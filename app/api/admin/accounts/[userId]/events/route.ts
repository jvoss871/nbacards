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

// GET /api/admin/accounts/[userId]/events
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const client = sb()
  const dataUserId = await resolveDataUserId(client, userId)

  const { data, error } = await client
    .from('user_events')
    .select('id, event_type, metadata, created_at')
    .eq('user_id', dataUserId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
