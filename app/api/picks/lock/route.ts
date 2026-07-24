import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface PickInput {
  game_id: string
  side: 'home' | 'away'
  card_player_id?: string | null
  use_insurance?: boolean
  use_double_down?: boolean
}

// POST /api/picks/lock
// Body: { picks: PickInput[] }
// Locks in a batch of picks server-side — verifies the game is still open, the wagered
// card is actually owned and not already wagered elsewhere, and that insurance/double-down
// requests are each backed by a distinct unused action card. Previously all of this (plus
// the actual prediction insert and action-card consumption) happened as direct anon-key
// writes from the browser with none of these checks enforced.
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { picks } = await req.json() as { picks: PickInput[] }
  if (!Array.isArray(picks) || picks.length === 0) {
    return NextResponse.json({ error: 'picks array required' }, { status: 400 })
  }

  const sb = serviceClient()

  const gameIds = picks.map(p => p.game_id)
  const { data: games } = await sb.from('games').select('*').in('id', gameIds)
  const gameById = new Map((games ?? []).map(g => [g.id, g]))

  for (const pick of picks) {
    const game = gameById.get(pick.game_id)
    if (!game || game.status !== 'scheduled') {
      return NextResponse.json({ error: `Game ${pick.game_id} is no longer open for picks` }, { status: 409 })
    }
  }

  const { data: existingPreds } = await sb
    .from('predictions')
    .select('game_id, card_used_id, status')
    .eq('user_id', userId)
    .in('game_id', gameIds)
  for (const pick of picks) {
    if ((existingPreds ?? []).some(p => p.game_id === pick.game_id)) {
      return NextResponse.json({ error: `Already picked game ${pick.game_id}` }, { status: 409 })
    }
  }

  const { data: pendingWagers } = await sb
    .from('predictions')
    .select('card_used_id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .not('card_used_id', 'is', null)
  const wageredElsewhere = new Set((pendingWagers ?? []).map(p => p.card_used_id as string))

  const cardIdsRequested = picks.map(p => p.card_player_id).filter((id): id is string => !!id)
  const seenInBatch = new Set<string>()
  for (const id of cardIdsRequested) {
    if (wageredElsewhere.has(id) || seenInBatch.has(id)) {
      return NextResponse.json({ error: 'A card in this batch is already wagered on another pending pick' }, { status: 409 })
    }
    seenInBatch.add(id)
  }
  if (cardIdsRequested.length > 0) {
    const { data: ownedCards } = await sb
      .from('user_cards')
      .select('player_id, quantity')
      .eq('user_id', userId)
      .in('player_id', cardIdsRequested)
    const ownedIds = new Set((ownedCards ?? []).filter(c => c.quantity >= 1).map(c => c.player_id))
    for (const id of cardIdsRequested) {
      if (!ownedIds.has(id)) return NextResponse.json({ error: `Card ${id} is not owned` }, { status: 400 })
    }
  }

  // Each insurance/double-down request needs its own distinct unused action card.
  const { data: unusedActionCards } = await sb
    .from('user_action_cards')
    .select('id, action_card_type_id')
    .eq('user_id', userId)
    .eq('used', false)
  const insurancePool = (unusedActionCards ?? []).filter(c => c.action_card_type_id === 'insurance').map(c => c.id)
  const doubleDownPool = (unusedActionCards ?? []).filter(c => c.action_card_type_id === 'double_down').map(c => c.id)

  const insuranceNeeded = picks.filter(p => p.use_insurance && p.card_player_id).length
  const doubleDownNeeded = picks.filter(p => p.use_double_down).length
  if (insuranceNeeded > insurancePool.length) {
    return NextResponse.json({ error: 'Not enough unused Insurance cards for this batch' }, { status: 409 })
  }
  if (doubleDownNeeded > doubleDownPool.length) {
    return NextResponse.json({ error: 'Not enough unused Double Down cards for this batch' }, { status: 409 })
  }

  const consumedActionCardIds: string[] = []
  const rows = picks.map(pick => {
    const game = gameById.get(pick.game_id)!
    const teamName = pick.side === 'home' ? game.home_team : game.away_team
    const multiplier = 1.0 // set below if a card is wagered
    let insuranceCardId: string | null = null
    let doubleDownCardId: string | null = null
    if (pick.use_insurance && pick.card_player_id && insurancePool.length > 0) {
      const id = insurancePool.shift() as string
      insuranceCardId = id
      consumedActionCardIds.push(id)
    }
    if (pick.use_double_down && doubleDownPool.length > 0) {
      const id = doubleDownPool.shift() as string
      doubleDownCardId = id
      consumedActionCardIds.push(id)
    }
    return {
      user_id: userId,
      game_id: pick.game_id,
      predicted_winner: pick.side,
      predicted_team: teamName,
      multiplier_applied: multiplier,
      card_used_id: pick.card_player_id ?? null,
      insurance_card_id: insuranceCardId,
      double_down_card_id: doubleDownCardId,
      status: 'pending' as const,
      credits_earned: null,
    }
  })

  // Multiplier comes from the wagered card's own multiplier, not a client-supplied value
  if (cardIdsRequested.length > 0) {
    const { data: cardPlayers } = await sb.from('players').select('id, multiplier').in('id', cardIdsRequested)
    const multiplierById = new Map((cardPlayers ?? []).map(p => [p.id, p.multiplier]))
    for (const row of rows) {
      if (row.card_used_id) row.multiplier_applied = multiplierById.get(row.card_used_id) ?? 1.0
    }
  }

  const { data, error } = await sb.from('predictions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (consumedActionCardIds.length > 0) {
    await sb.from('user_action_cards').update({ used: true }).in('id', consumedActionCardIds)
  }

  return NextResponse.json({ predictions: data, consumedActionCardIds })
}
