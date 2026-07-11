import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/trivia/history — returns all trivia sessions for the profile page
export async function GET() {
  const sb = serviceClient()
  const { data, error } = await sb
    .from('trivia_sessions')
    .select('status, current_step, credits_floor, lifeline_fifty_used, lifeline_phone_used, lifeline_audience_used')
    .eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
