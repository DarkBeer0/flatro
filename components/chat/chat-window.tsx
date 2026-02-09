// components/chat/chat-window.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, MessageSquare, ArrowLeft, User } from 'lucide-react'
import { MessageBubble, DateSeparator } from './message-bubble'
import { MessageInput } from './message-input'
import Link from 'next/link'

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  sender: {
    id: string
    name: string | null
  }
}

interface ChatPartner {
  id: string
  name: string | null
  email?: string
}

interface Property {
  id: string
  name: string
  address: string
}

interface ChatWindowProps {
  propertyId: string
  backLink?: string
  backLabel?: string
  pollingInterval?: number
}

export function ChatWindow({
  propertyId,
  backLink,
  backLabel = 'Назад',
  pollingInterval = 5000,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [property, setProperty] = useState<Property | null>(null)
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollToBottom = useRef(true)
  
  // Храним ID отправленных temp сообщений для отслеживания
  const pendingMessages = useRef<Set<string>>(new Set())

  const scrollToBottom = useCallback((force = false) => {
    if (force || shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Умное обновление сообщений без мигания
  const updateMessages = useCallback((serverMessages: Message[]) => {
    setMessages(prev => {
      // Получаем temp сообщения (ещё не подтверждённые сервером)
      const tempMessages = prev.filter(m => m.id.startsWith('temp-'))
      
      // Создаём Set серверных ID для быстрого поиска
      const serverIds = new Set(serverMessages.map(m => m.id))
      
      // Проверяем какие temp сообщения уже пришли с сервера (по content + senderId)
      const confirmedTempIds = new Set<string>()
      tempMessages.forEach(temp => {
        const found = serverMessages.find(
          s => s.senderId === temp.senderId && 
               s.content === temp.content &&
               // Проверяем что время создания близко (в пределах 30 сек)
               Math.abs(new Date(s.createdAt).getTime() - new Date(temp.createdAt).getTime()) < 30000
        )
        if (found) {
          confirmedTempIds.add(temp.id)
          pendingMessages.current.delete(temp.id)
        }
      })
      
      // Оставляем только неподтверждённые temp сообщения
      const remainingTemp = tempMessages.filter(t => !confirmedTempIds.has(t.id))
      
      // Проверяем нужно ли вообще обновлять
      const prevServerMessages = prev.filter(m => !m.id.startsWith('temp-'))
      
      // Если серверные сообщения не изменились и нет подтверждённых temp - не обновляем
      if (
        prevServerMessages.length === serverMessages.length &&
        confirmedTempIds.size === 0 &&
        prevServerMessages.every((m, i) => 
          m.id === serverMessages[i]?.id && 
          m.isRead === serverMessages[i]?.isRead
        )
      ) {
        return prev // Возвращаем предыдущее состояние без изменений
      }
      
      // Объединяем серверные + оставшиеся temp
      return [...serverMessages, ...remainingTemp]
    })
  }, [])

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res = await fetch(`/api/messages/${propertyId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch messages')
      }
      
      const data = await res.json()
      
      if (initial) {
        setMessages(data.messages)
        setLoading(false)
        setTimeout(() => scrollToBottom(true), 100)
      } else {
        // Используем умное обновление
        updateMessages(data.messages)
      }
      
      setProperty(data.property)
      setChatPartner(data.chatPartner)
      setCurrentUserId(data.currentUserId)
      
    } catch (err) {
      console.error('Error fetching messages:', err)
      if (initial) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
        setLoading(false)
      }
    }
  }, [propertyId, scrollToBottom, updateMessages])

  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/messages/${propertyId}`, { method: 'PATCH' })
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [propertyId])

  useEffect(() => {
    fetchMessages(true)
    markAsRead()
  }, [fetchMessages, markAsRead])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages()
      markAsRead()
    }, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchMessages, markAsRead, pollingInterval])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      shouldScrollToBottom.current = scrollHeight - scrollTop - clientHeight < 100
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(async (content: string) => {
    if (!currentUserId) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      receiverId: chatPartner?.id || '',
      content,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: null }
    }
    
    pendingMessages.current.add(tempId)
    setMessages(prev => [...prev, tempMessage])
    shouldScrollToBottom.current = true
    scrollToBottom(true)

    try {
      const res = await fetch(`/api/messages/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to send message:', errorData)
        pendingMessages.current.delete(tempId)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        return
      }
      const newMessage = await res.json()
      pendingMessages.current.delete(tempId)
      
      // Заменяем temp на реальное сообщение
      setMessages(prev => prev.map(m => m.id === tempId ? newMessage : m))
      
    } catch (error) {
      pendingMessages.current.delete(tempId)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      console.error('Network error:', error)
    }
  }, [currentUserId, chatPartner?.id, propertyId, scrollToBottom])

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: Date; messages: Message[] }[] = []
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt)
      const dateKey = messageDate.toDateString()
      
      const existingGroup = groups.find(g => g.date.toDateString() === dateKey)
      if (existingGroup) {
        existingGroup.messages.push(message)
      } else {
        groups.push({ date: messageDate, messages: [message] })
      }
    })
    
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        {backLink && (
          <Link href={backLink} className="text-blue-600 hover:underline">
            {backLabel}
          </Link>
        )}
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        {backLink && (
          <Link
            href={backLink}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
        )}
        
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {chatPartner?.name || 'Чат'}
          </h3>
          {property && (
            <p className="text-xs text-gray-500 truncate">
              {property.name} • {property.address}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{ minHeight: '300px', maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Начните общение
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Напишите первое сообщение, чтобы начать диалог
            </p>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <DateSeparator date={group.date} />
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  createdAt={message.createdAt}
                  isFromMe={message.senderId === currentUserId}
                  isRead={message.isRead}
                  senderName={message.sender.name}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        disabled={!chatPartner?.id}
        placeholder={
          chatPartner?.id
            ? `Сообщение для ${chatPartner.name || 'собеседника'}...`
            : 'Нет доступного собеседника'
        }
      />
    </div>
  )
}
