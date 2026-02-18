// components/settings/notifications-tab.tsx
// Flatro — Вкладка "Уведомления" в Настройках
// Заменяет заглушку "Функционал в разработке"

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Check, RefreshCw, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface NotificationSettings {
  emailPaymentReminders: boolean
  emailContractExpiry: boolean
  emailNewTenant: boolean
}

interface NotificationLog {
  id: string
  type: string
  status: string
  subject: string
  recipient: string
  sentAt: string | null
  createdAt: string
  errorMsg: string | null
}

const TYPE_LABELS: Record<string, string> = {
  PAYMENT_DUE_SOON: 'Zbliżający się termin płatności',
  PAYMENT_OVERDUE: 'Zaległa płatność',
  CONTRACT_EXPIRY_SOON: 'Umowa wygasa wkrótce',
  CONTRACT_EXPIRED: 'Umowa wygasła',
}

const STATUS_COLORS: Record<string, string> = {
  SENT: 'text-green-600 bg-green-50',
  FAILED: 'text-red-600 bg-red-50',
  PENDING: 'text-yellow-600 bg-yellow-50',
  SKIPPED: 'text-gray-500 bg-gray-50',
}

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Wysłano',
  FAILED: 'Błąd',
  PENDING: 'Oczekuje',
  SKIPPED: 'Pominięto',
}

export default function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailPaymentReminders: true,
    emailContractExpiry: true,
    emailNewTenant: true,
  })
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Загрузка настроек
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [settingsRes, logsRes] = await Promise.all([
          fetch('/api/user/settings'),
          fetch('/api/notifications/send?limit=20'),
        ])

        if (settingsRes.ok) setSettings(await settingsRes.json())
        if (logsRes.ok) {
          const data = await logsRes.json()
          setLogs(data.logs ?? [])
        }
      } catch (e) {
        console.error('Błąd ładowania ustawień powiadomień', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      alert('Nie udało się zapisać ustawień')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSend = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      })

      const data = await res.json()

      if (res.ok) {
        const total = (data.result?.payments?.sent ?? 0) + (data.result?.contracts?.sent ?? 0)
        setTestResult(`✅ Uruchomiono. Wysłano ${total} powiadomień.`)

        // Odśwież logi
        const logsRes = await fetch('/api/notifications/send?limit=20')
        if (logsRes.ok) {
          const logsData = await logsRes.json()
          setLogs(logsData.logs ?? [])
        }
      } else {
        setTestResult(`❌ Błąd: ${data.error}`)
      }
    } catch (e) {
      setTestResult('❌ Błąd połączenia')
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Настройки ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Powiadomienia email</h2>
        <p className="text-sm text-gray-500 mb-6">
          Skonfiguruj, jakie powiadomienia chcesz otrzymywać
        </p>

        <div className="space-y-4">
          <ToggleRow
            icon={<Bell className="h-4 w-4 text-blue-500" />}
            label="Przypomnienia o płatnościach"
            description="Powiadomienie 3 dni przed terminem i przy opóźnieniu"
            enabled={settings.emailPaymentReminders}
            onToggle={() => handleToggle('emailPaymentReminders')}
          />

          <ToggleRow
            icon={<Bell className="h-4 w-4 text-orange-500" />}
            label="Wygasające umowy"
            description="Powiadomienie gdy umowa wygasa w ciągu 30 dni"
            enabled={settings.emailContractExpiry}
            onToggle={() => handleToggle('emailContractExpiry')}
          />

          <ToggleRow
            icon={<Bell className="h-4 w-4 text-green-500" />}
            label="Nowi najemcy"
            description="Powiadomienie po dołączeniu nowego najemcy"
            enabled={settings.emailNewTenant}
            onToggle={() => handleToggle('emailNewTenant')}
          />
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Zapisz ustawienia
          </Button>
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <Check className="h-4 w-4" /> Zapisano
            </span>
          )}
        </div>
      </Card>

      {/* ── Ручной запуск ── */}
      <Card className="p-6">
        <h2 className="text-base font-semibold mb-1">Testowe uruchomienie</h2>
        <p className="text-sm text-gray-500 mb-4">
          Uruchom sprawdzanie i wysyłkę powiadomień ręcznie (działa też automatycznie codziennie o 08:00)
        </p>

        <Button
          variant="outline"
          onClick={handleTestSend}
          disabled={testLoading}
          className="flex items-center gap-2"
        >
          {testLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />
          }
          Uruchom teraz
        </Button>

        {testResult && (
          <p className="mt-3 text-sm text-gray-700">{testResult}</p>
        )}
      </Card>

      {/* ── История уведомлений ── */}
      <Card className="p-6">
        <h2 className="text-base font-semibold mb-1">Historia powiadomień</h2>
        <p className="text-sm text-gray-500 mb-4">Ostatnie 20 wysłanych powiadomień</p>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Brak historii powiadomień</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-lg bg-gray-50 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {TYPE_LABELS[log.type] ?? log.type}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{log.subject}</p>
                  {log.errorMsg && (
                    <p className="text-xs text-red-500 mt-0.5">{log.errorMsg}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] ?? ''}`}>
                    {STATUS_LABELS[log.status] ?? log.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.sentAt ?? log.createdAt).toLocaleDateString('pl-PL', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Subcomponent: переключатель уведомления
// ─────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          enabled ? 'bg-gray-900' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}