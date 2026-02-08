// app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const errorParam = searchParams.get('error')
  const inviteAccepted = searchParams.get('invite_accepted')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Сохраняем invite код ТОЛЬКО если пришли явно с ?invite=
    if (inviteCode) {
      localStorage.setItem('pendingInviteCode', inviteCode)
    }
    
    if (errorParam) {
      if (errorParam === 'account_not_found') {
        setError('Аккаунт не найден. Возможно, вы ещё не зарегистрированы.')
      } else if (errorParam === 'auth') {
        setError('Ошибка авторизации. Попробуйте войти снова.')
        // При ошибке auth чистим invite код — он мог застрять от прошлой сессии
        localStorage.removeItem('pendingInviteCode')
      } else if (errorParam === 'cannot_invite_self') {
        setError('Вы не можете стать жильцом собственной квартиры.')
        // Чистим invite код — он больше не нужен
        localStorage.removeItem('pendingInviteCode')
      } else if (errorParam === 'invite_invalid') {
        setError('Приглашение недействительно или истекло.')
        localStorage.removeItem('pendingInviteCode')
      } else if (errorParam === 'server_error') {
        setError('Ошибка сервера. Попробуйте позже.')
      } else {
        setError(decodeURIComponent(errorParam))
      }
    }

    if (inviteAccepted) {
      setSuccess('Приглашение принято! Теперь у вас есть доступ к новой квартире.')
    }
  }, [inviteCode, errorParam, inviteAccepted])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Неверный email или пароль')
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Email не подтверждён. Проверьте почту для подтверждения.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    // Проверяем pending приглашение
    // Используем ТОЛЬКО из localStorage если пришли с ?invite=, 
    // иначе берём только из URL текущей страницы
    const pendingInvite = inviteCode || localStorage.getItem('pendingInviteCode')

    if (pendingInvite) {
      try {
        const res = await fetch(`/api/invitations/${pendingInvite}`, {
          method: 'POST',
        })
        
        // ВСЕГДА чистим после попытки (успешной или нет)
        localStorage.removeItem('pendingInviteCode')
        
        if (res.ok) {
          const data = await res.json()
          
          if (data.isOwner) {
            router.push('/dashboard?invite_accepted=true')
          } else {
            router.push('/tenant/dashboard')
          }
          router.refresh()
          return
        } else {
          const errData = await res.json()
          if (errData.error?.includes('собственной квартиры')) {
            setError('Вы не можете стать жильцом собственной квартиры.')
            setLoading(false)
            return
          }
          // Другие ошибки (expired, already used) — просто продолжаем вход
        }
      } catch (err) {
        console.error('Error activating invitation:', err)
        localStorage.removeItem('pendingInviteCode')
      }
    }

    // Получаем информацию о пользователе для редиректа
    try {
      const res = await fetch('/api/auth/me')
      
      if (res.ok) {
        const user = await res.json()
        
        if (user.isOwner) {
          router.push('/dashboard')
        } else if (user.isTenant) {
          router.push('/tenant/dashboard')
        } else {
          router.push('/dashboard')
        }
        router.refresh()
        return
      } else if (res.status === 404) {
        setError('Ошибка профиля. Попробуйте зарегистрироваться заново.')
        setLoading(false)
        return
      }
    } catch {
      // Fallback - просто идём на dashboard
    }

    router.push('/dashboard')
    router.refresh()
  }

  // Вход через Google
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Формируем redirect URL с invite кодом если есть
    let redirectUrl = `${window.location.origin}/auth/callback`
    if (inviteCode) {
      redirectUrl += `?invite=${inviteCode}`
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Flatro</span>
          </Link>
          <p className="text-gray-500 mt-2">Войдите в свой аккаунт</p>
        </div>

        <Card className="p-6">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2 mb-4">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Auth */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleLogin}
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
              Войти через Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">или</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="email">Email</Label>
              </div>
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
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password">Пароль</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Забыли пароль?
                </Link>
              </div>
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
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Нет аккаунта?{' '}
            <Link 
              href={inviteCode ? `/invite/${inviteCode}` : '/register'} 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Зарегистрироваться
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
