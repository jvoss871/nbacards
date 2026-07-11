import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/players
// Returns all players ordered by rating_2k desc (nulls last)
export async function GET() {
  const sb = serviceClient()
  const { data, error } = await sb
    .from('players')
    .select('id, name, rating_2k, tier, in_pool, position')
    .order('rating_2k', { ascending: false, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
