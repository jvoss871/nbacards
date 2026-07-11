import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/log-event'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/packs/log-open
// Called after all cards are saved in open/page.tsx
export async function POST(req: Request) {
  const { pack_name, cost, previous_balance, new_balance, cards } = await req.json()
  const sb = serviceClient()
  logEvent(sb, USER_ID, 'pack_opened', { pack_name, cost, previous_balance, new_balance, cards })
  return NextResponse.json({ ok: true })
}
