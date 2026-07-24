import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/log-event'
import { getUserId } from '@/lib/get-user-id'

const SLOT_POSITION: Record<number, string> = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' }
const SLOT_LABEL: Record<number, string> = {
  1: 'Point Guard', 2: 'Shooting Guard', 3: 'Small Forward', 4: 'Power Forward', 5: 'Center',
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/prestige — eligibility + slot options
export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()

  const [userRes, ownedRes, totalRes] = await Promise.all([
    sb.from('user_state').select('prestige_level, username').eq('user_id', userId).single(),
    sb.from('user_cards').select('player_id').eq('user_id', userId),
    sb.from('players').select('id').eq('in_pool', true),
  ])

  const prestigeLevel = (userRes.data?.prestige_level ?? 0) as number
  const username = (userRes.data?.username ?? null) as string | null
  const ownedUnique = new Set(
    (ownedRes.data ?? []).map((r: { player_id: string }) => r.player_id)
  ).size
  const totalPlayers = (totalRes.data ?? []).length
  const canPrestige = totalPlayers > 0 && ownedUnique >= totalPlayers

  const nextSlot = prestigeLevel + 1
  const [nextSlotRes, earnedRes] = await Promise.all([
    sb.from('legends').select('*').eq('prestige_required', nextSlot).order('name'),
    sb.from('user_legends')
      .select('prestige_number, earned_at, legend:legends(*)')
      .eq('user_id', userId)
      .order('prestige_number'),
  ])

  return NextResponse.json({
    prestigeLevel,
    username,
    ownedUnique,
    totalPlayers,
    canPrestige,
    nextSlot,
    nextSlotPosition: SLOT_POSITION[nextSlot] ?? null,
    nextSlotLabel: SLOT_LABEL[nextSlot] ?? null,
    nextSlotOptions: nextSlotRes.data ?? [],
    earnedLegends: earnedRes.data ?? [],
  })
}

// POST /api/prestige — perform prestige with chosen legend
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { legendId } = await req.json() as { legendId?: string }

  if (!legendId) {
    return NextResponse.json({ error: 'legendId is required' }, { status: 400 })
  }

  const sb = serviceClient()

  // Re-verify eligibility server-side
  const [userRes, ownedRes, totalRes] = await Promise.all([
    sb.from('user_state').select('prestige_level, username').eq('user_id', userId).single(),
    sb.from('user_cards').select('player_id').eq('user_id', userId),
    sb.from('players').select('id').eq('in_pool', true),
  ])

  const currentLevel = (userRes.data?.prestige_level ?? 0) as number
  const username = (userRes.data?.username ?? 'Anonymous') as string
  const ownedUnique = new Set(
    (ownedRes.data ?? []).map((r: { player_id: string }) => r.player_id)
  ).size
  const totalPlayers = (totalRes.data ?? []).length

  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev && (totalPlayers === 0 || ownedUnique < totalPlayers)) {
    return NextResponse.json({ error: 'Collection not complete' }, { status: 400 })
  }

  const newLevel = currentLevel + 1

  // Validate chosen legend belongs to the correct slot
  const { data: chosenLegend, error: legendErr } = await sb
    .from('legends')
    .select('*')
    .eq('id', legendId)
    .single()

  if (legendErr || !chosenLegend) {
    return NextResponse.json({ error: 'Legend not found' }, { status: 400 })
  }
  if (chosenLegend.prestige_required !== newLevel) {
    return NextResponse.json({ error: 'Invalid legend for this prestige slot' }, { status: 400 })
  }

  // Log attempt before any destructive step — if we see this without prestige_completed, something failed mid-flow
  logEvent(sb, userId, 'prestige_attempt', {
    from_level: currentLevel,
    to_level: newLevel,
    cards_before: ownedUnique,
    legend_id: legendId,
    legend_name: chosenLegend.name,
  })

  // 1. Increment prestige level
  await sb.from('user_state').update({ prestige_level: newLevel }).eq('user_id', userId)

  // 2. Wipe collection
  await sb.from('user_cards').delete().eq('user_id', userId)

  // 3. Award the chosen legend
  await sb.from('user_legends').upsert(
    { user_id: userId, legend_id: legendId, prestige_number: newLevel },
    { onConflict: 'user_id,legend_id' }
  )

  // 4. Induct into Hall of Fame at Prestige V
  const inductedToHof = newLevel === 5
  if (inductedToHof) {
    await sb.from('hall_of_fame').upsert(
      { user_id: userId, username },
      { onConflict: 'user_id' }
    )
  }

  logEvent(sb, userId, 'prestige_completed', {
    to_level: newLevel,
    legend_name: chosenLegend.name,
    inducted_to_hof: inductedToHof,
  })

  return NextResponse.json({
    success: true,
    newPrestigeLevel: newLevel,
    legend: chosenLegend,
    inductedToHof,
  })
}
