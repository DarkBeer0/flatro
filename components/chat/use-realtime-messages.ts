// components/chat/use-realtime-messages.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

// Тип сообщения из БД (без join'ов)
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

    // Создаём канал с уникальным именем
    const channelName = `messages:${propertyId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `propertyId=eq.${propertyId}`,
        },
        (payload) => {
          const newMessage = payload.new as RealtimeMessage
          
          // Не добавляем своё сообщение (оно уже добавлено через optimistic update)
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
          table: 'Message',
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