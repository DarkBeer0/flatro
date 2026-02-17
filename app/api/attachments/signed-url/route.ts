// app/api/attachments/signed-url/route.ts
// Generate signed URLs for secure image access

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'attachments'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paths } = body as { paths: string[] }

    if (!paths?.length) {
      return NextResponse.json({ error: 'paths array is required' }, { status: 400 })
    }

    // Limit batch size
    if (paths.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 paths per request' }, { status: 400 })
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600) // 1 hour

    if (error) {
      console.error('[SignedURL] Error:', error)
      return NextResponse.json({ error: 'Failed to generate URLs' }, { status: 500 })
    }

    const urls: Record<string, string> = {}
    data?.forEach((item) => {
      if (item.signedUrl && item.path) {
        urls[item.path] = item.signedUrl
      }
    })

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('[SignedURL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
