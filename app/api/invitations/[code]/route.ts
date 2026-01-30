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
            userId: true, // Нужно для проверки
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

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation expired', code: 'EXPIRED' },
        { status: 410 }
      )
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Invitation already used', code: 'ALREADY_USED' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      id: invitation.id,
      property: {
        id: invitation.property.id,
        name: invitation.property.name,
        address: invitation.property.address,
        city: invitation.property.city,
        rooms: invitation.property.rooms,
        area: invitation.property.area,
        user: invitation.property.user,
      },
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

// POST /api/invitations/[code] - использовать приглашение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
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

    // ВАЖНО: Пользователь не может быть жильцом своей квартиры
    if (invitation.property.userId === authUser.id) {
      return NextResponse.json(
        { error: 'Вы не можете стать жильцом собственной квартиры' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Проверяем существующего пользователя
      const existingUser = await tx.user.findUnique({
        where: { id: authUser.id }
      })

      let user

      if (existingUser) {
        // Добавляем роль жильца если её нет
        if (!existingUser.isTenant) {
          user = await tx.user.update({
            where: { id: authUser.id },
            data: { isTenant: true }
          })
        } else {
          user = existingUser
        }
      } else {
        // Новый пользователь - создаём как жильца
        user = await tx.user.create({
          data: {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.name || null,
            isOwner: false,
            isTenant: true,
          }
        })
      }

      // Проверяем, не является ли уже жильцом этой квартиры
      const existingTenant = await tx.tenant.findFirst({
        where: {
          tenantUserId: user.id,
          propertyId: invitation.propertyId,
        }
      })

      if (existingTenant) {
        return { 
          user, 
          tenant: existingTenant, 
          alreadyTenant: true,
        }
      }

      // Создаём запись Tenant
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId,
          propertyId: invitation.propertyId,
          tenantUserId: user.id,
          firstName: authUser.user_metadata?.name?.split(' ')[0] || 'Имя',
          lastName: authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || 'Фамилия',
          email: authUser.email,
          isActive: true,
          moveInDate: new Date(),
        }
      })

      await tx.property.update({
        where: { id: invitation.propertyId },
        data: { status: 'OCCUPIED' }
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
          usedBy: user.id,
        }
      })

      return { user, tenant, alreadyTenant: false }
    })

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
      alreadyTenant: result.alreadyTenant,
      isOwner: result.user.isOwner,
      isTenant: result.user.isTenant,
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
