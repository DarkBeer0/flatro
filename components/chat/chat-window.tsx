// components/chat/chat-window.tsx
// UPDATED: Added attachment support for sending images in chat
// FIX: Integrates ChatAttachmentInput flow into message sending
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, MessageSquare, ArrowLeft, User } from 'lucide-react'
import { MessageBubble, DateSeparator } from './message-bubble'
import { MessageInput } from './message-input'
import Link from 'next/link'

interface AttachmentData {
  path: string
  metadata: { width: number; height: number; size: number; mime_type: string }
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string | null // V6: nullable for image-only messages
  isRead: boolean
  readAt: string | null
  createdAt: string
  attachmentUrl?: string | null
  attachmentMetadata?: {
    width?: number
    height?: number
    size?: number
    mime_type?: string
  } | null
  issueRef?: {
    id: string
    title: string
    status: string
  } | null
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
  
  const pendingMessages = useRef<Set<string>>(new Set())

  const scrollToBottom = useCallback((force = false) => {
    if (force || shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Smart message update without flicker
  const updateMessages = useCallback((serverMessages: Message[]) => {
    setMessages(prev => {
      const tempMessages = prev.filter(m => 
        m.id.startsWith('temp-') && pendingMessages.current.has(m.id)
      )
      
      const serverIds = new Set(serverMessages.map(m => m.id))
      const uniqueTemp = tempMessages.filter(m => !serverIds.has(m.id))
      
      return [...serverMessages, ...uniqueTemp]
    })
  }, [])

  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/messages/${propertyId}`)
      if (!res.ok) throw new Error('Ошибка загрузки сообщений')
      
      const data = await res.json()

      if (data.property) setProperty(data.property)
      if (data.chatPartner) setChatPartner(data.chatPartner)
      if (data.currentUserId) setCurrentUserId(data.currentUserId)

      updateMessages(data.messages || [])

      if (isInitial) {
        setLoading(false)
        setTimeout(() => scrollToBottom(true), 100)
      }
    } catch (err) {
      if (isInitial) {
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

  // UPDATED: handleSend now supports optional attachment
  const handleSend = useCallback(async (content: string, attachment?: AttachmentData) => {
    if (!currentUserId) return

    const hasContent = !!content.trim()
    const hasAttachment = !!attachment

    // Must have at least text or attachment
    if (!hasContent && !hasAttachment) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      receiverId: chatPartner?.id || '',
      content: hasContent ? content : null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      // Show local preview for attachment
      attachmentUrl: undefined, // Will be resolved by server
      attachmentMetadata: hasAttachment ? attachment.metadata : null,
      sender: { id: currentUserId, name: null }
    }
    
    pendingMessages.current.add(tempId)
    setMessages(prev => [...prev, tempMessage])
    shouldScrollToBottom.current = true
    scrollToBottom(true)

    try {
      // Build request body with optional attachment fields
      const body: Record<string, unknown> = {}
      if (hasContent) body.content = content
      if (hasAttachment) {
        body.attachmentPath = attachment.path
        body.attachmentMetadata = attachment.metadata
      }

      const res = await fetch(`/api/messages/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      
      // Replace temp with real message
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
                  attachmentUrl={message.attachmentUrl}
                  attachmentMetadata={message.attachmentMetadata}
                  issueRef={message.issueRef}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — now with attachment support */}
      <MessageInput
        onSend={handleSend}
        disabled={!chatPartner?.id}
        propertyId={propertyId}
        placeholder={
          chatPartner?.id
            ? `Сообщение для ${chatPartner.name || 'собеседника'}...`
            : 'Нет доступного собеседника'
        }
      />
    </div>
  )
}