// app/layout.tsx
// FIXED: lang attribute defaults to 'en' (neutral) and is dynamically
// updated by LocaleProvider to match the user's chosen locale.
// V11: Added PWA meta tags + install prompt + push registration + SW registration

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from '@/lib/i18n/context'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { PushRegistration } from '@/components/pwa/push-registration'
import { SwRegister } from '@/components/pwa/sw-register'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Flatro — Rental Management',
  description: 'Rental property management application',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flatro',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <head>
        {/* PWA: Apple touch icon */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
        {/* PWA: Splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <LocaleProvider>
          {children}
          {/* PWA Install Prompt — floating banner */}
          <PwaInstallPrompt />
          {/* Service Worker — manual registration (Turbopack-compatible) */}
          <SwRegister />
          {/* Push Notifications — silent subscription on mount */}
          <PushRegistration />
        </LocaleProvider>
      </body>
    </html>
  )
}