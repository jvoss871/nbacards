import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/admin/draft/reset-prospects
// Body: { year?: number }
// Deletes all draft_prospects for the given year.
// Note: also clears any picks referencing those prospects (cascade or manual).
export async function DELETE(req: Request) {
  const { year = DRAFT_YEAR } = await req.json().catch(() => ({}))

  // Get prospect IDs for this year so we can clear picks referencing them
  const { data: prospects } = await sb
    .from('draft_prospects')
    .select('id')
    .eq('year', year)

  if (prospects?.length) {
    const ids = prospects.map(p => p.id)
    await sb.from('draft_picks').delete().in('prospect_id', ids)
  }

  const { error } = await sb.from('draft_prospects').delete().eq('year', year)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, year, deleted: prospects?.length ?? 0 })
}
