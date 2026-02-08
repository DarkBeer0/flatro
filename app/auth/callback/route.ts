// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Типы для логирования
type LogEvent =
  | 'callback_start'
  | 'missing_code'
  | 'code_exchange_failed'
  | 'code_exchange_success'
  | 'invite_processing'
  | 'invite_activated'
  | 'invite_error'
  | 'invite_critical_error'
  | 'invite_user_created'
  | 'invite_auto_completed'
  | 'user_ensured'
  | 'user_creation_error'
  | 'no_roles_fallback'

function authLog(event: LogEvent, data?: Record<string, unknown>) {
  console.log(`[Auth Callback] ${event}`, data ? JSON.stringify(data) : '')
}

// Утилита для получения redirect URL
function getRedirectURL(request: NextRequest, path: string) {
  const origin = request.nextUrl.origin
  return `${origin}${path}`
}

// Утилита для получения понятного сообщения об ошибке
function getErrorMessage(error: unknown): string {
  if (!error) return 'Неизвестная ошибка'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Ошибка авторизации'
}

// Функция для создания или получения пользователя
async function ensureUserExists(
  userId: string,
  email: string,
  firstName: string | null,
  lastName: string | null,
  roles: { isOwner: boolean; isTenant: boolean }
) {
  // Пробуем найти существующего
  let user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    // Создаём нового
    user = await prisma.user.create({
      data: {
        id: userId,
        email,
        firstName,
        lastName,
        isOwner: roles.isOwner,
        isTenant: roles.isTenant,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        termsVersion: '1.0',
      },
    })
  }

  return user
}

// Извлечение имени из Supabase user metadata
function extractNameFromMetadata(metadata: Record<string, any> | undefined) {
  if (!metadata) return { firstName: null as string | null, lastName: null as string | null }
  const nameParts = (metadata.name || '').split(' ')
  const firstName = metadata.first_name || nameParts[0] || null
  const lastName = metadata.last_name || nameParts.slice(1).join(' ') || null
  return { firstName, lastName }
}

