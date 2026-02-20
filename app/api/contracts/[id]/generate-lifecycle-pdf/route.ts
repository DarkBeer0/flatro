// app/api/contracts/[id]/generate-lifecycle-pdf/route.ts
// Flatro — V9: Generate PDF for Protocols or Annexes
// GET ?type=protocol&protocolId=xxx  OR  ?type=annex&annexId=xxx

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { ProtocolPDF, type ProtocolPDFData } from '@/lib/pdf/ProtocolPDF'
import { AnnexPDF, type AnnexPDFData } from '@/lib/pdf/AnnexPDF'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'protocol' | 'annex'
    const protocolId = searchParams.get('protocolId')
    const annexId = searchParams.get('annexId')

    // ─── Verify contract ownership ────────────────────────
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
      include: {
        property: { select: { name: true, address: true, city: true } },
        tenant: { select: { firstName: true, lastName: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Get owner info
    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, address: true, city: true },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    let pdfBuffer: Buffer

    // ─── Protocol PDF ─────────────────────────────────────
    if (type === 'protocol' && protocolId) {
      const protocol = await prisma.protocol.findFirst({
        where: { id: protocolId, contractId },
      })

      if (!protocol) {
        return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
      }

      const data: ProtocolPDFData = {
        type: protocol.type as any,
        date: protocol.date.toISOString(),
        property: contract.property,
        owner: {
          firstName: owner.firstName || '',
          lastName: owner.lastName || '',
          address: [owner.address, owner.city].filter(Boolean).join(', ') || undefined,
        },
        tenant: contract.tenant,
        meterReadings: (protocol.meterReadings as any) || [],
        keysHandedOver: (protocol.keysHandedOver as any) || [],
        roomsCondition: (protocol.roomsCondition as any) || [],
        generalNotes: protocol.generalNotes,
        photos: (protocol.photos as any) || [],
      }

      pdfBuffer = await renderToBuffer(React.createElement(ProtocolPDF, { data }) as any)

      const fileName =
        protocol.type === 'MOVE_IN'
          ? `protokol-wydania-${contract.property.name}.pdf`
          : `protokol-zwrotu-${contract.property.name}.pdf`

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      })
    }

    // ─── Annex PDF ────────────────────────────────────────
    if (type === 'annex' && annexId) {
      const annex = await prisma.contractAnnex.findFirst({
        where: { id: annexId, contractId },
      })

      if (!annex) {
        return NextResponse.json({ error: 'Annex not found' }, { status: 404 })
      }

      const data: AnnexPDFData = {
        annexNumber: annex.annexNumber,
        type: annex.type as any,
        effectiveDate: annex.effectiveDate.toISOString(),
        changes: (annex.changes as any) || {},
        customText: annex.customText,
        contractStartDate: contract.startDate.toISOString(),
        property: contract.property,
        owner: {
          firstName: owner.firstName || '',
          lastName: owner.lastName || '',
          address: [owner.address, owner.city].filter(Boolean).join(', ') || undefined,
        },
        tenant: contract.tenant,
      }

      pdfBuffer = await renderToBuffer(React.createElement(AnnexPDF, { data }) as any)

      const fileName = `aneks-nr-${annex.annexNumber}-${contract.property.name}.pdf`

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid params. Use ?type=protocol&protocolId=... or ?type=annex&annexId=...' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error generating lifecycle PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}