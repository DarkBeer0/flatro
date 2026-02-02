// app/api/meters/[id]/readings/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST — добавить показание счётчика
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: meterId } = await params
    const body = await request.json()
    const { value, readingDate } = body

    // Проверяем что счётчик принадлежит объекту текущего пользователя
    const meter = await prisma.meter.findFirst({
      where: {
        id: meterId,
        property: { userId: user.id },
      },
    })

    if (!meter) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
    }

    const reading = await prisma.meterReading.create({
      data: {
        meterId,
        value: parseFloat(value),
        readingDate: readingDate ? new Date(readingDate) : new Date(),
      },
    })

    return NextResponse.json(reading, { status: 201 })
  } catch (error) {
    console.error('Error creating reading:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
