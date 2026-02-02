// app/api/contracts/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET — получить детали договора
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

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        property: { userId: user.id },
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — обновить договор
export async function PUT(
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
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.rentAmount && { rentAmount: parseFloat(body.rentAmount) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
