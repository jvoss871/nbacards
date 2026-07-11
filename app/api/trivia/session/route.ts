import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { QUESTIONS_PER_TIER } from '@/lib/trivia-logic'

const USER_ID = 'default'
const MIN_PER_TIER = QUESTIONS_PER_TIER // 5 each

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// GET /api/trivia/session — returns today's session + questions
export async function GET() {
  const sb = serviceClient()
  const today = new Date().toISOString().split('T')[0]

  // Check for existing session today
  const { data: existing } = await sb
    .from('trivia_sessions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('session_date', today)
    .neq('status', 'reset')
    .single()

  if (existing) {
    const { data: questions } = await sb
      .from('trivia_questions')
      .select('*')
      .in('id', existing.question_ids)
    const qMap = new Map((questions ?? []).map((q: { id: string; difficulty: number }) => [q.id, q]))

    // If no questions answered yet, re-sort by difficulty in case session was corrupted
    // (e.g. by an old skip that inserted wrong-difficulty questions)
    let sessionIds: string[] = existing.question_ids
    if (existing.current_step === 0) {
      const sorted = [...sessionIds]
        .map(id => qMap.get(id))
        .filter(Boolean)
        .sort((a, b) => (a as { difficulty: number }).difficulty - (b as { difficulty: number }).difficulty)
        .map((q) => (q as { id: string }).id)
      if (sorted.join(',') !== sessionIds.join(',')) {
        sessionIds = sorted
        await sb
          .from('trivia_sessions')
          .update({ question_ids: sorted })
          .eq('id', existing.id)
      }
    }

    const ordered = sessionIds.map((id: string) => qMap.get(id)).filter(Boolean)
    return NextResponse.json({ session: { ...existing, question_ids: sessionIds }, questions: ordered })
  }

  // Collect all question IDs used in previous sessions so we don't repeat them
  const { data: pastSessions } = await sb
    .from('trivia_sessions')
    .select('question_ids')
    .eq('user_id', USER_ID)
  const usedIds = new Set<string>(
    (pastSessions ?? []).flatMap(s => s.question_ids as string[])
  )

  // Build a new session — pick 5 questions per difficulty tier, preferring unused ones
  const byTier: Record<number, { id: string }[]> = { 1: [], 2: [], 3: [] }
  for (const diff of [1, 2, 3]) {
    const { data } = await sb
      .from('trivia_questions')
      .select('id')
      .eq('difficulty', diff)
    const all = data ?? []
    const unused = all.filter(q => !usedIds.has(q.id))
    // If we have enough unseen questions use them; otherwise reset the pool for this tier
    byTier[diff] = unused.length >= MIN_PER_TIER ? unused : all
  }

  // Check we have enough questions; if not, signal the client to generate first
  const shortfall = [1, 2, 3].find(d => byTier[d].length < MIN_PER_TIER)
  if (shortfall !== undefined) {
    return NextResponse.json(
      { error: 'insufficient_questions', shortage_difficulty: shortfall },
      { status: 409 }
    )
  }

  // Sample 5 from each tier, order: easy → medium → hard
  const selectedIds = [
    ...shuffle(byTier[1]).slice(0, MIN_PER_TIER),
    ...shuffle(byTier[2]).slice(0, MIN_PER_TIER),
    ...shuffle(byTier[3]).slice(0, MIN_PER_TIER),
  ].map(q => q.id)

  const { data: session, error } = await sb
    .from('trivia_sessions')
    .insert({
      user_id:      USER_ID,
      session_date: today,
      question_ids: selectedIds,
      current_step: 0,
      credits_floor: 0,
      status:       'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: questions } = await sb
    .from('trivia_questions')
    .select('*')
    .in('id', selectedIds)

  const qMap = new Map((questions ?? []).map(q => [q.id, q]))
  const ordered = selectedIds.map(id => qMap.get(id)).filter(Boolean)

  return NextResponse.json({ session, questions: ordered })
}

// DELETE /api/trivia/session — wipes today's session (testing only)
export async function DELETE() {
  const sb = serviceClient()
  const today = new Date().toISOString().split('T')[0]
  await sb
    .from('trivia_sessions')
    .delete()
    .eq('user_id', USER_ID)
    .eq('session_date', today)
  return NextResponse.json({ ok: true })
}
