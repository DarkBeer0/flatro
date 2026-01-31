// app/(auth)/register/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'

// Константы для таймера
const RESEND_COOLDOWN_SECONDS = 60
const MAX_RESEND_ATTEMPTS = 3

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Состояния для повторной отправки
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendAttempts, setResendAttempts] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Таймер обратного отсчёта
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Валидация пароля
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error!)
      setLoading(false)
      return
    }

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
        // ИСПРАВЛЕНИЕ: Указываем куда редиректить после подтверждения email
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Этот email уже зарегистрирован')
      } else if (error.message.includes('rate limit')) {
        setError('Слишком много попыток. Подождите несколько минут.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    setLoading(false)
  }

  // Функция повторной отправки письма
  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0 || resending || resendAttempts >= MAX_RESEND_ATTEMPTS) {
      return
    }

    setResending(true)
    setResendError(null)
    setResendSuccess(false)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('rate limit')) {
          setResendError('Слишком много попыток. Подождите несколько минут.')
        } else {
          setResendError(error.message)
        }
      } else {
        setResendSuccess(true)
        setResendAttempts(prev => prev + 1)
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } catch (err) {
      setResendError('Не удалось отправить письмо. Попробуйте позже.')
    } finally {
      setResending(false)
    }
  }, [email, resendCooldown, resending, resendAttempts])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}с`
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Проверьте почту!</h2>
            <p className="text-gray-500 mb-4">
              Мы отправили ссылку для подтверждения на <strong>{email}</strong>
            </p>
            
            {/* Предупреждение о спаме */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-700">
                ⚠️ Проверьте папку <strong>"Спам"</strong> или <strong>"Нежелательная почта"</strong>, если письмо не пришло
              </p>
            </div>

            {/* Кнопка повторной отправки */}
            <div className="mb-4">
              {resendAttempts >= MAX_RESEND_ATTEMPTS ? (
                <p className="text-sm text-gray-500">
                  Достигнут лимит повторных отправок. 
                  <br />Если письмо не пришло, попробуйте позже или обратитесь в поддержку.
                </p>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || resending}
                    className="w-full mb-2"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Отправить повторно ({formatTime(resendCooldown)})
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Отправить письмо повторно
                      </>
                    )}
                  </Button>
                  
                  {/* Счётчик попыток */}
                  <p className="text-xs text-gray-400">
                    Осталось попыток: {MAX_RESEND_ATTEMPTS - resendAttempts} из {MAX_RESEND_ATTEMPTS}
                  </p>
                </>
              )}
            </div>

            {/* Сообщения об ошибке/успехе повторной отправки */}
            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {resendError}
              </div>
            )}

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Письмо отправлено повторно!
              </div>
            )}

            <Link href="/login">
              <Button variant="outline" className="w-full">
                Вернуться ко входу
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">Flatro</span>
          </Link>
          <p className="text-gray-500 mt-2">Создайте аккаунт</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Пароли не совпадают</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600">✓ Пароли совпадают</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Войти
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
