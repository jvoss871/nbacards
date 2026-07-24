import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/onboarding — keys of onboarding callouts the caller has already dismissed
export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()
  const { data, error } = await sb.from('user_onboarding_seen').select('key').eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ seen: (data ?? []).map(r => r.key) })
}

// POST /api/onboarding  body: { key: string } — marks a callout as dismissed
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json() as { key: string }
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const sb = serviceClient()
  const { error } = await sb.from('user_onboarding_seen').upsert({ user_id: userId, key }, { onConflict: 'user_id,key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
