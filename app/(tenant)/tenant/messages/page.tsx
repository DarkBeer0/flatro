// app/(tenant)/tenant/messages/page.tsx
// FIX 1: Поддержка пользователей с обеими ролями
// Теперь корректно обрабатывает role='both' из API

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Loader2, MessageSquare, Home, ArrowRight } from 'lucide-react'
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
        
        // FIX: Обрабатываем role='both' - берём tenantChat
        if (data.role === 'tenant' || data.role === 'both') {
          // Для role='both' используем tenantChat, для 'tenant' - chat
          const tenantChat = data.tenantChat || data.chat
          
          if (tenantChat) {
            setChat(tenantChat)
            setNoProperty(false)
          } else {
            setChat(null)
            setNoProperty(true)
          }
        } else if (data.role === 'owner') {
          // Пользователь только owner, но зашёл на tenant страницу
          // Это не должно происходить, но обработаем
          setChat(null)
          setNoProperty(true)
        } else {
          setNoProperty(true)
        }
      } catch (err) {
        console.error('Error fetching chats:', err)
        setError(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
    
    // Polling для обновления
    const interval = setInterval(fetchChats, 10000)
    return () => clearInterval(interval)
  }, [])

  function formatMessageDate(dateStr: string) {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    }
    if (isYesterday(date)) {
      return t.common?.yesterday || 'Вчера'
    }
    return format(date, 'd MMM', { locale: ru })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t.common?.error || 'Ошибка'}
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
            {t.messages?.title || 'Сообщения'}
          </h1>
        </div>
        
        <Card className="p-8 text-center">
          <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t.tenant?.noProperty || 'Нет привязанной квартиры'}
          </h2>
          <p className="text-gray-500 mb-4">
            {t.tenant?.noPropertyDesc || 'Попросите владельца отправить вам приглашение'}
          </p>
          <Link href="/tenant/dashboard">
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              {t.common?.backToDashboard || 'Вернуться на главную'}
            </button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {t.messages?.title || 'Сообщения'}
        </h1>
        <p className="text-gray-500 mt-1">
          {t.messages?.chatWithOwner || 'Чат с владельцем квартиры'}
        </p>
      </div>

      {/* Единственный чат с владельцем */}
      <Link href={`/tenant/messages/${chat.propertyId}`}>
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold text-lg">
                {chat.owner.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {chat.owner.name}
                </h3>
                {chat.lastMessage && (
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {formatMessageDate(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-500 truncate">
                {chat.propertyName} • {chat.propertyAddress}
              </p>

              {chat.lastMessage && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {chat.lastMessage.isOwn && (
                    <span className="text-gray-400">
                      {t.messages?.you || 'Вы'}: {' '}
                    </span>
                  )}
                  {chat.lastMessage.content}
                </p>
              )}
            </div>

            {/* Unread badge + Arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {chat.unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {chat.unreadCount}
                </span>
              )}
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </Card>
      </Link>
    </div>
  )
}
