// app/api/auth/me/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Найти или создать пользователя
    let dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        tenantProfile: {
          include: {
            property: {
              select: { id: true, name: true, address: true }
            }
          }
        }
      }
    })

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || null,
          role: 'OWNER',
        },
        include: {
          tenantProfile: {
            include: {
              property: {
                select: { id: true, name: true, address: true }
              }
            }
          }
        }
      })
    }

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      role: dbUser.role,
      tenantProfile: dbUser.tenantProfile,
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
