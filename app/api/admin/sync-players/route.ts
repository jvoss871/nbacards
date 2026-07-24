import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchPlayer } from '@/lib/thesportsdb'
import { fetchActiveNBAPlayerNames, nbaCdnHeadshotUrl } from '@/lib/nba-stats'

const TSDB_BATCH_SIZE = 5
const TSDB_BATCH_DELAY = 400

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/admin/sync-players
// 1. Matches players to NBA.com CDN headshots by player ID (fast, near-100% coverage)
// 2. Falls back to TheSportsDB cutout search for any still missing
// Safe to re-run: touches rows with null image_url, plus any TheSportsDB cutout —
// those are season-specific photos (jersey included) that go stale after a trade and
// never self-heal, so they're always retried against the NBA CDN in case a fresh
// headshot is now available.
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const sb = serviceClient()

  const { data: players } = await sb
    .from('players')
    .select('id, name, team, team_abbr, position, tier, multiplier, in_pool')
    .or('image_url.is.null,image_url.ilike.%thesportsdb%')

  if (!players?.length) return NextResponse.json({ updated: 0, total: 0 })

  // ── Pass 1: NBA.com CDN headshots ────────────────────────────────────────
  // Fetch the name→nba_player_id map from the stats API. The HEAD check is
  // inherently per-player (external HTTP call), but the DB write is deferred
  // and batched once at the end instead of one round trip per player.
  const { nameToNbaId } = await fetchActiveNBAPlayerNames()
  const stillMissing: typeof players = []
  // upsert's insert branch still validates NOT NULL columns even though every
  // one of these ids already exists — the rest of the row comes along with
  // each player so only image_url actually changes.
  const imageUpdates: (typeof players[number] & { image_url: string })[] = []

  // NBA CDN placeholder silhouette is ~12 KB — any response ≤ 15 KB is not a real headshot
  const NBA_PLACEHOLDER_MAX_BYTES = 15_000

  for (const player of players) {
    const nbaId = nameToNbaId.get(player.name.toLowerCase())
    if (nbaId) {
      const imageUrl = nbaCdnHeadshotUrl(nbaId)
      try {
        const head = await fetch(imageUrl, { method: 'HEAD', cache: 'no-store' })
        const size = Number(head.headers.get('content-length') ?? 0)
        if (size > NBA_PLACEHOLDER_MAX_BYTES) {
          imageUpdates.push({ ...player, image_url: imageUrl })
        } else {
          stillMissing.push(player)  // placeholder — fall through to TheSportsDB
        }
      } catch {
        stillMissing.push(player)
      }
    } else {
      stillMissing.push(player)
    }
  }

  // ── Pass 2: TheSportsDB for any still missing ────────────────────────────
  let notFound = 0

  for (let i = 0; i < stillMissing.length; i += TSDB_BATCH_SIZE) {
    const batch = stillMissing.slice(i, i + TSDB_BATCH_SIZE)
    await Promise.all(batch.map(async player => {
      try {
        const results = await searchPlayer(player.name)
        if (!results.length) { notFound++; return }
        const hit = results[0]
        const imageUrl = hit.strCutout || hit.strThumb || null
        if (!imageUrl) { notFound++; return }
        imageUpdates.push({ ...player, image_url: imageUrl })
      } catch {
        notFound++
      }
    }))
    if (i + TSDB_BATCH_SIZE < stillMissing.length) {
      await new Promise(r => setTimeout(r, TSDB_BATCH_DELAY))
    }
  }

  const nbaCdnCount = players.length - stillMissing.length
  const tsdbCount = imageUpdates.length - nbaCdnCount

  if (imageUpdates.length > 0) {
    const { error: updateErr } = await sb.from('players').upsert(imageUpdates, { onConflict: 'id' })
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    total: players.length,
    nba_cdn: nbaCdnCount,
    thesportsdb: tsdbCount,
    not_found: notFound,
  })
}
