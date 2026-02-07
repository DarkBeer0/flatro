/**
 * API endpoint для завершения регистрации арендатора
 * 
 * Путь в проекте: app/api/invitations/[code]/complete/route.ts
 * 
 * GET  /api/invitations/{code}/complete - Получить данные приглашения для формы
 * POST /api/invitations/{code}/complete - Сохранить данные и завершить регистрацию
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { 
  RegionCode, 
  getRegion, 
  validateNationalId, 
  validatePhone,
  normalizePhone 
} from '@/lib/regions'

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
// ТИПЫ
// ============================================

interface CompleteTenantRequest {
  firstName: string
  lastName: string
  phone?: string | null
  nationalId?: string | null
  nationalIdType?: string | null
  regionCode: RegionCode
  moveInDate?: string
  emergencyContact?: string | null
  emergencyPhone?: string | null
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
}

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
// GET: Данные для формы завершения регистрации
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Проверка авторизации
    const supabase = await createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

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
            country: true,
            userId: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено или истекло' },
        { status: 404 }
      )
    }

    // Получаем владельца
    const owner = await prisma.user.findUnique({
      where: { id: invitation.property.userId },
      select: { name: true }
    })

    // Определяем предложенный регион
    const suggestedRegion: RegionCode = invitation.property.country 
      ? (countryToRegion[invitation.property.country] || 'PL')
      : 'PL'

    // Предзаполненные данные из сессии (если есть)
    let userData = null
    if (session?.user) {
      const nameParts = session.user.user_metadata?.name?.split(' ') || []
      userData = {
        email: session.user.email,
        firstName: session.user.user_metadata?.first_name || nameParts[0] || '',
        lastName: session.user.user_metadata?.last_name || nameParts.slice(1).join(' ') || ''
      }
    }

    return NextResponse.json({
      propertyId: invitation.property.id,
      propertyName: invitation.property.name,
      propertyAddress: `${invitation.property.address}, ${invitation.property.city}`,
      ownerName: owner?.name || 'Владелец',
      expiresAt: invitation.expiresAt.toISOString(),
      suggestedRegion,
      userData,
      invitedEmail: invitation.email
    })

  } catch (error) {
    console.error('[Get Invitation Complete Error]:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке данных' },
      { status: 500 }
    )
  }
}

// ============================================
// POST: Завершение регистрации
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
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Парсинг тела запроса
    const body: CompleteTenantRequest = await request.json()

    // Получаем конфигурацию региона
    const regionCode = body.regionCode || 'PL'
    const region = getRegion(regionCode)

    // ============================================
    // ВАЛИДАЦИЯ
    // ============================================

    // Имя (обязательно)
    if (!body.firstName?.trim() || body.firstName.length < 2) {
      return NextResponse.json(
        { error: 'Имя обязательно (минимум 2 символа)' },
        { status: 400 }
      )
    }

    // Фамилия (обязательно)
    if (!body.lastName?.trim() || body.lastName.length < 2) {
      return NextResponse.json(
        { error: 'Фамилия обязательна (минимум 2 символа)' },
        { status: 400 }
      )
    }

    // Валидация имени (только буквы)
    const nameRegex = /^[\p{L}\s-]+$/u
    if (!nameRegex.test(body.firstName) || !nameRegex.test(body.lastName)) {
      return NextResponse.json(
        { error: 'Имя и фамилия могут содержать только буквы' },
        { status: 400 }
      )
    }

    // Согласие с условиями (обязательно)
    if (!body.termsAccepted || !body.privacyAccepted) {
      return NextResponse.json(
        { error: 'Необходимо принять пользовательское соглашение и политику конфиденциальности' },
        { status: 400 }
      )
    }

    // Валидация телефона (если указан)
    if (body.phone && !validatePhone(body.phone, regionCode)) {
      return NextResponse.json(
        { error: `Некорректный формат телефона для ${region.name}` },
        { status: 400 }
      )
    }

    // Валидация национального ID (если указан)
    if (body.nationalId && !validateNationalId(body.nationalId, regionCode)) {
      const idName = region.nationalId?.localName || 'ID'
      return NextResponse.json(
        { error: `Некорректный ${idName}` },
        { status: 400 }
      )
    }

    // ============================================
    // ПОИСК ПРИГЛАШЕНИЯ
    // ============================================

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
            userId: true
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

    // Проверка email (если приглашение на конкретный email)
    if (invitation.email && invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Это приглашение предназначено для другого email' },
        { status: 403 }
      )
    }

    // ============================================
    // СОЗДАНИЕ/ОБНОВЛЕНИЕ ДАННЫХ
    // ============================================

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      // 1. Обновляем или создаём User
      let user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (user) {
        // Обновляем существующего пользователя
        user = await tx.user.update({
          where: { id: userId },
          data: {
            isTenant: true,
            regionCode: regionCode,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: body.termsVersion,
            // Обновляем имя если пустое
            name: user.name || `${body.firstName} ${body.lastName}`,
            phone: user.phone || (body.phone ? normalizePhone(body.phone, regionCode) : null)
          }
        })
      } else {
        // Создаём нового пользователя
        user = await tx.user.create({
          data: {
            id: userId,
            email: userEmail!,
            name: `${body.firstName} ${body.lastName}`,
            phone: body.phone ? normalizePhone(body.phone, regionCode) : null,
            isTenant: true,
            regionCode: regionCode,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: body.termsVersion
          }
        })
      }

      // 2. Создаём запись Tenant
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId, // Владелец недвижимости
          propertyId: invitation.propertyId,
          tenantUserId: userId,                // Аккаунт жильца
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          email: userEmail,
          phone: body.phone ? normalizePhone(body.phone, regionCode) : null,
          nationalId: body.nationalId || null,
          nationalIdType: body.nationalIdType || (region.nationalId?.name || null),
          regionCode: regionCode,
          emergencyContact: body.emergencyContact?.trim() || null,
          emergencyPhone: body.emergencyPhone 
            ? normalizePhone(body.emergencyPhone, regionCode) 
            : null,
          moveInDate: body.moveInDate ? new Date(body.moveInDate) : now,
          isActive: true,
          termsAcceptedAt: now,
          termsVersion: body.termsVersion,
          registrationCompletedAt: now
        }
      })

      // 3. Обновляем статус приглашения
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          usedAt: now,
          usedBy: userId,
          tenantId: tenant.id
        }
      })

      // 4. Обновляем статус недвижимости (если была VACANT)
      await tx.property.update({
        where: { id: invitation.propertyId },
        data: {
          status: 'OCCUPIED'
        }
      })

      return { user, tenant }
    })

    // Логирование
    console.log(`[Tenant Registration Complete] User: ${userId}, Tenant: ${result.tenant.id}, Property: ${invitation.propertyId}, Region: ${regionCode}`)

    return NextResponse.json({
      success: true,
      message: 'Регистрация успешно завершена',
      tenant: {
        id: result.tenant.id,
        firstName: result.tenant.firstName,
        lastName: result.tenant.lastName
      },
      redirectTo: '/tenant/dashboard'
    })

  } catch (error) {
    console.error('[Complete Registration Error]:', error)
    
    // Проверка на уникальность
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Вы уже зарегистрированы как жилец' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}