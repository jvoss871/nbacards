import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PAYOUTS } from '@/lib/trivia-logic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Data may be stored under the auth UUID or under the legacy 'default' key.
// Try the auth UUID first; fall back to 'default' if no row exists.
async function resolveDataUserId(client: SupabaseClient, authUserId: string): Promise<string> {
  const { data } = await client
    .from('user_state')
    .select('user_id')
    .eq('user_id', authUserId)
    .maybeSingle()
  return data ? authUserId : 'default'
}

// GET /api/admin/accounts/[userId]
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const client = sb()

  const [{ data: { user }, error: authErr }, dataUserId] = await Promise.all([
    client.auth.admin.getUserById(userId),
    resolveDataUserId(client, userId),
  ])

  if (authErr || !user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const [
    { data: state },
    { count: cardCount },
    { data: preds },
    { data: triviaSessions },
    { data: draftBoards },
    { data: purchases },
  ] = await Promise.all([
    client.from('user_state').select('credits, prestige_level, username').eq('user_id', dataUserId).single(),
    client.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', dataUserId),
    client.from('predictions').select('status, credits_earned').eq('user_id', dataUserId),
    client.from('trivia_sessions').select('status, credits_floor').eq('user_id', dataUserId),
    client.from('draft_boards').select('credits_earned').eq('user_id', dataUserId).eq('status', 'scored'),
    client.from('purchases').select('amount_cents').eq('user_id', dataUserId).eq('status', 'completed'),
  ])

  const settledPicks = (preds ?? []).filter(p => p.status !== 'pending')
  const correctPicks = settledPicks.filter(p => p.status === 'correct')
  const pickCredits  = correctPicks.reduce((s, p) => s + (p.credits_earned ?? 0), 0)

  const triviaEarned = (triviaSessions ?? [])
    .filter(t => t.status !== 'active')
    .reduce((s: number, t: { status: string; credits_floor: number | null }) => {
      if (t.status === 'won') return s + PAYOUTS[15]
      return s + (t.credits_floor ?? 0)
    }, 0)

  const draftCredits = (draftBoards ?? []).reduce((s, b) => s + (b.credits_earned ?? 0), 0)
  const totalSpentCents = (purchases ?? []).reduce((s, p) => s + p.amount_cents, 0)

  return NextResponse.json({
    id: user.id,
    email: user.email ?? '',
    created_at: user.created_at,
    credits: state?.credits ?? 0,
    username: state?.username ?? null,
    prestige_level: state?.prestige_level ?? 0,
    cards: cardCount ?? 0,
    picks: {
      total: settledPicks.length,
      correct: correctPicks.length,
      pending: (preds ?? []).filter(p => p.status === 'pending').length,
    },
    trivia: {
      total: (triviaSessions ?? []).length,
      won: (triviaSessions ?? []).filter(t => t.status === 'won').length,
    },
    credits_earned: {
      picks: pickCredits,
      trivia: triviaEarned,
      draft: draftCredits,
      total: pickCredits + triviaEarned + draftCredits,
    },
    total_spent_cents: totalSpentCents,
  })
}
