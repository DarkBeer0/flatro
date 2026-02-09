// app/api/tenant/contracts/route.ts
// GET — Tenant sees only contracts where they are the tenant
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Tenant record linked to this user
    const tenantProfile = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true },
    })

    if (!tenantProfile) {
      return NextResponse.json([]) // No tenant profile = no contracts
    }

    const contracts = await prisma.contract.findMany({
      where: {
        tenantId: tenantProfile.id,
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        attachments: {
          select: {
            id: true,
            type: true,
            label: true,
            fileName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Error fetching tenant contracts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}