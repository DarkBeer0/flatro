// components/invite-tenant.tsx
'use client'

import { useState } from 'react'
import { UserPlus, Copy, Check, Loader2, Link as LinkIcon, Trash2, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Invitation {
  id: string
  code: string
  email: string | null
  expiresAt: string
  usedAt: string | null
}

interface InviteTenantProps {
  propertyId: string
  propertyName: string
  invitations: Invitation[]
  onInvitationCreated: () => void
}

export function InviteTenant({ propertyId, propertyName, invitations, onInvitationCreated }: InviteTenantProps) {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          email: email || null,
        }),
      })

      if (res.ok) {
        setEmail('')
        setShowForm(false)
        onInvitationCreated()
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
      const res = await fetch(`/api/invitations/${code}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onInvitationCreated()
      }
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

  const activeInvitations = invitations.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date())

  return (
    <Card className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          Пригласить жильца
        </h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Создать ссылку
          </Button>
        )}
      </div>

      {/* Форма создания приглашения */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div>
              <Label htmlFor="inviteEmail">Email жильца (опционально)</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="tenant@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Если указать — только этот email сможет зарегистрироваться
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Создать'
                )}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Список активных приглашений */}
      {activeInvitations.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Активные приглашения:</p>
          {activeInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border truncate max-w-[200px]">
                    {baseUrl}/invite/{inv.code}
                  </code>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {inv.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {inv.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    до {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLink(inv.code)}
                  className="h-8 w-8 p-0"
                >
                  {copiedId === inv.code ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(inv.code)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Создайте ссылку-приглашение, чтобы жилец мог зарегистрироваться и получить доступ к личному кабинету.
        </p>
      )}
    </Card>
  )
}
