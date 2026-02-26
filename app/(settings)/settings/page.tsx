// app/(settings)/settings/page.tsx
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Bell, CreditCard, Shield, Globe, LogOut, Check, Loader2,
  AlertCircle, Home as HomeIcon, Users, ChevronDown, Building2,
  Phone, Mail, KeyRound, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'
import { locales, localeNames, Locale } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import BillingTab from '@/components/settings/billing-tab'
import NotificationsTab from '@/components/settings/notifications-tab'
import { StripeConnectTab } from '@/components/settings/stripe-connect-tab'
import { useRegion } from '@/lib/regions/useRegion'
import type { RegionCode } from '@/lib/regions/config'
// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
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
  regionCode?: string
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

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  nationalId?: string
  iban?: string
  postalCode?: string
  accountHolder?: string
  address?: string
  city?: string
}

// ═══════════════════════════════════════════════════════════════
// IBAN VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  if (cleaned.length < 15 || cleaned.length > 34) return false
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false

  // Move first 4 chars to end, convert letters to numbers (A=10, B=11...)
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))

  // Modulo 97 check (handle big number via chunks)
  let remainder = ''
  for (const digit of numeric) {
    remainder += digit
    const val = parseInt(remainder, 10)
    remainder = String(val % 97)
  }
  return parseInt(remainder, 10) === 1
}

function formatIBAN(value: string): string {
  const cleaned = value.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Insert space every 4 characters
  return cleaned.replace(/(.{4})/g, '$1 ').trim()
}

// ═══════════════════════════════════════════════════════════════
// POSTAL CODE VALIDATION BY REGION
// ═══════════════════════════════════════════════════════════════

const POSTAL_CODE_PATTERNS: Record<string, { pattern: RegExp; format: string; placeholder: string }> = {
  PL: { pattern: /^\d{2}-\d{3}$/, format: 'XX-XXX', placeholder: '00-000' },
  DE: { pattern: /^\d{5}$/, format: 'XXXXX', placeholder: '10115' },
  UA: { pattern: /^\d{5}$/, format: 'XXXXX', placeholder: '01001' },
  CZ: { pattern: /^\d{3}\s?\d{2}$/, format: 'XXX XX', placeholder: '110 00' },
  SK: { pattern: /^\d{3}\s?\d{2}$/, format: 'XXX XX', placeholder: '811 01' },
  LT: { pattern: /^LT-\d{5}$/, format: 'LT-XXXXX', placeholder: 'LT-01001' },
  LV: { pattern: /^LV-\d{4}$/, format: 'LV-XXXX', placeholder: 'LV-1001' },
  EE: { pattern: /^\d{5}$/, format: 'XXXXX', placeholder: '10111' },
}

function formatPostalCode(value: string, regionCode: string): string {
  if (regionCode === 'PL') {
    const digits = value.replace(/\D/g, '').slice(0, 5)
    if (digits.length > 2) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return digits
  }
  if (regionCode === 'LT') {
    const digits = value.replace(/[^0-9LT-]/gi, '').slice(0, 8)
    if (!digits.startsWith('LT-') && digits.length > 0) {
      const nums = value.replace(/\D/g, '').slice(0, 5)
      return `LT-${nums}`
    }
    return digits.toUpperCase()
  }
  if (regionCode === 'LV') {
    const digits = value.replace(/[^0-9LV-]/gi, '').slice(0, 7)
    if (!digits.startsWith('LV-') && digits.length > 0) {
      const nums = value.replace(/\D/g, '').slice(0, 4)
      return `LV-${nums}`
    }
    return digits.toUpperCase()
  }
  return value
}

// ═══════════════════════════════════════════════════════════════
// ROLES UTIL
// ═══════════════════════════════════════════════════════════════

function dispatchRolesChanged(isOwner: boolean, isTenant: boolean) {
  try {
    localStorage.setItem('flatro_user_roles', JSON.stringify({ isOwner, isTenant }))
  } catch {}
  window.dispatchEvent(new CustomEvent('roles-changed', {
    detail: { isOwner, isTenant }
  }))
}

