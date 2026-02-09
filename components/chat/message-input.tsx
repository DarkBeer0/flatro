// components/chat/message-input.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Введите сообщение...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Автоматический resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed || disabled) return

    // Сразу очищаем поле
    setMessage('')
    // Возвращаем фокус в поле ввода
    textareaRef.current?.focus()
    // Отправляем в фоне (fire and forget)
    Promise.resolve(onSend(trimmed)).catch((err) => {
      console.error('Failed to send message:', err)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-full border border-gray-300 px-4 py-2.5 text-sm 
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                     disabled:bg-gray-50 disabled:text-gray-500
                     max-h-[120px] overflow-y-auto"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white 
                     flex items-center justify-center
                     hover:bg-blue-700 transition-colors
                     disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        Enter — отправить, Shift+Enter — новая строка
      </p>
    </div>
  )
}