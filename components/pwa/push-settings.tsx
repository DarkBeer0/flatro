// components/pwa/push-settings.tsx
// Flatro — Push Notification Settings section
// Displayed inside notifications-tab.tsx
// Handles: permission request, subscribe/unsubscribe, device list, test push

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, BellOff, BellRing, Loader2, Trash2, Smartphone,
  Monitor, Send, CheckCircle2, AlertTriangle, Info, Share, Plus
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

interface PushDevice {
  id: string
  endpoint: string
  deviceName: string | null
  createdAt: string
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new DataView(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view.setUint8(i, rawData.charCodeAt(i))
  }
  return buffer
}

function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPad/.test(ua)) return 'iPad'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) {
    const match = ua.match(/;\s*([^;)]+)\s*Build/)
    return match ? match[1].trim() : 'Android'
  }
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

function isIOS(): boolean {
  return typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
}

function isInStandaloneMode(): boolean {
  return typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isCurrentEndpoint(endpoint: string, currentSub: PushSubscription | null): boolean {
  return currentSub?.endpoint === endpoint
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PushSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [devices, setDevices] = useState<PushDevice[]>([])
  const [currentSub, setCurrentSub] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const isIOSDevice = isIOS()
  const isStandalone = isInStandaloneMode()

  // ── Load current state ────────────────────────────────────
  const loadState = useCallback(async () => {
    setLoading(true)
    try {
      // Get permission state
      if ('Notification' in window) {
        setPermission(Notification.permission)
      }

      // Get current SW subscription
      if (supported) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setCurrentSub(sub)
      }

      // Get all user devices from server
      const res = await fetch('/api/push/subscribe')
      if (res.ok) {
        const data = await res.json()
        setDevices(data.subscriptions || [])
      }
    } catch (e) {
      console.error('[PushSettings] Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [supported])

  useEffect(() => {
    loadState()
  }, [loadState])

  // ── Subscribe this device ─────────────────────────────────
  const handleSubscribe = async () => {
    if (!VAPID_PUBLIC_KEY) return
    setSubscribing(true)

    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setSubscribing(false)
        return
      }

      // Get SW registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setCurrentSub(subscription)

      // Send to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: getDeviceName(),
        }),
      })

      await loadState()
    } catch (e) {
      console.error('[PushSettings] Subscribe error:', e)
    } finally {
      setSubscribing(false)
    }
  }

  // ── Unsubscribe this device ───────────────────────────────
  const handleUnsubscribe = async () => {
    try {
      if (currentSub) {
        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: currentSub.endpoint }),
        })

        // Unsubscribe from push service
        await currentSub.unsubscribe()
        setCurrentSub(null)
      }

      await loadState()
    } catch (e) {
      console.error('[PushSettings] Unsubscribe error:', e)
    }
  }

  // ── Remove a specific device ──────────────────────────────
  const handleRemoveDevice = async (device: PushDevice) => {
    try {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: device.endpoint }),
      })

      // If it's the current device, also unsubscribe locally
      if (currentSub && device.endpoint === currentSub.endpoint) {
        await currentSub.unsubscribe()
        setCurrentSub(null)
      }

      await loadState()
    } catch (e) {
      console.error('[PushSettings] Remove device error:', e)
    }
  }

  // ── Send test push ────────────────────────────────────────
  const handleTestPush = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' }),
      })

      const data = await res.json()
      if (res.ok && data.result?.sent > 0) {
        setTestResult(`✅ Powiadomienie testowe wysłane na ${data.result.sent} urządzenie(a)`)
      } else if (data.result?.removed > 0) {
        setTestResult('⚠️ Niektóre subskrypcje wygasły i zostały usunięte')
        await loadState()
      } else {
        setTestResult('❌ Nie udało się wysłać powiadomienia')
      }
    } catch {
      setTestResult('❌ Błąd wysyłania')
    } finally {
      setTestSending(false)
    }
  }

  // ── Device icon helper ────────────────────────────────────
  const DeviceIcon = ({ name }: { name: string | null }) => {
    const n = (name || '').toLowerCase()
    if (n.includes('iphone') || n.includes('ipad') || n.includes('android')) {
      return <Smartphone className="h-4 w-4 text-gray-400" />
    }
    return <Monitor className="h-4 w-4 text-gray-400" />
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Card>
    )
  }

  // ── Not supported ─────────────────────────────────────────
  if (!supported) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <BellOff className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Powiadomienia Push</h3>
        </div>
        <p className="text-sm text-gray-500">
          Ta przeglądarka nie obsługuje powiadomień push.
          Spróbuj użyć Chrome, Edge lub Safari 16.4+.
        </p>
      </Card>
    )
  }

  const isSubscribed = !!currentSub
  const isPermDenied = permission === 'denied'

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isSubscribed ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {isSubscribed ? (
              <BellRing className="h-5 w-5 text-green-600" />
            ) : (
              <Bell className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Powiadomienia Push</h3>
            <p className="text-xs text-gray-500">
              {isSubscribed
                ? 'Aktywne na tym urządzeniu'
                : isPermDenied
                  ? 'Zablokowane w ustawieniach przeglądarki'
                  : 'Wyłączone'}
            </p>
          </div>
        </div>

        {/* Subscribe / Unsubscribe toggle */}
        {!isPermDenied && (
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              'Wyłącz'
            ) : (
              'Włącz'
            )}
          </Button>
        )}
      </div>

      {/* iOS in Safari (not standalone) — instruction */}
      {isIOSDevice && !isStandalone && !isPermDenied && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium mb-1">iPhone / iPad — wymagana instalacja</p>
              <p className="mb-2">
                Powiadomienia push na iOS działają tylko z zainstalowanej aplikacji na ekranie głównym.
              </p>
              <div className="space-y-1 text-amber-700">
                <p className="flex items-center gap-1">
                  <Share className="h-3 w-3 text-blue-500" /> 1. Kliknij „Udostępnij" na dole Safari
                </p>
                <p className="flex items-center gap-1">
                  <Plus className="h-3 w-3" /> 2. Wybierz „Dodaj do ekranu głównego"
                </p>
                <p>3. Otwórz Flatro z ekranu głównego i włącz powiadomienia</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission denied warning */}
      {isPermDenied && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">
              <p className="font-medium">Powiadomienia zablokowane</p>
              <p>
                Odblokuj powiadomienia w ustawieniach przeglądarki, aby włączyć powiadomienia push.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscribed devices list */}
      {devices.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Podłączone urządzenia ({devices.length})
          </p>
          <div className="space-y-2">
            {devices.map((device) => {
              const isCurrent = isCurrentEndpoint(device.endpoint, currentSub)
              return (
                <div
                  key={device.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DeviceIcon name={device.deviceName} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {device.deviceName || 'Nieznane urządzenie'}
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                            to urządzenie
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(device.createdAt).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(device)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    title="Usuń urządzenie"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Test push button */}
      {isSubscribed && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Testowe powiadomienie</p>
              <p className="text-xs text-gray-400">Wyślij test na wszystkie podłączone urządzenia</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPush}
              disabled={testSending}
            >
              {testSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Wyślij test
                </>
              )}
            </Button>
          </div>
          {testResult && (
            <p className="text-xs mt-2 text-gray-600">{testResult}</p>
          )}
        </div>
      )}
    </Card>
  )
}