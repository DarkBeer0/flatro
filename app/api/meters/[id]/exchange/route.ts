// app/api/meters/[id]/exchange/route.ts
// Flatro — Meter Exchange (replace old meter with new)

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { exchangeMeter } from '@/lib/utilities/meter-exchange'

// POST /api/meters/[id]/exchange
// Body: { finalReading, newMeterNumber?, newSerialNumber?, newInitialReading, notes? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: meterId } = await params
    const body = await request.json()

    const { finalReading, newMeterNumber, newSerialNumber, newInitialReading, notes } = body

    if (finalReading === undefined || newInitialReading === undefined) {
      return NextResponse.json(
        { error: 'finalReading and newInitialReading are required' },
        { status: 400 }
      )
    }

    const result = await exchangeMeter(
      {
        oldMeterId: meterId,
        finalReading: parseFloat(finalReading),
        newMeterNumber: newMeterNumber || undefined,
        newSerialNumber: newSerialNumber || undefined,
        newInitialReading: parseFloat(newInitialReading),
        notes: notes || undefined,
      },
      user.id
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error exchanging meter:', error)

    if (
      error.message?.includes('not found') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('already') ||
      error.message?.includes('cannot')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}