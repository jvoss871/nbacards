import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = sb()

  const [userRes, legendsRes, trophiesRes, picksRes, triviaRes] = await Promise.all([
    supabase.from('user_state').select('username, prestige_level').eq('user_id', userId).single(),
    supabase.from('user_legends')
      .select('prestige_number, legend:legends(name, era, position, image_url, bio)')
      .eq('user_id', userId)
      .order('prestige_number'),
    supabase.from('user_trophies').select('trophy_id').eq('user_id', userId),
    supabase.from('predictions').select('status').eq('user_id', userId),
    supabase.from('trivia_sessions').select('status, current_step').eq('user_id', userId).neq('status', 'active'),
  ])

  const username = userRes.data?.username ?? 'Anonymous'
  const prestigeLevel = userRes.data?.prestige_level ?? 0

  type LegendShape = { name: string; era: string; position: string; image_url?: string | null; bio: string }
  const earnedLegends = (legendsRes.data ?? []).map(r => ({
    prestige_number: r.prestige_number,
    legend: (Array.isArray(r.legend) ? r.legend[0] : r.legend) as LegendShape,
  }))

  const trophyIds = (trophiesRes.data ?? []).map(r => r.trophy_id as string)

  const picks = picksRes.data ?? []
  const settled = picks.filter(p => p.status !== 'pending')
  const correct = picks.filter(p => p.status === 'correct')

  const sessions = triviaRes.data ?? []
  const wins = sessions.filter(s => s.status === 'won').length
  const totalCorrectTrivia = sessions.reduce((sum, s) => sum + (s.current_step ?? 0), 0)

  return NextResponse.json({
    username,
    prestigeLevel,
    earnedLegends,
    trophyIds,
    allTime: {
      picks: picks.length,
      correctPicks: correct.length,
      settledPicks: settled.length,
      triviaSessions: sessions.length,
      triviaWins: wins,
      triviaCorrect: totalCorrectTrivia,
    },
  })
}
