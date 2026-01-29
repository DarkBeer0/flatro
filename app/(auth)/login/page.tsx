// app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Сохраняем код приглашения если есть
    if (inviteCode) {
      localStorage.setItem('pendingInviteCode', inviteCode)
    }
  }, [inviteCode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    // Проверяем pending приглашение
    const pendingInvite = localStorage.getItem('pendingInviteCode') || inviteCode

    if (pendingInvite) {
      try {
        const res = await fetch(`/api/invitations/${pendingInvite}`, {
          method: 'POST',
        })
        
        if (res.ok) {
          localStorage.removeItem('pendingInviteCode')
          router.push('/tenant/dashboard')
          router.refresh()
          return
        }
      } catch (err) {
        console.error('Error activating invitation:', err)
      }
    }

    // Получаем роль и редиректим
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const user = await res.json()
        router.push(user.role === 'TENANT' ? '/tenant/dashboard' : '/dashboard')
        router.refresh()
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

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />{error}
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
