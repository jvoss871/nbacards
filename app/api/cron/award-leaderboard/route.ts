import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lastMonthStartET, lastMonthKeyET, monthStartET } from '@/lib/time'
import { logEvent } from '@/lib/log-event'

const PRIZES = [5000, 2500, 1000]

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = sb()
  const monthKey  = lastMonthKeyET()
  const settingKey = `leaderboard_awarded_${monthKey}`

  // Idempotency — don't award twice for the same month
  const { data: alreadyDone } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', settingKey)
    .single()

  if (alreadyDone) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Already awarded for ${monthKey}` })
  }

  const monthStart = lastMonthStartET()
  const monthEnd   = monthStartET()

  // Fetch last month's settled sessions, oldest first (for tie-breaking)
  const { data: sessions, error: sessErr } = await supabase
    .from('trivia_sessions')
    .select('user_id, current_step, status, created_at')
    .neq('status', 'active')
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)
    .order('created_at', { ascending: true })

  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 })

  if (!sessions || sessions.length === 0) {
    await supabase.from('app_settings').upsert({ key: settingKey, value: 'no_entries' })
    return NextResponse.json({ ok: true, month: monthKey, awarded: [] })
  }

  // Aggregate: total correct answers + timestamp of last contributing session
  const agg = new Map<string, { totalCorrect: number; lastSessionAt: string }>()
  for (const s of sessions) {
    const entry = agg.get(s.user_id) ?? { totalCorrect: 0, lastSessionAt: s.created_at }
    entry.totalCorrect += s.current_step ?? 0
    entry.lastSessionAt = s.created_at
    agg.set(s.user_id, entry)
  }

  // Rank: most correct first; ties go to whoever reached their total earliest
  const top3 = [...agg.entries()]
    .sort(([, a], [, b]) =>
      b.totalCorrect - a.totalCorrect ||
      a.lastSessionAt.localeCompare(b.lastSessionAt)
    )
    .slice(0, 3)

  const awarded: { userId: string; place: number; credits: number; newBalance: number }[] = []

  for (let i = 0; i < top3.length; i++) {
    const [userId] = top3[i]
    const prize = PRIZES[i]

    const { data: state } = await supabase
      .from('user_state')
      .select('credits')
      .eq('user_id', userId)
      .single()

    const current = state?.credits ?? 0
    const next = current + prize

    await supabase
      .from('user_state')
      .update({ credits: next })
      .eq('user_id', userId)

    logEvent(supabase, userId, 'leaderboard_prize', {
      month: monthKey,
      place: i + 1,
      credits_awarded: prize,
      previous_balance: current,
      new_balance: next,
    })

    awarded.push({ userId, place: i + 1, credits: prize, newBalance: next })
  }

  await supabase.from('app_settings').upsert({ key: settingKey, value: JSON.stringify(awarded) })

  return NextResponse.json({ ok: true, month: monthKey, awarded })
}
