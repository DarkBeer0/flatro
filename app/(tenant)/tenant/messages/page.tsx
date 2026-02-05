// app/(tenant)/tenant/messages/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, MessageSquare, Home } from 'lucide-react'
import { ChatWindow } from '@/components/chat'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface TenantChat {
  propertyId: string
  propertyName: string
  propertyAddress: string
  owner: {
    id: string
    name: string | null
    email: string
  }
  unreadCount: number
}

export default function TenantMessagesPage() {
  const [chat, setChat] = useState<TenantChat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChat() {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) {
          throw new Error('Failed to fetch chat')
        }
        
        const data = await res.json()
        
        if (data.role === 'tenant' && data.chat) {
          setChat(data.chat)
        }
      } catch (err) {
        console.error('Error fetching chat:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    fetchChat()
  }, [])

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

  if (!chat) {
    return (
      <div className="text-center py-12">
        <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Нет привязанной квартиры
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
    )
  }

  return (
    <div className="w-full h-full">
      {/* Page Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Сообщения
        </h1>
        <p className="text-gray-500 mt-1">
          Общение с владельцем квартиры
        </p>
      </div>

      {/* Property Info Card */}
      <Card className="p-4 mb-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Home className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{chat.propertyName}</h3>
            <p className="text-sm text-gray-500">{chat.propertyAddress}</p>
          </div>
        </div>
      </Card>

      {/* Chat Window */}
      <div className="h-[calc(100vh-320px)] min-h-[400px]">
        <ChatWindow
          propertyId={chat.propertyId}
          pollingInterval={5000}
        />
      </div>
    </div>
  )
}
