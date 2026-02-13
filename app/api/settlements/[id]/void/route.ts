// app/api/settlements/[id]/void/route.ts
// Flatro — Void a finalized settlement (reverse ledger entries)

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { voidSettlement } from '@/lib/utilities/settlement-finalize'

// POST /api/settlements/[id]/void
// Body: { reason: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    if (!body.reason || body.reason.trim().length < 3) {
      return NextResponse.json(
        { error: 'Reason is required (min 3 characters)' },
        { status: 400 }
      )
    }

    const result = await voidSettlement(id, user.id, body.reason.trim())

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error voiding settlement:', error)

    if (error.message?.includes('not found') || error.message?.includes('not FINALIZED')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}