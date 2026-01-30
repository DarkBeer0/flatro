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

    // Только ищем, НЕ создаём
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isOwner: true,
        isTenant: true,
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

    // Вычисляем role для совместимости
    const role = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')

    return NextResponse.json({
      ...dbUser,
      role, // Для совместимости
    })
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
        // Банковские реквизиты (только для владельцев)
        ...(existingUser.isOwner && {
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
        isOwner: true,
        isTenant: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        updatedAt: true,
      }
    })

    const role = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')

    return NextResponse.json({
      ...dbUser,
      role,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
