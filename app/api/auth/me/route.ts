// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  const next = searchParams.get('next')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Обработка ошибок от Supabase
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code:', error)
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }

    if (data.user) {
      const isPasswordReset = next === '/reset-password'
      
      // Для password reset не создаём пользователя
      if (isPasswordReset) {
        const existingUser = await prisma.user.findUnique({
          where: { id: data.user.id }
        })

        if (!existingUser) {
          console.warn('Password reset for non-existent user:', data.user.email)
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=account_not_found`)
        }

        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Получаем код приглашения
      const pendingInvite = inviteCode || data.user.user_metadata?.pendingInviteCode

      if (pendingInvite) {
        try {
          const invitation = await prisma.invitation.findUnique({
            where: { code: pendingInvite },
            include: { property: true }
          })

          if (invitation && !invitation.usedAt && new Date() < invitation.expiresAt) {
            // Проверяем существующего пользователя
            const existingUser = await prisma.user.findUnique({
              where: { id: data.user.id }
            })

            // Проверка: пользователь не может быть жильцом своей квартиры
            if (existingUser && invitation.property.userId === data.user.id) {
              return NextResponse.redirect(`${origin}/dashboard?error=cannot_invite_self`)
            }

            if (existingUser) {
              // Добавляем роль жильца если её нет
              if (!existingUser.isTenant) {
                await prisma.user.update({
                  where: { id: data.user.id },
                  data: { isTenant: true }
                })
              }
            } else {
              // Создаём нового пользователя как жильца
              await prisma.user.create({
                data: {
                  id: data.user.id,
                  email: data.user.email!,
                  name: data.user.user_metadata?.name || null,
                  isOwner: false,
                  isTenant: true,
                }
              })
            }

            // Проверяем не является ли уже жильцом этой квартиры
            const existingTenant = await prisma.tenant.findFirst({
              where: {
                tenantUserId: data.user.id,
                propertyId: invitation.propertyId,
              }
            })

            if (!existingTenant) {
              // Создаём запись Tenant
              const nameParts = (data.user.user_metadata?.name || '').split(' ')
              await prisma.tenant.create({
                data: {
                  userId: invitation.property.userId,
                  propertyId: invitation.propertyId,
                  tenantUserId: data.user.id,
                  firstName: nameParts[0] || 'Имя',
                  lastName: nameParts.slice(1).join(' ') || 'Фамилия',
                  email: data.user.email,
                  isActive: true,
                  moveInDate: new Date(),
                }
              })

              await prisma.property.update({
                where: { id: invitation.propertyId },
                data: { status: 'OCCUPIED' }
              })

              await prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                  usedAt: new Date(),
                  usedBy: data.user.id,
                }
              })
            }

            // Редирект зависит от того, есть ли у пользователя роль владельца
            const updatedUser = await prisma.user.findUnique({
              where: { id: data.user.id }
            })

            if (updatedUser?.isOwner) {
              return NextResponse.redirect(`${origin}/dashboard?invite_accepted=true`)
            }
            return NextResponse.redirect(`${origin}/tenant/dashboard`)
          }
        } catch (err) {
          console.error('Error processing invitation:', err)
        }
      }

      // Стандартный flow без приглашения
      let dbUser = await prisma.user.findUnique({
        where: { id: data.user.id }
      })

      if (!dbUser) {
        // Создаём как владельца по умолчанию (обычная регистрация)
        dbUser = await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || null,
            isOwner: true,
            isTenant: false,
          }
        })
      }

      // Редирект по ролям
      // Если есть обе роли - идём в dashboard владельца
      if (dbUser.isOwner) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
      
      if (dbUser.isTenant) {
        return NextResponse.redirect(`${origin}/tenant/dashboard`)
      }

      // Fallback - если нет ни одной роли, включаем владельца
      await prisma.user.update({
        where: { id: data.user.id },
        data: { isOwner: true }
      })
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}