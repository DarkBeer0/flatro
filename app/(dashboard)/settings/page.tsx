// app/(dashboard)/settings/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Bell, CreditCard, Shield, Globe, LogOut, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/context'
import { locales, localeNames, Locale } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const { t, locale, setLocale } = useLocale()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    nip: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // TODO: Save to API
    await new Promise(resolve => setTimeout(resolve, 500))
    setSaving(false)
    setSaved(true)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const tabs = [
    { id: 'profile', label: t.settings.profile, icon: User },
    { id: 'language', label: t.settings.language, icon: Globe },
    { id: 'notifications', label: t.settings.notifications, icon: Bell },
    { id: 'security', label: t.settings.security, icon: Shield },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.settings.title}</h1>
        <p className="text-gray-500 mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
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
              
              {/* Logout button */}
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
                      placeholder="Иван Петров"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t.settings.email}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ivan@example.com"
                    />
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
                    <Label htmlFor="company">{t.settings.company}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder={t.settings.companyPlaceholder}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nip">{t.settings.nip}</Label>
                    <Input
                      id="nip"
                      name="nip"
                      value={formData.nip}
                      onChange={handleChange}
                      placeholder="1234567890"
                    />
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