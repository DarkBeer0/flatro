// app/api/tenant/profile/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET — получить профиль текущего арендатора
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantProfile = await prisma.tenant.findFirst({
      where: {
        tenantUserId: user.id,
        isActive: true,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    })

    if (!tenantProfile) {
      return NextResponse.json({ error: 'Tenant profile not found' }, { status: 404 })
    }

    return NextResponse.json(tenantProfile)
  } catch (error) {
    console.error('Error fetching tenant profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
