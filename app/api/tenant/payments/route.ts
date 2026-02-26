// app/api/tenant/payments/route.ts
// GET /api/tenant/payments — получить платежи жильца
// UPDATED: добавлен owner.stripeOnboarded для переключения между Stripe и IBAN

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Найти tenant запись
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: authUser.id },
      include: {
        user: {
          select: {
            bankName: true,
            iban: true,
            accountHolder: true,
            stripeOnboarded: true, // ← NEW: для переключения UI
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json([])
    }

    const payments = await prisma.payment.findMany({
      where: { tenantId: tenant.id },
      orderBy: { dueDate: 'desc' },
    })

    // Добавляем реквизиты владельца к каждому платежу
    const paymentsWithOwner = payments.map((payment) => ({
      ...payment,
      owner: {
        bankName: tenant.user.bankName,
        iban: tenant.user.iban,
        accountHolder: tenant.user.accountHolder,
        stripeOnboarded: tenant.user.stripeOnboarded, // ← NEW
      },
    }))

    return NextResponse.json(paymentsWithOwner)
  } catch (error) {
    console.error('Error fetching tenant payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}