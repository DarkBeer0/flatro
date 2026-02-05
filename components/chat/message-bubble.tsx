// components/chat/message-bubble.tsx
'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  content: string
  createdAt: string | Date
  isFromMe: boolean
  isRead: boolean
  senderName?: string | null
  showSender?: boolean
}

export function MessageBubble({
  content,
  createdAt,
  isFromMe,
  isRead,
  senderName,
  showSender = false,
}: MessageBubbleProps) {
  const date = new Date(createdAt)
  
  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm')
    }
    if (isYesterday(date)) {
      return `Вчера, ${format(date, 'HH:mm')}`
    }
    return format(date, 'd MMM, HH:mm', { locale: ru })
  }

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 ${
          isFromMe
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {showSender && !isFromMe && senderName && (
          <p className="text-xs font-medium text-blue-600 mb-1">
            {senderName}
          </p>
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">
          {content}
        </p>
        
        <div className={`flex items-center justify-end gap-1 mt-1 ${
          isFromMe ? 'text-blue-200' : 'text-gray-400'
        }`}>
          <span className="text-[10px]">
            {formatTime(date)}
          </span>
          
          {isFromMe && (
            isRead ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )
          )}
        </div>
      </div>
    </div>
  )
}

// Компонент для разделителя дат
interface DateSeparatorProps {
  date: Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Сегодня'
    if (isYesterday(date)) return 'Вчера'
    return format(date, 'd MMMM yyyy', { locale: ru })
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
        {formatDate(date)}
      </div>
    </div>
  )
}
