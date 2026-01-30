// app/(dashboard)/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Bell, CreditCard, Shield, Globe, LogOut, Check, Loader2, AlertCircle, Home, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function SettingsPage() {
  const router = useRouter()
  const { t, locale, setLocale } = useLocale()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  
  // Состояния для управления ролями
  const [rolesInfo, setRolesInfo] = useState<RolesInfo | null>(null)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSaving, setRolesSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    iban: '',
    accountHolder: '',
  })

  useEffect(() => {
    loadUserData()
    loadRolesInfo()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const res = await fetch('/api/user')
      
      if (!res.ok) {
        if (res.status === 404) {
          setLoadError('Профиль не найден. Попробуйте войти заново.')
        } else {
          setLoadError('Не удалось загрузить данные профиля')
        }
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
    } catch (error) {
      console.error('Error loading user data:', error)
      setLoadError('Ошибка подключения. Проверьте интернет-соединение.')
    } finally {
      setLoading(false)
    }
  }

  const loadRolesInfo = async () => {
    setRolesLoading(true)
    setRolesError(null)

    try {
      const res = await fetch('/api/user/roles')
      if (res.ok) {
        const data = await res.json()
        setRolesInfo(data)
      }
    } catch (error) {
      console.error('Error loading roles info:', error)
    } finally {
      setRolesLoading(false)
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
        const updatedUser = await res.json()
        setUserData(updatedUser)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const error = await res.json()
        alert(error.error || 'Не удалось сохранить изменения')
      }
    } catch (error) {
      console.error('Error saving user data:', error)
      alert('Ошибка сохранения. Попробуйте позже.')
    } finally {
      setSaving(false)
    }
  }

  // Переключение роли
  const handleToggleRole = async (role: 'owner' | 'tenant', enable: boolean) => {
    if (!rolesInfo) return

    // Проверка: нельзя отключить обе роли
    if (!enable) {
      if (role === 'owner' && !rolesInfo.isTenant) {
        setRolesError('Нельзя отключить единственную активную роль')
        return
      }
      if (role === 'tenant' && !rolesInfo.isOwner) {
        setRolesError('Нельзя отключить единственную активную роль')
        return
      }
    }

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
        // Обновляем состояние
        setRolesInfo(prev => prev ? {
          ...prev,
          isOwner: data.isOwner,
          isTenant: data.isTenant,
        } : null)
        
        setUserData(prev => prev ? {
          ...prev,
          isOwner: data.isOwner,
          isTenant: data.isTenant,
        } : null)

        // Если отключили текущий режим, возможно нужен редирект
        if (role === 'owner' && !enable && !data.isTenant) {
          // Это не должно произойти, но на всякий случай
          router.push('/tenant/dashboard')
        }
      } else {
        setRolesError(data.error || 'Не удалось изменить роль')
      }
    } catch (error) {
      console.error('Error toggling role:', error)
      setRolesError('Ошибка сети. Попробуйте позже.')
    } finally {
      setRolesSaving(false)
      // Перезагружаем информацию о ролях
      loadRolesInfo()
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
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

  const tabs = [
    { id: 'profile', label: t.settings.profile, icon: User },
    { id: 'roles', label: 'Роли', icon: Users },
    { id: 'language', label: t.settings.language, icon: Globe },
    ...(userData?.isOwner ? [{ id: 'bank', label: 'Реквизиты', icon: CreditCard }] : []),
    { id: 'notifications', label: t.settings.notifications, icon: Bell },
    { id: 'security', label: t.settings.security, icon: Shield },
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
      <div className="w-full max-w-4xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Ошибка загрузки</h2>
          </div>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <div className="flex gap-3">
            <Button onClick={loadUserData}>Попробовать снова</Button>
            <Button variant="outline" onClick={handleLogout}>Выйти и войти заново</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.settings.title}</h1>
        <p className="text-gray-500 mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                    {tab.label}
                  </button>
                )
              })}
              
              <div className="pt-2 mt-2 border-t">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  {loggingOut ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  {t.settings.logout}
                </button>
              </div>
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings.profileData}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings.profileDataDesc}</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t.settings.name}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Введите имя"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t.settings.email}</Label>
                    <Input
                      id="email"
                      value={maskEmail(formData.email)}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">{t.settings.phone}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                  <div>
                    <Label>Активные роли</Label>
                    <div className="flex gap-2 mt-1">
                      {userData?.isOwner && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          Владелец
                        </span>
                      )}
                      {userData?.isTenant && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          Жилец
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.common.loading}
                      </>
                    ) : (
                      t.settings.saveChanges
                    )}
                  </Button>
                  {saved && (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      {t.settings.saved}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Roles Tab - НОВАЯ ВКЛАДКА */}
          {activeTab === 'roles' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Управление ролями</h2>
              <p className="text-sm text-gray-500 mb-6">
                Настройте какие функции вам доступны в системе
              </p>

              {rolesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {rolesError}
                </div>
              )}

              {rolesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : rolesInfo && (
                <div className="space-y-4">
                  {/* Роль владельца */}
                  <div className={`p-4 rounded-lg border-2 ${rolesInfo.isOwner ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${rolesInfo.isOwner ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <Home className={`h-5 w-5 ${rolesInfo.isOwner ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Режим владельца</h3>
                          <p className="text-sm text-gray-500">
                            Добавляйте квартиры, приглашайте жильцов, управляйте платежами
                          </p>
                          {rolesInfo.isOwner && rolesInfo.ownedPropertiesCount > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              У вас {rolesInfo.ownedPropertiesCount} объект(ов) недвижимости
                            </p>
                          )}
                          {!rolesInfo.canDisableOwner && rolesInfo.isOwner && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Нельзя отключить — есть активные квартиры
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRole('owner', !rolesInfo.isOwner)}
                        disabled={rolesSaving || (rolesInfo.isOwner && !rolesInfo.canDisableOwner) || (!rolesInfo.isOwner && !rolesInfo.isTenant)}
                        className="flex-shrink-0"
                      >
                        {rolesInfo.isOwner ? (
                          <ToggleRight className={`h-8 w-8 ${rolesInfo.canDisableOwner ? 'text-blue-600' : 'text-gray-300'}`} />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-300 hover:text-blue-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Роль жильца */}
                  <div className={`p-4 rounded-lg border-2 ${rolesInfo.isTenant ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${rolesInfo.isTenant ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Users className={`h-5 w-5 ${rolesInfo.isTenant ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Режим жильца</h3>
                          <p className="text-sm text-gray-500">
                            Просматривайте платежи, общайтесь с владельцем, создавайте заявки
                          </p>
                          {rolesInfo.hasActiveTenancy && (
                            <p className="text-xs text-green-600 mt-1">
                              Вы арендуете квартиру
                            </p>
                          )}
                          {!rolesInfo.canDisableTenant && rolesInfo.isTenant && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Нельзя отключить — есть активная аренда
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRole('tenant', !rolesInfo.isTenant)}
                        disabled={rolesSaving || (rolesInfo.isTenant && !rolesInfo.canDisableTenant) || (!rolesInfo.isTenant && !rolesInfo.isOwner)}
                        className="flex-shrink-0"
                      >
                        {rolesInfo.isTenant ? (
                          <ToggleRight className={`h-8 w-8 ${rolesInfo.canDisableTenant ? 'text-green-600' : 'text-gray-300'}`} />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-300 hover:text-green-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Подсказка */}
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                    <p className="font-medium mb-2">💡 Как это работает:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Вы можете включить <strong>обе роли</strong> одновременно</li>
                      <li>Нельзя отключить роль владельца если у вас есть квартиры</li>
                      <li>Нельзя отключить роль жильца если вы активно арендуете</li>
                      <li>Должна быть хотя бы одна активная роль</li>
                    </ul>
                  </div>

                  {/* Кнопки быстрого перехода */}
                  {rolesInfo.isOwner && rolesInfo.isTenant && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        className="flex-1"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Панель владельца
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/tenant/dashboard')}
                        className="flex-1"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Панель жильца
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Bank Details Tab */}
          {activeTab === 'bank' && userData?.isOwner && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Банковские реквизиты</h2>
              <p className="text-sm text-gray-500 mb-6">
                Эти данные будут показаны жильцам для оплаты аренды
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="bankName">Название банка</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="PKO Bank Polski"
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN / Номер счёта</Label>
                  <Input
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    placeholder="PL00 0000 0000 0000 0000 0000 0000"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolder">Получатель</Label>
                  <Input
                    id="accountHolder"
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleChange}
                    placeholder="Имя Фамилия или название компании"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить реквизиты'
                    )}
                  </Button>
                  {saved && (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Сохранено!
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings.language}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings.languageDesc}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                      locale === loc
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={locale === loc ? 'font-medium text-blue-700' : 'text-gray-700'}>
                      {localeNames[loc]}
                    </span>
                    {locale === loc && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings.notifications}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings.notificationsDesc}</p>

              <div className="space-y-4">
                <NotificationToggle
                  label={t.settings.emailPaymentReminders}
                  description={t.settings.emailPaymentRemindersDesc}
                  defaultChecked={true}
                />
                <NotificationToggle
                  label={t.settings.emailContractExpiry}
                  description={t.settings.emailContractExpiryDesc}
                  defaultChecked={true}
                />
                <NotificationToggle
                  label={t.settings.emailNewTenant}
                  description={t.settings.emailNewTenantDesc}
                  defaultChecked={false}
                />
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">{t.settings.security}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.settings.securityDesc}</p>

              <div className="space-y-4">
                <Button variant="outline">{t.settings.changePassword}</Button>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-red-600 mb-2">{t.settings.dangerZone}</h3>
                  <p className="text-sm text-gray-500 mb-3">{t.settings.deleteAccountDesc}</p>
                  <Button variant="destructive" size="sm">{t.settings.deleteAccount}</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationToggle({ 
  label, 
  description, 
  defaultChecked 
}: { 
  label: string
  description: string
  defaultChecked: boolean 
}) {
  const [checked, setChecked] = useState(defaultChecked)
  
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}
