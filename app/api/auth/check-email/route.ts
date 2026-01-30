// app/api/auth/check-email/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST - проверить существует ли email в системе
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    // Проверяем email в нашей БД (не в Supabase Auth)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true }
    })

    return NextResponse.json({ 
      exists: !!user 
    })
  } catch (error) {
    console.error('Error checking email:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
