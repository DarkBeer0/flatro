// components/issues/issue-card.tsx
// Polished Issue (Zgłoszenie) card with Polish UI labels
'use client'

import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  AlertTriangle, Clock, CheckCircle, XCircle,
  MessageSquare, Image as ImageIcon, Lock,
  ChevronRight, Wrench, Zap, Droplets,
  Thermometer, Bug, Sparkles, HelpCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageLightbox } from '@/components/ui/image-lightbox'

// ============ Types ============

interface IssueAttachment {
  id: string
  filePath: string
  fileName: string
  signedUrl: string | null
}

interface Issue {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  isPrivate: boolean
  createdAt: string
  resolvedAt?: string | null
  closedAt?: string | null
  createdBy: { id: string; name: string }
  attachments: IssueAttachment[]
  messageCount?: number
}

interface IssueCardProps {
  issue: Issue
  isOwner: boolean
  onStatusChange?: (issueId: string, newStatus: string) => void
  onOpenChat?: (issueId: string) => void
  onDelete?: (issueId: string) => void
}

// ============ Constants — Polish labels ============

const STATUS_CONFIG: Record<string, {
  label: string
  icon: typeof AlertTriangle
  color: string
  bgColor: string
}> = {
  OPEN: {
    label: 'Otwarte',
    icon: AlertTriangle,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'W toku',
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  RESOLVED: {
    label: 'Rozwiązane',
    icon: CheckCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  CLOSED: {
    label: 'Zamknięte',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
  },
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Wrench }> = {
  PLUMBING: { label: 'Hydraulika', icon: Droplets },
  ELECTRICAL: { label: 'Elektryka', icon: Zap },
  HEATING: { label: 'Ogrzewanie', icon: Thermometer },
  APPLIANCE: { label: 'Sprzęt AGD', icon: Wrench },
  STRUCTURAL: { label: 'Konstrukcja', icon: Wrench },
  PEST_CONTROL: { label: 'Dezynsekcja', icon: Bug },
  CLEANING: { label: 'Czystość', icon: Sparkles },
  OTHER: { label: 'Inne', icon: HelpCircle },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Niski', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Średni', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'Wysoki', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Pilne', color: 'bg-red-100 text-red-700' },
}

const NEXT_STATUS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: ['OPEN'],
}

// ============ Component ============

export function IssueCard({
  issue,
  isOwner,
  onStatusChange,
  onOpenChat,
  onDelete,
}: IssueCardProps) {
  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN
  const category = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG.OTHER
  const priority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.MEDIUM
  const StatusIcon = status.icon
  const CategoryIcon = category.icon

  const formattedDate = format(new Date(issue.createdAt), 'dd.MM.yyyy, HH:mm', { locale: pl })

  const imageAttachments = issue.attachments
    .filter((a) => a.signedUrl)
    .map((a) => ({ src: a.signedUrl!, alt: a.fileName }))

  return (
    <Card className={`overflow-hidden border ${status.bgColor} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${status.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${status.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">
                  {issue.title}
                </h3>
                {issue.isPrivate && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Lock className="h-3 w-3" />
                    Prywatne
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{formattedDate}</span>
                <span>·</span>
                <span>{issue.createdBy.name}</span>
              </div>
            </div>
          </div>

          {/* Priority badge */}
          <Badge className={`${priority.color} text-xs shrink-0`}>
            {priority.label}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        {/* Category */}
        <div className="flex items-center gap-1.5 mb-2">
          <CategoryIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">{category.label}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
          {issue.description}
        </p>

        {/* Photo thumbnails */}
        {imageAttachments.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {imageAttachments.map((img, idx) => (
              <ImageLightbox
                key={idx}
                src={img.src}
                alt={img.alt}
                images={imageAttachments}
                startIndex={idx}
                thumbnailClassName="w-20 h-20 rounded-lg flex-shrink-0 border border-gray-200"
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — status + actions */}
      <div className="px-4 py-3 bg-white/60 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 font-medium ${status.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>

          {/* Message count */}
          {(issue.messageCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {issue.messageCount}
            </span>
          )}

          {/* Photo count */}
          {issue.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {issue.attachments.length}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Open Chat button */}
          {onOpenChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChat(issue.id)}
              className="text-xs h-8"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Otwórz czat
            </Button>
          )}

          {/* Status change (owner only) */}
          {isOwner && onStatusChange && NEXT_STATUS[issue.status] && (
            <div className="flex gap-1">
              {NEXT_STATUS[issue.status].map((nextStatus) => {
                const next = STATUS_CONFIG[nextStatus]
                if (!next) return null
                return (
                  <Button
                    key={nextStatus}
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(issue.id, nextStatus)}
                    className="text-xs h-8"
                  >
                    {next.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
