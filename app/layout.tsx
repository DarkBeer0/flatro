// app/layout.tsx
// FIXED: lang attribute defaults to 'en' (neutral) and is dynamically
// updated by LocaleProvider to match the user's chosen locale.
// Metadata is also overridden at runtime by the context.
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from '@/lib/i18n/context'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Flatro — Rental Management',
  description: 'Rental property management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: the lang attribute is updated client-side
    // by LocaleProvider once the saved locale is read from localStorage.
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}