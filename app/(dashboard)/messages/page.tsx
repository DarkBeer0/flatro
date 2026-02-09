// app/(dashboard)/messages/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, MessageSquare, Plus } from 'lucide-react'
import { ChatList } from '@/components/chat'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ChatPreview {
  propertyId: string
  propertyName: string
  propertyAddress: string
  tenants: {
    id: string
    name: string
    userId: string | null
  }[]
  lastMessage: {
    content: string
    createdAt: string
    isFromMe: boolean
    isRead: boolean
  } | null
  unreadCount: number
}

export default function MessagesPage() {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) {
          throw new Error('Failed to fetch chats')
        }
        
        const data = await res.json()
        
        if (data.role === 'owner' && data.chats) {
          setChats(data.chats)
          // Подсчитываем общее количество непрочитанных
          const total = data.chats.reduce(
            (sum: number, chat: ChatPreview) => sum + chat.unreadCount,
            0
          )
          setTotalUnread(total)
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
    const interval = setInterval(fetchChats, 10000) // каждые 10 сек
    return () => clearInterval(interval)
  }, [])

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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  // Фильтруем чаты только с арендаторами, у которых есть аккаунт
  const activeChats = chats.filter(chat => 
    chat.tenants.some(t => (t as any).userId || (t as any).tenantUserId)
  )

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Сообщения
          </h1>
          <p className="text-gray-500 mt-1">
            {totalUnread > 0 ? (
              <span className="text-blue-600 font-medium">
                {totalUnread} непрочитанных
              </span>
            ) : (
              'Общение с арендаторами'
            )}
          </p>
        </div>
      </div>

      {/* Chat List */}
      <Card className="overflow-hidden">
        {activeChats.length > 0 ? (
          <ChatList chats={activeChats} basePath="/messages" />
        ) : chats.length > 0 ? (
          // Есть квартиры, но нет арендаторов с аккаунтами
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет активных чатов
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mb-4">
              Чаты появятся, когда ваши арендаторы зарегистрируются в системе
              через приглашение
            </p>
            <Link href="/properties">
              <Button variant="outline">
                Управление квартирами
              </Button>
            </Link>
          </div>
        ) : (
          // Нет квартир вообще
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет квартир
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mb-4">
              Добавьте квартиру и пригласите арендатора, чтобы начать общение
            </p>
            <Link href="/properties/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить квартиру
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Tip */}
      {activeChats.length > 0 && (
        <p className="text-xs text-gray-400 text-center mt-4">
          Выберите чат, чтобы начать общение
        </p>
      )}
    </div>
  )
}
