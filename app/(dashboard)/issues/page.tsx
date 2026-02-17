// app/(dashboard)/issues/page.tsx
// Owner — Issues (Zgłoszenia) management across all properties
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Loader2, Filter, Home, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IssueCard } from '@/components/issues/issue-card'

interface Property {
  id: string
  name: string
  address: string
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
  attachments: any[]
  messageCount?: number
  propertyId?: string
}

export default function OwnerIssuesPage() {
  const router = useRouter()

  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch('/api/properties')
        if (res.ok) {
          const data = await res.json()
          setProperties(data)
          if (!selectedPropertyId && data.length > 0) {
            setSelectedPropertyId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error fetching properties:', err)
      }
    }
    fetchProperties()
  }, [])

  // Fetch issues for selected property
  const fetchIssues = useCallback(async () => {
    if (!selectedPropertyId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ propertyId: selectedPropertyId })
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/issues?${params}`)
      if (res.ok) {
        const data = await res.json()
        setIssues(data)
      }
    } catch (err) {
      console.error('Error fetching issues:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedPropertyId, statusFilter])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // Status change handler
  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        fetchIssues() // Refresh
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd aktualizacji')
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  // Soft delete
  const handleDelete = async (issueId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zgłoszenie?')) return

    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      })

      if (res.ok) {
        fetchIssues()
      }
    } catch (err) {
      console.error('Error deleting issue:', err)
    }
  }

  // Open chat with issue reference
  const handleOpenChat = (issueId: string) => {
    if (selectedPropertyId) {
      router.push(`/messages/${selectedPropertyId}?issueId=${issueId}`)
    }
  }

  const STATUS_FILTERS = [
    { value: null, label: 'Wszystkie' },
    { value: 'OPEN', label: 'Otwarte' },
    { value: 'IN_PROGRESS', label: 'W toku' },
    { value: 'RESOLVED', label: 'Rozwiązane' },
    { value: 'CLOSED', label: 'Zamknięte' },
  ]

  // Count by status
  const statusCounts: Record<string, number> = {}
  issues.forEach((i) => {
    statusCounts[i.status] = (statusCounts[i.status] || 0) + 1
  })

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Zgłoszenia</h1>
        <p className="text-gray-500 mt-1">Zarządzaj zgłoszeniami od lokatorów</p>
      </div>

      {/* Property selector */}
      {properties.length > 1 && (
        <div className="mb-4">
          <div className="relative">
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full sm:w-80 h-10 px-3 pr-8 border rounded-md text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.address}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!loading && issues.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => {
            const labels: Record<string, { label: string; color: string }> = {
              OPEN: { label: 'Otwarte', color: 'text-blue-600' },
              IN_PROGRESS: { label: 'W toku', color: 'text-yellow-600' },
              RESOLVED: { label: 'Rozwiązane', color: 'text-green-600' },
              CLOSED: { label: 'Zamknięte', color: 'text-gray-500' },
            }
            const cfg = labels[s]
            return (
              <Card key={s} className="p-3 text-center cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              >
                <p className={`text-2xl font-bold ${cfg.color}`}>
                  {statusCounts[s] || 0}
                </p>
                <p className="text-xs text-gray-500">{cfg.label}</p>
              </Card>
            )
          })}
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!loading && issues.length === 0 && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Brak zgłoszeń</h2>
          <p className="text-gray-500">
            {statusFilter
              ? 'Brak zgłoszeń z tym statusem'
              : 'Lokatorzy nie zgłosili jeszcze żadnych problemów'}
          </p>
        </Card>
      )}

      {/* Issues list */}
      {!loading && issues.length > 0 && (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isOwner={true}
              onStatusChange={handleStatusChange}
              onOpenChat={handleOpenChat}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
