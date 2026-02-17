// components/chat/message-bubble.tsx
// UPDATED: Supports image attachments, issue references, and image-only messages
'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Check, CheckCheck, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import { ImageLightbox } from '@/components/ui/image-lightbox'

interface IssueRef {
  id: string
  title: string
  status: string
}

interface MessageBubbleProps {
  content: string | null
  createdAt: string
  isOwn?: boolean
  isFromMe?: boolean
  isRead: boolean
  senderName?: string | null
  attachmentUrl?: string | null
  attachmentMetadata?: {
    width?: number
    height?: number
    size?: number
    mime_type?: string
  } | null
  issueRef?: IssueRef | null
  onIssueClick?: (issueId: string) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Otwarte', color: 'text-blue-600' },
  IN_PROGRESS: { label: 'W toku', color: 'text-yellow-600' },
  RESOLVED: { label: 'Rozwiązane', color: 'text-green-600' },
  CLOSED: { label: 'Zamknięte', color: 'text-gray-500' },
}

export function MessageBubble({
  content,
  createdAt,
  isOwn: isOwnProp,
  isFromMe,
  isRead,
  senderName,
  attachmentUrl,
  attachmentMetadata,
  issueRef,
  onIssueClick,
}: MessageBubbleProps) {
  const isOwn = isOwnProp ?? isFromMe ?? false
  const time = format(new Date(createdAt), 'HH:mm')
  const hasAttachment = !!attachmentUrl
  const hasContent = !!content?.trim()
  const isImageOnly = hasAttachment && !hasContent

  // Calculate thumbnail dimensions (max 280px wide, maintain aspect ratio)
  let thumbW = 280
  let thumbH = 200
  if (attachmentMetadata?.width && attachmentMetadata?.height) {
    const ratio = attachmentMetadata.width / attachmentMetadata.height
    if (ratio > 1) {
      thumbW = Math.min(280, attachmentMetadata.width)
      thumbH = Math.round(thumbW / ratio)
    } else {
      thumbH = Math.min(280, attachmentMetadata.height)
      thumbW = Math.round(thumbH * ratio)
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] ${
          isImageOnly ? '' : 'rounded-2xl px-4 py-2.5'
        } ${
          isOwn
            ? isImageOnly
              ? ''
              : 'bg-blue-600 text-white rounded-br-md'
            : isImageOnly
            ? ''
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {/* Issue reference header */}
        {issueRef && (
          <button
            onClick={() => onIssueClick?.(issueRef.id)}
            className={`flex items-center gap-1.5 text-xs mb-1.5 pb-1.5 border-b ${
              isOwn
                ? 'border-white/20 text-white/80 hover:text-white'
                : 'border-gray-200 text-gray-500 hover:text-blue-600'
            } transition-colors`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>
              Dotyczy zgłoszenia: {issueRef.title}
            </span>
            <span className={`${STATUS_LABELS[issueRef.status]?.color || ''} font-medium`}>
              ({STATUS_LABELS[issueRef.status]?.label || issueRef.status})
            </span>
          </button>
        )}

        {/* Image attachment */}
        {hasAttachment && (
          <div className={`${hasContent ? 'mb-2' : ''} ${isImageOnly ? 'rounded-2xl overflow-hidden' : 'rounded-lg overflow-hidden'}`}>
            <ImageLightbox
              src={attachmentUrl!}
              alt="Załącznik"
              thumbnailClassName={`block`}
            />
          </div>
        )}

        {/* Text content */}
        {hasContent && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}

        {/* Timestamp + read status */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 ${
            isOwn ? 'text-white/60' : 'text-gray-400'
          }`}
        >
          <span className="text-[11px]">{time}</span>
          {isOwn && (
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

// Date separator
interface DateSeparatorProps {
  date: string | Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const d = typeof date === 'string' ? new Date(date) : date
  let label: string

  if (isToday(d)) {
    label = 'Dzisiaj'
  } else if (isYesterday(d)) {
    label = 'Wczoraj'
  } else {
    label = format(d, 'd MMMM yyyy', { locale: pl })
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}
