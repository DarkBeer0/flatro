// app/(tenant)/tenant/messages/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Loader2, MessageSquare, Home } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useLocale } from '@/lib/i18n/context'

interface ChatInfo {
  propertyId: string
  propertyName: string
  propertyAddress: string
  owner: {
    id: string
    name: string
    email: string
  }
  lastMessage: {
    id: string
    content: string
    createdAt: string
    isOwn: boolean
  } | null
  unreadCount: number
}

export default function TenantMessagesPage() {
  const { t } = useLocale()
  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noProperty, setNoProperty] = useState(false)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch('/api/messages')
        
        if (!res.ok) {
          throw new Error('Ошибка загрузки')
        }
        
        const data = await res.json()
        
        if (data.role === 'tenant') {
          if (data.chat) {
            setChat(data.chat)
            setNoProperty(false)
          } else {
            // Нет привязанной квартиры
            setChat(null)
            setNoProperty(true)
          }
        } else if (data.role === 'none') {
          setNoProperty(true)
        }
      } catch (err) {
        console.error('Error fetching chats:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
    
    // Polling для обновления списка
    const interval = setInterval(fetchChats, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    }
    if (isYesterday(date)) {
      return t?.common?.yesterday || 'Вчера'
    }
    return format(date, 'd MMM', { locale: ru })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t?.common?.error || 'Ошибка'}
        </h2>
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  // Нет привязанной квартиры
  if (noProperty || !chat) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {t?.nav?.messages || 'Сообщения'}
          </h1>
          <p className="text-gray-500 mt-1">
            {t?.messages?.chatWithOwner || 'Общение с владельцем квартиры'}
          </p>
        </div>
        
        <div className="text-center py-12">
          <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t?.tenant?.noProperty || 'Нет привязанной квартиры'}
          </h2>
          <p className="text-gray-500 mb-4">
            {t?.tenant?.noPropertyDesc || 'Чтобы начать общение с владельцем, вам нужно быть привязанным к квартире'}
          </p>
          <Link
            href="/tenant/dashboard"
            className="text-green-600 hover:underline"
          >
            {t?.common?.backToDashboard || 'Вернуться на главную'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {t?.nav?.messages || 'Сообщения'}
        </h1>
        <p className="text-gray-500 mt-1">
          {chat.unreadCount > 0 ? (
            <span className="text-green-600 font-medium">
              {chat.unreadCount} {t?.messages?.unread || 'непрочитанных'}
            </span>
          ) : (
            t?.messages?.chatWithOwner || 'Общение с владельцем квартиры'
          )}
        </p>
      </div>

      {/* Chat Card */}
      <Card className="overflow-hidden">
        <Link
          href={`/tenant/messages/${chat.propertyId}`}
          className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
            chat.unreadCount > 0 ? 'bg-green-50/50' : ''
          }`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Home className="h-6 w-6 text-green-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className={`font-medium truncate ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {chat.propertyName}
              </h3>
              {chat.lastMessage && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(chat.lastMessage.createdAt)}
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-500 truncate">
              {chat.owner.name}
            </p>
            
            {chat.lastMessage && (
              <p className={`text-sm truncate mt-1 ${chat.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {chat.lastMessage.isOwn && <span className="text-gray-400">{t?.messages?.you || 'Вы'}: </span>}
                {chat.lastMessage.content}
              </p>
            )}
          </div>

          {/* Unread badge */}
          {chat.unreadCount > 0 && (
            <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
              </span>
            </div>
          )}
        </Link>
      </Card>

      {/* Tip */}
      <p className="text-xs text-gray-400 text-center mt-4">
        {t?.messages?.clickToChat || 'Нажмите, чтобы открыть чат'}
      </p>
    </div>
  )
}