// ═══════════════════════════════════════════════════════════════
// FIELD ERROR COMPONENT
// ═══════════════════════════════════════════════════════════════

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

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

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Region hook — используем регион пользователя
  const {
    region,
    regionCode,
    setRegionCode,
    validatePhone: regionValidatePhone,
    validateNationalId: regionValidateNationalId,
    formatPhone: regionFormatPhone,
    getPhonePlaceholder,
    getNationalIdLabel,
    getNationalIdPlaceholder,
    getNationalIdDescription,
    hasNationalId,
  } = useRegion((userData?.regionCode as RegionCode) || 'PL')

  // Sync region when user data loads
  useEffect(() => {
    if (userData?.regionCode) {
      setRegionCode(userData.regionCode as RegionCode)
    }
  }, [userData?.regionCode, setRegionCode])

  // ── Tab from URL ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['profile', 'roles', 'notifications', 'billing', 'stripe', 'security', 'language'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  // ── Load data ─────────────────────────────────────────────────
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

      dispatchRolesChanged(data.isOwner, data.isTenant)

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

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════

  const validateField = useCallback((name: string, value: string): string | undefined => {
    const v = value.trim()

    switch (name) {
      case 'firstName':
        if (v && v.length < 2) return 'Imię musi mieć co najmniej 2 znaki'
        if (v && !/^[\p{L}\s-]+$/u.test(v)) return 'Imię może zawierać tylko litery, spacje i myślniki'
        if (v && v.length > 50) return 'Imię nie może być dłuższe niż 50 znaków'
        return undefined

      case 'lastName':
        if (v && v.length < 2) return 'Nazwisko musi mieć co najmniej 2 znaki'
        if (v && !/^[\p{L}\s-]+$/u.test(v)) return 'Nazwisko może zawierać tylko litery, spacje i myślniki'
        if (v && v.length > 50) return 'Nazwisko nie może być dłuższe niż 50 znaków'
        return undefined

      case 'phone':
        if (v && !regionValidatePhone(v)) {
          return `Nieprawidłowy numer telefonu. Format: ${region.phone.format}`
        }
        return undefined

      case 'nationalId':
        if (v && hasNationalId() && !regionValidateNationalId(v)) {
          return `Nieprawidłowy ${getNationalIdLabel()}`
        }
        return undefined

      case 'iban':
        if (v) {
          const cleaned = v.replace(/\s/g, '')
          if (cleaned.length < 15) return 'IBAN jest za krótki'
          if (cleaned.length > 34) return 'IBAN jest za długi'
          if (!validateIBAN(v)) return 'Nieprawidłowy numer IBAN (sprawdź sumę kontrolną)'
        }
        return undefined

      case 'postalCode': {
        if (!v) return undefined
        const postalCfg = POSTAL_CODE_PATTERNS[regionCode]
        if (postalCfg && !postalCfg.pattern.test(v)) {
          return `Nieprawidłowy kod pocztowy. Format: ${postalCfg.format}`
        }
        return undefined
      }

      case 'accountHolder':
        if (v && v.length < 3) return 'Wpisz pełne imię i nazwisko właściciela konta'
        if (v && !/^[\p{L}\s.-]+$/u.test(v)) return 'Nazwa właściciela może zawierać tylko litery'
        return undefined

      case 'address':
        if (v && v.length < 5) return 'Adres jest za krótki'
        return undefined

      case 'city':
        if (v && v.length < 2) return 'Nazwa miasta musi mieć co najmniej 2 znaki'
        if (v && !/^[\p{L}\s-]+$/u.test(v)) return 'Nazwa miasta może zawierać tylko litery'
        return undefined

      default:
        return undefined
    }
  }, [regionValidatePhone, regionValidateNationalId, region, regionCode, hasNationalId, getNationalIdLabel])

  const validateAllFields = useCallback((): boolean => {
    const fieldsToValidate = ['firstName', 'lastName', 'phone']
    if (userData?.isOwner) {
      fieldsToValidate.push('nationalId', 'iban', 'postalCode', 'accountHolder', 'address', 'city')
    }

    const newErrors: FormErrors = {}
    let hasErrors = false

    for (const field of fieldsToValidate) {
      const error = validateField(field, formData[field as keyof typeof formData] || '')
      if (error) {
        newErrors[field as keyof FormErrors] = error
        hasErrors = true
      }
    }

    setErrors(newErrors)
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    fieldsToValidate.forEach(f => { allTouched[f] = true })
    setTouched(prev => ({ ...prev, ...allTouched }))

    return !hasErrors
  }, [formData, userData, validateField])

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let processedValue = value

    // Auto-format specific fields
    if (name === 'phone') {
      processedValue = regionFormatPhone(value)
    } else if (name === 'iban') {
      processedValue = formatIBAN(value)
    } else if (name === 'postalCode') {
      processedValue = formatPostalCode(value, regionCode)
    } else if (name === 'nationalId' && hasNationalId()) {
      const maxLen = region.nationalId?.length || 20
      processedValue = value.replace(/[^\d]/g, '').slice(0, maxLen)
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }))
    setSaved(false)

    // Clear error on change if field was touched
    if (touched[name]) {
      const error = validateField(name, processedValue)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, formData[name as keyof typeof formData] || '')
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSave = async () => {
    if (!validateAllFields()) return

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
          iban: formData.iban.replace(/\s/g, ''), // Отправляем без пробелов
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
        setFormData(prev => ({
          ...prev,
          firstName: updatedData.firstName || '',
          lastName: updatedData.lastName || '',
        }))
        setSaved(true)
        setErrors({})
        setTimeout(() => setSaved(false), 3000)
      } else {
        const errorData = await res.json()
        // Показываем серверные ошибки валидации
        if (errorData.field && errorData.error) {
          setErrors(prev => ({ ...prev, [errorData.field]: errorData.error }))
        } else {
          alert(errorData.error || 'Nie udało się zapisać')
        }
      }
    } catch { alert('Błąd połączenia') }
    finally { setSaving(false) }
  }

  // ── Toggle role ───────────────────────────────────────────────
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
        setRolesError(error.error || 'Błąd')
      }
    } catch { setRolesError('Błąd połączenia') }
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

  const maskEmail = (email: string) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (!domain) return email
    const visible = local.slice(0, 2)
    return `${visible}***@${domain}`
  }

  // ═══════════════════════════════════════════════════════════════
  // TABS CONFIG
  // ═══════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'profile', label: t.settings?.profile || 'Profil', icon: User },
    { id: 'roles', label: 'Role', icon: Users },
    { id: 'notifications', label: t.settings?.notifications || 'Powiadomienia', icon: Bell },
    { id: 'billing', label: t.settings?.billing || 'Subskrypcja', icon: CreditCard },
    // Stripe Connect — только для владельцев
    ...(userData?.isOwner ? [{ id: 'stripe', label: 'Stripe Connect', icon: CreditCard }] : []),
    { id: 'security', label: t.settings?.security || 'Bezpieczeństwo', icon: Shield },
    { id: 'language', label: t.settings?.language || 'Język', icon: Globe },
  ]

  // ═══════════════════════════════════════════════════════════════
  // LOADING / ERROR
  // ═══════════════════════════════════════════════════════════════

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
        <Button onClick={() => router.push('/login')}>Zaloguj się ponownie</Button>
      </div>
    )
  }

  const hasErrors = Object.values(errors).some(Boolean)

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.settings?.title || 'Ustawienia'}</h1>
        <p className="text-gray-500">{t.settings?.subtitle || 'Zarządzaj profilem i preferencjami'}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Sidebar ──────────────────────────────────────── */}
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

            {/* Tab items */}
            <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}

              {/* Logout */}
              <div className="border-t mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {t.settings?.logout || 'Wyloguj się'}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* ═══ Profile Tab ═══════════════════════════════════ */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">
                {t.settings?.profileData || 'Dane profilu'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {t.settings?.profileDataDesc || 'Zaktualizuj swoje dane osobowe'}
              </p>

              <div className="space-y-4">
                {/* Имя / Фамилия */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Imię</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('firstName')}
                        placeholder="Wpisz imię"
                        className={`pl-10 ${touched.firstName && errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={50}
                      />
                    </div>
                    <FieldError error={touched.firstName ? errors.firstName : undefined} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nazwisko</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('lastName')}
                      placeholder="Wpisz nazwisko"
                      className={touched.lastName && errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      maxLength={50}
                    />
                    <FieldError error={touched.lastName ? errors.lastName : undefined} />
                  </div>
                </div>

                {/* Email / Телефон */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t.settings?.email || 'Email'}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="email" value={maskEmail(formData.email)} disabled className="pl-10 bg-gray-50" />
                    </div>
                    <p className="text-xs text-gray-400">Email nie można zmienić</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t.settings?.phone || 'Telefon'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={() => handleBlur('phone')}
                        placeholder={getPhonePlaceholder()}
                        className={`pl-10 ${touched.phone && errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                    </div>
                    <FieldError error={touched.phone ? errors.phone : undefined} />
                  </div>
                </div>

                {/* ── Dane do umów (Owner only) ──────────────── */}
                {userData?.isOwner && (
                  <>
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Dane do umów</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Te dane będą automatycznie wstawiane do generowanych umów najmu
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address">Adres zamieszkania</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        onBlur={() => handleBlur('address')}
                        placeholder="ul. Przykładowa 12/3"
                        className={touched.address && errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      <FieldError error={touched.address ? errors.address : undefined} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city">Miasto</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          onBlur={() => handleBlur('city')}
                          placeholder="Warszawa"
                          className={touched.city && errors.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        <FieldError error={touched.city ? errors.city : undefined} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="postalCode">Kod pocztowy</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          onBlur={() => handleBlur('postalCode')}
                          placeholder={POSTAL_CODE_PATTERNS[regionCode]?.placeholder || '00-000'}
                          className={touched.postalCode && errors.postalCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        <FieldError error={touched.postalCode ? errors.postalCode : undefined} />
                      </div>
                    </div>

                    {/* National ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nationalIdType">Typ dokumentu</Label>
                        <select
                          id="nationalIdType"
                          name="nationalIdType"
                          value={formData.nationalIdType}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, nationalIdType: e.target.value, nationalId: '' }))
                            setErrors(prev => ({ ...prev, nationalId: undefined }))
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {hasNationalId() && (
                            <option value={region.nationalId?.name}>{getNationalIdLabel()}</option>
                          )}
                          <option value="PASSPORT">Paszport</option>
                          <option value="ID_CARD">Dowód osobisty</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nationalId">
                          {formData.nationalIdType === region.nationalId?.name
                            ? getNationalIdLabel()
                            : 'Numer dokumentu'}
                        </Label>
                        <Input
                          id="nationalId"
                          name="nationalId"
                          value={formData.nationalId}
                          onChange={handleChange}
                          onBlur={() => handleBlur('nationalId')}
                          placeholder={
                            formData.nationalIdType === region.nationalId?.name
                              ? getNationalIdPlaceholder()
                              : 'ABC123456'
                          }
                          className={touched.nationalId && errors.nationalId ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          maxLength={formData.nationalIdType === region.nationalId?.name ? (region.nationalId?.length || 20) : 20}
                        />
                        <FieldError error={touched.nationalId ? errors.nationalId : undefined} />
                        {formData.nationalIdType === region.nationalId?.name && (
                          <p className="text-xs text-gray-400">{getNationalIdDescription()}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Банковские реквизиты (Owner only) ──────── */}
                {userData?.isOwner && (
                  <>
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Dane bankowe</h3>
                      <p className="text-xs text-gray-500 mb-4">Dla otrzymywania płatności od najemców</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName">Nazwa banku</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleChange}
                          placeholder="PKO BP"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountHolder">Właściciel konta</Label>
                        <Input
                          id="accountHolder"
                          name="accountHolder"
                          value={formData.accountHolder}
                          onChange={handleChange}
                          onBlur={() => handleBlur('accountHolder')}
                          placeholder="Imię Nazwisko"
                          className={touched.accountHolder && errors.accountHolder ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        <FieldError error={touched.accountHolder ? errors.accountHolder : undefined} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input
                        id="iban"
                        name="iban"
                        value={formData.iban}
                        onChange={handleChange}
                        onBlur={() => handleBlur('iban')}
                        placeholder="PL61 1090 1014 0000 0712 1981 2874"
                        className={`font-mono ${touched.iban && errors.iban ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={42} // 34 chars + 8 spaces
                      />
                      <FieldError error={touched.iban ? errors.iban : undefined} />
                    </div>
                  </>
                )}

                {/* ── Save button ────────────────────────────── */}
                <div className="pt-4 flex items-center gap-3">
                  <Button onClick={handleSave} disabled={saving || hasErrors}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t.common?.save || 'Zapisz'}
                  </Button>
                  {saved && (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" /> Zapisano
                    </span>
                  )}
                  {hasErrors && (
                    <span className="text-red-500 text-sm flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Popraw błędy w formularzu
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ═══ Roles Tab ═════════════════════════════════════ */}
          {activeTab === 'roles' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Role użytkownika</h2>
              <p className="text-sm text-gray-500 mb-6">Zarządzanie trybami korzystania z aplikacji</p>

              {rolesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : rolesInfo ? (
                <div className="space-y-6">
                  {rolesError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {rolesError}
                    </div>
                  )}

                  {/* Owner role */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HomeIcon className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Właściciel</p>
                        <p className="text-sm text-gray-500">
                          Zarządzaj nieruchomościami i najemcami
                          {rolesInfo.ownedPropertiesCount > 0 && (
                            <span className="ml-1">({rolesInfo.ownedPropertiesCount} nieruchomości)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={rolesInfo.isOwner ? 'outline' : 'default'}
                      size="sm"
                      disabled={rolesSaving || (rolesInfo.isOwner && !rolesInfo.canDisableOwner)}
                      onClick={() => handleToggleRole('owner', !rolesInfo.isOwner)}
                    >
                      {rolesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : rolesInfo.isOwner ? 'Wyłącz' : 'Włącz'}
                    </Button>
                  </div>

                  {/* Tenant role */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Najemca</p>
                        <p className="text-sm text-gray-500">
                          Zarządzaj płatnościami i zgłoszeniami
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={rolesInfo.isTenant ? 'outline' : 'default'}
                      size="sm"
                      disabled={rolesSaving || (rolesInfo.isTenant && !rolesInfo.canDisableTenant)}
                      onClick={() => handleToggleRole('tenant', !rolesInfo.isTenant)}
                    >
                      {rolesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : rolesInfo.isTenant ? 'Wyłącz' : 'Włącz'}
                    </Button>
                  </div>

                  {/* Tenant info */}
                  {rolesInfo.isTenant && tenantInfo && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Twój najem</h4>
                      {tenantInfo.property ? (
                        <div className="text-sm text-gray-600">
                          <p><strong>Mieszkanie:</strong> {tenantInfo.property.name}</p>
                          <p><strong>Adres:</strong> {tenantInfo.property.address}, {tenantInfo.property.city}</p>
                          {tenantInfo.moveInDate && (
                            <p><strong>Data zameldowania:</strong> {new Date(tenantInfo.moveInDate).toLocaleDateString('pl-PL')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Brak aktywnego najmu</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Nie udało się załadować informacji o rolach</p>
              )}
            </Card>
          )}

          {/* ═══ Notifications Tab ═════════════════════════════ */}
          {activeTab === 'notifications' && <NotificationsTab />}

          {/* ═══ Billing Tab ═══════════════════════════════════ */}
          {activeTab === 'billing' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t.settings?.billing || 'Subskrypcja'}
              </h2>
              <BillingTab />
            </Card>
          )}

          {/* ═══ Stripe Connect Tab (Owner only) ══════════════ */}
          {activeTab === 'stripe' && userData?.isOwner && (
            <StripeConnectTab />
          )}

          {/* ═══ Security Tab ═════════════════════════════════ */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Bezpieczeństwo</h2>
              <p className="text-sm text-gray-500 mb-6">Zarządzanie hasłem i uwierzytelnianiem dwuskładnikowym</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Hasło</p>
                      <p className="text-sm text-gray-500">Ostatnia zmiana: nieznana</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/forgot-password')}>
                    Zmień
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ═══ Language Tab ═════════════════════════════════ */}
          {activeTab === 'language' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-1">Język interfejsu</h2>
              <p className="text-sm text-gray-500 mb-6">Wybierz preferowany język</p>
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
                    <span className="font-medium">{localeNames[loc]}</span>
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

// ═══════════════════════════════════════════════════════════════
// PAGE EXPORT
// ═══════════════════════════════════════════════════════════════

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