// components/settings/stripe-connect-tab.tsx
// Owner settings tab for managing Stripe Connect integration
'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Unlink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ConnectStatus {
  connected: boolean
  onboarded: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  accountId: string | null
  detailsSubmitted?: boolean
}

export function StripeConnectTab() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for onboarding return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarded') === '1' || params.get('refresh') === '1') {
      // Clean URL
      const url = new URL(window.location.href)
      url.searchParams.delete('onboarded')
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.toString())
    }
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/status')
      if (!res.ok) throw new Error('Błąd ładowania statusu')
      setStatus(await res.json())
    } catch {
      setError('Nie można załadować statusu Stripe')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json()

      if (data.alreadyOnboarded) {
        await fetchStatus()
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Błąd')
      }
    } catch {
      setError('Nie można rozpocząć procesu podłączenia Stripe')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDisconnect() {
    if (
      !confirm(
        'Czy na pewno chcesz odłączyć konto Stripe?\n\n' +
          'Twoi najemcy nie będą mogli płacić kartą — wrócą do przelewów IBAN.'
      )
    ) {
      return
    }

    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Błąd')
      await fetchStatus()
    } catch {
      setError('Nie można odłączyć konta Stripe')
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (error && !status) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-gray-600">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          Spróbuj ponownie
        </Button>
      </div>
    )
  }

  const isConnected = status?.connected && status?.onboarded

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Status card ──────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${
              isConnected ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <CreditCard
              className={`h-6 w-6 ${
                isConnected ? 'text-green-600' : 'text-gray-500'
              }`}
            />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Stripe Connect
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isConnected
                ? 'Konto połączone — najemcy mogą płacić kartą'
                : 'Podłącz Stripe, aby najemcy mogli płacić kartą. Flatro pobiera 1 zł prowizji za przelew.'}
            </p>

            {/* Status indicators */}
            {status?.connected && (
              <div className="mt-3 space-y-1">
                <StatusRow
                  ok={status.chargesEnabled}
                  label="Przyjmowanie płatności"
                />
                <StatusRow ok={status.payoutsEnabled} label="Wypłaty na konto" />
                {status.detailsSubmitted === false && (
                  <p className="text-xs text-amber-600 mt-2">
                    Onboarding nie został ukończony. Kliknij poniżej, aby
                    kontynuować.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-3">
          {!isConnected && (
            <Button onClick={handleConnect} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {status?.connected && !status?.onboarded
                ? 'Dokończ onboarding'
                : 'Podłącz Stripe'}
            </Button>
          )}

          {status?.connected && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Odłącz Stripe
            </Button>
          )}
        </div>
      </Card>

      {/* ── How it works ─────────────────────────────────────── */}
      <Card className="p-6 bg-blue-50 border-blue-100">
        <h4 className="font-medium text-blue-900 mb-2">Jak to działa?</h4>
        <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
          <li>Podłączasz swoje konto Stripe (Express)</li>
          <li>
            Najemcy widzą przycisk <strong>„Zapłać kartą"</strong> przy
            każdej płatności
          </li>
          <li>
            Pieniądze trafiają bezpośrednio na Twoje konto, Flatro pobiera{' '}
            <strong>1 zł</strong> prowizji
          </li>
          <li>
            Płatność jest automatycznie potwierdzana — nie musisz nic
            klikać
          </li>
        </ol>
      </Card>
    </div>
  )
}

// ── Small status row component ──────────────────────────────────
function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500" />
      )}
      <span className={ok ? 'text-green-700' : 'text-amber-700'}>{label}</span>
    </div>
  )
}