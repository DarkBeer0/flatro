// app/invite/[code]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Home, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'

interface InvitationData {
  id: string
  email: string | null
  expiresAt: string
  property: {
    id: string
    name: string
    address: string
    city: string
    rooms: number | null
    area: number | null
    user: {
      name: string | null
    }
  }
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'loading' | 'register' | 'login' | 'success' | 'error'>('loading')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchInvitation()
  }, [code])

  async function fetchInvitation() {
    try {
      const res = await fetch(`/api/invitations/${code}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'NOT_FOUND') {
          setError('Приглашение не найдено')
        } else if (data.code === 'EXPIRED') {
          setError('Срок действия приглашения истёк')
        } else if (data.code === 'ALREADY_USED') {
          setError('Это приглашение уже использовано')
        } else {
          setError('Ошибка загрузки приглашения')
        }
        setStep('error')
        return
      }

      setInvitation(data)
      if (data.email) setEmail(data.email)
      
      // Сохраняем код для использования после подтверждения email
      localStorage.setItem('pendingInviteCode', code)
      
      setStep('register')
    } catch (err) {
      setError('Ошибка соединения')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!)
      setSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setSubmitting(false)
      return
    }

    const supabase = createClient()

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, pendingInviteCode: code },
        emailRedirectTo: `${window.location.origin}/auth/callback?invite=${code}`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Этот email уже зарегистрирован.')
        setStep('login')
      } else {
        setError(signUpError.message)
      }
      setSubmitting(false)
      return
    }

    if (authData.session) {
      await activateInvitation()
      return
    }

    setStep('success')
    setSubmitting(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Неверный email или пароль')
      setSubmitting(false)
      return
    }

    await activateInvitation()
  }

  async function activateInvitation() {
    try {
      const res = await fetch(`/api/invitations/${code}`, { method: 'POST' })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ошибка активации')
        setSubmitting(false)
        return
      }

      localStorage.removeItem('pendingInviteCode')
      router.push('/tenant/dashboard')
      router.refresh()
    } catch (err) {
      setError('Ошибка активации')
      setSubmitting(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/"><Button variant="outline">На главную</Button></Link>
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Проверьте почту!</h2>
          <p className="text-gray-500 mb-4">
            Мы отправили ссылку на <strong>{email}</strong>
          </p>
          <p className="text-sm text-yellow-600">
            ⚠️ После подтверждения вы будете добавлены в квартиру
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">Flatro</span>
          </Link>
        </div>

        {invitation && (
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Вас приглашают в:</p>
                <p className="font-semibold text-gray-900">{invitation.property.name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {invitation.property.address}, {invitation.property.city}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          {step === 'login' ? (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">Войдите в аккаунт</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />{error}
                  </div>
                )}
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Пароль</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти и принять'}
                </Button>
              </form>
              <button onClick={() => setStep('register')} className="w-full mt-4 text-sm text-blue-600">
                Создать новый аккаунт
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">Создайте аккаунт</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />{error}
                  </div>
                )}
                <div>
                  <Label>Ваше имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Иван Петров" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={!!invitation?.email} />
                  </div>
                </div>
                <div>
                  <Label>Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                  <PasswordStrength password={password} />
                </div>
                <div>
                  <Label>Подтвердите пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Зарегистрироваться'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-gray-500">
                Уже есть аккаунт?{' '}
                <button onClick={() => setStep('login')} className="text-blue-600">Войти</button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
