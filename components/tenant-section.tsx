// components/tenant-section.tsx
// Unified component: tenants list + invite functionality in one card
// Replaces separate "Арендаторы" card + "Пригласить жильца" (InviteTenant) card
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Copy, Check, Loader2, Link as LinkIcon,
  Trash2, Clock, Mail, Send, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/context'

interface Tenant {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  isActive: boolean
}

interface Invitation {
  id: string
  code: string
  email: string | null
  expiresAt: string
  usedAt: string | null
}

interface TenantSectionProps {
  propertyId: string
  propertyName: string
  tenants: Tenant[]
  invitations: Invitation[]
  onDataChanged: () => void
}

export function TenantSection({
  propertyId,
  propertyName,
  tenants,
  invitations,
  onDataChanged,
}: TenantSectionProps) {
  const { t } = useLocale()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showInvitations, setShowInvitations] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const activeTenants = tenants.filter(t => t.isActive)
  const activeInvitations = invitations.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date())

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, email: email.trim() || null }),
      })

      if (res.ok) {
        setEmail('')
        setShowInviteForm(false)
        setShowInvitations(true)
        onDataChanged()
      }
    } catch (error) {
      console.error('Error creating invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(code: string) {
    if (!confirm('Отозвать приглашение?')) return

    try {
      const res = await fetch(`/api/invitations/${code}`, { method: 'DELETE' })
      if (res.ok) onDataChanged()
    } catch (error) {
      console.error('Error deleting invitation:', error)
    }
  }

  function copyLink(code: string) {
    const link = `${baseUrl}/invite/${code}`
    navigator.clipboard.writeText(link)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Card className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          {t.tenants.title}
          {activeTenants.length > 0 && (
            <span className="text-xs font-normal text-gray-400">({activeTenants.length})</span>
          )}
        </h3>
      </div>

      {/* ── Tenant list ── */}
      {activeTenants.length > 0 ? (
        <div className="space-y-2 mb-4">
          {activeTenants.map((tenant) => (
            <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-medium text-sm">
                      {tenant.firstName[0]}{tenant.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{tenant.firstName} {tenant.lastName}</p>
                    {tenant.email && <p className="text-xs text-gray-500">{tenant.email}</p>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{t.common.details} →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* ── Empty state with invite CTA ── */
        !showInviteForm && activeInvitations.length === 0 && (
          <div className="text-center py-6 mb-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-4">{t.properties.noTenant}</p>
            <Button
              size="sm"
              onClick={() => setShowInviteForm(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Пригласить жильца
            </Button>
          </div>
        )
      )}

      {/* ── Invite form (inline) ── */}
      {showInviteForm && (
        <form onSubmit={handleCreate} className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Новое приглашение
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="inviteEmail" className="text-xs text-blue-800">Email жильца (опционально)</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="tenant@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-blue-600 mt-1">
                Если указать — только этот email сможет зарегистрироваться
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                    Создать ссылку
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowInviteForm(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Active invitations ── */}
      {activeInvitations.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowInvitations(!showInvitations)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2 w-full"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Активные приглашения ({activeInvitations.length})</span>
            {showInvitations ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>

          {showInvitations && (
            <div className="space-y-2">
              {activeInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-2 py-0.5 rounded border truncate max-w-[180px] block">
                        /invite/{inv.code.slice(0, 8)}...
                      </code>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      {inv.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {inv.email}
                        </span>
                      )}
                      <span>до {new Date(inv.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(inv.code)}
                      className="h-7 w-7 p-0"
                    >
                      {copiedId === inv.code ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(inv.code)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom action: invite more (when tenants exist or invitations exist but form hidden) ── */}
      {(activeTenants.length > 0 || activeInvitations.length > 0) && !showInviteForm && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Пригласить жильца
          </button>
        </div>
      )}
    </Card>
  )
}