/**
 * Страница завершения регистрации арендатора (tenant)
 * 
 * Путь в проекте: app/(auth)/invite/complete/[code]/page.tsx
 * 
 * Эта страница показывается после того, как арендатор:
 * 1. Перешёл по ссылке-приглашению
 * 2. Прошёл авторизацию через Supabase Auth
 * 
 * Здесь собираются дополнительные данные и согласие с условиями.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RegionSelector } from '@/components/ui/RegionSelector'
import { useRegion, RegionCode } from '@/lib/regions'
import { 
  Loader2, User, Phone, FileText, Calendar, 
  AlertCircle, CheckCircle2, Globe 
} from 'lucide-react'

// ============================================
// ТИПЫ
// ============================================

interface FormData {
  firstName: string
  lastName: string
  phone: string
  nationalId: string          // PESEL / INN / Steuer-ID / etc.
  moveInDate: string
  emergencyContact: string
  emergencyPhone: string
  termsAccepted: boolean
  privacyAccepted: boolean
}

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  nationalId?: string
  terms?: string
  general?: string
}

interface InvitationData {
  propertyAddress: string
  ownerName: string
  expiresAt: string
  suggestedRegion?: RegionCode
}

// ============================================
// КОМПОНЕНТ
// ============================================

export default function CompleteTenantRegistration() {
  const router = useRouter()
  const params = useParams()
  const inviteCode = params.code as string

  // Регион (по умолчанию Польша, но может быть изменён)
  const [regionCode, setRegionCode] = useState<RegionCode>('PL')
  const {
    region,
    validatePhone,
    validateNationalId,
    formatPhone,
    normalizePhone,
    getPhonePlaceholder,
    getNationalIdLabel,
    getNationalIdPlaceholder,
    getNationalIdDescription,
    hasNationalId
  } = useRegion(regionCode)

  // Состояния
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
    moveInDate: new Date().toISOString().split('T')[0],
    emergencyContact: '',
    emergencyPhone: '',
    termsAccepted: false,
    privacyAccepted: false
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ============================================
  // ЗАГРУЗКА ДАННЫХ ПРИГЛАШЕНИЯ
  // ============================================

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations/${inviteCode}`)
        if (!res.ok) {
          throw new Error('Приглашение не найдено или истекло')
        }
        const data = await res.json()
        setInvitation(data)
        
        // Установить регион если есть предложение от сервера
        if (data.suggestedRegion) {
          setRegionCode(data.suggestedRegion)
        }
        
        // Предзаполненные данные из Supabase Auth
        if (data.userData) {
          setFormData(prev => ({
            ...prev,
            firstName: data.userData.firstName || '',
            lastName: data.userData.lastName || ''
          }))
        }
      } catch (error) {
        setErrors({ general: 'Не удалось загрузить приглашение. Проверьте ссылку.' })
      } finally {
        setIsLoading(false)
      }
    }

    if (inviteCode) {
      fetchInvitation()
    }
  }, [inviteCode])

  // ============================================
  // ВАЛИДАЦИЯ
  // ============================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Имя (универсально для всех регионов)
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно для заполнения'
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'Имя должно содержать минимум 2 символа'
    } else if (!/^[\p{L}\s-]+$/u.test(formData.firstName)) {
      newErrors.firstName = 'Имя может содержать только буквы'
    }

    // Фамилия
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна для заполнения'
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Фамилия должна содержать минимум 2 символа'
    } else if (!/^[\p{L}\s-]+$/u.test(formData.lastName)) {
      newErrors.lastName = 'Фамилия может содержать только буквы'
    }

    // Телефон (если введён - валидируем по региону)
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = `Введите корректный номер телефона (${region.phone.format})`
    }

    // Национальный ID (если есть для региона и введён)
    if (hasNationalId() && formData.nationalId && !validateNationalId(formData.nationalId)) {
      newErrors.nationalId = `Введите корректный ${getNationalIdLabel()}`
    }

    // Согласие с условиями
    if (!formData.termsAccepted || !formData.privacyAccepted) {
      newErrors.terms = 'Необходимо принять пользовательское соглашение и политику конфиденциальности'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ============================================
  // ОБРАБОТЧИКИ
  // ============================================

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    let processedValue = value

    // Форматирование телефона
    if (field === 'phone' && typeof value === 'string') {
      processedValue = formatPhone(value)
    }

    // Ограничение национального ID
    if (field === 'nationalId' && typeof value === 'string' && hasNationalId()) {
      const maxLen = region.nationalId?.length || 20
      processedValue = value.replace(/[^\d]/g, '').slice(0, maxLen)
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }))
    
    // Сброс ошибки
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegionCode(newRegion)
    // Сбрасываем nationalId при смене региона (разные форматы)
    setFormData(prev => ({ ...prev, nationalId: '', phone: '' }))
    setErrors({})
  }

  // ============================================
  // ОТПРАВКА ФОРМЫ
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      nationalId: true,
      terms: true
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const res = await fetch(`/api/invitations/${inviteCode}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone ? normalizePhone(formData.phone) : null,
          nationalId: formData.nationalId || null,
          nationalIdType: hasNationalId() ? region.nationalId?.name : null,
          regionCode: regionCode,
          moveInDate: formData.moveInDate,
          emergencyContact: formData.emergencyContact.trim() || null,
          emergencyPhone: formData.emergencyPhone ? normalizePhone(formData.emergencyPhone) : null,
          termsAccepted: formData.termsAccepted,
          privacyAccepted: formData.privacyAccepted,
          termsVersion: '1.0'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при сохранении данных')
      }

      setSubmitSuccess(true)
      
      setTimeout(() => {
        router.push('/tenant/dashboard')
      }, 2000)

    } catch (error) {
      setErrors({ 
        general: error instanceof Error ? error.message : 'Произошла ошибка. Попробуйте ещё раз.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // РЕНДЕРИНГ: СОСТОЯНИЯ
  // ============================================

  // Загрузка
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Загрузка приглашения...</p>
        </div>
      </div>
    )
  }

  // Ошибка загрузки
  if (errors.general && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => router.push('/')}
            >
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Успех
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Регистрация завершена!
            </h2>
            <p className="text-gray-600">
              Добро пожаловать в Flatro. Сейчас вы будете перенаправлены в личный кабинет.
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4 text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // РЕНДЕРИНГ: ФОРМА
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Flatro</h1>
          <p className="text-gray-600 mt-2">Завершение регистрации арендатора</p>
        </div>

        {/* Информация о приглашении */}
        {invitation && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Вы приглашены в:</strong> {invitation.propertyAddress}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Владелец: {invitation.ownerName}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Основная форма */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ваши данные
            </CardTitle>
            <CardDescription>
              Заполните информацию для создания профиля арендатора
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Общая ошибка */}
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              {/* Выбор региона */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Страна
                </Label>
                <RegionSelector
                  value={regionCode}
                  onChange={handleRegionChange}
                />
                <p className="text-xs text-gray-500">
                  Выбор страны влияет на формат телефона и документов
                </p>
              </div>

              {/* Имя и Фамилия */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Имя <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Введите имя"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    className={touched.firstName && errors.firstName ? 'border-red-500' : ''}
                  />
                  {touched.firstName && errors.firstName && (
                    <p className="text-red-500 text-sm">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Фамилия <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Введите фамилию"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    className={touched.lastName && errors.lastName ? 'border-red-500' : ''}
                  />
                  {touched.lastName && errors.lastName && (
                    <p className="text-red-500 text-sm">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Телефон */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Телефон
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={getPhonePlaceholder()}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={touched.phone && errors.phone ? 'border-red-500' : ''}
                />
                {touched.phone && errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
                <p className="text-xs text-gray-500">
                  Рекомендуется для связи по важным вопросам
                </p>
              </div>

              {/* Национальный ID (только если есть для региона) */}
              {hasNationalId() && (
                <div className="space-y-2">
                  <Label htmlFor="nationalId" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {getNationalIdLabel()}
                    <span className="text-gray-400 text-sm">(опционально)</span>
                  </Label>
                  <Input
                    id="nationalId"
                    placeholder={getNationalIdPlaceholder()}
                    maxLength={region.nationalId?.length || 20}
                    value={formData.nationalId}
                    onChange={(e) => handleChange('nationalId', e.target.value)}
                    onBlur={() => handleBlur('nationalId')}
                    className={touched.nationalId && errors.nationalId ? 'border-red-500' : ''}
                  />
                  {touched.nationalId && errors.nationalId && (
                    <p className="text-red-500 text-sm">{errors.nationalId}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {getNationalIdDescription()}
                  </p>
                </div>
              )}

              {/* Дата заселения */}
              <div className="space-y-2">
                <Label htmlFor="moveInDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Планируемая дата заселения
                </Label>
                <Input
                  id="moveInDate"
                  type="date"
                  value={formData.moveInDate}
                  onChange={(e) => handleChange('moveInDate', e.target.value)}
                />
              </div>

              {/* Экстренный контакт */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Контакт для экстренной связи (опционально)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">ФИО контакта</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="Имя Фамилия"
                      value={formData.emergencyContact}
                      onChange={(e) => handleChange('emergencyContact', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Телефон</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      placeholder={getPhonePlaceholder()}
                      value={formData.emergencyPhone}
                      onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Лицензионное соглашение */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Правовые документы <span className="text-red-500">*</span>
                </h3>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => 
                      handleChange('termsAccepted', checked as boolean)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Я прочитал(а) и принимаю{' '}
                    <Link 
                      href="/terms" 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      Пользовательское соглашение
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.privacyAccepted}
                    onCheckedChange={(checked) => 
                      handleChange('privacyAccepted', checked as boolean)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                    Я прочитал(а) и принимаю{' '}
                    <Link 
                      href="/privacy" 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      Политику конфиденциальности
                    </Link>
                    {' '}({region.legal.dataProtectionLaw})
                  </Label>
                </div>

                {touched.terms && errors.terms && (
                  <p className="text-red-500 text-sm">{errors.terms}</p>
                )}
              </div>

              {/* Кнопка отправки */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Завершить регистрацию'
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Нажимая кнопку, вы подтверждаете достоверность введённых данных
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
