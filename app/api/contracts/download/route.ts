// app/api/contracts/download/route.ts
// GET — Generate a fresh signed download URL for a contract file
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'contracts'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const contractId = searchParams.get('contractId')

    if (!path && !contractId) {
      return NextResponse.json({ error: 'path or contractId required' }, { status: 400 })
    }

    // If contractId provided, verify user has access (owner OR tenant)
    if (contractId) {
      const tenantProfile = await prisma.tenant.findFirst({
        where: { tenantUserId: user.id },
        select: { id: true },
      })

      const contract = await prisma.contract.findFirst({
        where: {
          id: contractId,
          OR: [
            { property: { userId: user.id } }, // owner
            ...(tenantProfile ? [{ tenantId: tenantProfile.id }] : []), // tenant
          ],
        },
      })

      if (!contract) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Generate signed URL
    const filePath = path || ''
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60) // 1 hour

    if (error) {
      console.error('Signed URL error:', error)

      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Storage bucket "contracts" not configured. Contact administrator.',
            code: 'BUCKET_NOT_FOUND',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to generate download URL: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}