// app/(auth)/register/page.tsx
// FIX 2: Не автоматически логинить, а показывать сообщение если авторизован
// FIX 3: License Agreement как модальное окно
// FIX 4: OTP verification instead of magic link

'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, LogOut, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN_SECONDS = 60

// ============================================
// Модальное окно License Agreement (FIX 3)
// ============================================
function LicenseModal({ 
  isOpen, 
  onClose,
  type 
}: { 
  isOpen: boolean
  onClose: () => void
  type: 'terms' | 'privacy'
}) {
  if (!isOpen) return null

  const title = type === 'terms' 
    ? 'Пользовательское соглашение' 
    : 'Политика конфиденциальности'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {type === 'terms' ? (
            <div className="prose prose-sm max-w-none">
              <h3>1. Общие положения</h3>
              <p>
                Настоящее Пользовательское соглашение регулирует отношения между 
                владельцем сервиса Flatro (далее — «Администрация») и физическим лицом, 
                использующим сервис (далее — «Пользователь»).
              </p>
              
              <h4>1.1. Определения</h4>
              <ul>
                <li><strong>Flatro</strong> — веб-приложение для управления арендой недвижимости</li>
                <li><strong>Владелец (Арендодатель)</strong> — Пользователь, управляющий объектами недвижимости</li>
                <li><strong>Арендатор</strong> — Пользователь, приглашённый Владельцем как жилец</li>
              </ul>

              <h3>2. Условия использования</h3>
              <p>Используя сервис Flatro, вы соглашаетесь с данными условиями...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <h3>Политика конфиденциальности</h3>
              <p>Мы серьёзно относимся к защите ваших персональных данных...</p>
              
              <h4>Какие данные мы собираем</h4>
              <ul>
                <li>Имя и фамилия</li>
                <li>Адрес электронной почты</li>
                <li>Данные об объектах недвижимости</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button onClick={onClose} className="w-full">
            Понятно
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Компонент "Уже авторизован" (FIX 2)
// ============================================
function AlreadyLoggedIn({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Вы уже авторизованы</h2>
        <p className="text-gray-600 mb-4">
          Вы вошли как <span className="font-medium">{email}</span>
        </p>
        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full">
              Перейти в панель управления
            </Button>
          </Link>
          <Button 
            onClick={onLogout} 
            variant="outline" 
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти и зарегистрировать новый аккаунт
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// Форма регистрации
// ============================================
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'verify'>('form')
  
  // FIX 2: Проверка авторизации
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  
  // FIX 3: Модальные окна
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  // FIX 4: OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setCurrentUser({ email: user.email || '' })
      }
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [])

  // Если есть invite код - редирект на страницу приглашения
  useEffect(() => {
    if (inviteCode && !checkingAuth && !currentUser) {
      router.replace(`/invite/${inviteCode}`)
    }
  }, [inviteCode, router, checkingAuth, currentUser])

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

  // FIX 2: Функция выхода
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setCurrentUser(null)
  }

  // Регистрация через Google
  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)

    if (!termsAccepted) {
      setError('Необходимо принять пользовательское соглашение')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Валидация имени
    if (!firstName.trim() || firstName.length < 2) {
      setError('Имя должно содержать минимум 2 символа')
      setLoading(false)
      return
    }

    if (!lastName.trim() || lastName.length < 2) {
      setError('Фамилия должна содержать минимум 2 символа')
      setLoading(false)
      return
    }

    // Валидация пароля
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    // Проверка согласия с условиями
    if (!termsAccepted) {
      setError('Необходимо принять пользовательское соглашение')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Регистрация через Supabase
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}` 
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Этот email уже зарегистрирован. Попробуйте войти.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // If auto-confirmed (when email confirmation is disabled)
    if (authData?.session) {
      router.push('/dashboard')
      return
    }

    // Go to OTP verification step
    if (authData?.user) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setStep('verify')
    }
    
    setLoading(false)
  }

  // ── OTP handlers ──
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const fullCode = newDigits.join('')
      if (fullCode.length === 6) {
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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newDigits = [...otpDigits]
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || ''
      }
      setOtpDigits(newDigits)

      const nextEmpty = newDigits.findIndex(d => !d)
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty
      inputRefs.current[focusIdx]?.focus()

      if (pasted.length === 6) {
        handleVerifyOtp(pasted)
      }
    }
  }

  async function handleVerifyOtp(otpCode?: string) {
    const token = otpCode || otpDigits.join('')
    if (token.length !== 6) {
      setError('Введите все 6 цифр кода')
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
        setError('Неверный или просроченный код. Попробуйте ещё раз.')
        setOtpDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setVerifying(false)
        return
      }

      if (data.session) {
        // Successfully verified — redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('Верификация прошла, но сессия не создана. Попробуйте войти.')
        setVerifying(false)
      }
    } catch (err) {
      console.error('OTP verification error:', err)
      setError('Произошла ошибка. Попробуйте ещё раз.')
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setOtpDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Не удалось отправить код повторно')
    } finally {
      setResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}с`
  }

  // Показываем загрузку пока проверяем авторизацию
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // FIX 2: Показываем сообщение если авторизован
  if (currentUser) {
    return <AlreadyLoggedIn email={currentUser.email} onLogout={handleLogout} />
  }

  // ── OTP Verification step ──
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Flatro</span>
            </Link>
          </div>

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Введите код подтверждения
              </h2>
              <p className="text-gray-600 text-sm">
                Мы отправили 6-значный код на{' '}
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
            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
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
                  className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  disabled={verifying}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerifyOtp()}
              className="w-full mb-4"
              disabled={verifying || otpDigits.join('').length !== 6}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Подтвердить и продолжить'
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Не получили код?</p>
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1 mx-auto"
              >
                {resending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Отправка...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Повторить через {formatTime(resendCooldown)}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Отправить повторно
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 mt-3">
                Проверьте папку «Спам», если письмо не пришло
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* FIX 3: Модальные окна */}
      <LicenseModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
        type="terms"
      />
      <LicenseModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
        type="privacy"
      />
      
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Flatro</span>
          </Link>
          <p className="mt-2 text-gray-500">Создайте аккаунт владельца</p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Google Auth */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Продолжить через Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">или</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">Имя</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    placeholder="Иван"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lastName">Фамилия</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    placeholder="Петров"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* FIX 3: Чекбокс с модальными окнами вместо отдельных страниц */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                Я принимаю{' '}
                <button 
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-600 hover:underline"
                >
                  Пользовательское соглашение
                </button>{' '}
                и{' '}
                <button 
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-blue-600 hover:underline"
                >
                  Политику конфиденциальности
                </button>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Зарегистрироваться'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Войти
            </Link>
          </div>

          {/* Информация о регистрации по приглашению */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">Вы арендатор?</p>
            <p>Если вы получили ссылку-приглашение от владельца, перейдите по ней для регистрации.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}