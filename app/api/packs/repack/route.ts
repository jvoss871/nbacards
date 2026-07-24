import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { drawPackCards } from '@/lib/game-logic'
import { rollReliability } from '@/lib/trivia-logic'
import type { Player, PackType } from '@/lib/types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/packs/repack
// Body: { action_card_id, pack_id, replace_player_ids, bonus_action_card_id? }
// Burns a 'repack' action card to scrap the whole just-opened set and draw a new one
// server-side. Every id in `replace_player_ids` must be a card the caller currently owns —
// verified before any mutation, same trust boundary as /api/packs/reroll. No new bonus
// action card is granted on repack (matches the pre-existing product behavior).
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action_card_id, pack_id, replace_player_ids, bonus_action_card_id } = await req.json() as {
    action_card_id: string; pack_id: string; replace_player_ids: string[]; bonus_action_card_id?: string | null
  }
  const sb = serviceClient()

  const { data: actionCard } = await sb
    .from('user_action_cards')
    .select('*')
    .eq('id', action_card_id)
    .eq('user_id', userId)
    .eq('used', false)
    .maybeSingle()
  if (!actionCard || actionCard.action_card_type_id !== 'repack') {
    return NextResponse.json({ error: 'Repack card not available' }, { status: 403 })
  }

  const { data: pack } = await sb.from('pack_types').select('*').eq('id', pack_id).single()
  const { data: players } = await sb.from('players').select('*').eq('in_pool', true)
  if (!pack || !players || players.length === 0) {
    return NextResponse.json({ error: 'Pack or player pool not found' }, { status: 404 })
  }

  // Verify ownership of every card being scrapped before mutating anything
  const owned = await Promise.all(
    replace_player_ids.map(playerId =>
      sb.from('user_cards').select('id, quantity, reliability').eq('user_id', userId).eq('player_id', playerId).maybeSingle()
    )
  )
  if (owned.some(({ data }) => !data || data.quantity < 1)) {
    return NextResponse.json({ error: 'You do not own one or more of those cards' }, { status: 400 })
  }

  for (const { data: row } of owned) {
    if (!row) continue
    if (row.quantity <= 1) {
      await sb.from('user_cards').delete().eq('id', row.id)
    } else {
      await sb.from('user_cards').update({
        quantity: row.quantity - 1,
        reliability: (row.reliability ?? []).slice(0, -1),
      }).eq('id', row.id)
    }
  }

  if (bonus_action_card_id) {
    await sb.from('user_action_cards').delete().eq('id', bonus_action_card_id).eq('user_id', userId)
  }

  const cards = drawPackCards(pack as PackType, players as Player[], rollReliability)

  for (const { player, reliability } of cards) {
    const { data: existing } = await sb
      .from('user_cards')
      .select('id, quantity, reliability')
      .eq('user_id', userId)
      .eq('player_id', player.id)
      .maybeSingle()
    if (existing) {
      await sb.from('user_cards').update({
        quantity: existing.quantity + 1,
        reliability: [...(existing.reliability ?? []), reliability],
      }).eq('id', existing.id)
    } else {
      await sb.from('user_cards').insert({ user_id: userId, player_id: player.id, quantity: 1, reliability: [reliability] })
    }
  }

  await sb.from('user_action_cards').update({ used: true }).eq('id', action_card_id)

  return NextResponse.json({ cards })
}
