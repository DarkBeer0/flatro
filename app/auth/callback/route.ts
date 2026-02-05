// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// === VERCEL CONFIGURATION ===
export const runtime = 'nodejs'
export const maxDuration = 60 // seconds - важно для cold starts

// === STRUCTURED LOGGING ===
function authLog(event: string, data: Record<string, unknown> = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    service: 'auth-callback',
    event,
    ...data,
    // Mask PII
    ...(data.email && typeof data.email === 'string' && { 
      email: data.email.replace(/(.{2}).*@/, '$1***@') 
    }),
  }
  console.log(JSON.stringify(logData))
}

// === ERROR MAPPING ===
const ERROR_MESSAGES: Record<string, string> = {
  'invalid_grant': 'Ссылка устарела. Запросите новую.',
  'otp_expired': 'Ссылка истекла. Запросите новую.',
  'email_not_confirmed': 'Email не подтверждён.',
  'user_not_found': 'Пользователь не найден.',
  'invalid_credentials': 'Неверные данные для входа.',
}

function getErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code]
  }
  return error.message || 'Ошибка авторизации'
}

// === PRODUCTION REDIRECT HELPER ===
function getRedirectURL(request: Request, path: string): string {
  const { origin } = new URL(request.url)
  
  // На Vercel используем x-forwarded-host для правильного домена
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${path}`
  }
  
  return `${origin}${path}`
}

// === IDEMPOTENT USER CREATION ===
async function ensureUserExists(
  userId: string, 
  email: string, 
  name: string | null,
  roles: { isOwner: boolean; isTenant: boolean }
) {
  // Используем upsert с NON-EMPTY update для атомарности
  // Пустой update = SELECT + INSERT (race condition)
  // Non-empty update = INSERT ... ON CONFLICT DO UPDATE (атомарно)
  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      name,
      isOwner: roles.isOwner,
      isTenant: roles.isTenant,
    },
    update: {
      // Обновляем email на случай если изменился в Supabase
      email,
      // Добавляем роли, но не убираем существующие
      ...(roles.isOwner && { isOwner: true }),
      ...(roles.isTenant && { isTenant: true }),
    },
  })
}

// === IDEMPOTENT INVITATION PROCESSING ===
async function processInvitation(
  inviteCode: string,
  user: { id: string; email?: string; user_metadata?: { name?: string } }
): Promise<{ success: boolean; redirectPath: string; error?: string }> {
  
  authLog('invite_processing_start', { inviteCode, userId: user.id })

  const invitation = await prisma.invitation.findUnique({
    where: { code: inviteCode },
    include: { property: true },
  })

  // Валидация приглашения
  if (!invitation) {
    authLog('invite_not_found', { inviteCode })
    return { success: false, redirectPath: '/login?error=invite_not_found', error: 'Приглашение не найдено' }
  }

  if (invitation.usedAt) {
    authLog('invite_already_used', { inviteCode, usedBy: invitation.usedBy })
    // Если использовано этим же пользователем — это OK (повторный переход)
    if (invitation.usedBy === user.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      return { 
        success: true, 
        redirectPath: dbUser?.isOwner ? '/dashboard' : '/tenant/dashboard' 
      }
    }
    return { success: false, redirectPath: '/login?error=invite_used', error: 'Приглашение уже использовано' }
  }

  if (new Date() > invitation.expiresAt) {
    authLog('invite_expired', { inviteCode, expiresAt: invitation.expiresAt })
    return { success: false, redirectPath: '/login?error=invite_expired', error: 'Приглашение истекло' }
  }

  // Проверка: пользователь не может быть жильцом своей квартиры
  if (invitation.property.userId === user.id) {
    authLog('invite_self_error', { inviteCode, userId: user.id })
    return { success: false, redirectPath: '/dashboard?error=cannot_invite_self', error: 'Нельзя пригласить себя' }
  }

  // === ТРАНЗАКЦИЯ: создание/обновление user + tenant + invitation ===
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Ensure user exists с ролью tenant
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          isOwner: false,
          isTenant: true,
        },
        update: {
          email: user.email!,
          isTenant: true, // Добавляем роль
        },
      })

      // 2. Ensure tenant record exists
      const existingTenant = await tx.tenant.findFirst({
        where: { tenantUserId: user.id, propertyId: invitation.propertyId },
      })

      if (!existingTenant) {
        const nameParts = (user.user_metadata?.name || '').split(' ')
        await tx.tenant.create({
          data: {
            userId: invitation.property.userId,
            propertyId: invitation.propertyId,
            tenantUserId: user.id,
            firstName: nameParts[0] || 'Имя',
            lastName: nameParts.slice(1).join(' ') || 'Фамилия',
            email: user.email,
            isActive: true,
            moveInDate: new Date(),
          },
        })

        // 3. Update property status
        await tx.property.update({
          where: { id: invitation.propertyId },
          data: { status: 'OCCUPIED' },
        })
      }

      // 4. Mark invitation as used (idempotent - если уже used, ничего не сломается)
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
          usedBy: user.id,
        },
      })
    }, {
      timeout: 10000, // 10 секунд на транзакцию
    })

    authLog('invite_processed_success', { inviteCode, userId: user.id })

    // Проверяем финальные роли для редиректа
    const finalUser = await prisma.user.findUnique({ where: { id: user.id } })
    
    if (finalUser?.isOwner) {
      return { success: true, redirectPath: '/dashboard?invite_accepted=true' }
    }
    return { success: true, redirectPath: '/tenant/dashboard' }

  } catch (error) {
    authLog('invite_processing_error', { 
      inviteCode, 
      userId: user.id, 
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // P2002 = unique constraint = race condition, но данные созданы
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      authLog('invite_race_condition_handled', { inviteCode })
      const finalUser = await prisma.user.findUnique({ where: { id: user.id } })
      return { 
        success: true, 
        redirectPath: finalUser?.isOwner ? '/dashboard' : '/tenant/dashboard' 
      }
    }

    throw error
  }
}

// === MAIN HANDLER ===
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  const next = searchParams.get('next')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  authLog('callback_start', { 
    hasCode: !!code, 
    hasInvite: !!inviteCode, 
    next,
    errorParam,
  })

  // === Обработка ошибок от Supabase ===
  if (errorParam) {
    authLog('supabase_error', { error: errorParam, description: errorDescription })
    const message = encodeURIComponent(errorDescription || errorParam)
    return NextResponse.redirect(getRedirectURL(request, `/login?error=${message}`))
  }

  // === Нет кода — редирект на логин ===
  if (!code) {
    authLog('no_code_provided')
    return NextResponse.redirect(getRedirectURL(request, '/login?error=no_code'))
  }

  // === Exchange code for session ===
  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    authLog('exchange_code_error', { 
      code: error.code, 
      message: error.message,
      status: error.status,
    })
    const message = encodeURIComponent(getErrorMessage(error))
    return NextResponse.redirect(getRedirectURL(request, `/login?error=${message}`))
  }

  if (!data.user) {
    authLog('no_user_in_session')
    return NextResponse.redirect(getRedirectURL(request, '/login?error=no_user'))
  }

  const user = data.user
  authLog('session_created', { userId: user.id, email: user.email })

  // === Password Reset Flow ===
  if (next === '/reset-password') {
    const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
    
    if (!existingUser) {
      authLog('password_reset_user_not_found', { userId: user.id })
      await supabase.auth.signOut()
      return NextResponse.redirect(getRedirectURL(request, '/login?error=account_not_found'))
    }

    authLog('password_reset_redirect')
    return NextResponse.redirect(getRedirectURL(request, '/reset-password'))
  }

  // === Invite Flow ===
  // Приоритет: URL param > user_metadata (localStorage fallback от старой логики)
  const pendingInvite = inviteCode || user.user_metadata?.pendingInviteCode

  if (pendingInvite) {
    try {
      const result = await processInvitation(pendingInvite, user)
      return NextResponse.redirect(getRedirectURL(request, result.redirectPath))
    } catch (err) {
      authLog('invite_fatal_error', { 
        inviteCode: pendingInvite,
        error: err instanceof Error ? err.message : 'Unknown',
      })
      // При критической ошибке всё равно создаём пользователя и пускаем
    }
  }

  // === Standard Registration/Login Flow ===
  try {
    const dbUser = await ensureUserExists(
      user.id,
      user.email!,
      user.user_metadata?.name || null,
      { isOwner: true, isTenant: false } // По умолчанию — владелец
    )

    authLog('user_ensured', { 
      userId: dbUser.id, 
      isOwner: dbUser.isOwner, 
      isTenant: dbUser.isTenant,
    })

    // Редирект по ролям
    if (dbUser.isOwner) {
      return NextResponse.redirect(getRedirectURL(request, '/dashboard'))
    }
    
    if (dbUser.isTenant) {
      return NextResponse.redirect(getRedirectURL(request, '/tenant/dashboard'))
    }

    // Fallback — если нет ролей (не должно случиться)
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

    // P2002 = user already exists (race condition) — просто fetch и redirect
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