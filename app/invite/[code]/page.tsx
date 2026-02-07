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
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Перейти на страницу входа
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Успешная отправка письма подтверждения
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Проверьте почту</h1>
          <p className="text-gray-600 mb-4">
            Мы отправили письмо на <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Нажмите на ссылку в письме для завершения регистрации
          </p>
        </Card>
      </div>
    )
  }

  // Защита от отсутствия данных приглашения
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-6">Не удалось загрузить данные приглашения</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Перейти на страницу входа
            </Button>
          </Link>
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
                <span className="truncate">{invitation.propertyName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{invitation.propertyAddress}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Владелец: {invitation.ownerName || 'Не указан'}
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
                <div>
                  <Label>Ваше имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Иван Петров" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="pl-10" 
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
                      disabled={!!invitation.invitedEmail}
                    />
                  </div>
                  {invitation.invitedEmail && (
                    <p className="text-xs text-gray-500 mt-1">
                      Приглашение привязано к этому email
                    </p>
                  )}
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать аккаунт'}
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

        {/* Информация о сроке действия */}
        <p className="text-center text-xs text-gray-500">
          Приглашение действительно до {new Date(invitation.expiresAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>
    </div>
  )
}