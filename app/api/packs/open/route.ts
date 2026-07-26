import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { logEvent } from '@/lib/log-event'
import { drawPackCards, drawActionCard } from '@/lib/game-logic'
import { rollReliability } from '@/lib/trivia-logic'
import type { Player, PackType, ActionCardType } from '@/lib/types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function saveCard(
  sb: ReturnType<typeof serviceClient>,
  userId: string,
  player: Player,
  reliability: number,
) {
  const { data: existing } = await sb
    .from('user_cards')
    .select('id, quantity, reliability')
    .eq('user_id', userId)
    .eq('player_id', player.id)
    .maybeSingle()

  if (existing) {
    const rolls = [...(existing.reliability ?? []), reliability]
    await sb.from('user_cards').update({ quantity: existing.quantity + 1, reliability: rolls }).eq('id', existing.id)
  } else {
    await sb.from('user_cards').insert({ user_id: userId, player_id: player.id, quantity: 1, reliability: [reliability] })
  }
}

// POST /api/packs/open
// Body: { pack_id }
// Deducts credits, rolls the card draw + bonus action card entirely server-side
// (previously done in the browser, which let a client dictate its own results), saves
// the results, and returns them for display only.
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack_id } = await req.json() as { pack_id: string }
  const sb = serviceClient()

  const { data: pack } = await sb.from('pack_types').select('*').eq('id', pack_id).single()
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const { data: players } = await sb.from('players').select('*').eq('in_pool', true)
  if (!players || players.length === 0) {
    return NextResponse.json({ error: 'No players in the card pool yet. Sync the roster first.' }, { status: 409 })
  }

  // Atomic deduct-if-sufficient — a plain read-then-write here lets two simultaneous
  // requests both read the same starting balance and both pass the affordability check,
  // effectively opening two packs for the price of one. adjust_credits does the check
  // and the write as a single UPDATE, so a concurrent second request re-evaluates against
  // the already-decremented balance instead of a stale one.
  const { data: newBalance, error: deductError } = await sb.rpc('adjust_credits', {
    p_user_id: userId,
    p_delta: -pack.credit_cost,
  })
  if (deductError) return NextResponse.json({ error: deductError.message }, { status: 500 })
  if (newBalance === null) return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
  const previousBalance = newBalance + pack.credit_cost

  try {
    const cards = drawPackCards(pack as PackType, players as Player[], rollReliability)

    const bonusChance = pack.action_bonus_chance ?? 0
    const pool = pack.action_card_pool ?? {}
    const drawnActionId = drawActionCard(bonusChance, pool)
    let bonusCard: ActionCardType | null = null
    if (drawnActionId) {
      const { data: actionType } = await sb.from('action_card_types').select('*').eq('id', drawnActionId).single()
      if (actionType) bonusCard = actionType as ActionCardType
    }

    for (const { player, reliability } of cards) {
      await saveCard(sb, userId, player, reliability)
    }

    let bonusActionCardId: string | null = null
    if (bonusCard) {
      const { data: acRow } = await sb
        .from('user_action_cards')
        .insert({ user_id: userId, action_card_type_id: bonusCard.id, used: false })
        .select('id')
        .single()
      bonusActionCardId = acRow?.id ?? null
    }

    logEvent(sb, userId, 'pack_opened', {
      pack_name: pack.name,
      cost: pack.credit_cost,
      previous_balance: previousBalance,
      new_balance: newBalance,
      cards: cards.map(({ player }) => ({ name: player.name, tier: player.tier })),
    })

    return NextResponse.json({
      credits: newBalance,
      pack_name: pack.name,
      cards,
      bonusCard,
      bonusActionCardId,
    })
  } catch (e) {
    // Refund on draw failure — adjust by +cost rather than setting back to the old absolute
    // balance, so this can't clobber an unrelated concurrent change to the same row.
    await sb.rpc('adjust_credits', { p_user_id: userId, p_delta: pack.credit_cost })
    return NextResponse.json({ error: `Failed to draw cards: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
  }
}
