import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flatro - Zarządzanie wynajmem',
  description: 'Aplikacja do zarządzania wynajmem nieruchomości',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}
      >
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
