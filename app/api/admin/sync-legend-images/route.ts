import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nbaCdnHeadshotUrl } from '@/lib/nba-stats'

// NBA CDN player IDs — only include confirmed real headshots (> 10KB)
const LEGEND_NBA_IDS: Record<string, number> = {
  'Michael Jordan':         893,
  "Shaquille O'Neal":       406,
  'Kobe Bryant':            977,
  'LeBron James':           2544,
  'Stephen Curry':          201939,
  'Kevin Durant':           201142,
  'Dwyane Wade':            2548,
  'Tim Duncan':             1495,
  'Dirk Nowitzki':          1717,
  'Kevin Garnett':          708,
}

// Pre-verified SportsDB thumbnail URLs
const LEGEND_SPORTSDB_URLS: Record<string, string> = {
  'Magic Johnson': 'https://r2.thesportsdb.com/images/media/player/thumb/36r59s1526725634.jpg',
  'Larry Bird':    'https://r2.thesportsdb.com/images/media/player/thumb/m08gy71493061003.jpg',
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Detect NBA CDN silhouette placeholder: exactly 4937 bytes
async function isRealNbaHeadshot(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const len = parseInt(res.headers.get('content-length') ?? '0')
    return len > 10000
  } catch {
    return false
  }
}

// Fetch thumbnail from SportsDB free API by player name
async function fetchSportsDbThumb(name: string): Promise<string | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const thumb = (json?.player?.[0]?.strThumb ?? '') as string
    if (thumb && thumb.length > 0 && !thumb.includes('blank')) return thumb
  } catch {
    // ignore
  }
  return null
}

export async function POST(req: Request) {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = serviceClient()
  const { data: legends, error } = await sb.from('legends').select('id, name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { name: string; status: string; url?: string }[] = []

  for (const legend of (legends ?? [])) {
    // 1. Try NBA CDN (verify it's a real headshot, not the silhouette placeholder)
    const nbaId = LEGEND_NBA_IDS[legend.name]
    if (nbaId) {
      const url = nbaCdnHeadshotUrl(nbaId)
      if (await isRealNbaHeadshot(url)) {
        await sb.from('legends').update({ image_url: url }).eq('id', legend.id)
        results.push({ name: legend.name, status: 'nba_cdn', url })
        continue
      }
    }

    // 2. Use pre-verified SportsDB URL
    const sportsdbUrl = LEGEND_SPORTSDB_URLS[legend.name]
    if (sportsdbUrl) {
      await sb.from('legends').update({ image_url: sportsdbUrl }).eq('id', legend.id)
      results.push({ name: legend.name, status: 'sportsdb_known', url: sportsdbUrl })
      continue
    }

    // 3. Search SportsDB API dynamically
    const fetchedUrl = await fetchSportsDbThumb(legend.name)
    if (fetchedUrl) {
      await sb.from('legends').update({ image_url: fetchedUrl }).eq('id', legend.id)
      results.push({ name: legend.name, status: 'sportsdb_api', url: fetchedUrl })
      continue
    }

    results.push({ name: legend.name, status: 'no_source' })
  }

  return NextResponse.json({ results })
}
