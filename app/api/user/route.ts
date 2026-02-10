// app/api/user/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - получить пользователя
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        // V4: Персональные данные владельца
        address: true,
        city: true,
        postalCode: true,
        nationalId: true,
        nationalIdType: true,
        // Банковские реквизиты
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

    const role = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      ...dbUser,
      name: fullName,
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
      firstName, lastName, name, phone, 
      bankName, iban, accountHolder,
      // V4: Новые поля для договоров
      address, city, postalCode, nationalId, nationalIdType,
    } = body

    // Валидация имени
    if (firstName !== undefined && firstName.trim().length > 0 && firstName.trim().length < 2) {
      return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 })
    }
    if (lastName !== undefined && lastName.trim().length > 0 && lastName.trim().length < 2) {
      return NextResponse.json({ error: 'Фамилия должна содержать минимум 2 символа' }, { status: 400 })
    }

    const nameRegex = /^[\p{L}\s-]*$/u
    if (firstName && !nameRegex.test(firstName)) {
      return NextResponse.json({ error: 'Имя может содержать только буквы' }, { status: 400 })
    }
    if (lastName && !nameRegex.test(lastName)) {
      return NextResponse.json({ error: 'Фамилия может содержать только буквы' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (firstName !== undefined) updateData.firstName = firstName.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName.trim() || null

    // Обратная совместимость
    if (name !== undefined && firstName === undefined && lastName === undefined) {
      const nameParts = (name || '').trim().split(' ')
      updateData.firstName = nameParts[0] || null
      updateData.lastName = nameParts.slice(1).join(' ') || null
    }

    if (phone !== undefined) updateData.phone = phone?.trim() || null

    // Данные владельца (банк + адрес + ID — только для владельцев)
    if (existingUser.isOwner) {
      if (bankName !== undefined) updateData.bankName = bankName?.trim() || null
      if (iban !== undefined) updateData.iban = iban?.trim() || null
      if (accountHolder !== undefined) updateData.accountHolder = accountHolder?.trim() || null
      if (address !== undefined) updateData.address = address?.trim() || null
      if (city !== undefined) updateData.city = city?.trim() || null
      if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null
      if (nationalId !== undefined) updateData.nationalId = nationalId?.trim() || null
      if (nationalIdType !== undefined) updateData.nationalIdType = nationalIdType?.trim() || null
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
        address: true,
        city: true,
        postalCode: true,
        nationalId: true,
        nationalIdType: true,
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