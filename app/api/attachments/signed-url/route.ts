// app/api/attachments/signed-url/route.ts
// Generate URLs for secure image access
// FIX: Now uses getAttachmentUrls() which supports public bucket mode
// and 7-day TTL for signed URLs (was 1 hour)

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAttachmentUrls } from '@/lib/supabase/storage'

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

    // Uses public URLs or 7-day signed URLs depending on config
    const urls = await getAttachmentUrls(paths)

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('[SignedURL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}