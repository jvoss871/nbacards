import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_KEYS = ['draft_enabled', 'draft_opens_at', 'draft_year', 'draft_lock_time', 'picks_enabled']

// GET — return all draft settings
export async function GET() {
  const { data, error } = await sb
    .from('app_settings')
    .select('key, value')
    .in('key', ALLOWED_KEYS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json(map)
}

// POST — upsert one or more settings: { key, value }[]
// When value is null, the row is deleted (clearing the setting).
export async function POST(req: Request) {
  const updates: { key: string; value: unknown }[] = await req.json()
  const filtered = updates.filter(u => ALLOWED_KEYS.includes(u.key))
  if (!filtered.length) return NextResponse.json({ error: 'no valid keys' }, { status: 400 })

  const toSet    = filtered.filter(u => u.value !== null && u.value !== undefined)
  const toDelete = filtered.filter(u => u.value === null || u.value === undefined).map(u => u.key)

  if (toSet.length) {
    const { error } = await sb
      .from('app_settings')
      .upsert(toSet.map(u => ({ key: u.key, value: u.value })), { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (toDelete.length) {
    const { error } = await sb
      .from('app_settings')
      .delete()
      .in('key', toDelete)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
