// app/api/contracts/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET — получить все договоры текущего владельца
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contracts = await prisma.contract.findMany({
      where: {
        property: {
          userId: user.id,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — создать новый договор
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, tenantId, type, startDate, endDate, rentAmount, depositAmount, paymentDay, notes } = body

    // Проверяем что property принадлежит текущему пользователю
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Проверяем что tenant принадлежит текущему пользователю
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, userId: user.id },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const contract = await prisma.contract.create({
      data: {
        propertyId,
        tenantId,
        type: type || 'STANDARD',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        rentAmount: parseFloat(rentAmount),
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        paymentDay: parseInt(paymentDay) || 10,
        notes: notes || null,
        status: 'ACTIVE',
      },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
        property: {
          select: { id: true, name: true, address: true },
        },
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
