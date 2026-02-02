// app/(dashboard)/settings/page.tsx
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
  name: string | null
  phone: string | null
  isOwner: boolean
  isTenant: boolean
  bankName: string | null
  iban: string | null
  accountHolder: string | null
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

// === Утилита: оповещаем сайдбар о смене ролей (Баг 3 fix) ===
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
    name: '',
    email: '',
    phone: '',
    bankName: '',
    iban: '',
    accountHolder: '',
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
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bankName: data.bankName || '',
        iban: data.iban || '',
        accountHolder: data.accountHolder || '',
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
          name: formData.name,
          phone: formData.phone,
          bankName: formData.bankName,
          iban: formData.iban,
          accountHolder: formData.accountHolder,
        }),
      })
      if (res.ok) {
        setUserData(await res.json())
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const error = await res.json()
        alert(error.error || 'Не удалось сохранить')
      }
    } catch { alert('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  // === Переключение роли (Баги 3+4 fix) ===
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
      const data = await res.json()
      if (res.ok) {
        // Обновляем локальное состояние
        setRolesInfo(prev => prev ? { ...prev, isOwner: data.isOwner, isTenant: data.isTenant } : null)
        setUserData(prev => prev ? { ...prev, isOwner: data.isOwner, isTenant: data.isTenant } : null)

        // Баг 3 fix: мгновенно обновляем сайдбар
        dispatchRolesChanged(data.isOwner, data.isTenant)

        // Баг 4 fix: если отключили текущую роль — редирект
        const isOnOwnerPage = !window.location.pathname.startsWith('/tenant')
        const isOnTenantPage = window.location.pathname.startsWith('/tenant')

        if (!data.isOwner && isOnOwnerPage && data.isTenant) {
          // Отключили владельца, а мы на странице владельца → в панель арендатора
          setTimeout(() => router.push('/tenant/dashboard'), 300)
        } else if (!data.isTenant && isOnTenantPage && data.isOwner) {
          // Отключили арендатора, а мы на странице арендатора → в панель владельца
          setTimeout(() => router.push('/dashboard'), 300)
        }
      } else {
        setRolesError(data.error || 'Не удалось изменить роль')
      }
    } catch {
      setRolesError('Ошибка сети')
    } finally {
      setRolesSaving(false)
      loadRolesInfo()
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      localStorage.removeItem('pendingInviteCode')
      localStorage.removeItem('flatro_user_roles')
    } catch {}
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const maskEmail = (email: string) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (local.length <= 2) return email
    return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`
  }

  // Баг 2 fix: разделяем «disabled» и «active»
  // canToggle = false значит нельзя переключить, но визуально роль всё ещё активна
  const getOwnerCanToggle = (): boolean => {
    if (!rolesInfo || rolesSaving) return false
    if (!rolesInfo.isOwner) return true // Включить — всегда можно
    return rolesInfo.canDisableOwner && rolesInfo.isTenant
  }

  const getTenantCanToggle = (): boolean => {
    if (!rolesInfo || rolesSaving) return false
    if (!rolesInfo.isTenant) return true
    return rolesInfo.canDisableTenant && rolesInfo.isOwner
  }

  // Табы
  const tabs = [
    { id: 'profile', label: t.settings?.profile || 'Профиль', icon: User },
    ...(userData?.isTenant ? [{ id: 'housing', label: 'Моё жильё', icon: Building2 }] : []),
    { id: 'roles', label: 'Роли', icon: Users },
    ...(userData?.isOwner ? [{ id: 'bank', label: 'Реквизиты', icon: CreditCard }] : []),
    { id: 'language', label: t.settings?.language || 'Язык', icon: Globe },
    { id: 'notifications', label: t.settings?.notifications || 'Уведомления', icon: Bell },
    { id: 'security', label: t.settings?.security || 'Безопасность', icon: Shield },
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab)
  const switchTab = (id: string) => { setActiveTab(id); setMobileMenuOpen(false) }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Ошибка загрузки</h2>
          </div>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <div className="flex gap-3">
            <Button onClick={loadAllData}>Попробовать снова</Button>
            <Button variant="outline" onClick={handleLogout}>Выйти</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.settings?.title || 'Настройки'}</h1>
        <p className="text-gray-500 mt-1">{t.settings?.subtitle || 'Управление аккаунтом и предпочтениями'}</p>
        {userData && (userData.isOwner || userData.isTenant) && (
          <div className="flex gap-2 mt-3">
            {userData.isOwner && <Badge className="bg-blue-100 text-blue-700">Владелец</Badge>}
            {userData.isTenant && <Badge className="bg-green-100 text-green-700">Арендатор</Badge>}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile dropdown */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {activeTabData && <activeTabData.icon className="h-5 w-5 text-blue-600" />}
              <span className="font-medium text-gray-900">{activeTabData?.label}</span>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {tab.label}
                      {isActive && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                    </button>
                  )
                })}
                <div className="border-t">
                  <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50">
                    {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                    {t.settings?.logout || 'Выйти'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:w-56 flex-shrink-0">
          <Card className="p-2 sticky top-8">
            <nav className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t.settings?.name || 'Имя и фамилия'}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Ваше имя" className="pl-10" />
                    </div>
                  </div>
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
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+48 123 456 789" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Активные роли</Label>
                    <div className="flex gap-2 mt-1.5">
                      {userData?.isOwner && <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium">Владелец</span>}
                      {userData?.isTenant && <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">Арендатор</span>}
                      {!userData?.isOwner && !userData?.isTenant && <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">Нет ролей</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : (t.settings?.saveChanges || 'Сохранить изменения')}
                  </Button>
                  {saved && <span className="text-green-600 text-sm flex items-center gap-1"><Check className="h-4 w-4" />{t.settings?.saved || 'Сохранено!'}</span>}
                </div>
              </div>
            </Card>
          )}

          {/* Housing (tenant) */}
          {activeTab === 'housing' && userData?.isTenant && (
            <div className="space-y-4">
              {tenantInfo?.property ? (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-1">Моё жильё</h2>
                  <p className="text-sm text-gray-500 mb-5">Информация о вашей текущей квартире</p>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg">{tenantInfo.property.name}</h3>
                        <p className="text-gray-600 mt-0.5">{tenantInfo.property.address}</p>
                        <p className="text-gray-500 text-sm">{tenantInfo.property.city}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge className={tenantInfo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {tenantInfo.isActive ? 'Активный арендатор' : 'Неактивный'}
                          </Badge>
                          {tenantInfo.moveInDate && (
                            <span className="text-sm text-gray-500">Заселение: {new Date(tenantInfo.moveInDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                    <button onClick={() => router.push('/tenant/payments')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div><p className="font-medium text-gray-900 text-sm">Мои платежи</p><p className="text-xs text-gray-500">Просмотр и оплата</p></div>
                    </button>
                    <button onClick={() => router.push('/tenant/tickets')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <div><p className="font-medium text-gray-900 text-sm">Заявки</p><p className="text-xs text-gray-500">Сообщить о проблеме</p></div>
                    </button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1">Нет активного жилья</h3>
                  <p className="text-sm text-gray-500">Вас ещё не добавили в квартиру.</p>
                </Card>
              )}
            </div>
          )}

          {/* Roles — Баг 2 fix: toggle всегда цветной если роль активна */}
          {activeTab === 'roles' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Управление ролями</h2>
              <p className="text-sm text-gray-500 mb-6">Настройте какие функции вам доступны</p>

              {rolesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{rolesError}
                </div>
              )}

              {rolesInfo && !rolesInfo.isOwner && !rolesInfo.isTenant && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-yellow-800 text-sm">
                  ⚠️ Нет активных ролей. Включите хотя бы одну.
                </div>
              )}

              {rolesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
              ) : rolesInfo && (
                <div className="space-y-4">
                  {/* Owner */}
                  <div className={`p-4 rounded-xl border-2 transition-colors ${rolesInfo.isOwner ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${rolesInfo.isOwner ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <HomeIcon className={`h-5 w-5 ${rolesInfo.isOwner ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Режим владельца</h3>
                          <p className="text-sm text-gray-500">Квартиры, жильцы, платежи, договоры</p>
                          {rolesInfo.isOwner && rolesInfo.ownedPropertiesCount > 0 && (
                            <p className="text-xs text-blue-600 mt-1">{rolesInfo.ownedPropertiesCount} объект(ов)</p>
                          )}
                          {rolesInfo.isOwner && !getOwnerCanToggle() && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ {!rolesInfo.canDisableOwner ? 'Нельзя отключить — есть квартиры' : 'Единственная роль'}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Баг 2 fix: switch-стиль toggle вместо ToggleLeft/Right */}
                      <button
                        onClick={() => handleToggleRole('owner', !rolesInfo.isOwner)}
                        disabled={!getOwnerCanToggle()}
                        className="flex-shrink-0"
                        aria-label={rolesInfo.isOwner ? 'Отключить владельца' : 'Включить владельца'}
                      >
                        <div className={`
                          relative w-12 h-7 rounded-full transition-colors
                          ${rolesInfo.isOwner
                            ? (getOwnerCanToggle() ? 'bg-blue-600' : 'bg-blue-400')
                            : (getOwnerCanToggle() ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200')
                          }
                          ${!getOwnerCanToggle() ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                        `}>
                          <span className={`
                            absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                            ${rolesInfo.isOwner ? 'translate-x-5' : ''}
                          `} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Tenant */}
                  <div className={`p-4 rounded-xl border-2 transition-colors ${rolesInfo.isTenant ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${rolesInfo.isTenant ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Users className={`h-5 w-5 ${rolesInfo.isTenant ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Режим арендатора</h3>
                          <p className="text-sm text-gray-500">Платежи, сообщения, заявки</p>
                          {rolesInfo.hasActiveTenancy && (
                            <p className="text-xs text-green-600 mt-1">Активная аренда</p>
                          )}
                          {rolesInfo.isTenant && !getTenantCanToggle() && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ {!rolesInfo.canDisableTenant ? 'Нельзя отключить — активная аренда' : 'Единственная роль'}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRole('tenant', !rolesInfo.isTenant)}
                        disabled={!getTenantCanToggle()}
                        className="flex-shrink-0"
                        aria-label={rolesInfo.isTenant ? 'Отключить арендатора' : 'Включить арендатора'}
                      >
                        <div className={`
                          relative w-12 h-7 rounded-full transition-colors
                          ${rolesInfo.isTenant
                            ? (getTenantCanToggle() ? 'bg-green-600' : 'bg-green-400')
                            : (getTenantCanToggle() ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200')
                          }
                          ${!getTenantCanToggle() ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                        `}>
                          <span className={`
                            absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                            ${rolesInfo.isTenant ? 'translate-x-5' : ''}
                          `} />
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p className="font-medium mb-2">💡 Как это работает:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-500">
                      <li>Можно включить <strong>обе роли</strong> одновременно</li>
                      <li>Нельзя отключить роль с активными данными</li>
                      <li>Должна быть хотя бы одна активная роль</li>
                    </ul>
                  </div>

                  {rolesInfo.isOwner && rolesInfo.isTenant && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1">
                        <HomeIcon className="h-4 w-4 mr-2" />Панель владельца
                      </Button>
                      <Button variant="outline" onClick={() => router.push('/tenant/dashboard')} className="flex-1">
                        <Users className="h-4 w-4 mr-2" />Панель арендатора
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Bank */}
          {activeTab === 'bank' && userData?.isOwner && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Банковские реквизиты</h2>
              <p className="text-sm text-gray-500 mb-6">Эти данные будут показаны жильцам для оплаты</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bankName">Название банка</Label>
                  <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="PKO Bank Polski" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iban">IBAN / Номер счёта</Label>
                  <Input id="iban" name="iban" value={formData.iban} onChange={handleChange} placeholder="PL00 0000 0000 0000 0000 0000 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountHolder">Получатель</Label>
                  <Input id="accountHolder" name="accountHolder" value={formData.accountHolder} onChange={handleChange} placeholder="Имя Фамилия или компания" />
                </div>
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить реквизиты'}
                  </Button>
                  {saved && <span className="text-green-600 text-sm flex items-center gap-1"><Check className="h-4 w-4" />Сохранено!</span>}
                </div>
              </div>
            </Card>
          )}

          {/* Language */}
          {activeTab === 'language' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings?.language || 'Язык'}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings?.languageDesc || 'Выберите язык интерфейса'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      locale === loc ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={locale === loc ? 'font-medium text-blue-700' : 'text-gray-700'}>{localeNames[loc]}</span>
                    {locale === loc && <Check className="h-5 w-5 text-blue-600" />}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings?.notifications || 'Уведомления'}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings?.notificationsDesc || 'Настройте уведомления'}</p>
              <div className="space-y-3">
                <NotificationToggle label={t.settings?.emailPaymentReminders || 'Напоминания о платежах'} description={t.settings?.emailPaymentRemindersDesc || 'О предстоящих платежах'} defaultChecked={true} />
                <NotificationToggle label={t.settings?.emailContractExpiry || 'Окончание договора'} description={t.settings?.emailContractExpiryDesc || 'За 30 дней до окончания'} defaultChecked={true} />
                {userData?.isOwner && (
                  <NotificationToggle label={t.settings?.emailNewTenant || 'Новый арендатор'} description={t.settings?.emailNewTenantDesc || 'При регистрации'} defaultChecked={false} />
                )}
              </div>
            </Card>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings?.security || 'Безопасность'}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings?.securityDesc || 'Пароль и безопасность'}</p>
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><KeyRound className="h-5 w-5 text-gray-600" /></div>
                  <div className="flex-1"><p className="font-medium text-gray-900">Пароль</p><p className="text-sm text-gray-500">Последнее изменение неизвестно</p></div>
                  <Button variant="outline" size="sm">{t.settings?.changePassword || 'Изменить'}</Button>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-red-600 mb-2">{t.settings?.dangerZone || 'Опасная зона'}</h3>
                  <p className="text-sm text-gray-500 mb-3">{t.settings?.deleteAccountDesc || 'Удаление аккаунта необратимо'}</p>
                  <Button variant="destructive" size="sm">{t.settings?.deleteAccount || 'Удалить аккаунт'}</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl">
      <div><p className="font-medium text-gray-900">{label}</p><p className="text-sm text-gray-500">{description}</p></div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}