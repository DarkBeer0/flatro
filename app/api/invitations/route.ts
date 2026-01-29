// app/api/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { randomBytes } from 'crypto'

// GET /api/invitations - список приглашений владельца
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    const invitations = await prisma.invitation.findMany({
      where: {
        property: {
          userId: user.id,
          ...(propertyId && { id: propertyId })
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

// POST /api/invitations - создать приглашение
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { propertyId, email } = body

    // Проверяем что property принадлежит пользователю
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Генерируем уникальный код
    const code = randomBytes(16).toString('hex')

    // Срок действия - 7 дней
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        propertyId,
        email: email || null,
        code,
        expiresAt,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      }
    })

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
