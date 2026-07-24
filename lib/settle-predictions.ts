import { type SupabaseClient } from '@supabase/supabase-js'
import { calcCreditsEarned } from '@/lib/game-logic'
import { logEvent } from '@/lib/log-event'

export async function settlePredictions(
  sb: SupabaseClient,
  gameId: string,
  winner: 'home' | 'away',
): Promise<number> {
  const { data: preds } = await sb
    .from('predictions')
    .select('*')
    .eq('game_id', gameId)
    .eq('status', 'pending')

  if (!preds?.length) return 0

  // Resolve wagered-card player names up front so the account activity feed
  // reads as "LeBron James lost" instead of a bare player id.
  const cardPlayerIds = [...new Set(preds.map(p => p.card_used_id).filter(Boolean))]
  const { data: cardPlayers } = cardPlayerIds.length
    ? await sb.from('players').select('id, name').in('id', cardPlayerIds)
    : { data: [] as { id: string; name: string }[] }
  const playerNameById = new Map((cardPlayers ?? []).map(p => [p.id, p.name]))

  let count = 0
  for (const pred of preds) {
    const correct = pred.predicted_winner === winner
    let earned = correct ? calcCreditsEarned(pred.multiplier_applied) : 0
    if (correct && pred.double_down_card_id) earned *= 2

    await sb
      .from('predictions')
      .update({ status: correct ? 'correct' : 'incorrect', credits_earned: earned })
      .eq('id', pred.id)

    if (correct && earned > 0) {
      const { data: state } = await sb
        .from('user_state')
        .select('credits')
        .eq('user_id', pred.user_id)
        .single()
      if (state) {
        await sb
          .from('user_state')
          .update({ credits: state.credits + earned })
          .eq('user_id', pred.user_id)
      }
    }

    // Consume wagered card on a loss, unless insurance was applied to this pick
    const cardProtected = !correct && !!pred.insurance_card_id
    let cardLost = false
    if (!correct && pred.card_used_id && !cardProtected) {
      const { data: card } = await sb
        .from('user_cards')
        .select('id, quantity')
        .eq('user_id', pred.user_id)
        .eq('player_id', pred.card_used_id)
        .single()
      if (card) {
        cardLost = true
        if (card.quantity <= 1) {
          await sb.from('user_cards').delete().eq('id', card.id)
        } else {
          await sb.from('user_cards').update({ quantity: card.quantity - 1 }).eq('id', card.id)
        }
      }
    }

    logEvent(sb, pred.user_id, 'pick_settled', {
      correct,
      credits_earned: earned,
      wagered_card: pred.card_used_id ? (playerNameById.get(pred.card_used_id) ?? pred.card_used_id) : null,
      card_lost: cardLost,
      card_protected: cardProtected,
    })

    count++
  }

  return count
}
