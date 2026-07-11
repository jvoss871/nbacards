import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rollReliability } from '@/lib/trivia-logic'
import type { Tier } from '@/lib/types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = serviceClient()

  const { data: cards, error } = await sb
    .from('user_cards')
    .select('id, quantity, reliability, player:players(tier)')

  if (error || !cards) {
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch' }, { status: 500 })
  }

  let updated = 0
  for (const card of cards) {
    const tier = (Array.isArray(card.player) ? card.player[0] : card.player)?.tier as Tier | undefined
    if (!tier) continue

    const existing: number[] = Array.isArray(card.reliability) ? card.reliability : []
    if (existing.length >= card.quantity) continue // already fully rolled

    const needed = card.quantity - existing.length
    const rolls = [...existing, ...Array.from({ length: needed }, () => rollReliability(tier))]

    await sb.from('user_cards').update({ reliability: rolls }).eq('id', card.id)
    updated++
  }

  return NextResponse.json({ updated })
}
