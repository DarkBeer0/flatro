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
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
    } catch (err) {
      console.error('Error getting user:', err)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">Flatro</span>
          </Link>
          <p className="text-gray-500 mt-2">Войдите в аккаунт</p>
        </div>

        {inviteCode && (
          <Card className="p-4 mb-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-700 text-center">
              🏠 Войдите чтобы принять приглашение
            </p>
          </Card>
        )}

        {success && (
          <Card className="p-4 mb-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  {error}
                  {error.includes('не зарегистрированы') && (
                    <div className="mt-2">
                      <Link href="/register" className="text-blue-600 hover:underline">
                        Зарегистрироваться →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
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