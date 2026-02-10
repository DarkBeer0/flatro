// app/(settings)/settings/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Bell, CreditCard, Shield, Globe, LogOut, Check, Loader2,
  AlertCircle, Home as HomeIcon, Users, ChevronDown, Building2,
  Phone, Mail, KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'
import { locales, localeNames, Locale } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null // для совместимости
  phone: string | null
  isOwner: boolean
  isTenant: boolean
  bankName: string | null
  iban: string | null
  accountHolder: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  nationalId: string | null
  nationalIdType: string | null
}

interface RolesInfo {
  isOwner: boolean
  isTenant: boolean
  canDisableOwner: boolean
  canDisableTenant: boolean
  ownedPropertiesCount: number
  hasActiveTenancy: boolean
}

interface TenantInfo {
  id: string
  firstName: string
  lastName: string
  property: {
    name: string
    address: string
    city: string
  } | null
  moveInDate: string | null
  isActive: boolean
}

// === Утилита: оповещаем сайдбар о смене ролей ===
function dispatchRolesChanged(isOwner: boolean, isTenant: boolean) {
  try {
    localStorage.setItem('flatro_user_roles', JSON.stringify({ isOwner, isTenant }))
  } catch {}
  window.dispatchEvent(new CustomEvent('roles-changed', {
    detail: { isOwner, isTenant }
  }))
}

