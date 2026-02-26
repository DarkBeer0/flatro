// components/chat/message-bubble.tsx
// ============================================================
// FIX: Render fallback state when attachmentPath exists but
//      attachmentUrl is null (signed URL failed or still loading)
//
// PROBLEM: Message with content=null + attachmentUrl=null renders
//   as an invisible empty bubble — just a floating timestamp.
//   This happens when:
//   A) The storage bucket/policy blocks signed URL generation
//   B) The message was sent before policies were applied
//
// FIX: When attachmentPath is known but URL is null, show a
//   placeholder image icon with "Zdjęcie" label so the user
//   sees *something* and the space isn't mysteriously blank.
// ============================================================
'use client'

import { format } from 'date-fns'
import { Check, CheckCheck, Image as ImageIcon } from 'lucide-react'
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
  attachmentPath?: string | null   // ← NEW: used to detect "has photo but no URL yet"
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
  attachmentPath,
  attachmentMetadata,
  issueRef,
  onIssueClick,
}: MessageBubbleProps) {
  const isOwn = isOwnProp ?? isFromMe ?? false
  const time = format(new Date(createdAt), 'HH:mm')
  const hasAttachment = !!attachmentUrl
  const hasContent = !!content?.trim()
  // Message has a file saved but signed URL not yet available
  const hasPendingAttachment = !attachmentUrl && !!attachmentPath

  // If truly nothing to show (shouldn't happen in practice), skip rendering
  if (!hasContent && !hasAttachment && !hasPendingAttachment && !issueRef) {
    return null
  }

  const isImageOnly = hasAttachment && !hasContent

  // Calculate thumbnail dimensions
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
            ? isImageOnly ? '' : 'bg-blue-600 text-white rounded-br-md'
            : isImageOnly ? '' : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {/* Issue reference header */}
        {issueRef && (
          <button
            onClick={() => onIssueClick?.(issueRef.id)}
            className={`flex items-center gap-1.5 text-xs mb-1.5 pb-1.5 border-b ${
              isOwn ? 'border-white/30 text-white/70 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-700'
            } w-full text-left`}
          >
            <span className="truncate">{issueRef.title}</span>
            <span className={`ml-auto shrink-0 ${STATUS_LABELS[issueRef.status]?.color}`}>
              {STATUS_LABELS[issueRef.status]?.label}
            </span>
          </button>
        )}

        {/* Attachment image */}
        {hasAttachment && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ width: thumbW, height: thumbH }}
          >
            <ImageLightbox
              src={attachmentUrl!}
              alt="Zdjęcie"
              thumbnailClassName="w-full h-full"
            />
          </div>
        )}

        {/* ── FIX: Pending attachment placeholder ─────────────── */}
        {hasPendingAttachment && (
          <div
            className={`rounded-xl flex items-center justify-center gap-2 px-4 ${
              isOwn ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            style={{ width: thumbW, height: thumbH }}
          >
            <ImageIcon className={`h-8 w-8 ${isOwn ? 'text-white/60' : 'text-gray-400'}`} />
            <span className={`text-sm ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
              Zdjęcie
            </span>
          </div>
        )}

        {/* Text content */}
        {hasContent && (
          <p className={`text-sm whitespace-pre-wrap break-words ${
            hasAttachment || hasPendingAttachment ? 'mt-1.5' : ''
          }`}>
            {content}
          </p>
        )}

        {/* Timestamp + read indicator */}
        <div className={`flex items-center gap-1 mt-1 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span className={`text-[10px] ${
            isOwn
              ? isImageOnly ? 'text-gray-500' : 'text-white/70'
              : 'text-gray-400'
          }`}>
            {time}
          </span>
          {isOwn && (
            isRead
              ? <CheckCheck className={`h-3 w-3 ${isImageOnly ? 'text-blue-500' : 'text-white/70'}`} />
              : <Check className={`h-3 w-3 ${isImageOnly ? 'text-gray-400' : 'text-white/70'}`} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export function DateSeparator({ date }: { date: Date }) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  let label: string
  if (date.toDateString() === now.toDateString()) {
    label = 'Dzisiaj'
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = 'Wczoraj'
  } else {
    label = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}