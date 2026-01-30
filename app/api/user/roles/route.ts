// app/api/user/roles/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - получить информацию о ролях и возможности их изменения
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        isOwner: true,
        isTenant: true,
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем можно ли отключить роль владельца
    // Нельзя если есть активные квартиры
    const ownedPropertiesCount = await prisma.property.count({
      where: { userId: user.id }
    })

    // Проверяем можно ли отключить роль жильца
    // Нельзя если есть активная аренда
    const activeTenantProfile = await prisma.tenant.findFirst({
      where: {
        tenantUserId: user.id,
        isActive: true,
      }
    })

    return NextResponse.json({
      isOwner: dbUser.isOwner,
      isTenant: dbUser.isTenant,
      canDisableOwner: ownedPropertiesCount === 0,
      canDisableTenant: !activeTenantProfile,
      ownedPropertiesCount,
      hasActiveTenancy: !!activeTenantProfile,
    })
  } catch (error) {
    console.error('Error getting user roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - изменить роли пользователя
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enableOwner, enableTenant } = body

    // Получаем текущего пользователя
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        isOwner: true,
        isTenant: true,
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Валидация: нельзя отключить обе роли
    if (enableOwner === false && enableTenant === false) {
      return NextResponse.json({
        error: 'Необходимо оставить хотя бы одну роль активной'
      }, { status: 400 })
    }

    // Проверка отключения роли владельца
    if (enableOwner === false && dbUser.isOwner) {
      const ownedPropertiesCount = await prisma.property.count({
        where: { userId: user.id }
      })

      if (ownedPropertiesCount > 0) {
        return NextResponse.json({
          error: `Невозможно отключить режим владельца. У вас есть ${ownedPropertiesCount} объект(ов) недвижимости. Сначала удалите или передайте их.`
        }, { status: 400 })
      }
    }

    // Проверка отключения роли жильца
    if (enableTenant === false && dbUser.isTenant) {
      const activeTenantProfile = await prisma.tenant.findFirst({
        where: {
          tenantUserId: user.id,
          isActive: true,
        },
        include: {
          property: {
            select: { name: true, address: true }
          }
        }
      })

      if (activeTenantProfile) {
        const propertyInfo = activeTenantProfile.property 
          ? `"${activeTenantProfile.property.name}"` 
          : 'объекте'
        return NextResponse.json({
          error: `Невозможно отключить режим жильца. Вы активно арендуете ${propertyInfo}. Сначала завершите аренду.`
        }, { status: 400 })
      }
    }

    // Обновляем роли
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(enableOwner !== undefined && { isOwner: enableOwner }),
        ...(enableTenant !== undefined && { isTenant: enableTenant }),
      },
      select: {
        id: true,
        isOwner: true,
        isTenant: true,
      }
    })

    return NextResponse.json({
      success: true,
      isOwner: updatedUser.isOwner,
      isTenant: updatedUser.isTenant,
    })
  } catch (error) {
    console.error('Error updating user roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
