// components/chat/chat-list.tsx
// FIXED: Hardcoded Russian strings → i18n dictionary keys
// FIXED: date-fns locale → dynamic via getDateFnsLocale()
'use client'

import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { MessageSquare, Home, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'
import { getDateFnsLocale } from '@/lib/i18n/get-date-fns-locale'

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
  basePath?: string
}

export function ChatList({ chats, basePath = '/messages' }: ChatListProps) {
  const { t, locale } = useLocale()
  const dfLocale = getDateFnsLocale(locale)

  // Access chat dictionary safely
  const chat = (t as any).chat || {}

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    }
    if (isYesterday(date)) {
      return t.common.yesterday
    }
    return format(date, 'd MMM', { locale: dfLocale })
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t.messages.noChats}
        </h3>
        <p className="text-gray-500 text-sm max-w-sm">
          {t.messages.noChatsDesc}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {chats.map((chatItem) => {
        const tenantName = chatItem.tenants[0]?.name || (chat.noTenant || 'No tenant')
        const hasUnread = chatItem.unreadCount > 0

        return (
          <Link
            key={chatItem.propertyId}
            href={`${basePath}/${chatItem.propertyId}`}
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
                  {chatItem.propertyName}
                </h4>
                {chatItem.lastMessage && (
                  <span className={`text-xs shrink-0 ${
                    hasUnread ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}>
                    {formatTime(chatItem.lastMessage.createdAt)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500 truncate">
                  {chatItem.lastMessage
                    ? chatItem.lastMessage.isFromMe
                      ? `${t.messages.you}: ${chatItem.lastMessage.content}`
                      : chatItem.lastMessage.content
                    : t.messages.clickToChat}
                </p>
                {hasUnread && (
                  <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 shrink-0">
                    {chatItem.unreadCount}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-0.5 truncate">{tenantName}</p>
            </div>

            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
          </Link>
        )
      })}
    </div>
  )
}