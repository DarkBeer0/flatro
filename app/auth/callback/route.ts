// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
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
            // Создаём или обновляем пользователя с ролью TENANT
            await prisma.user.upsert({
              where: { id: data.user.id },
              update: { role: 'TENANT' },
              create: {
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || null,
                role: 'TENANT',
              }
            })

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

            // Редирект в личный кабинет жильца
            return NextResponse.redirect(`${origin}/tenant/dashboard`)
          }
        } catch (err) {
          console.error('Error processing invitation:', err)
        }
      }

      // Проверяем существующую роль пользователя
      let dbUser = await prisma.user.findUnique({
        where: { id: data.user.id }
      })

      if (!dbUser) {
        // Создаём как OWNER по умолчанию
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
