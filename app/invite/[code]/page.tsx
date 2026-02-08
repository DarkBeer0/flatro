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
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'

// Интерфейс соответствует формату ответа API /api/invitations/[code]
interface InvitationData {
  valid: boolean
  propertyId: string
  propertyName: string
  propertyAddress: string
  ownerName: string
  ownerEmail?: string
  expiresAt: string
  suggestedRegion?: string
  invitedEmail: string | null
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'loading' | 'register' | 'login' | 'success' | 'error'>('loading')

  // Раздельные поля для имени и фамилии
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchInvitation()
  }, [code])

  async function fetchInvitation() {
    try {
      const res = await fetch(`/api/invitations/${code}`)
      const data = await res.json()

      if (!res.ok) {
        // Обработка различных ошибок от API
        if (data.code === 'NOT_FOUND' || res.status === 404) {
          setError('Приглашение не найдено')
        } else if (data.code === 'EXPIRED') {
          setError('Срок действия приглашения истёк')
        } else if (data.code === 'ALREADY_USED') {
          setError('Это приглашение уже использовано')
        } else {
          setError(data.error || 'Ошибка загрузки приглашения')
        }
        setStep('error')
        return
      }

      // Проверяем что данные валидны
      if (!data.propertyName || !data.propertyAddress) {
        setError('Некорректные данные приглашения')
        setStep('error')
        return
      }

      setInvitation(data)
      
      // Устанавливаем email если указан в приглашении
      if (data.invitedEmail) {
        setEmail(data.invitedEmail)
      }
      
      // Сохраняем код для использования после подтверждения email
      localStorage.setItem('pendingInviteCode', code)
      
      setStep('register')
    } catch (err) {
      console.error('Error fetching invitation:', err)
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

    // Валидация имени
    if (!firstName.trim() || firstName.length < 2) {
      setError('Имя должно содержать минимум 2 символа')
      setSubmitting(false)
      return
    }

    if (!lastName.trim() || lastName.length < 2) {
      setError('Фамилия должна содержать минимум 2 символа')
      setSubmitting(false)
      return
    }

    // Валидация пароля
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

    // Проверка согласия с условиями (обязательно для tenant)
    if (!termsAccepted) {
      setError('Необходимо принять пользовательское соглашение для продолжения')
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
          pendingInviteCode: code 
        },
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

  // Регистрация через Google с сохранением invite кода
  async function handleGoogleAuth() {
    setSubmitting(true)
    setError(null)

    // Проверка согласия с условиями перед Google Auth
    if (!termsAccepted) {
      setError('Необходимо принять пользовательское соглашение для продолжения')
      setSubmitting(false)
      return
    }

    // Сохраняем invite код в localStorage для использования после callback
    localStorage.setItem('pendingInviteCode', code)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite=${code}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
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

  // Состояние загрузки
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Загрузка приглашения...</p>
        </Card>
      </div>
    )
  }

  // Состояние ошибки
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Перейти на страницу входа
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Успешная регистрация
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Проверьте почту</h2>
          <p className="text-gray-600 mb-4">
            Мы отправили письмо на <strong>{email}</strong>. 
            Перейдите по ссылке для подтверждения и завершения регистрации.
          </p>
          <p className="text-sm text-gray-500">
            После подтверждения вы сможете войти и принять приглашение.
          </p>
        </Card>
      </div>
    )
  }

  // Основная форма регистрации/входа
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        {/* Информация о квартире */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 mb-1">
                Приглашение в квартиру
              </h1>
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{invitation?.propertyName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{invitation?.propertyAddress}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Владелец: {invitation?.ownerName || 'Не указан'}
              </p>
            </div>
          </div>
        </Card>

        {/* Форма */}
        <Card className="p-6">
          {step === 'login' ? (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">Войдите в аккаунт</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="pl-10" 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <Label>Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="pl-10" 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти и принять'}
                </Button>
              </form>
              <button 
                onClick={() => { setStep('register'); setError(null) }} 
                className="w-full mt-4 text-sm text-blue-600 hover:underline"
              >
                Создать новый аккаунт
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">Создайте аккаунт</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google Auth с сохранением invite */}
                <div className="space-y-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleAuth}
                    disabled={submitting}
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
                    Продолжить с Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">или</span>
                    </div>
                  </div>
                </div>

                {/* ИСПРАВЛЕНИЕ: Раздельные поля для имени и фамилии */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Имя <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Иван" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        className="pl-10" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Фамилия <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="Петров" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="pl-10" 
                      required 
                      disabled={!!invitation?.invitedEmail}
                    />
                  </div>
                </div>

                <div>
                  <Label>Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="pl-10" 
                      required 
                    />
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <Label>Подтвердите пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="pl-10" 
                      required 
                    />
                  </div>
                </div>

                {/* НОВОЕ: Обязательный чекбокс лицензионного соглашения */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                    Я принимаю{' '}
                    <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                      Пользовательское соглашение
                    </Link>{' '}
                    и{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                      Политику конфиденциальности
                    </Link>
                    {' '}<span className="text-red-500">*</span>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Зарегистрироваться'}
                </Button>
              </form>
              <button 
                onClick={() => { setStep('login'); setError(null) }} 
                className="w-full mt-4 text-sm text-blue-600 hover:underline"
              >
                Уже есть аккаунт? Войти
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
