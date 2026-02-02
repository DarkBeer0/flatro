// app/api/payments/[id]/reject/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST — владелец отклоняет платёж
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Опционально: причина отклонения
    let reason: string | null = null
    try {
      const body = await request.json()
      reason = body.reason || null
    } catch {
      // Нет тела запроса — ок
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json({ 
        error: `Нельзя отклонить платёж со статусом "${payment.status}"` 
      }, { status: 400 })
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      select: {
        id: true,
        status: true,
        rejectedAt: true,
        rejectionReason: true,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error rejecting payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
