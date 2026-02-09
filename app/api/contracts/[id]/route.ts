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
            nationalId: true,
            nationalIdType: true,
            citizenship: true,
            registrationAddress: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            postalCode: true,
            area: true,
          },
        },
        attachments: {
          select: {
            id: true,
            type: true,
            label: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
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

    const updateData: any = {}

    // Status
    if (body.status) updateData.status = body.status
    if (body.status === 'SIGNED') updateData.signedAt = new Date()

    // Dates
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    // Financial
    if (body.rentAmount !== undefined) updateData.rentAmount = parseFloat(body.rentAmount)
    if (body.adminFee !== undefined) updateData.adminFee = parseFloat(body.adminFee)
    if (body.utilitiesAdvance !== undefined) updateData.utilitiesAdvance = parseFloat(body.utilitiesAdvance)

    // Contract file
    if (body.contractFileUrl !== undefined) updateData.contractFileUrl = body.contractFileUrl

    // Notes
    if (body.notes !== undefined) updateData.notes = body.notes

    // Substitute property
    if (body.substituteAddress !== undefined) updateData.substituteAddress = body.substituteAddress
    if (body.substituteCity !== undefined) updateData.substituteCity = body.substituteCity
    if (body.substitutePostalCode !== undefined) updateData.substitutePostalCode = body.substitutePostalCode

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
        property: {
          select: { id: true, name: true, address: true },
        },
        attachments: true,
      },
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — удалить договор
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

    const existing = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.contract.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}