// app/api/properties/[id]/rates/route.ts
// Flatro — Utility Rate History (Tariff management)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/properties/[id]/rates?meterType=...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: propertyId } = await params
    const meterType = request.nextUrl.searchParams.get('meterType')

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const rates = await prisma.utilityRate.findMany({
      where: {
        propertyId,
        ...(meterType && { meterType: meterType as any }),
      },
      orderBy: [{ meterType: 'asc' }, { effectiveFrom: 'desc' }],
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching rates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/properties/[id]/rates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: propertyId } = await params
    const body = await request.json()

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { meterType, pricePerUnit, effectiveFrom, effectiveTo, source, notes } = body

    if (!meterType || pricePerUnit === undefined || !effectiveFrom) {
      return NextResponse.json(
        { error: 'meterType, pricePerUnit, and effectiveFrom are required' },
        { status: 400 }
      )
    }

    // Close previous open rate for same meterType (set effectiveTo)
    const prevRate = await prisma.utilityRate.findFirst({
      where: {
        propertyId,
        meterType,
        effectiveTo: null, // currently active
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    const newEffectiveFrom = new Date(effectiveFrom)

    if (prevRate) {
      // Close previous rate the day before new one starts
      const closingDate = new Date(newEffectiveFrom)
      closingDate.setDate(closingDate.getDate() - 1)

      await prisma.utilityRate.update({
        where: { id: prevRate.id },
        data: { effectiveTo: closingDate },
      })
    }

    // Also update the meter's current pricePerUnit for UI convenience
    await prisma.meter.updateMany({
      where: { propertyId, type: meterType, status: 'ACTIVE' },
      data: { pricePerUnit: parseFloat(pricePerUnit) },
    })

    const rate = await prisma.utilityRate.create({
      data: {
        propertyId,
        meterType,
        pricePerUnit: parseFloat(pricePerUnit),
        effectiveFrom: newEffectiveFrom,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        source: source || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(rate, { status: 201 })
  } catch (error) {
    console.error('Error creating rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}