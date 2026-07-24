import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/draft/results
// Body: { year: number, slot: number, prospectId: string | null, prospectName: string | null }
// Records which prospect a team actually picked at a slot — this is what
// /api/admin/draft/score matches each user's picks against. Meant to be called
// once per pick as the live draft happens. Only prospect columns are in the
// upsert payload, so the team_abbr/team_name saved via /api/admin/draft/order
// is left untouched.
export async function POST(req: Request) {
  const { year, slot, prospectId, prospectName } = await req.json() as {
    year: number; slot: number; prospectId: string | null; prospectName: string | null
  }

  if (!year || !slot) {
    return NextResponse.json({ error: 'year and slot are required' }, { status: 400 })
  }

  const { error } = await sb
    .from('draft_results')
    .upsert({ year, slot, prospect_id: prospectId, prospect_name: prospectName }, { onConflict: 'year,slot' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
