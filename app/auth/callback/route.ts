// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  const next = searchParams.get('next') // Для редиректа после reset password
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
      // Проверяем тип события (signup, recovery, etc.)
      // Supabase передаёт это в user_metadata или можно определить по next параметру
      const isPasswordReset = next === '/reset-password'
      
      // ИСПРАВЛЕНИЕ БАГ 5: Для password reset не создаём пользователя автоматически
      if (isPasswordReset) {
        // Проверяем существует ли пользователь в нашей БД
        const existingUser = await prisma.user.findUnique({
          where: { id: data.user.id }
        })

        if (!existingUser) {
          // Пользователь пришёл через recovery, но его нет в БД
          // Это означает что кто-то использовал recovery для несуществующего email
          // (хотя мы добавили проверку на фронте, это запасной вариант)
          console.warn('Password reset for non-existent user:', data.user.email)
          
          // Выходим и показываем ошибку
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=account_not_found`)
        }

        // Пользователь существует - редиректим на страницу сброса пароля
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Получаем код приглашения из URL или метаданных пользователя
      const pendingInvite = inviteCode || data.user.user_metadata?.pendingInviteCode

      if (pendingInvite) {
        try {
          // Проверяем приглашение
          const invitation = await prisma.invitation.findUnique({
            where: { code: pendingInvite },
            include: { property: true }
          })

          if (invitation && !invitation.usedAt && new Date() < invitation.expiresAt) {
            // Проверяем существующего пользователя
            const existingUser = await prisma.user.findUnique({
              where: { id: data.user.id }
            })

            let userRole: 'OWNER' | 'TENANT' = 'TENANT'

            if (existingUser) {
              // ИСПРАВЛЕНИЕ БАГ 3: Не меняем роль OWNER
              userRole = existingUser.role
              
              if (existingUser.role !== 'OWNER') {
                // Обновляем только если не OWNER
                await prisma.user.update({
                  where: { id: data.user.id },
                  data: { role: 'TENANT' }
                })
              }
            } else {
              // Создаём нового пользователя как TENANT
              await prisma.user.create({
                data: {
                  id: data.user.id,
                  email: data.user.email!,
                  name: data.user.user_metadata?.name || null,
                  role: 'TENANT',
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
                  userId: invitation.property.userId, // Владелец
                  propertyId: invitation.propertyId,
                  tenantUserId: data.user.id, // Привязка к аккаунту жильца
                  firstName: nameParts[0] || 'Имя',
                  lastName: nameParts.slice(1).join(' ') || 'Фамилия',
                  email: data.user.email,
                  isActive: true,
                  moveInDate: new Date(),
                }
              })

              // Обновляем статус квартиры
              await prisma.property.update({
                where: { id: invitation.propertyId },
                data: { status: 'OCCUPIED' }
              })

              // Отмечаем приглашение использованным
              await prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                  usedAt: new Date(),
                  usedBy: data.user.id,
                }
              })
            }

            // Редирект в зависимости от роли
            // OWNER который принял приглашение → остаётся в dashboard владельца
            // TENANT → в личный кабинет жильца
            if (userRole === 'OWNER') {
              return NextResponse.redirect(`${origin}/dashboard?invite_accepted=true`)
            }
            return NextResponse.redirect(`${origin}/tenant/dashboard`)
          }
        } catch (err) {
          console.error('Error processing invitation:', err)
        }
      }

      // Стандартный flow без приглашения
      // Проверяем существующую роль пользователя
      let dbUser = await prisma.user.findUnique({
        where: { id: data.user.id }
      })

      if (!dbUser) {
        // Создаём как OWNER по умолчанию (обычная регистрация)
        dbUser = await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || null,
            role: 'OWNER',
          }
        })
      }

      // Редирект по роли
      if (dbUser.role === 'TENANT') {
        return NextResponse.redirect(`${origin}/tenant/dashboard`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
