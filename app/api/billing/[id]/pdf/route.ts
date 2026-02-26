// app/api/billing/[id]/pdf/route.ts
// Flatro V10 — Generate & serve PDF for a billing document
// GET /api/billing/:id/pdf?save=true  — generate, optionally save to storage, redirect

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { BillingDocumentPDF } from '@/lib/pdf/BillingDocumentPDF'
import React from 'react'
import type { BillingDocument, BillingLineItem, SellerSnapshot, BuyerSnapshot } from '@/lib/billing/types'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const save = searchParams.get('save') === 'true'

    // ── Fetch document ────────────────────────────────────
    const doc = await prisma.billingDocument.findFirst({
      where: { id, ownerId: user.id },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // ── Build typed payload for PDF component ─────────────
    const pdfPayload: BillingDocument = {
      id:          doc.id,
      ownerId:     doc.ownerId,
      tenantId:    doc.tenantId,
      contractId:  doc.contractId,
      type:        doc.type        as BillingDocument['type'],
      number:      doc.number,
      issueDate:   doc.issueDate.toISOString(),
      saleDate:    doc.saleDate.toISOString(),
      dueDate:     doc.dueDate.toISOString(),
      items:       (doc.items as unknown as BillingLineItem[]),
      totalNet:    doc.totalNet,
      totalVat:    doc.totalVat,
      totalGross:  doc.totalGross,
      status:      doc.status      as BillingDocument['status'],
      remarks:     doc.remarks,
      sellerSnapshot: doc.sellerSnapshot as unknown as SellerSnapshot,
      buyerSnapshot:  doc.buyerSnapshot  as unknown as BuyerSnapshot,
      pdfUrl:      doc.pdfUrl,
      issuedAt:    doc.issuedAt?.toISOString()    ?? null,
      paidAt:      doc.paidAt?.toISOString()      ?? null,
      cancelledAt: doc.cancelledAt?.toISOString() ?? null,
      createdAt:   doc.createdAt.toISOString(),
      updatedAt:   doc.updatedAt.toISOString(),
    }

    // ── Render PDF ────────────────────────────────────────
    const buffer = await renderToBuffer(
      React.createElement(BillingDocumentPDF, { document: pdfPayload }) as any
    )

    // ── Optionally save to Supabase storage ───────────────
    if (save) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const filePath = `billing/${user.id}/${doc.number.replace(/\//g, '-')}.pdf`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, buffer, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath)

          await prisma.billingDocument.update({
            where: { id },
            data: { pdfUrl: publicUrl.publicUrl },
          })
        }
      } catch (storageErr) {
        // Non-fatal — PDF still returned to client
        console.warn('[billing/pdf] Storage save failed:', storageErr)
      }
    }

    // ── Return PDF as file download ───────────────────────
    const safeNumber = doc.number.replace(/\//g, '-')
    const fileName   = `${safeNumber}.pdf`

   return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/billing/:id/pdf]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}