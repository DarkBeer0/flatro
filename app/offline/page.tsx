// app/offline/page.tsx
// Flatro — Offline fallback page (shown when no network & no cache)

'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
          <WifiOff className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Brak połączenia z internetem
        </h1>
        <p className="text-gray-500 mb-6">
          Sprawdź połączenie sieciowe i spróbuj ponownie.
          Niektóre strony mogą być dostępne w trybie offline.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież stronę
        </button>
      </div>
    </div>
  )
}