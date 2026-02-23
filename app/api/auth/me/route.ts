// app/api/auth/me/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Явно указываем select чтобы не запрашивать несуществующие колонки
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
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
        tenantProfiles: {
          where: { isActive: true },
          include: {
            property: {
              select: { id: true, name: true, address: true }
            }
          }
        }
      }
    })

    // Если пользователя нет в БД - он не завершил регистрацию
    if (!dbUser) {
      return NextResponse.json({ 
        error: 'User not found in database. Please complete registration.',
        code: 'USER_NOT_REGISTERED'
      }, { status: 404 })
    }

    // Вычисляем "основную" роль для совместимости со старым кодом
    const primaryRole = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')

    // Собираем полное имя для совместимости
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      name: fullName, // Для совместимости со старым кодом
      phone: dbUser.phone,
      
      // Новые поля ролей
      isOwner: dbUser.isOwner,
      isTenant: dbUser.isTenant,
      
      // Для совместимости со старым кодом
      role: primaryRole,
      
      // Банковские реквизиты
      bankName: dbUser.bankName,
      iban: dbUser.iban,
      accountHolder: dbUser.accountHolder,
      
      // Профиль жильца (если есть активная аренда)
      tenantProfiles: dbUser.tenantProfiles,
      tenantProfile: dbUser.tenantProfiles[0] || null,
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}