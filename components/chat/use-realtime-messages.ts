// components/chat/use-realtime-messages.ts
// ============================================================
// FIX: table name corrected from 'Message' → 'messages'
// 
// Prisma model is named `Message` in schema.prisma,
// but @@map("messages") means the actual PostgreSQL table
// is lowercase "messages". Supabase Realtime uses the real
// DB table name, not the Prisma model name.
// ============================================================
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeMessage {
  id: string
  senderId: string
  receiverId: string
  propertyId: string
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

interface UseRealtimeMessagesOptions {
  propertyId: string
  currentUserId: string | null
  onNewMessage: (message: RealtimeMessage) => void
  onMessageUpdated: (message: RealtimeMessage) => void
  enabled?: boolean
}

export function useRealtimeMessages({
  propertyId,
  currentUserId,
  onNewMessage,
  onMessageUpdated,
  enabled = true,
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !propertyId || !currentUserId) {
      return cleanup
    }

    const supabase = supabaseRef.current
    const channelName = `messages:${propertyId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages', // ← FIXED: was 'Message' (Prisma model name)
          filter: `propertyId=eq.${propertyId}`,
        },
        (payload) => {
          const newMessage = payload.new as RealtimeMessage
          if (newMessage.senderId !== currentUserId) {
            onNewMessage(newMessage)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages', // ← FIXED: was 'Message'
          filter: `propertyId=eq.${propertyId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as RealtimeMessage
          onMessageUpdated(updatedMessage)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${channelName}`)
        }
      })

    channelRef.current = channel

    return cleanup
  }, [propertyId, currentUserId, enabled, onNewMessage, onMessageUpdated, cleanup])

  return { cleanup }
}