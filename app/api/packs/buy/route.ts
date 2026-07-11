import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/packs/buy
// Body: { pack_id }
// Deducts credits server-side. Returns new balance or 402 if insufficient.
export async function POST(req: Request) {
  const { pack_id } = await req.json()
  const sb = serviceClient()

  const { data: pack } = await sb
    .from('pack_types')
    .select('credit_cost, name')
    .eq('id', pack_id)
    .single()

  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const { data: state } = await sb
    .from('user_state')
    .select('credits')
    .eq('user_id', USER_ID)
    .single()

  if (!state) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (state.credits < pack.credit_cost) {
    return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
  }

  const newCredits = state.credits - pack.credit_cost
  const { error } = await sb
    .from('user_state')
    .update({ credits: newCredits })
    .eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, credits: newCredits, pack_name: pack.name, cost: pack.credit_cost, previous_balance: state.credits })
}
