// app/(tenant)/tenant/issues/page.tsx
// Tenant — Issues (Zgłoszenia) list and creation
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Plus, Loader2, Filter, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IssueCard } from '@/components/issues/issue-card'
import { IssueForm, type IssueFormData } from '@/components/issues/issue-form'

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
}

export default function TenantIssuesPage() {
  const router = useRouter()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [tenantCount, setTenantCount] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Fetch tenant's property info
  useEffect(() => {
    async function fetchTenantInfo() {
      try {
        const res = await fetch('/api/tenant/dashboard')
        if (!res.ok) throw new Error('Błąd ładowania')
        const data = await res.json()
        if (data.property?.id) {
          setPropertyId(data.property.id)
          // Get tenant count for privacy toggle
          const propRes = await fetch(`/api/properties/${data.property.id}`)
          if (propRes.ok) {
            const propData = await propRes.json()
            setTenantCount(propData.tenants?.filter((t: any) => t.isActive)?.length || 1)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd')
      }
    }
    fetchTenantInfo()
  }, [])

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ propertyId })
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/issues?${params}`)
      if (!res.ok) throw new Error('Błąd ładowania zgłoszeń')
      const data = await res.json()
      setIssues(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }, [propertyId, statusFilter])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // Create issue
  const handleCreateIssue = async (formData: IssueFormData) => {
    if (!propertyId) return

    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, ...formData }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Błąd tworzenia zgłoszenia')
    }

    setShowForm(false)
    fetchIssues()
  }

  // Open chat with issue reference
  const handleOpenChat = (issueId: string) => {
    if (propertyId) {
      router.push(`/tenant/messages/${propertyId}?issueId=${issueId}`)
    }
  }

  const STATUS_FILTERS = [
    { value: null, label: 'Wszystkie' },
    { value: 'OPEN', label: 'Otwarte' },
    { value: 'IN_PROGRESS', label: 'W toku' },
    { value: 'RESOLVED', label: 'Rozwiązane' },
    { value: 'CLOSED', label: 'Zamknięte' },
  ]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Zgłoszenia</h1>
          <p className="text-gray-500 mt-1">Zgłoś usterkę lub problem w mieszkaniu</p>
        </div>
        {propertyId && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nowe zgłoszenie
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && propertyId && (
        <Card className="p-4 lg:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nowe zgłoszenie</h2>
          <IssueForm
            propertyId={propertyId}
            showPrivacyToggle={tenantCount > 1}
            onSubmit={handleCreateIssue}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {/* Status filter */}
      {!showForm && (
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
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-3" />
          <p className="text-gray-600">{error}</p>
        </Card>
      )}

      {/* No property */}
      {!propertyId && !loading && !error && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Brak przypisanego mieszkania</h2>
          <p className="text-gray-500">Poproś właściciela o zaproszenie</p>
        </Card>
      )}

      {/* Issues list */}
      {!loading && !error && issues.length === 0 && propertyId && !showForm && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Brak zgłoszeń</h2>
          <p className="text-gray-500 mb-4">Nie masz jeszcze żadnych zgłoszeń</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Utwórz pierwsze zgłoszenie
          </Button>
        </Card>
      )}

      {!loading && issues.length > 0 && (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isOwner={false}
              onOpenChat={handleOpenChat}
            />
          ))}
        </div>
      )}
    </div>
  )
}
