// next.config.ts
// Flatro — Next.js 16 configuration (Turbopack)
// ⚠️ НЕ используем withSerwist / @serwist/next — несовместимы с Turbopack
// Service Worker — статический файл public/sw.js + ручная регистрация

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default — добавляем пустой объект
  // чтобы не было ошибки "webpack config without turbopack config"
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.com',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
}

export default nextConfig