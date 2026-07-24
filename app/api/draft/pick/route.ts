import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getOrCreateBoard(userId: string, year: number) {
  const { data: existing } = await sb
    .from('draft_boards')
    .select('id, status')
    .eq('user_id', userId)
    .eq('year', year)
    .single()
  if (existing) return existing

  const { data: created } = await sb
    .from('draft_boards')
    .insert({ user_id: userId, year, status: 'open' })
    .select('id, status')
    .single()
  return created
}

async function isLockTimePassed(): Promise<boolean> {
  const { data } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'draft_lock_time')
    .single()
  if (!data?.value) return false
  const raw = typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : String(data.value)
  const lockTime = new Date(raw)
  return isNaN(lockTime.getTime()) ? false : Date.now() >= lockTime.getTime()
}

// PUT — upsert a pick (slot + prospect_id)
export async function PUT(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slot, prospect_id, year = DRAFT_YEAR } = await req.json()
  if (!slot || !prospect_id) return NextResponse.json({ error: 'slot and prospect_id required' }, { status: 400 })

  if (await isLockTimePassed()) return NextResponse.json({ error: 'board is locked' }, { status: 403 })

  const board = await getOrCreateBoard(userId, year)
  if (!board) return NextResponse.json({ error: 'board error' }, { status: 500 })
  if (board.status !== 'open') return NextResponse.json({ error: 'board is locked' }, { status: 403 })

  // Remove any existing pick for this prospect on other slots
  await sb.from('draft_picks').delete().eq('board_id', board.id).eq('prospect_id', prospect_id)

  // Upsert to target slot
  const { error } = await sb.from('draft_picks').upsert(
    { board_id: board.id, slot, prospect_id },
    { onConflict: 'board_id,slot' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a pick from a slot
export async function DELETE(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slot, year = DRAFT_YEAR } = await req.json()
  if (!slot) return NextResponse.json({ error: 'slot required' }, { status: 400 })

  if (await isLockTimePassed()) return NextResponse.json({ error: 'board is locked' }, { status: 403 })

  const board = await getOrCreateBoard(userId, year)
  if (!board) return NextResponse.json({ error: 'board error' }, { status: 500 })
  if (board.status !== 'open') return NextResponse.json({ error: 'board is locked' }, { status: 403 })

  await sb.from('draft_picks').delete().eq('board_id', board.id).eq('slot', slot)
  return NextResponse.json({ ok: true })
}
