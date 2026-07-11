import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchNBAEventsByDate, eventStatus, abbr } from '@/lib/thesportsdb'
import { settlePredictions } from '@/lib/settle-predictions'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalize(name: string) {
  return name.toLowerCase().trim()
}

// POST /api/sync  body: { dates: string[] }
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const sb = serviceClient()
  const { dates } = (await req.json()) as { dates: string[] }

  let gamesAdded = 0
  let scoresUpdated = 0
  let predictionsSettled = 0

  for (const date of dates) {
    const events = await fetchNBAEventsByDate(date)
    if (!events.length) continue

    const { data: existing } = await sb
      .from('games')
      .select('*')
      .eq('game_date', date)

    const dbGames = existing ?? []

    for (const event of events) {
      const status = eventStatus(event)
      const match = dbGames.find(
        g =>
          normalize(g.home_team) === normalize(event.strHomeTeam) &&
          normalize(g.away_team) === normalize(event.strAwayTeam)
      )

      if (status === 'final' && event.intHomeScore !== null && event.intAwayScore !== null) {
        const homeScore = parseInt(event.intHomeScore)
        const awayScore = parseInt(event.intAwayScore)
        const winner = homeScore > awayScore ? 'home' : 'away'

        if (match) {
          if (match.status !== 'final') {
            await sb
              .from('games')
              .update({ status: 'final', home_score: homeScore, away_score: awayScore, winner })
              .eq('id', match.id)
            scoresUpdated++

            // Auto-settle any pending predictions for this game
            const settled = await settlePredictions(sb, match.id, winner)
            predictionsSettled += settled
          }
        } else {
          await sb.from('games').insert({
            home_team: event.strHomeTeam,
            away_team: event.strAwayTeam,
            home_team_abbr: abbr(event.strHomeTeam),
            away_team_abbr: abbr(event.strAwayTeam),
            game_date: date,
            game_time: null,
            status: 'final',
            home_score: homeScore,
            away_score: awayScore,
            winner,
          })
          gamesAdded++
        }
      } else if (status === 'scheduled' && !match) {
        await sb.from('games').insert({
          home_team: event.strHomeTeam,
          away_team: event.strAwayTeam,
          home_team_abbr: abbr(event.strHomeTeam),
          away_team_abbr: abbr(event.strAwayTeam),
          game_date: date,
          game_time: formatTime(event.strTime),
          status: 'scheduled',
          home_score: null,
          away_score: null,
          winner: null,
        })
        gamesAdded++
      }
    }
  }

  return NextResponse.json({ gamesAdded, scoresUpdated, predictionsSettled })
}


function formatTime(tsdbTime: string | null): string | null {
  if (!tsdbTime) return null
  // TSDB gives UTC time like "02:00:00" — convert to "7:00 PM ET" approx
  // Just surface the raw time for now; can improve with timezone logic
  const [h, m] = tsdbTime.split(':').map(Number)
  const etHour = ((h - 5 + 24) % 24) // rough EST offset
  const period = etHour < 12 ? 'AM' : 'PM'
  const displayHour = etHour === 0 ? 12 : etHour > 12 ? etHour - 12 : etHour
  return `${displayHour}:${String(m).padStart(2, '0')} ${period} ET`
}
