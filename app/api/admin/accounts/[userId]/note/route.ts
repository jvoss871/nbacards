import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function resolveDataUserId(client: SupabaseClient, authUserId: string): Promise<string> {
  const { data } = await client
    .from('user_state')
    .select('user_id')
    .eq('user_id', authUserId)
    .maybeSingle()
  return data ? authUserId : 'default'
}

// POST /api/admin/accounts/[userId]/note
// Body: { note: string }
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { note } = await req.json() as { note?: string }

  const client = sb()
  const dataUserId = await resolveDataUserId(client, userId)

  const { error } = await client
    .from('user_state')
    .update({ support_note: note?.trim() || null })
    .eq('user_id', dataUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
