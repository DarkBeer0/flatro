// components/pwa/sw-register.tsx
// Ручная регистрация Service Worker (вместо @serwist/next авто-регистрации)
// Turbopack-совместимый подход — SW лежит как статический файл в public/sw.js
'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Регистрируем с небольшой задержкой, чтобы не блокировать первоначальную загрузку
    const timer = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Проверяем обновления каждые 60 минут
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)

        // Если есть ожидающий SW — предлагаем обновиться
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              // Новая версия активирована — перезагрузим при следующей навигации
              console.log('[SW] New version available')
            }
          })
        })

        console.log('[SW] Registered successfully, scope:', registration.scope)
      } catch (error) {
        console.error('[SW] Registration failed:', error)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return null
}