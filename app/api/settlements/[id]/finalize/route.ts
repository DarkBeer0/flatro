// app/api/settlements/[id]/finalize/route.ts
// Flatro — Finalize settlement (commit to tenant ledger)

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { finalizeSettlement } from '@/lib/utilities/settlement-finalize'

// POST /api/settlements/[id]/finalize
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const result = await finalizeSettlement(id, user.id)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error finalizing settlement:', error)

    // Business logic errors
    if (error.message?.includes('not found') || error.message?.includes('cannot')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}