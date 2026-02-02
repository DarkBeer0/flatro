// app/api/meters/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET — получить все счётчики для всех объектов владельца
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const propertyId = request.nextUrl.searchParams.get('propertyId')

    const where: any = {
      property: { userId: user.id },
    }
    if (propertyId) {
      where.propertyId = propertyId
    }

    const meters = await prisma.meter.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true },
        },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 2,
          select: {
            id: true,
            value: true,
            readingDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Добавляем расчёт потребления
    const metersWithUsage = meters.map(meter => {
      const lastReading = meter.readings[0]
      const prevReading = meter.readings[1]
      const usage = lastReading && prevReading ? lastReading.value - prevReading.value : null
      const cost = usage !== null && meter.pricePerUnit ? usage * meter.pricePerUnit : null
      
      return {
        ...meter,
        lastReading: lastReading || null,
        usage,
        cost,
      }
    })

    return NextResponse.json(metersWithUsage)
  } catch (error) {
    console.error('Error fetching meters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — создать новый счётчик
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, type, meterNumber, unit, pricePerUnit } = body

    // Проверяем что property принадлежит текущему пользователю
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const meter = await prisma.meter.create({
      data: {
        propertyId,
        type,
        meterNumber: meterNumber || null,
        unit,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
        readings: true,
      },
    })

    return NextResponse.json(meter, { status: 201 })
  } catch (error) {
    console.error('Error creating meter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
