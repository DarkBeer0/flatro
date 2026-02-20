// app/api/properties/route.ts  (V8 — with subscription limit check)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { canAddProperty, type SubscriptionPlan } from '@/lib/subscription'

// GET /api/properties - получить список недвижимости
export async function GET() {
  try {
    const user = await requireUser()

    const properties = await prisma.property.findMany({
      where: { userId: user.id },
      include: {
        tenants: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contracts: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            rentAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}

// POST /api/properties - создать недвижимость (with plan limit check)
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    // ── Subscription limit check ──────────────────────────────────
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionPlan: true,
        _count: { select: { properties: true } },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const plan = (dbUser.subscriptionPlan ?? 'FREE') as SubscriptionPlan
    const currentCount = dbUser._count.properties
    const check = canAddProperty(plan, currentCount)

    if (!check.allowed) {
      return NextResponse.json(
        {
          error: 'PLAN_LIMIT_REACHED',
          message: `Twój plan ${plan} pozwala na maksymalnie ${check.limit} nieruchomości. Zaktualizuj plan, aby dodać więcej.`,
          plan,
          limit: check.limit,
          current: check.current,
        },
        { status: 403 }
      )
    }
    // ── End limit check ───────────────────────────────────────────

    const body = await request.json()

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        name: body.name,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode || null,
        area: body.area ? parseFloat(body.area) : null,
        rooms: body.rooms ? parseInt(body.rooms) : null,
        floor: body.floor ? parseInt(body.floor) : null,
        description: body.description || null,
        status: body.status || 'VACANT',
      },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}