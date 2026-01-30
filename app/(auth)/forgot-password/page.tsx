// app/(auth)/forgot-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

// Константы для таймера
const RESEND_COOLDOWN_SECONDS = 60

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Состояния для повторной отправки
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  // Таймер обратного отсчёта
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // ИСПРАВЛЕНИЕ БАГ 5: Проверка существования email перед отправкой
  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      })
      
      if (res.ok) {
        const data = await res.json()
        return data.exists
      }
      return false
    } catch (err) {
      console.error('Error checking email:', err)
      // В случае ошибки позволяем продолжить (fail-open)
      return true
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const trimmedEmail = email.toLowerCase().trim()

    // ИСПРАВЛЕНИЕ БАГ 5: Сначала проверяем существует ли email
    const emailExists = await checkEmailExists(trimmedEmail)
    
    if (!emailExists) {
      setError('Пользователь с таким email не найден. Проверьте правильность ввода или зарегистрируйтесь.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      if (error.message.includes('rate limit')) {
        setError('Слишком много запросов. Подождите несколько минут перед повторной попыткой.')
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

  // Повторная отправка
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return

    setResending(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
      }
    } catch (err) {
      setError('Не удалось отправить письмо')
    } finally {
      setResending(false)
    }
  }

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
            <h2 className="text-xl font-semibold mb-2">Письмо отправлено!</h2>
            <p className="text-gray-500 mb-4">
              Проверьте почту <strong>{email}</strong> для инструкций по сбросу пароля.
            </p>
            
            {/* Предупреждение о спаме */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-700">
                ⚠️ Проверьте папку <strong>"Спам"</strong>, если письмо не пришло в течение нескольких минут
              </p>
            </div>

            {/* Кнопка повторной отправки */}
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="w-full mb-4"
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Link href="/login">
              <Button variant="outline" className="w-full">
                Вернуться к входу
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
          <p className="text-gray-500 mt-2">Восстановление пароля</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  {error}
                  {error.includes('не найден') && (
                    <div className="mt-2">
                      <Link href="/register" className="text-blue-600 hover:underline">
                        Зарегистрироваться →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Введите email, и мы отправим инструкции по сбросу пароля.
            </p>

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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : (
                'Отправить инструкции'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к входу
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
