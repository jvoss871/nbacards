import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request) {
  const { card_type_id } = await req.json() as { card_type_id: string }
  const { error } = await sb()
    .from('user_action_cards')
    .insert({ user_id: USER_ID, action_card_type_id: card_type_id, used: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
