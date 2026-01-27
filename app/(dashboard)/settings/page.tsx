'use client'

import { useState } from 'react'
import { User, Bell, CreditCard, Shield, Building2, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const [profile, setProfile] = useState({
    name: 'Jan Kowalski',
    email: 'jan.kowalski@email.com',
    phone: '+48 123 456 789',
    company: '',
    nip: '',
  })

  const [notifications, setNotifications] = useState({
    emailPaymentReminder: true,
    emailPaymentOverdue: true,
    emailContractExpiry: true,
    emailNewMessage: false,
    pushPaymentReminder: true,
    pushPaymentOverdue: true,
  })

  const [billing, setBilling] = useState({
    plan: 'starter',
    propertiesCount: 2,
    propertiesLimit: 3,
  })

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 3000)
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Powiadomienia', icon: Bell },
    { id: 'billing', label: 'Subskrypcja', icon: CreditCard },
    { id: 'security', label: 'Bezpieczenstwo', icon: Shield },
  ]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ustawienia</h1>
        <p className="text-gray-500 mt-1">Zarzadzaj swoim kontem i preferencjami</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
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
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Dane profilowe</h2>
                  <p className="text-sm text-gray-500">Zaktualizuj swoje dane osobowe</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Imie i nazwisko</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Nazwa firmy (opcjonalnie)</Label>
                  <Input
                    id="company"
                    name="company"
                    value={profile.company}
                    onChange={handleProfileChange}
                    placeholder="Dla faktur"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="nip">NIP (opcjonalnie)</Label>
                  <Input
                    id="nip"
                    name="nip"
                    value={profile.nip}
                    onChange={handleProfileChange}
                    placeholder="1234567890"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    'Zapisywanie...'
                  ) : showSaved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Zapisano
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Zapisz zmiany
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Powiadomienia</h2>
                  <p className="text-sm text-gray-500">Wybierz jakie powiadomienia chcesz otrzymywac</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Powiadomienia email</h3>
                  <div className="space-y-4">
                    <NotificationToggle
                      label="Przypomnienie o platnosci"
                      description="3 dni przed terminem platnosci"
                      checked={notifications.emailPaymentReminder}
                      onChange={() => handleNotificationChange('emailPaymentReminder')}
                    />
                    <NotificationToggle
                      label="Zalegla platnosc"
                      description="Gdy platnosc jest przeterminowana"
                      checked={notifications.emailPaymentOverdue}
                      onChange={() => handleNotificationChange('emailPaymentOverdue')}
                    />
                    <NotificationToggle
                      label="Wygasajaca umowa"
                      description="30 dni przed koncem umowy"
                      checked={notifications.emailContractExpiry}
                      onChange={() => handleNotificationChange('emailContractExpiry')}
                    />
                    <NotificationToggle
                      label="Nowa wiadomosc"
                      description="Gdy najemca wysle wiadomosc"
                      checked={notifications.emailNewMessage}
                      onChange={() => handleNotificationChange('emailNewMessage')}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-medium text-gray-900 mb-4">Powiadomienia push</h3>
                  <div className="space-y-4">
                    <NotificationToggle
                      label="Przypomnienie o platnosci"
                      description="Powiadomienie w przegladarce"
                      checked={notifications.pushPaymentReminder}
                      onChange={() => handleNotificationChange('pushPaymentReminder')}
                    />
                    <NotificationToggle
                      label="Zalegla platnosc"
                      description="Natychmiastowe powiadomienie"
                      checked={notifications.pushPaymentOverdue}
                      onChange={() => handleNotificationChange('pushPaymentOverdue')}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Zapisywanie...' : 'Zapisz preferencje'}
                </Button>
              </div>
            </Card>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Twoj plan</h2>
                    <p className="text-sm text-gray-500">Zarzadzaj subskrypcja</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Plan Starter</h3>
                      <p className="text-sm text-blue-700">
                        {billing.propertiesCount} z {billing.propertiesLimit} nieruchomosci
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">0 zl<span className="text-sm font-normal">/mies</span></p>
                  </div>
                  <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(billing.propertiesCount / billing.propertiesLimit) * 100}%` }}
                    />
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 mb-4">Dostepne plany</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PlanCard
                    name="Starter"
                    price="0"
                    features={['Do 3 nieruchomosci', 'Podstawowe funkcje', 'Email support']}
                    current={billing.plan === 'starter'}
                  />
                  <PlanCard
                    name="Growth"
                    price="49"
                    features={['Do 20 nieruchomosci', 'Wszystkie funkcje', 'Priorytetowy support', 'Eksport danych']}
                    current={billing.plan === 'growth'}
                    recommended
                  />
                  <PlanCard
                    name="Professional"
                    price="149"
                    features={['Do 100 nieruchomosci', 'API dostep', 'Dedykowany opiekun', 'Customizacja']}
                    current={billing.plan === 'professional'}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Bezpieczenstwo</h2>
                  <p className="text-sm text-gray-500">Zarzadzaj haslem i dostepem</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Zmiana hasla</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                    <div className="md:col-span-2">
                      <Label htmlFor="currentPassword">Obecne haslo</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="newPassword">Nowe haslo</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="confirmPassword">Potwierdz nowe haslo</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button className="mt-4">
                    Zmien haslo
                  </Button>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-medium text-gray-900 mb-4">Sesje</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Aktualnie zalogowany na 1 urzadzeniu
                  </p>
                  <Button variant="outline">
                    Wyloguj ze wszystkich urzadzen
                  </Button>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-medium text-red-600 mb-2">Strefa niebezpieczna</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Usuniecie konta jest nieodwracalne. Wszystkie dane zostana usuniete.
                  </p>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    Usun konto
                  </Button>
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
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function PlanCard({
  name,
  price,
  features,
  current,
  recommended,
}: {
  name: string
  price: string
  features: string[]
  current?: boolean
  recommended?: boolean
}) {
  return (
    <div className={`relative p-4 border-2 rounded-lg ${
      current ? 'border-blue-500 bg-blue-50' : recommended ? 'border-purple-300' : 'border-gray-200'
    }`}>
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            Polecany
          </span>
        </div>
      )}
      <h4 className="font-semibold text-gray-900">{name}</h4>
      <p className="text-2xl font-bold mt-2">
        {price} zl<span className="text-sm font-normal text-gray-500">/mies</span>
      </p>
      <ul className="mt-4 space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            {feature}
          </li>
        ))}
      </ul>
      <Button 
        className="w-full mt-4" 
        variant={current ? 'outline' : 'default'}
        disabled={current}
      >
        {current ? 'Aktualny plan' : 'Wybierz'}
      </Button>
    </div>
  )
}
