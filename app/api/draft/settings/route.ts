import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRAFT_YEAR } from '@/lib/draft-logic'
import type { DraftSettings } from '@/lib/draft-logic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['draft_enabled', 'draft_opens_at', 'draft_year', 'draft_lock_time', 'picks_enabled'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))

  const settings: DraftSettings & { picks_enabled: boolean } = {
    enabled:       map.draft_enabled  === true,
    opens_at:      map.draft_opens_at ?? null,
    year:          map.draft_year     ?? DRAFT_YEAR,
    lock_time:     map.draft_lock_time ?? null,
    picks_enabled: map.picks_enabled  !== false,
  }

  return NextResponse.json(settings)
}
