// app/invite/[code]/page.tsx
// Tenant invitation page
// FIX: Session detection — if already logged in, offer to accept directly
// FIX: OTP verification instead of magic link for cross-device support

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, MapPin, Mail, Lock, User, Loader2, AlertCircle,
  CheckCircle, LogOut, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n/context'

const RESEND_COOLDOWN_SECONDS = 60

interface InvitationData {
  propertyName: string
  propertyAddress: string
  ownerName: string
  expiresAt: string
  suggestedRegion?: string
  invitedEmail: string | null
}

type Step = 'loading' | 'logged-in' | 'register' | 'login' | 'verify' | 'error'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string
  const { t } = useLocale()

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('loading')

  // Auth state
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null)

  // Register form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const inv = (t as any).invite || {}

  // ── Load invitation + check auth ──
  useEffect(() => {
    async function init() {
      // 1. Check if user is already logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setCurrentUser({
          email: user.email || '',
          name: user.user_metadata?.name ||
                (user.user_metadata?.first_name && user.user_metadata?.last_name
                  ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                  : undefined),
        })
      }

      // 2. Fetch invitation data
      try {
        const res = await fetch(`/api/invitations/${code}`)
        const data = await res.json()

        if (!res.ok) {
          if (data.code === 'NOT_FOUND' || res.status === 404) {
            setError(inv.notFound || 'Invitation not found')
          } else if (data.code === 'EXPIRED') {
            setError(inv.expired || 'Invitation expired')
          } else if (data.code === 'ALREADY_USED') {
            setError(inv.alreadyUsed || 'Invitation already used')
          } else {
            setError(data.error || inv.loadError || 'Failed to load invitation')
          }
          setStep('error')
          return
        }

        if (!data.propertyName || !data.propertyAddress) {
          setError(inv.invalidInvitationData || 'Invalid invitation data')
          setStep('error')
          return
        }

        setInvitation(data)
        if (data.invitedEmail) setEmail(data.invitedEmail)
        localStorage.setItem('pendingInviteCode', code)

        // 3. Decide initial step
        if (user) {
          setStep('logged-in')
        } else {
          setStep('register')
        }
      } catch (err) {
        console.error('Error fetching invitation:', err)
        setError(inv.connectionError || 'Connection error')
        setStep('error')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [code])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Auto-focus first OTP input
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [step])

  // ── Accept invitation (logged-in user) ──
  async function handleAcceptAsCurrentUser() {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/invitations/${code}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || inv.activationError || 'Activation failed')
        setSubmitting(false)
        return
      }
      localStorage.removeItem('pendingInviteCode')
      router.push('/tenant/dashboard')
      router.refresh()
    } catch {
      setError(inv.activationError || 'Activation failed')
      setSubmitting(false)
    }
  }

  // ── Log out and switch to register ──
  async function handleLogoutAndRegister() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setCurrentUser(null)
    setError(null)
    setStep('register')
  }

  // ── Register ──
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!firstName.trim() || firstName.length < 2) {
      setError(inv.firstNameMin || 'First name must be at least 2 characters')
      setSubmitting(false)
      return
    }
    if (!lastName.trim() || lastName.length < 2) {
      setError(inv.lastNameMin || 'Last name must be at least 2 characters')
      setSubmitting(false)
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!)
      setSubmitting(false)
      return
    }
    if (password !== confirmPassword) {
      setError(inv.passwordsMismatch || 'Passwords do not match')
      setSubmitting(false)
      return
    }
    if (!termsAccepted) {
      setError(inv.termsRequired || 'You must accept the terms')
      setSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          pendingInviteCode: code,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?invite=${code}`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError(inv.emailAlreadyRegistered || 'Email already registered')
        setStep('login')
      } else {
        setError(signUpError.message)
      }
      setSubmitting(false)
      return
    }

    // If auto-confirmed (session returned immediately)
    if (authData.session) {
      await activateInvitation()
      return
    }

    // Go to OTP verification
    if (authData?.user) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setStep('verify')
    }
    setSubmitting(false)
  }

  // ── Login ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(inv.wrongCredentials || 'Invalid email or password')
      setSubmitting(false)
      return
    }

    await activateInvitation()
  }

  // ── Google Auth ──
  async function handleGoogleAuth() {
    setSubmitting(true)
    setError(null)

    if (!termsAccepted && step === 'register') {
      setError(inv.termsRequired || 'You must accept the terms')
      setSubmitting(false)
      return
    }

    localStorage.setItem('pendingInviteCode', code)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite=${code}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
  }

  // ── Activate invitation (shared) ──
  async function activateInvitation() {
    try {
      const res = await fetch(`/api/invitations/${code}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || inv.activationError || 'Activation failed')
        setSubmitting(false)
        return
      }
      localStorage.removeItem('pendingInviteCode')
      router.push('/tenant/dashboard')
      router.refresh()
    } catch {
      setError(inv.activationError || 'Activation failed')
      setSubmitting(false)
    }
  }

  // ── OTP handlers ──
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)

    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 7) {
      const fullCode = newDigits.join('')
      if (fullCode.length === 8) {
        handleVerifyOtp(fullCode)
      }
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
    if (pasted.length > 0) {
      const newDigits = [...otpDigits]
      for (let i = 0; i < 8; i++) {
        newDigits[i] = pasted[i] || ''
      }
      setOtpDigits(newDigits)
      const nextEmpty = newDigits.findIndex(d => !d)
      inputRefs.current[nextEmpty === -1 ? 7 : nextEmpty]?.focus()

      if (pasted.length === 8) {
        handleVerifyOtp(pasted)
      }
    }
  }

  async function handleVerifyOtp(otpCode?: string) {
    const token = otpCode || otpDigits.join('')
    if (token.length !== 8) {
      setError(inv.otpIncomplete || 'Enter all 8 digits')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      })

      if (verifyError) {
        setError(inv.otpInvalid || 'Invalid or expired code. Try again.')
        setOtpDigits(['', '', '', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setVerifying(false)
        return
      }

      if (data.session) {
        await activateInvitation()
      } else {
        setError(inv.otpNoSession || 'Verification passed but no session. Try logging in.')
        setVerifying(false)
      }
    } catch {
      setError('Error verifying code')
      setVerifying(false)
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?invite=${code}`,
        },
      })
      if (resendError) {
        setError(resendError.message)
      } else {
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setOtpDigits(['', '', '', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}с`
  }

  // ════════════════════════════════════════════
  // RENDER: Invitation info card (shared)
  // ════════════════════════════════════════════
  const InvitationCard = () => (
    invitation ? (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Building2 className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">{inv.invitedTo || 'You have been invited to'}</p>
            <p className="text-blue-800 font-medium text-base">{invitation.propertyName}</p>
            <div className="flex items-center gap-1 text-blue-700 mt-1">
              <MapPin className="h-3 w-3" />
              <span>{invitation.propertyAddress}</span>
            </div>
            <p className="text-blue-600 mt-1">{inv.owner || 'Owner'}: {invitation.ownerName}</p>
          </div>
        </div>
      </Card>
    ) : null
  )

  // ════════════════════════════════════════════
  // RENDER: Loading
  // ════════════════════════════════════════════
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">{inv.loadingInvitation || 'Loading invitation...'}</p>
        </Card>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // RENDER: Error
  // ════════════════════════════════════════════
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{inv.errorTitle || 'Error'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              {inv.goToLogin || 'Go to login'}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // RENDER: Already logged in
  // ════════════════════════════════════════════
  if (step === 'logged-in') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <InvitationCard />

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Вы уже авторизованы
              </h2>
              <p className="text-gray-600 text-sm">
                Вы вошли как <span className="font-medium text-gray-900">{currentUser?.email}</span>
                {currentUser?.name && (
                  <span className="block text-gray-500 mt-1">{currentUser.name}</span>
                )}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Accept invitation */}
              <Button
                onClick={handleAcceptAsCurrentUser}
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Принять приглашение
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">или</span>
                </div>
              </div>

              {/* Log out and register new account */}
              <Button
                onClick={handleLogoutAndRegister}
                variant="outline"
                className="w-full"
                disabled={submitting}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выйти и создать новый аккаунт
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              Принимая приглашение, вы получите доступ к квартире как жилец
            </p>
          </Card>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // RENDER: OTP Verification
  // ════════════════════════════════════════════
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <InvitationCard />

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {inv.enterCode || 'Enter verification code'}
              </h2>
              <p className="text-gray-600 text-sm">
                {(inv.otpSentTo || 'We sent an 8-digit code to {email}').replace('{email}', '')}
                <span className="font-medium text-gray-900">{email}</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Input */}
            <div className="flex justify-center gap-1.5 mb-6" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  disabled={verifying}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerifyOtp()}
              className="w-full mb-4"
              disabled={verifying || otpDigits.join('').length !== 8}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inv.verifyAndContinue || 'Verify and continue'
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">{inv.didntReceiveCode || "Didn't receive the code?"}</p>
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1 mx-auto"
              >
                {resending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> {inv.sending || 'Sending...'}</>
                ) : resendCooldown > 0 ? (
                  <><RefreshCw className="h-3 w-3" /> {(inv.resendIn || 'Resend in {time}').replace('{time}', formatTime(resendCooldown))}</>
                ) : (
                  <><RefreshCw className="h-3 w-3" /> {inv.resendCode || 'Resend code'}</>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-3">{inv.checkSpam || 'Check spam folder if not received'}</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // RENDER: Register / Login form
  // ════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <InvitationCard />

        <Card className="p-6">
          {step === 'login' ? (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">{inv.loginToAccount || 'Log in'}</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <Label>{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" placeholder="jan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label>{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (inv.loginAndAccept || 'Log in & accept')}
                </Button>
              </form>
              <button onClick={() => { setStep('register'); setError(null) }} className="w-full mt-4 text-sm text-blue-600 hover:underline">
                {inv.createNewAccount || 'Create a new account'}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">{inv.createAccount || 'Create account'}</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google Auth */}
                <div className="space-y-3">
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={submitting}>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {inv.continueWithGoogle || t.auth.continueWithGoogle}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">{inv.orDivider || t.auth.orDivider}</span>
                    </div>
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.auth.firstName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Jan" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div>
                    <Label>{t.auth.lastName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Kowalski" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label>{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" placeholder="jan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={!!invitation?.invitedEmail} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label>{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm password */}
                <div>
                  <Label>{t.auth.confirmPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
                  <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                    {t.auth.termsAccept}{' '}
                    <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">{t.auth.termsLink}</Link>{' '}
                    &{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">{t.auth.privacyLink}</Link>
                    {' '}<span className="text-red-500">*</span>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.auth.register}
                </Button>
              </form>
              <button onClick={() => { setStep('login'); setError(null) }} className="w-full mt-4 text-sm text-blue-600 hover:underline">
                {inv.alreadyHaveAccount || t.auth.hasAccount}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}