// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// === VERCEL CONFIGURATION ===
export const runtime = 'nodejs'
export const maxDuration = 60

// === STRUCTURED LOGGING ===
function authLog(event: string, data: Record<string, unknown> = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    service: 'auth-callback',
    event,
    ...data,
    ...(typeof data.email === 'string'
      ? { email: data.email.replace(/(.{2}).*@/, '$1***@') }
      : {}),
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
  firstName: string | null,
  lastName: string | null,
  roles: { isOwner: boolean; isTenant: boolean }
) {
  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      firstName,
      lastName,
      isOwner: roles.isOwner,
      isTenant: roles.isTenant,
    },
    update: {
      email,
      ...(roles.isOwner && { isOwner: true }),
      ...(roles.isTenant && { isTenant: true }),
    },
  })
}

// === IDEMPOTENT INVITATION PROCESSING ===
async function processInvitation(
  inviteCode: string,
  user: { id: string; email?: string; user_metadata?: { first_name?: string; last_name?: string; name?: string } }
): Promise<{ success: boolean; redirectPath: string; error?: string }> {
  
  authLog('invite_processing_start', { inviteCode, userId: user.id })

  const invitation = await prisma.invitation.findUnique({
    where: { code: inviteCode },
    include: { property: true },
  })

  if (!invitation) {
    authLog('invite_not_found', { inviteCode })
    return { success: false, redirectPath: '/login?error=invite_not_found', error: 'Приглашение не найдено' }
  }

  if (invitation.usedAt) {
    authLog('invite_already_used', { inviteCode, usedBy: invitation.usedBy })
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

  if (invitation.property.userId === user.id) {
    authLog('invite_self_error', { inviteCode, userId: user.id })
    return { success: false, redirectPath: '/dashboard?error=cannot_invite_self', error: 'Нельзя пригласить себя' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Получаем имя из метаданных
      const nameParts = (user.user_metadata?.name || '').split(' ')
      const firstName = user.user_metadata?.first_name || nameParts[0] || null
      const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(' ') || null

      // 1. Ensure user exists с ролью tenant
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email!,
          firstName,
          lastName,
          isOwner: false,
          isTenant: true,
        },
        update: {
          email: user.email!,
          isTenant: true,
        },
      })

      // 2. Ensure tenant record exists
      const existingTenant = await tx.tenant.findFirst({
        where: { tenantUserId: user.id, propertyId: invitation.propertyId },
      })

      if (!existingTenant) {
        await tx.tenant.create({
          data: {
            userId: invitation.property.userId,
            propertyId: invitation.propertyId,
            tenantUserId: user.id,
            firstName: firstName || 'Имя',
            lastName: lastName || 'Фамилия',
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

      // 4. Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
          usedBy: user.id,
        },
      })
    }, {
      timeout: 10000,
    })

    authLog('invite_processed_success', { inviteCode, userId: user.id })

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
    hasNext: !!next,
    hasError: !!errorParam 
  })

  // === Handle Error from Supabase ===
  if (errorParam) {
    const errorMsg = ERROR_MESSAGES[errorParam] || errorDescription || errorParam
    authLog('supabase_error', { error: errorParam, description: errorDescription })
    return NextResponse.redirect(getRedirectURL(request, `/login?error=${encodeURIComponent(errorMsg)}`))
  }

  // === No Code = Direct Access ===
  if (!code) {
    authLog('no_code_redirect')
    return NextResponse.redirect(getRedirectURL(request, '/login'))
  }

  // === Exchange Code for Session ===
  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.user) {
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
      const result = await processInvitation(inviteCode, user)
      return NextResponse.redirect(getRedirectURL(request, result.redirectPath))
    } catch (err) {
      authLog('invite_critical_error', {
        inviteCode,
        userId: user.id,
        error: err instanceof Error ? err.message : 'Unknown',
      })
    }
  }

  // === Standard Registration/Login Flow ===
  try {
    // Получаем имя из метаданных
    const nameParts = (user.user_metadata?.name || '').split(' ')
    const firstName = user.user_metadata?.first_name || nameParts[0] || null
    const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(' ') || null

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