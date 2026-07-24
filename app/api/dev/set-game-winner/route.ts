import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { settlePredictions } from '@/lib/settle-predictions'

export async function POST(req: Request) {

  const { game_id, winner } = await req.json() as { game_id: string; winner: 'home' | 'away' }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await sb
    .from('games')
    .update({
      status:     'final',
      winner,
      home_score: winner === 'home' ? 110 : 104,
      away_score: winner === 'home' ? 104 : 110,
    })
    .eq('id', game_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settled = await settlePredictions(sb, game_id, winner)
  return NextResponse.json({ ok: true, settled })
}
