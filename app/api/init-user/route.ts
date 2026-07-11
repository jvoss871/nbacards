import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STARTING_CREDITS = 200

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/init-user
// Body: { user_id: string }
// Creates a new user_state row with starting credits if one doesn't exist.
// Call this immediately after signup/auth completes.
export async function POST(req: Request) {
  const { user_id } = await req.json() as { user_id?: string }
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const sb = serviceClient()

  const { data: existing } = await sb
    .from('user_state')
    .select('user_id, credits')
    .eq('user_id', user_id)
    .single()

  if (existing) {
    return NextResponse.json({ already_exists: true, credits: existing.credits })
  }

  const { error } = await sb
    .from('user_state')
    .insert({ user_id, credits: STARTING_CREDITS })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: true, credits: STARTING_CREDITS })
}
