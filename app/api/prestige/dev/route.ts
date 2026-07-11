import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/prestige/dev — dev-only: set prestige level, award one legend per slot
export async function POST(req: Request) {
  const { level } = await req.json() as { level: number }
  const sb = serviceClient()

  await sb.from('user_state').update({ prestige_level: level }).eq('user_id', USER_ID)
  await sb.from('user_legends').delete().eq('user_id', USER_ID)

  if (level > 0) {
    // Award the first legend alphabetically for each slot up to `level`
    for (let slot = 1; slot <= level; slot++) {
      const { data: slotLegs } = await sb
        .from('legends')
        .select('*')
        .eq('prestige_required', slot)
        .order('name')
        .limit(1)

      const leg = slotLegs?.[0]
      if (leg) {
        await sb.from('user_legends').upsert(
          { user_id: USER_ID, legend_id: leg.id, prestige_number: slot },
          { onConflict: 'user_id,legend_id' }
        )
      }
    }
  }

  const { data: earnedData } = await sb
    .from('user_legends')
    .select('prestige_number, earned_at, legend:legends(*)')
    .eq('user_id', USER_ID)
    .order('prestige_number')

  return NextResponse.json({ success: true, level, earnedLegends: earnedData ?? [] })
}
