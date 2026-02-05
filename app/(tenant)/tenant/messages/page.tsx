// app/(tenant)/tenant/messages/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, MessageSquare, Home, User, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'

interface ChatPreview {
  propertyId: string
  propertyName: string
  propertyAddress: string
  owner: {
    id: string
    name: string | null
    email: string
  }
  lastMessage: {
    content: string
    createdAt: string
    isFromMe: boolean
    isRead: boolean
  } | null
  unreadCount: number
}

export default function TenantMessagesPage() {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) {
          throw new Error('Failed to fetch chats')
        }
        
        const data = await res.json()
        
        if (data.role === 'tenant' && data.chats) {
          setChats(data.chats)
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
      return 'Вчера'
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Сообщения</h1>
          <p className="text-gray-500 mt-1">Общение с владельцами квартир</p>
        </div>
        
        <div className="text-center py-12">
          <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Нет привязанных квартир
          </h2>
          <p className="text-gray-500 mb-4">
            Чтобы начать общение с владельцем, вам нужно быть привязанным к квартире
          </p>
          <Link
            href="/tenant/dashboard"
            className="text-green-600 hover:underline"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0)

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Сообщения</h1>
        <p className="text-gray-500 mt-1">
          {totalUnread > 0 ? (
            <span className="text-green-600 font-medium">
              {totalUnread} непрочитанных
            </span>
          ) : (
            'Общение с владельцами квартир'
          )}
        </p>
      </div>

      {/* Chat List */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {chats.map((chat) => {
            const hasUnread = chat.unreadCount > 0
            
            return (
              <Link
                key={chat.propertyId}
                href={`/tenant/messages/${chat.propertyId}`}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                  hasUnread ? 'bg-green-50/50' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  hasUnread ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <User className={`h-5 w-5 ${hasUnread ? 'text-green-600' : 'text-gray-500'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className={`font-medium truncate ${
                      hasUnread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {chat.owner.name || 'Владелец'}
                    </h4>
                    {chat.lastMessage && (
                      <span className={`text-xs shrink-0 ${
                        hasUnread ? 'text-green-600 font-medium' : 'text-gray-400'
                      }`}>
                        {formatTime(chat.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {chat.propertyName} • {chat.propertyAddress}
                  </p>
                  
                  <div className="flex items-center justify-between gap-2">
                    {chat.lastMessage ? (
                      <p className={`text-sm truncate ${
                        hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}>
                        {chat.lastMessage.isFromMe && (
                          <span className="text-gray-400">Вы: </span>
                        )}
                        {chat.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        Нет сообщений
                      </p>
                    )}
                    
                    {hasUnread && (
                      <Badge className="bg-green-600 text-white px-2 py-0.5 text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </Link>
            )
          })}
        </div>
      </Card>

      <p className="text-xs text-gray-400 text-center mt-4">
        Выберите чат, чтобы начать общение
      </p>
    </div>
  )
}
