// components/pwa/install-prompt.tsx
// Flatro — PWA Install Prompt
// - Android/Chrome: uses beforeinstallprompt event
// - iOS 16.4+: shows manual "Add to Home Screen" instructions
//   (required for Push Notifications on iOS Safari)
// - Desktop: shows install button

'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, Share, Plus, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ═══════════════════════════════════════════════════════════════
// DEVICE DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function getIOSVersion(): number | null {
  if (typeof navigator === 'undefined') return null
  const match = navigator.userAgent.match(/OS (\d+)_/)
  return match ? parseInt(match[1], 10) : null
}

const DISMISS_KEY = 'flatro_pwa_install_dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function wasDismissedRecently(): boolean {
  if (typeof localStorage === 'undefined') return false
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  return Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION
}

function setDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Listen for beforeinstallprompt (Chrome/Android/Edge/Samsung)
  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // iOS detection — show manual instructions
  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return

    if (isIOS()) {
      const iosVersion = getIOSVersion()
      // iOS 16.4+ supports Web Push in standalone mode
      // Show prompt to encourage installation
      if (iosVersion && iosVersion >= 16) {
        // Delay showing to not annoy users immediately
        const timer = setTimeout(() => setShowIOSPrompt(true), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowBanner(false)
        setDeferredPrompt(null)
      }
    } catch (err) {
      console.error('[PWA] Install prompt error:', err)
    } finally {
      setInstalling(false)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    setShowIOSPrompt(false)
    setDismissed()
  }, [])

  // ── Android / Chrome / Desktop banner ─────────────────────
  if (showBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 safe-area-pb">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                Zainstaluj Flatro
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Dodaj aplikację na ekran główny, aby korzystać offline i otrzymywać powiadomienia push.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {installing ? 'Instaluję...' : 'Zainstaluj'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  Nie teraz
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── iOS Safari instruction sheet ──────────────────────────
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 safe-area-pb">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-2 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                Dodaj Flatro na ekran główny
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Zainstaluj aplikację, aby korzystać z powiadomień push i trybu offline.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step-by-step instructions for iOS */}
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Kliknij</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border text-xs font-medium">
                    <Share className="h-3.5 w-3.5 text-blue-500" />
                    Udostępnij
                  </span>
                  <span>na dole ekranu</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Przewiń w dół i wybierz</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border text-xs font-medium">
                    <Plus className="h-3.5 w-3.5" />
                    Dodaj do ekranu głównego
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <span className="text-sm text-gray-700">
                  Kliknij <span className="font-semibold">Dodaj</span> w prawym górnym rogu
                </span>
              </div>
            </div>

            {/* iOS 16.4+ push note */}
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              🔔 Powiadomienia push na iPhone działają tylko z zainstalowanej aplikacji (iOS 16.4+)
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}