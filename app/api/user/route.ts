// app/api/user/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - получить пользователя (БЕЗ автосоздания)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ИСПРАВЛЕНИЕ БАГ 1: Только ищем, НЕ создаём
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!dbUser) {
      return NextResponse.json({ 
        error: 'User not found. Please complete registration.',
        code: 'USER_NOT_REGISTERED'
      }, { status: 404 })
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - обновить профиль пользователя
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем что пользователь существует
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_REGISTERED'
      }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone, bankName, iban, accountHolder } = body

    const dbUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        name, 
        phone,
        // Банковские реквизиты (только для OWNER)
        ...(existingUser.role === 'OWNER' && {
          bankName,
          iban,
          accountHolder,
        })
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
