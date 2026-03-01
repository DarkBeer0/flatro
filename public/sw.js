// public/sw.js
// Flatro — Service Worker (static, no build step)
// Совместим с Next.js 16 Turbopack — не требует webpack/serwist плагинов
//
// Функционал:
// 1. Cache-first для статических ассетов (JS, CSS, images, fonts)
// 2. Network-first для API и навигации
// 3. Offline fallback на /offline
// 4. Web Push notifications handling

const CACHE_NAME = 'flatro-v1'
const OFFLINE_URL = '/offline'

// ═══════════════════════════════════════════════════════════════
// INSTALL — precache offline page
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache the offline fallback page
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
    })
  )
  // Activate immediately, don't wait for old SW to stop
  self.skipWaiting()
})

// ═══════════════════════════════════════════════════════════════
// ACTIVATE — clean up old caches
// ═══════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  // Take control of all clients immediately
  self.clients.claim()
})

// ═══════════════════════════════════════════════════════════════
// FETCH — caching strategies
// ═══════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests (except CDN assets)
  if (url.origin !== self.location.origin) return

  // Skip API routes and auth — always go to network
  if (url.pathname.startsWith('/api/')) return

  // Skip Supabase auth callbacks
  if (url.pathname.startsWith('/auth/')) return

  // ── Navigation requests → Network-first with offline fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(async () => {
          // Try to serve from cache first
          const cached = await caches.match(request)
          if (cached) return cached
          // Fall back to offline page
          const offlinePage = await caches.match(OFFLINE_URL)
          return offlinePage || new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // ── Static assets → Cache-first ──
  // Next.js hashed assets (_next/static/*), images, fonts
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // ── Everything else → Network-first ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ═══════════════════════════════════════════════════════════════
// PUSH — Web Push notifications
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'Flatro',
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
    }
  }

  const {
    title = 'Flatro',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    tag,
    data,
    actions,
  } = payload

  const options = {
    body,
    icon,
    badge,
    tag: tag || 'flatro-notification',
    data: data || {},
    actions: actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CLICK — open/focus the app
// ═══════════════════════════════════════════════════════════════

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Determine the URL to open
  const urlPath = event.notification.data?.url || '/dashboard'
  const fullUrl = new URL(urlPath, self.location.origin).href

  // Handle action buttons
  if (event.action === 'view' && event.notification.data?.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url))
    return
  }

  if (event.action === 'dismiss') return

  // Focus existing window or open new one
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing Flatro tab
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(fullUrl)
            return
          }
        }
        // No existing tab — open new window
        return self.clients.openWindow(fullUrl)
      })
  )
})