function SettingsContent() {
  const router = useRouter()
  const { t, locale, setLocale } = useLocale()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  const [rolesInfo, setRolesInfo] = useState<RolesInfo | null>(null)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSaving, setRolesSaving] = useState(false)

  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bankName: '',
    iban: '',
    accountHolder: '',
    address: '',
    city: '',
    postalCode: '',
    nationalId: '',
    nationalIdType: 'PESEL',
  })

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const res = await fetch('/api/user')
      if (!res.ok) {
        setLoadError(res.status === 404
          ? 'Профиль не найден. Попробуйте войти заново.'
          : 'Не удалось загрузить данные профиля')
        setLoading(false)
        return
      }

      const data: UserData = await res.json()
      setUserData(data)
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        bankName: data.bankName || '',
        iban: data.iban || '',
        accountHolder: data.accountHolder || '',
        address: data.address || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        nationalId: data.nationalId || '',
        nationalIdType: data.nationalIdType || 'PESEL',
      })

      // Синхронизируем кэш ролей
      dispatchRolesChanged(data.isOwner, data.isTenant)

      // Параллельно загружаем роли и профиль жильца
      const promises: Promise<void>[] = [loadRolesInfo()]
      if (data.isTenant) promises.push(loadTenantInfo())
      await Promise.all(promises)
    } catch (error) {
      console.error('Error loading user data:', error)
      setLoadError('Ошибка подключения.')
    } finally {
      setLoading(false)
    }
  }

  const loadRolesInfo = async () => {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/user/roles')
      if (res.ok) setRolesInfo(await res.json())
    } catch {} finally { setRolesLoading(false) }
  }

  const loadTenantInfo = async () => {
    try {
      const res = await fetch('/api/tenant/profile')
      if (res.ok) {
        const data = await res.json()
        setTenantInfo(data)
      }
    } catch (error) {
      console.error('Error loading tenant info:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          bankName: formData.bankName,
          iban: formData.iban,
          accountHolder: formData.accountHolder,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          nationalId: formData.nationalId,
          nationalIdType: formData.nationalIdType,
        }),
      })
      if (res.ok) {
        const updatedData = await res.json()
        setUserData(updatedData)
        // Обновляем formData с новыми данными
        setFormData(prev => ({
          ...prev,
          firstName: updatedData.firstName || '',
          lastName: updatedData.lastName || '',
        }))
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const error = await res.json()
        alert(error.error || 'Не удалось сохранить')
      }
    } catch { alert('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  // === Переключение роли ===
  const handleToggleRole = async (role: 'owner' | 'tenant', enable: boolean) => {
    if (!rolesInfo) return
    setRolesSaving(true)
    setRolesError(null)
    try {
      const res = await fetch('/api/user/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableOwner: role === 'owner' ? enable : undefined,
          enableTenant: role === 'tenant' ? enable : undefined,
        }),
      })
      if (res.ok) {
        const newRoles = await res.json()
        setRolesInfo(newRoles)
        dispatchRolesChanged(newRoles.isOwner, newRoles.isTenant)
        if (userData) {
          setUserData({ ...userData, isOwner: newRoles.isOwner, isTenant: newRoles.isTenant })
        }
      } else {
        const error = await res.json()
        setRolesError(error.error || 'Ошибка')
      }
    } catch { setRolesError('Ошибка соединения') }
    finally { setRolesSaving(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch { setLoggingOut(false) }
  }

  // Маскирование email
  const maskEmail = (email: string) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (!domain) return email
    const visible = local.slice(0, 2)
    return `${visible}***@${domain}`
  }

  const tabs = [
    { id: 'profile', label: t.settings?.profile || 'Профиль', icon: User },
    { id: 'roles', label: 'Роли', icon: Users },
    { id: 'notifications', label: t.settings?.notifications || 'Уведомления', icon: Bell },
    { id: 'billing', label: t.settings?.billing || 'Платежи', icon: CreditCard },
    { id: 'security', label: t.settings?.security || 'Безопасность', icon: Shield },
    { id: 'language', label: t.settings?.language || 'Язык', icon: Globe },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{loadError}</p>
        <Button onClick={() => router.push('/login')}>Войти заново</Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.settings?.title || 'Настройки'}</h1>
        <p className="text-gray-500">{t.settings?.subtitle || 'Управление профилем и настройками аккаунта'}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Card className="p-2">
            {/* Mobile dropdown */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-full flex items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="font-medium">{tabs.find(t => t.id === activeTab)?.label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block space-y-1`}>
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                    {tab.label}
                  </button>
                )
              })}
              <div className="pt-2 mt-2 border-t">
                <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-red-600 hover:bg-red-50">
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {t.settings?.logout || 'Выйти'}
                </button>
              </div>
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings?.profileData || 'Данные профиля'}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings?.profileDataDesc || 'Обновите ваши личные данные'}</p>
              <div className="space-y-4">
                {/* Имя и Фамилия - отдельные поля */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Имя</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        id="firstName" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        placeholder="Введите имя" 
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input 
                      id="lastName" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleChange} 
                      placeholder="Введите фамилию" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t.settings?.email || 'Email'}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="email" value={maskEmail(formData.email)} disabled className="pl-10 bg-gray-50" />
                    </div>
                    <p className="text-xs text-gray-400">Email нельзя изменить</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t.settings?.phone || 'Телефон'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+48..." className="pl-10" />
                    </div>
                  </div>
                </div>
                {/* Персональные данные для договоров — только для владельцев */}
                {userData?.isOwner && (
                  <>
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Dane do umów</h3>
                      <p className="text-xs text-gray-500 mb-4">Te dane będą automatycznie wstawiane do generowanych umów najmu</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address">Adres zamieszkania</Label>
                      <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="ul. Przykładowa 10/5" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="postalCode">Kod pocztowy</Label>
                        <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="00-001" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city">Miasto</Label>
                        <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="Warszawa" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nationalIdType">Rodzaj dokumentu</Label>
                        <select
                          id="nationalIdType"
                          name="nationalIdType"
                          value={formData.nationalIdType}
                          onChange={(e) => { setFormData({ ...formData, nationalIdType: e.target.value }); setSaved(false) }}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PESEL">PESEL</option>
                          <option value="PASZPORT">Numer paszportu</option>
                          <option value="DOWOD">Numer dowodu osobistego</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nationalId">{formData.nationalIdType === 'PESEL' ? 'PESEL' : 'Numer dokumentu'}</Label>
                        <Input id="nationalId" name="nationalId" value={formData.nationalId} onChange={handleChange} placeholder={formData.nationalIdType === 'PESEL' ? '12345678901' : 'ABC123456'} />
                      </div>
                    </div>
                  </>
                )}
                {/* Банковские реквизиты - только для владельцев */}
                {userData?.isOwner && (
                  <>
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Банковские реквизиты</h3>
                      <p className="text-xs text-gray-500 mb-4">Для получения платежей от арендаторов</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName">Название банка</Label>
                        <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="PKO BP" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountHolder">Владелец счета</Label>
                        <Input id="accountHolder" name="accountHolder" value={formData.accountHolder} onChange={handleChange} placeholder="Имя Фамилия" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input id="iban" name="iban" value={formData.iban} onChange={handleChange} placeholder="PL..." />
                    </div>
                  </>
                )}

                <div className="pt-4 flex items-center gap-3">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t.common?.save || 'Сохранить'}
                  </Button>
                  {saved && (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" /> Сохранено
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Roles */}
          {activeTab === 'roles' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Роли пользователя</h2>
              <p className="text-sm text-gray-500 mb-6">Управление режимами использования приложения</p>

              {rolesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : rolesInfo ? (
                <div className="space-y-4">
                  {rolesError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> {rolesError}
                    </div>
                  )}

                  {/* Владелец */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg"><HomeIcon className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <p className="font-medium">Владелец недвижимости</p>
                        <p className="text-sm text-gray-500">Управление квартирами и арендаторами</p>
                        {rolesInfo.ownedPropertiesCount > 0 && (
                          <p className="text-xs text-gray-400 mt-1">Квартир: {rolesInfo.ownedPropertiesCount}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rolesInfo.isOwner && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Активно</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rolesSaving || (rolesInfo.isOwner && !rolesInfo.canDisableOwner)}
                        onClick={() => handleToggleRole('owner', !rolesInfo.isOwner)}
                      >
                        {rolesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : rolesInfo.isOwner ? 'Отключить' : 'Включить'}
                      </Button>
                    </div>
                  </div>

                  {/* Арендатор */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg"><Users className="h-5 w-5 text-green-600" /></div>
                      <div>
                        <p className="font-medium">Арендатор</p>
                        <p className="text-sm text-gray-500">Доступ к арендованным квартирам</p>
                        {rolesInfo.hasActiveTenancy && (
                          <p className="text-xs text-gray-400 mt-1">Активная аренда</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rolesInfo.isTenant && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Активно</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rolesSaving || (rolesInfo.isTenant && !rolesInfo.canDisableTenant)}
                        onClick={() => handleToggleRole('tenant', !rolesInfo.isTenant)}
                      >
                        {rolesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : rolesInfo.isTenant ? 'Отключить' : 'Включить'}
                      </Button>
                    </div>
                  </div>

                  {/* Tenant info */}
                  {rolesInfo.isTenant && tenantInfo && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Ваша аренда</h4>
                      {tenantInfo.property ? (
                        <div className="text-sm text-gray-600">
                          <p><strong>Квартира:</strong> {tenantInfo.property.name}</p>
                          <p><strong>Адрес:</strong> {tenantInfo.property.address}, {tenantInfo.property.city}</p>
                          {tenantInfo.moveInDate && (
                            <p><strong>Заселение:</strong> {new Date(tenantInfo.moveInDate).toLocaleDateString('ru-RU')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Нет активной аренды</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Не удалось загрузить информацию о ролях</p>
              )}
            </Card>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Уведомления</h2>
              <p className="text-sm text-gray-500 mb-6">Настройка email и push-уведомлений</p>
              <p className="text-gray-400 text-sm">Функционал в разработке</p>
            </Card>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Способы оплаты</h2>
              <p className="text-sm text-gray-500 mb-6">Управление картами и подписками</p>
              <p className="text-gray-400 text-sm">Функционал в разработке</p>
            </Card>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Безопасность</h2>
              <p className="text-sm text-gray-500 mb-6">Управление паролем и двухфакторной аутентификацией</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Пароль</p>
                      <p className="text-sm text-gray-500">Последнее изменение: неизвестно</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/forgot-password')}>
                    Изменить
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Language */}
          {activeTab === 'language' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Язык интерфейса</h2>
              <p className="text-sm text-gray-500 mb-6">Выберите предпочтительный язык</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {locales.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      locale === loc 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{localeNames[loc]}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}