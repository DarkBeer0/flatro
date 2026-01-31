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

    // Только ищем пользователя, НЕ создаём автоматически
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        tenantProfile: {
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
    // Приоритет: если есть обе роли - показываем как OWNER
    const primaryRole = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
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
      tenantProfile: dbUser.tenantProfile,
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
