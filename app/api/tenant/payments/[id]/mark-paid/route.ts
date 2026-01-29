// app/api/tenant/payments/[id]/mark-paid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/tenant/payments/[id]/mark-paid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Найти tenant запись
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: authUser.id }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Проверить что платёж принадлежит этому жильцу
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        tenantId: tenant.id,
        status: { in: ['PENDING', 'OVERDUE'] }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found or cannot be marked as paid' },
        { status: 404 }
      )
    }

    // Обновить статус на "ожидает подтверждения"
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'PENDING_CONFIRMATION',
        markedPaidAt: new Date(),
      }
    })

    // TODO: Отправить уведомление владельцу

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Error marking payment as paid:', error)
    return NextResponse.json(
      { error: 'Failed to mark payment as paid' },
      { status: 500 }
    )
  }
}
