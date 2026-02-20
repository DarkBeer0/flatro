// app/api/user/settings/route.ts
// Flatro — Настройки уведомлений пользователя (GET / PUT)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/settings — получить настройки
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // upsert — создаём запись с дефолтами, если ещё не существует
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailPaymentReminders: true,
        emailContractExpiry: true,
        emailNewTenant: true,
      },
      update: {},
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[GET /api/user/settings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user/settings — обновить настройки
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Принимаем только разрешённые поля
    const allowedFields = ['emailPaymentReminders', 'emailContractExpiry', 'emailNewTenant']
    const updateData: Record<string, boolean> = {}

    for (const field of allowedFields) {
      if (typeof body[field] === 'boolean') {
        updateData[field] = body[field]
      }
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailPaymentReminders: updateData.emailPaymentReminders ?? true,
        emailContractExpiry: updateData.emailContractExpiry ?? true,
        emailNewTenant: updateData.emailNewTenant ?? true,
      },
      update: updateData,
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[PUT /api/user/settings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
