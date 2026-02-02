// app/api/tenants/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET — получить информацию об арендаторе
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const tenant = await prisma.tenant.findFirst({
      where: {
        id,
        userId: user.id, // Только арендаторы текущего владельца
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          }
        },
        contracts: {
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
            rentAmount: true,
            status: true,
          },
          orderBy: { startDate: 'desc' },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            dueDate: true,
            paidDate: true,
            period: true,
          },
          orderBy: { dueDate: 'desc' },
          take: 20,
        },
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — удалить арендатора
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем что арендатор принадлежит текущему владельцу
    const tenant = await prisma.tenant.findFirst({
      where: { id, userId: user.id },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Деактивируем вместо удаления (soft delete)
    await prisma.tenant.update({
      where: { id },
      data: { isActive: false, moveOutDate: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
