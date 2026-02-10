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
        attachments: {
          select: {
            id: true,
            type: true,
            label: true,
            fileName: true,
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
    const {
      propertyId,
      tenantId,
      type,
      startDate,
      endDate,
      rentAmount,
      adminFee,
      utilitiesAdvance,
      depositAmount,
      paymentDay,
      notes,
      contractSource,
      contractFileUrl,
      currency,
      country,
      locale,
      // Najem okazjonalny fields
      substituteAddress,
      substituteCity,
      substitutePostalCode,
      // Attachments (array of {type, label, fileUrl, fileName, fileSize, mimeType})
      attachments,
    } = body

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Verify tenant ownership
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, userId: user.id },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Determine initial status
    const initialStatus: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' =
      contractSource === 'UPLOAD' && contractFileUrl ? 'SIGNED' : 'DRAFT'

    // Create contract with attachments
    const contract = await prisma.contract.create({
      data: {
        propertyId,
        tenantId,
        type: type || 'STANDARD',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        rentAmount: parseFloat(rentAmount) || 0,
        adminFee: parseFloat(adminFee) || 0,
        utilitiesAdvance: parseFloat(utilitiesAdvance) || 0,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        paymentDay: parseInt(paymentDay) || 10,
        notes: notes || null,
        noticePeriod: body.noticePeriod ? parseInt(body.noticePeriod) : 1,
        additionalTerms: body.additionalTerms || null,
        status: initialStatus,
        contractSource: contractSource || 'FORM',
        contractFileUrl: contractFileUrl || null,
        currency: currency || 'PLN',
        country: country || 'PL',
        locale: locale || 'pl-PL',
        substituteAddress: substituteAddress || null,
        substituteCity: substituteCity || null,
        substitutePostalCode: substitutePostalCode || null,
        // Create attachments if provided
        ...(attachments && attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((att: any) => ({
                  type: att.type || 'OTHER',
                  label: att.label || att.fileName || 'Załącznik',
                  fileUrl: att.fileUrl,
                  fileName: att.fileName || null,
                  fileSize: att.fileSize || null,
                  mimeType: att.mimeType || null,
                })),
              },
            }
          : {}),
      },
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

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}