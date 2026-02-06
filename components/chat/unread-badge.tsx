// components/chat/unread-badge.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface UnreadBadgeProps {
  className?: string
}

export function UnreadBadge({ className = '' }: UnreadBadgeProps) {
  const [count, setCount] = useState(0)
  const [showBadge, setShowBadge] = useState(false)

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread')
      if (res.ok) {
        const data = await res.json()
        setCount(data.missed || 0)
        setShowBadge(data.showBadge || false)
      }
    } catch (error) {
      console.error('Error fetching unread:', error)
    }
  }, [])

  useEffect(() => {
    fetchUnread()
    
    // Polling каждые 30 секунд (резервный вариант)
    const interval = setInterval(fetchUnread, 30000)
    
    // Слушаем событие когда сообщения прочитаны
    const handleMessagesRead = () => {
      fetchUnread()
    }
    
    window.addEventListener('messages-read', handleMessagesRead)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('messages-read', handleMessagesRead)
    }
  }, [fetchUnread])

  if (!showBadge || count === 0) {
    return null
  }

  return (
    <span className={`
      inline-flex items-center justify-center
      min-w-[18px] h-[18px] px-1
      text-[10px] font-bold text-white
      bg-red-500 rounded-full
      ${className}
    `}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Хук для использования в любом месте
export function useUnreadMessages() {
  const [data, setData] = useState({
    total: 0,
    missed: 0,
    showBadge: false,
    byProperty: [] as { propertyId: string; count: number; hasMissed: boolean }[]
  })

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching unread:', error)
    }
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    
    const handleMessagesRead = () => fetchUnread()
    window.addEventListener('messages-read', handleMessagesRead)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('messages-read', handleMessagesRead)
    }
  }, [fetchUnread])

  return data
}

// Функция для вызова обновления badge извне
export function notifyMessagesRead() {
  window.dispatchEvent(new Event('messages-read'))
}