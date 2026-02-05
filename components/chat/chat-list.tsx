// components/chat/chat-list.tsx
'use client'

import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MessageSquare, Home, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

interface ChatListProps {
  chats: ChatPreview[]
  basePath?: string // /messages для владельца
}

export function ChatList({ chats, basePath = '/messages' }: ChatListProps) {
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

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Нет чатов
        </h3>
        <p className="text-gray-500 text-sm max-w-sm">
          Чаты появятся, когда арендаторы присоединятся к вашим квартирам
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {chats.map((chat) => {
        const tenantName = chat.tenants[0]?.name || 'Нет арендатора'
        const hasUnread = chat.unreadCount > 0
        
        return (
          <Link
            key={chat.propertyId}
            href={`${basePath}/${chat.propertyId}`}
            className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
              hasUnread ? 'bg-blue-50/50' : ''
            }`}
          >
            {/* Avatar / Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              hasUnread ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Home className={`h-5 w-5 ${hasUnread ? 'text-blue-600' : 'text-gray-500'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h4 className={`font-medium truncate ${
                  hasUnread ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {chat.propertyName}
                </h4>
                {chat.lastMessage && (
                  <span className={`text-xs shrink-0 ${
                    hasUnread ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}>
                    {formatTime(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-gray-500 truncate mb-1">
                {tenantName} • {chat.propertyAddress}
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
                  <Badge className="bg-blue-600 text-white px-2 py-0.5 text-xs">
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
  )
}
