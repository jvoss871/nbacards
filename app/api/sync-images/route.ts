import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchActiveNBAPlayerNames, nbaCdnHeadshotUrl } from '@/lib/nba-stats'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/sync-images
// Backfills image_url for every player row that currently has none.
// Safe to re-run — never overwrites an existing image_url.
export async function POST() {
  const sb = serviceClient()

  const { nameToNbaId } = await fetchActiveNBAPlayerNames()
  if (nameToNbaId.size === 0) {
    return NextResponse.json({ error: 'NBA.com name→ID map unavailable' }, { status: 502 })
  }

  const { data: players, error } = await sb
    .from('players')
    .select('id, name, image_url')
    .is('image_url', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  const missed: string[] = []

  for (const player of players ?? []) {
    const lower = (player.name as string).toLowerCase()
    const ascii = lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const nbaId = nameToNbaId.get(lower) ?? nameToNbaId.get(ascii)

    if (nbaId) {
      await sb
        .from('players')
        .update({ image_url: nbaCdnHeadshotUrl(nbaId) })
        .eq('id', player.id)
      updated++
    } else {
      missed.push(player.name as string)
    }
  }

  return NextResponse.json({ updated, missed })
}
