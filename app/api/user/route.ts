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
        firstName: true,
        lastName: true,
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
    
    // Собираем полное имя для совместимости
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      ...dbUser,
      name: fullName, // Для совместимости
      role,
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
    const { 
      firstName, 
      lastName, 
      name, // для обратной совместимости
      phone, 
      bankName, 
      iban, 
      accountHolder 
    } = body

    // Валидация имени
    if (firstName !== undefined && firstName.trim().length > 0 && firstName.trim().length < 2) {
      return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 })
    }
    
    if (lastName !== undefined && lastName.trim().length > 0 && lastName.trim().length < 2) {
      return NextResponse.json({ error: 'Фамилия должна содержать минимум 2 символа' }, { status: 400 })
    }

    // Валидация символов в имени (только буквы, пробелы и дефисы)
    const nameRegex = /^[\p{L}\s-]*$/u
    if (firstName && !nameRegex.test(firstName)) {
      return NextResponse.json({ error: 'Имя может содержать только буквы' }, { status: 400 })
    }
    if (lastName && !nameRegex.test(lastName)) {
      return NextResponse.json({ error: 'Фамилия может содержать только буквы' }, { status: 400 })
    }

    // Формируем данные для обновления
    const updateData: Record<string, unknown> = {}

    // Поддержка нового формата (firstName + lastName)
    if (firstName !== undefined) {
      updateData.firstName = firstName.trim() || null
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName.trim() || null
    }

    // Обратная совместимость: если передано только name (старый формат)
    if (name !== undefined && firstName === undefined && lastName === undefined) {
      const nameParts = (name || '').trim().split(' ')
      updateData.firstName = nameParts[0] || null
      updateData.lastName = nameParts.slice(1).join(' ') || null
    }

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null
    }

    // Банковские реквизиты (только для владельцев)
    if (existingUser.isOwner) {
      if (bankName !== undefined) {
        updateData.bankName = bankName?.trim() || null
      }
      if (iban !== undefined) {
        updateData.iban = iban?.trim() || null
      }
      if (accountHolder !== undefined) {
        updateData.accountHolder = accountHolder?.trim() || null
      }
    }

    const dbUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      ...dbUser,
      name: fullName,
      role,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}