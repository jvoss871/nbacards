import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { drawCard, REROLL_ODDS } from '@/lib/game-logic'
import { rollReliability } from '@/lib/trivia-logic'
import type { Player } from '@/lib/types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/packs/reroll
// Body: { action_card_id, replace_player_id }
// Burns a 'reroll' action card to redraw one slot server-side. `replace_player_id` must be
// a card the caller currently owns (proves it's their own drawn card, not an arbitrary id) —
// the request is rejected before any mutation if ownership can't be verified. The redraw uses
// a fixed odds table (REROLL_ODDS), not whatever pack the client claims to be opening.
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action_card_id, replace_player_id } = await req.json() as {
    action_card_id: string; replace_player_id: string
  }
  const sb = serviceClient()

  const { data: actionCard } = await sb
    .from('user_action_cards')
    .select('*, type:action_card_types(*)')
    .eq('id', action_card_id)
    .eq('user_id', userId)
    .eq('used', false)
    .maybeSingle()
  if (!actionCard || actionCard.action_card_type_id !== 'reroll') {
    return NextResponse.json({ error: 'Reroll card not available' }, { status: 403 })
  }

  const { data: owned } = await sb
    .from('user_cards')
    .select('id, quantity, reliability')
    .eq('user_id', userId)
    .eq('player_id', replace_player_id)
    .maybeSingle()
  if (!owned || owned.quantity < 1) {
    return NextResponse.json({ error: 'You do not own that card' }, { status: 400 })
  }

  const { data: players } = await sb.from('players').select('*').eq('in_pool', true)
  if (!players || players.length === 0) {
    return NextResponse.json({ error: 'Player pool not found' }, { status: 404 })
  }

  // Platinum is the top tier, so a reroll can't offer "same tier or higher" without
  // either reproducing another platinum (the exact farming loop this card must not enable)
  // or silently downgrading. Rather than either, platinum cards simply can't be rerolled.
  const oldPlayer = (players as Player[]).find(p => p.id === replace_player_id)
  if (oldPlayer?.tier === 'platinum') {
    return NextResponse.json({ error: 'Platinum cards cannot be rerolled' }, { status: 400 })
  }

  // Undo the old copy of this card
  if (owned.quantity <= 1) {
    await sb.from('user_cards').delete().eq('id', owned.id)
  } else {
    await sb.from('user_cards').update({
      quantity: owned.quantity - 1,
      reliability: (owned.reliability ?? []).slice(0, -1),
    }).eq('id', owned.id)
  }

  // Draw the replacement — floored at the old card's tier so a reroll is never a downgrade.
  const floorTier = oldPlayer?.tier ?? 'bronze'
  const newPlayer = drawCard({ odds: REROLL_ODDS, guaranteed_tier: floorTier }, players as Player[], true)
  const newReliability = rollReliability(newPlayer.tier)

  const { data: existing } = await sb
    .from('user_cards')
    .select('id, quantity, reliability')
    .eq('user_id', userId)
    .eq('player_id', newPlayer.id)
    .maybeSingle()
  if (existing) {
    await sb.from('user_cards').update({
      quantity: existing.quantity + 1,
      reliability: [...(existing.reliability ?? []), newReliability],
    }).eq('id', existing.id)
  } else {
    await sb.from('user_cards').insert({ user_id: userId, player_id: newPlayer.id, quantity: 1, reliability: [newReliability] })
  }

  await sb.from('user_action_cards').update({ used: true }).eq('id', action_card_id)

  return NextResponse.json({ player: newPlayer, reliability: newReliability })
}
