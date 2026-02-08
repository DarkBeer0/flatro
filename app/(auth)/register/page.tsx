// app/(auth)/register/page.tsx
// FIX 2: Не автоматически логинить, а показывать сообщение если авторизован
// + FIX 3: License Agreement как модальное окно

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrength, validatePassword } from '@/components/password-strength'
import { createClient } from '@/lib/supabase/client'

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

              <h3>2. Предмет соглашения</h3>
              <p>Администрация предоставляет Пользователю доступ к следующим функциям:</p>
              <ul>
                <li>Регистрация и управление объектами недвижимости</li>
                <li>Ведение базы арендаторов</li>
                <li>Учёт платежей за аренду и коммунальные услуги</li>
                <li>Генерация договоров аренды</li>
                <li>Уведомления о платежах и событиях</li>
              </ul>

              <h3>3. Права и обязанности</h3>
              <h4>3.1. Обязанности Пользователя</h4>
              <ul>
                <li>Предоставлять достоверные данные при регистрации</li>
                <li>Обеспечивать конфиденциальность учётных данных</li>
                <li>Не использовать Сервис для незаконной деятельности</li>
                <li>Соблюдать права интеллектуальной собственности</li>
              </ul>

              <h3>4. Конфиденциальность</h3>
              <p>
                Обработка персональных данных осуществляется в соответствии с 
                Политикой конфиденциальности. Администрация обрабатывает данные 
                в соответствии с GDPR.
              </p>

              <h3>5. Ответственность</h3>
              <p>Администрация не несёт ответственности за:</p>
              <ul>
                <li>Убытки, возникшие в результате действий Пользователя</li>
                <li>Содержание данных, загружаемых Пользователем</li>
                <li>Юридическую силу документов, сгенерированных с помощью Сервиса</li>
              </ul>

              <p className="text-sm text-gray-500 mt-4">
                Последнее обновление: 1 января 2025 • Версия 1.0
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <h3>1. Какие данные мы собираем</h3>
              <ul>
                <li>Контактные данные (email, телефон)</li>
                <li>Личные данные (имя, фамилия)</li>
                <li>Данные о недвижимости</li>
                <li>Финансовая информация о платежах</li>
              </ul>

              <h3>2. Как мы используем данные</h3>
              <ul>
                <li>Для предоставления услуг сервиса</li>
                <li>Для связи с вами по вопросам аккаунта</li>
                <li>Для улучшения качества сервиса</li>
              </ul>

              <h3>3. Защита данных</h3>
              <p>
                Мы используем современные методы шифрования и защиты данных. 
                Доступ к персональным данным имеют только авторизованные сотрудники.
              </p>

              <h3>4. Ваши права (GDPR)</h3>
              <ul>
                <li>Право на доступ к своим данным</li>
                <li>Право на исправление данных</li>
                <li>Право на удаление данных</li>
                <li>Право на переносимость данных</li>
              </ul>

              <h3>5. Контакты</h3>
              <p>
                По вопросам обработки персональных данных: support@flatro.app
              </p>

              <p className="text-sm text-gray-500 mt-4">
                Последнее обновление: 1 января 2025 • Версия 1.0
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t">
          <Button onClick={onClose} className="w-full">
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Компонент для авторизованного пользователя (FIX 2)
// ============================================
function AlreadyLoggedIn({ 
  email, 
  onLogout 
}: { 
  email: string
  onLogout: () => void 
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Вы уже авторизованы</h1>
          <p className="text-gray-500 mt-2">
            Вы вошли как <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="w-full"
          >
            Перейти в личный кабинет
          </Button>
          
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
  const [success, setSuccess] = useState(false)
  
  // FIX 2: Проверка авторизации
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  
  // FIX 3: Модальные окна
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

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

  // FIX 2: Функция выхода
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setCurrentUser(null)
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

    // Успешная регистрация
    if (authData?.user) {
      setSuccess(true)
    }
    
    setLoading(false)
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

  // Успешная регистрация
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Проверьте почту</h2>
          <p className="text-gray-600 mb-4">
            Мы отправили письмо на <span className="font-medium">{email}</span>.
            Перейдите по ссылке в письме для подтверждения регистрации.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Перейти к входу
            </Button>
          </Link>
        </Card>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">Имя</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
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
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Иванов"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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
