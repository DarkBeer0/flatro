// components/pwa/push-registration.tsx
// Flatro — Background Push Notification Registration
// Mounts invisibly and handles SW registration + push subscription
// Only activates when user is logged in and has granted permission

'use client'

import { useEffect, useRef } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/**
 * Convert a Base64 VAPID key to Uint8Array for PushManager.subscribe()
 */
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

/**
 * Detect a human-readable device name from user agent
 */
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

export function PushRegistration() {
  const registered = useRef(false)

  useEffect(() => {
    if (registered.current) return
    if (!VAPID_PUBLIC_KEY) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    // Only register if notification permission is already granted
    // (don't auto-prompt — that's done from the settings page)
    if (Notification.permission !== 'granted') return

    registered.current = true

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Create new subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        // Send subscription to our server
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            deviceName: getDeviceName(),
          }),
        })

        if (!response.ok) {
          console.warn('[Push] Failed to save subscription:', await response.text())
        }
      } catch (err) {
        // Silently fail — push is a nice-to-have, not critical
        console.warn('[Push] Registration failed:', err)
      }
    }

    // Small delay to not interfere with initial page load
    const timer = setTimeout(registerPush, 2000)
    return () => clearTimeout(timer)
  }, [])

  // This component renders nothing — it's a side-effect only
  return null
}