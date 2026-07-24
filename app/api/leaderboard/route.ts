import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { monthStartET } from '@/lib/time'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const monthStart = monthStartET()

  // Fetch all settled trivia sessions for the current month
  const { data: sessions, error: sessErr } = await sb
    .from('trivia_sessions')
    .select('user_id, current_step, status, created_at')
    .neq('status', 'active')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true })

  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 })

  // Aggregate per user; sessions arrive oldest-first so lastSessionAt tracks naturally
  const agg = new Map<string, { totalCorrect: number; sessions: number; perfectGames: number; lastSessionAt: string }>()
  for (const s of sessions ?? []) {
    const entry = agg.get(s.user_id) ?? { totalCorrect: 0, sessions: 0, perfectGames: 0, lastSessionAt: s.created_at }
    entry.totalCorrect += s.current_step ?? 0
    entry.sessions++
    if (s.status === 'won') entry.perfectGames++
    entry.lastSessionAt = s.created_at
    agg.set(s.user_id, entry)
  }

  if (agg.size === 0) return NextResponse.json({ entries: [], month: monthStart })

  // Fetch usernames for all user_ids in the result
  const userIds = [...agg.keys()]
  const { data: users, error: userErr } = await sb
    .from('user_state')
    .select('user_id, username, prestige_level')
    .in('user_id', userIds)

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  const userMap = new Map((users ?? []).map(u => [u.user_id, u]))

  const entries = [...agg.entries()]
    .map(([userId, stats]) => {
      const user = userMap.get(userId)
      return {
        userId,
        username:      user?.username ?? 'Anonymous',
        prestigeLevel: user?.prestige_level ?? 0,
        totalCorrect:  stats.totalCorrect,
        sessions:      stats.sessions,
        perfectGames:  stats.perfectGames,
        lastSessionAt: stats.lastSessionAt,
      }
    })
    .sort((a, b) =>
      b.totalCorrect - a.totalCorrect ||
      a.lastSessionAt.localeCompare(b.lastSessionAt)
    )
    .slice(0, 10)
    .map(({ lastSessionAt: _unused, ...rest }) => rest)

  return NextResponse.json({ entries, month: monthStart })
}
