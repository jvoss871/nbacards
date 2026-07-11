import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/log-event'

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

// POST /api/admin/accounts/[userId]/credits
// Body: { delta: number }  — positive adds, negative subtracts
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { delta } = await req.json() as { delta: number }
  if (typeof delta !== 'number' || isNaN(delta)) {
    return NextResponse.json({ error: 'invalid delta' }, { status: 400 })
  }

  const client = sb()
  const dataUserId = await resolveDataUserId(client, userId)

  const { data: state } = await client.from('user_state').select('credits').eq('user_id', dataUserId).single()
  const current = state?.credits ?? 0
  const next = Math.max(0, current + delta)
  const { error } = await client.from('user_state').update({ credits: next }).eq('user_id', dataUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logEvent(client, dataUserId, 'credits_adjusted', { delta, previous: current, new_balance: next, adjusted_by: 'admin' })

  return NextResponse.json({ ok: true, previous: current, credits: next, delta })
}
