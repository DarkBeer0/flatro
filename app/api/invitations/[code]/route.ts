// app/api/invitations/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/invitations/[code] - получить информацию о приглашении
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            rooms: true,
            area: true,
            user: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Проверяем срок действия
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation expired', code: 'EXPIRED' },
        { status: 410 }
      )
    }

    // Проверяем не использовано ли уже
    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Invitation already used', code: 'ALREADY_USED' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      id: invitation.id,
      property: invitation.property,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// POST /api/invitations/[code] - использовать приглашение (после регистрации)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
    // Получаем текущего пользователя
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        property: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation expired' },
        { status: 410 }
      )
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Invitation already used' },
        { status: 410 }
      )
    }

    // Транзакция: создаём пользователя, tenant, обновляем invitation
    const result = await prisma.$transaction(async (tx) => {
      // Создаём или обновляем пользователя с ролью TENANT
      const user = await tx.user.upsert({
        where: { id: authUser.id },
        update: {
          role: 'TENANT',
        },
        create: {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || null,
          role: 'TENANT',
        }
      })

      // Создаём запись Tenant и привязываем к пользователю
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId, // Владелец
          propertyId: invitation.propertyId,
          tenantUserId: user.id, // Привязка к аккаунту жильца
          firstName: authUser.user_metadata?.name?.split(' ')[0] || 'Имя',
          lastName: authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || 'Фамилия',
          email: authUser.email,
          isActive: true,
          moveInDate: new Date(),
        }
      })

      // Обновляем статус квартиры
      await tx.property.update({
        where: { id: invitation.propertyId },
        data: { status: 'OCCUPIED' }
      })

      // Отмечаем приглашение использованным
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
          usedBy: user.id,
        }
      })

      return { user, tenant }
    })

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
    })
  } catch (error) {
    console.error('Error using invitation:', error)
    return NextResponse.json(
      { error: 'Failed to use invitation' },
      { status: 500 }
    )
  }
}

// DELETE /api/invitations/[code] - отозвать приглашение
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем что приглашение принадлежит владельцу
    const invitation = await prisma.invitation.findFirst({
      where: {
        code,
        property: {
          userId: authUser.id
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    await prisma.invitation.delete({
      where: { id: invitation.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}
