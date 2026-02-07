/**
 * API endpoint для работы с приглашениями
 * 
 * Путь в проекте: app/api/invitations/[code]/route.ts
 * 
 * GET  /api/invitations/{code} - Получить информацию о приглашении
 * POST /api/invitations/{code} - Принять приглашение (авторизация + редирект)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { RegionCode } from '@/lib/regions'

// ============================================
// Утилита для создания Supabase клиента
// ============================================

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll может выбросить ошибку в Server Components
          }
        },
      },
    }
  )
}

// ============================================
// МАППИНГ СТРАНЫ -> РЕГИОН
// ============================================

const countryToRegion: Record<string, RegionCode> = {
  'Poland': 'PL',
  'Polska': 'PL',
  'Ukraine': 'UA',
  'Україна': 'UA',
  'Germany': 'DE',
  'Deutschland': 'DE',
  'Czech Republic': 'CZ',
  'Česko': 'CZ',
  'Czechia': 'CZ',
  'Slovakia': 'SK',
  'Slovensko': 'SK',
  'Lithuania': 'LT',
  'Lietuva': 'LT',
  'Latvia': 'LV',
  'Latvija': 'LV',
  'Estonia': 'EE',
  'Eesti': 'EE'
}

// ============================================
// GET: Информация о приглашении
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Поиск приглашения
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: code,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            country: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено, уже использовано или истекло' },
        { status: 404 }
      )
    }

    // Получаем владельца
    const owner = await prisma.user.findFirst({
      where: {
        properties: {
          some: { id: invitation.propertyId }
        }
      },
      select: {
        name: true,
        email: true
      }
    })

    // Определяем предложенный регион по стране недвижимости
    const suggestedRegion: RegionCode = invitation.property.country 
      ? (countryToRegion[invitation.property.country] || 'PL')
      : 'PL'

    return NextResponse.json({
      valid: true,
      propertyId: invitation.property.id,
      propertyName: invitation.property.name,
      propertyAddress: `${invitation.property.address}, ${invitation.property.city}`,
      ownerName: owner?.name || 'Владелец',
      ownerEmail: owner?.email,
      expiresAt: invitation.expiresAt.toISOString(),
      suggestedRegion,
      // Если приглашение на конкретный email
      invitedEmail: invitation.email
    })

  } catch (error) {
    console.error('[Get Invitation Error]:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке приглашения' },
      { status: 500 }
    )
  }
}

// ============================================
// POST: Принять приглашение
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Проверка авторизации
    const supabase = await createSupabaseClient()
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Необходима авторизация', redirectTo: `/login?invite=${code}` },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Поиск приглашения
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: code,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        property: {
          select: {
            id: true,
            userId: true,
            country: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено, уже использовано или истекло' },
        { status: 404 }
      )
    }

    // Проверка: приглашение на конкретный email?
    if (invitation.email && invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Это приглашение предназначено для другого email' },
        { status: 403 }
      )
    }

    // Проверка: пользователь не является владельцем этой недвижимости
    if (invitation.property.userId === userId) {
      return NextResponse.json(
        { error: 'Вы не можете принять приглашение на собственную недвижимость' },
        { status: 400 }
      )
    }

    // Проверка: пользователь уже является жильцом этой недвижимости
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        propertyId: invitation.propertyId,
        tenantUserId: userId,
        isActive: true
      }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Вы уже являетесь жильцом этой недвижимости' },
        { status: 400 }
      )
    }

    // ============================================
    // ВАЖНО: Редирект на страницу завершения регистрации
    // Вместо автоматического создания tenant здесь,
    // перенаправляем на форму для ввода полных данных
    // ============================================

    return NextResponse.json({
      success: true,
      message: 'Приглашение валидно. Перенаправление на завершение регистрации.',
      redirectTo: `/invite/complete/${code}`
    })

  } catch (error) {
    console.error('[Accept Invitation Error]:', error)
    return NextResponse.json(
      { error: 'Ошибка при обработке приглашения' },
      { status: 500 }
    )
  }
}