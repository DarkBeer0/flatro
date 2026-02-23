/**
 * API endpoint для работы с приглашениями
 * 
 * Путь в проекте: app/api/invitations/[code]/route.ts
 * 
 * GET  /api/invitations/{code} - Получить информацию о приглашении
 * POST /api/invitations/{code} - Принять приглашение (создать user + tenant)
 * 
 * FIX: POST теперь реально создаёт user + tenant в БД
 *      (раньше только валидировал и возвращал redirectTo)
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
// GET: Информация о приглашении (без изменений)
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

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
            userId: true,
            country: true,
          }
        }
      }
    })

    if (!invitation) {
      // Проверяем существует ли вообще
      const anyInvite = await prisma.invitation.findFirst({
        where: { code },
        select: { status: true, expiresAt: true }
      })
      
      if (!anyInvite) {
        return NextResponse.json(
          { error: 'Приглашение не найдено', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      
      if (anyInvite.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Приглашение уже использовано', code: 'ALREADY_USED' },
          { status: 410 }
        )
      }
      
      return NextResponse.json(
        { error: 'Приглашение истекло', code: 'EXPIRED' },
        { status: 410 }
      )
    }

    // Получаем имя владельца
    const owner = await prisma.user.findUnique({
      where: { id: invitation.property.userId },
      select: { firstName: true, lastName: true, email: true }
    })

    const ownerName = owner 
      ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'Владелец'
      : 'Владелец'

    // Определяем предложенный регион по стране недвижимости
    const suggestedRegion: RegionCode = invitation.property.country 
      ? (countryToRegion[invitation.property.country] || 'PL')
      : 'PL'

    return NextResponse.json({
      valid: true,
      propertyId: invitation.property.id,
      propertyName: invitation.property.name,
      propertyAddress: `${invitation.property.address}, ${invitation.property.city}`,
      ownerName,
      ownerEmail: owner?.email,
      expiresAt: invitation.expiresAt.toISOString(),
      suggestedRegion,
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
// POST: Принять приглашение — СОЗДАЁТ USER + TENANT
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // ── 1. Auth check ──
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
    const userMetadata = session.user.user_metadata || {}

    // ── 2. Find invitation ──
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: code,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
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

    // ── 3. Validate: email match ──
    if (invitation.email && invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Это приглашение предназначено для другого email' },
        { status: 403 }
      )
    }

    // ── 4. Validate: not self-invite ──
    if (invitation.property.userId === userId) {
      return NextResponse.json(
        { error: 'Вы не можете принять приглашение на собственную недвижимость' },
        { status: 400 }
      )
    }

    // ── 5. Validate: not duplicate ──
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        propertyId: invitation.propertyId,
        tenantUserId: userId,
        isActive: true
      }
    })

    if (existingTenant) {
      // Already a tenant — just mark invite as used and redirect
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', usedAt: new Date(), usedBy: userId },
      })
      return NextResponse.json({
        success: true,
        message: 'Вы уже являетесь жильцом этой недвижимости',
        alreadyTenant: true,
      })
    }

    // ── 6. Extract name from Supabase metadata ──
    const firstName = userMetadata.first_name || 
                      (userMetadata.name || '').split(' ')[0] || 
                      'Tenant'
    const lastName = userMetadata.last_name || 
                     (userMetadata.name || '').split(' ').slice(1).join(' ') || 
                     ''

    const regionCode: RegionCode = invitation.property.country
      ? (countryToRegion[invitation.property.country] || 'PL')
      : 'PL'

    const now = new Date()

    // ── 7. Transaction: create user + tenant + update invitation + property ──
    const result = await prisma.$transaction(async (tx) => {
      // 7a. Ensure user exists in DB
      let dbUser = await tx.user.findUnique({ where: { id: userId } })

      if (!dbUser) {
        dbUser = await tx.user.create({
          data: {
            id: userId,
            email: userEmail!,
            firstName,
            lastName,
            isOwner: false,
            isTenant: true,
            regionCode,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: '1.0',
          },
        })
      } else {
        // Update existing user to also be tenant
        await tx.user.update({
          where: { id: userId },
          data: {
            isTenant: true,
            // Fill in missing fields if needed
            firstName: dbUser.firstName || firstName,
            lastName: dbUser.lastName || lastName,
            termsAcceptedAt: dbUser.termsAcceptedAt || now,
            privacyAcceptedAt: dbUser.privacyAcceptedAt || now,
            termsVersion: dbUser.termsVersion || '1.0',
          },
        })
      }

      // 7b. Create tenant record
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId,  // Owner's user ID
          propertyId: invitation.property.id,
          tenantUserId: userId,                // Tenant's user ID
          firstName: dbUser?.firstName || firstName,
          lastName: dbUser?.lastName || lastName,
          email: userEmail || null,
          regionCode,
          moveInDate: now,
          isActive: true,
          termsAcceptedAt: now,
          termsVersion: '1.0',
          registrationCompletedAt: now,
        },
      })

      // 7c. Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          usedAt: now,
          usedBy: userId,
          tenantId: tenant.id,
        },
      })

      // 7d. Update property status
      await tx.property.update({
        where: { id: invitation.property.id },
        data: { status: 'OCCUPIED' },
      })

      return tenant
    })

    console.log(`[Accept Invitation] Success: user=${userId}, tenant=${result.id}, property=${invitation.property.id}`)

    return NextResponse.json({
      success: true,
      tenantId: result.id,
    })

  } catch (error) {
    console.error('[Accept Invitation Error]:', error)
    return NextResponse.json(
      { error: 'Ошибка при обработке приглашения' },
      { status: 500 }
    )
  }
}