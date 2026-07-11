import { type SupabaseClient } from '@supabase/supabase-js'
import { BASE_CREDITS_PER_WIN } from '@/lib/game-logic'

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

  let count = 0
  for (const pred of preds) {
    const correct = pred.predicted_winner === winner
    const earned  = correct ? Math.round(BASE_CREDITS_PER_WIN * pred.multiplier_applied) : 0

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

    // Consume wagered card on a loss
    if (!correct && pred.card_used_id) {
      const { data: card } = await sb
        .from('user_cards')
        .select('id, quantity')
        .eq('user_id', pred.user_id)
        .eq('player_id', pred.card_used_id)
        .single()
      if (card) {
        if (card.quantity <= 1) {
          await sb.from('user_cards').delete().eq('id', card.id)
        } else {
          await sb.from('user_cards').update({ quantity: card.quantity - 1 }).eq('id', card.id)
        }
      }
    }

    count++
  }

  return count
}