// Функция обработки приглашения
async function processInvitation(
  inviteCode: string,
  user: { id: string; email?: string; user_metadata?: Record<string, any> }
) {
  authLog('invite_processing', { inviteCode, userId: user.id })

  // Находим приглашение
  const invitation = await prisma.invitation.findFirst({
    where: {
      code: inviteCode,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      property: {
        select: { id: true, userId: true },
      },
    },
  })

  if (!invitation) {
    return { success: false, redirectPath: '/login?error=invite_invalid' }
  }

  // Проверка: нельзя быть жильцом своей квартиры
  if (invitation.property.userId === user.id) {
    return { success: false, redirectPath: '/login?error=cannot_invite_self' }
  }

  // Проверяем, зарегистрирован ли уже как tenant для этой квартиры
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      tenantUserId: user.id,
      propertyId: invitation.propertyId,
      isActive: true,
    },
  })

  if (existingTenant) {
    // Уже зарегистрирован — просто помечаем invite как использованный
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', usedAt: new Date(), usedBy: user.id },
    })
    return { success: true, redirectPath: '/tenant/dashboard' }
  }

  // --- Создаём DB user если его ещё нет (при email-регистрации user есть только в Supabase Auth) ---
  const { firstName, lastName } = extractNameFromMetadata(user.user_metadata)

  let dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  if (!dbUser) {
    dbUser = await ensureUserExists(
      user.id,
      user.email!,
      firstName,
      lastName,
      { isOwner: false, isTenant: true }
    )
    authLog('invite_user_created', { userId: user.id, firstName, lastName })
  }

  // --- Если пользователь уже указал имя на странице /invite/[code], создаём tenant напрямую ---
  const hasName = (dbUser.firstName && dbUser.lastName) || (firstName && lastName)
  const cameFromInvitePage = user.user_metadata?.pendingInviteCode === inviteCode

  if (hasName || cameFromInvitePage) {
    const now = new Date()
    const tenantFirstName = dbUser.firstName || firstName || 'Tenant'
    const tenantLastName = dbUser.lastName || lastName || ''

    await prisma.$transaction(async (tx) => {
      // Обновляем user: устанавливаем isTenant и terms
      await tx.user.update({
        where: { id: user.id },
        data: {
          isTenant: true,
          firstName: dbUser!.firstName || firstName,
          lastName: dbUser!.lastName || lastName,
          termsAcceptedAt: dbUser!.termsAcceptedAt || now,
          privacyAcceptedAt: dbUser!.privacyAcceptedAt || now,
          termsVersion: dbUser!.termsVersion || '1.0',
        },
      })

      // Создаём запись tenant
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId,
          propertyId: invitation.propertyId,
          tenantUserId: user.id,
          firstName: tenantFirstName,
          lastName: tenantLastName,
          email: user.email!,
          regionCode: dbUser!.regionCode || 'PL',
          moveInDate: now,
          isActive: true,
          termsAcceptedAt: now,
          termsVersion: '1.0',
          registrationCompletedAt: now,
        },
      })

      // Обновляем invitation
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          usedAt: now,
          usedBy: user.id,
          tenantId: tenant.id,
        },
      })

      // Обновляем статус недвижимости
      await tx.property.update({
        where: { id: invitation.propertyId },
        data: { status: 'OCCUPIED' },
      })
    })

    authLog('invite_auto_completed', { inviteCode, userId: user.id })
    return { success: true, redirectPath: '/tenant/dashboard' }
  }

  // Пользователь без имени (например, OAuth без metadata) — отправляем на форму завершения
  if (!dbUser.termsAcceptedAt) {
    return { success: true, redirectPath: `/invite/complete/${inviteCode}` }
  }

  // Если всё готово, но tenant profile ещё нет — тоже на форму
  const existingProfile = await prisma.tenant.findFirst({
    where: { tenantUserId: user.id, propertyId: invitation.propertyId },
  })

  if (!existingProfile) {
    return { success: true, redirectPath: `/invite/complete/${inviteCode}` }
  }

  authLog('invite_activated', { inviteCode, userId: user.id })
  return { success: true, redirectPath: '/tenant/dashboard' }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')

  authLog('callback_start', { hasCode: !!code, inviteCode })

  if (!code) {
    authLog('missing_code', {})
    return NextResponse.redirect(getRedirectURL(request, '/login?error=missing_code'))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
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
            // Игнорируем ошибки в Server Components
          }
        },
      },
    }
  )

  // Обмен кода на сессию
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data?.user) {
    const errorMsg = exchangeError ? getErrorMessage(exchangeError) : 'Ошибка авторизации'
    authLog('code_exchange_failed', { 
      error: exchangeError?.message,
      code: exchangeError?.code 
    })
    return NextResponse.redirect(getRedirectURL(request, `/login?error=${encodeURIComponent(errorMsg)}`))
  }

  const user = data.user
  authLog('code_exchange_success', { userId: user.id, email: user.email })

  // === Invitation Flow ===
  if (inviteCode) {
    try {
      // Передаём полный объект user с user_metadata
      const result = await processInvitation(inviteCode, user)
      return NextResponse.redirect(getRedirectURL(request, result.redirectPath))
    } catch (err) {
      authLog('invite_critical_error', {
        inviteCode,
        userId: user.id,
        error: err instanceof Error ? err.message : 'Unknown',
      })
      // При ошибке продолжаем стандартный flow
    }
  }

  // === Standard Registration/Login Flow ===
  try {
    const { firstName, lastName } = extractNameFromMetadata(user.user_metadata)

    const dbUser = await ensureUserExists(
      user.id,
      user.email!,
      firstName,
      lastName,
      { isOwner: true, isTenant: false }
    )

    authLog('user_ensured', { 
      userId: dbUser.id, 
      isOwner: dbUser.isOwner, 
      isTenant: dbUser.isTenant,
    })

    if (dbUser.isOwner) {
      return NextResponse.redirect(getRedirectURL(request, '/dashboard'))
    }
    
    if (dbUser.isTenant) {
      return NextResponse.redirect(getRedirectURL(request, '/tenant/dashboard'))
    }

    authLog('no_roles_fallback', { userId: dbUser.id })
    await prisma.user.update({
      where: { id: user.id },
      data: { isOwner: true },
    })
    return NextResponse.redirect(getRedirectURL(request, '/dashboard'))

  } catch (err) {
    authLog('user_creation_error', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
      code: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
    })

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
      if (existingUser) {
        return NextResponse.redirect(getRedirectURL(request, 
          existingUser.isOwner ? '/dashboard' : '/tenant/dashboard'
        ))
      }
    }

    return NextResponse.redirect(getRedirectURL(request, '/login?error=server_error'))
  }
}