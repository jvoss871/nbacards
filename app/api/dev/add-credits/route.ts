import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await req.json() as { amount: number }
  const client = sb()
  const { data } = await client.from('user_state').select('credits').eq('user_id', USER_ID).single()
  const newCredits = (data?.credits ?? 0) + amount
  await client.from('user_state').update({ credits: newCredits }).eq('user_id', USER_ID)
  return NextResponse.json({ ok: true, credits: newCredits })
}
