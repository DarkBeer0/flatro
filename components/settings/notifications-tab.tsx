// components/settings/notifications-tab.tsx
// Flatro — Вкладка "Уведомления" в Настройках
// V11: Добавлена секция Push-уведомлений

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Check, RefreshCw, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PushSettings from '@/components/pwa/push-settings'

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
        setTestResult(`❌ Błąd: ${data.error || 'Nieznany błąd'}`)
      }
    } catch {
      setTestResult('❌ Nie udało się wysłać')
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* PUSH NOTIFICATIONS (V11: new section)                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <PushSettings />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EMAIL NOTIFICATIONS                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Powiadomienia e-mail</h3>
            <p className="text-xs text-gray-500">Wybierz, które e-maile chcesz otrzymywać</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Payment reminders */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Przypomnienia o płatnościach
              </p>
              <p className="text-xs text-gray-400">
                Zbliżające się terminy i zaległe płatności
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.emailPaymentReminders}
                onChange={() => handleToggle('emailPaymentReminders')}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>

          {/* Contract expiry */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Wygaśnięcie umowy
              </p>
              <p className="text-xs text-gray-400">
                Umowy wygasające w ciągu 30 dni
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.emailContractExpiry}
                onChange={() => handleToggle('emailContractExpiry')}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>

          {/* New tenant */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Nowy najemca
              </p>
              <p className="text-xs text-gray-400">
                Gdy najemca przyjmie zaproszenie
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.emailNewTenant}
                onChange={() => handleToggle('emailNewTenant')}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
        </div>

        {/* Save + Test buttons */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-1.5 text-green-500" />
            ) : null}
            {saved ? 'Zapisano' : 'Zapisz ustawienia'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleTestSend} disabled={testLoading}>
            {testLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Uruchom sprawdzenie
          </Button>
        </div>

        {testResult && (
          <p className="text-sm mt-3 text-gray-600">{testResult}</p>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NOTIFICATION LOG                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {logs.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Historia powiadomień</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {log.subject}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TYPE_LABELS[log.type] || log.type} • {log.recipient}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[log.status] || log.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(log.sentAt || log.createdAt).toLocaleDateString('pl-PL', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}