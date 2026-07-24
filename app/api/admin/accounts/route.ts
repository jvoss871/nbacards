import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Supabase's admin API caps a single page at 1000 — loop until a page comes
// back short so search covers every registered user, not just the first 1000.
async function listAllUsers(client: ReturnType<typeof sb>) {
  const all: { id: string; email?: string; created_at: string }[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) return { users: all, error }
    all.push(...data.users)
    if (data.users.length < perPage) break
    page++
  }
  return { users: all, error: null }
}

// GET /api/admin/accounts?q=email
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.toLowerCase().trim() ?? ''

  const client = sb()
  const { users, error } = await listAllUsers(client)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = (q.length >= 2)
    ? users.filter(u => u.email?.toLowerCase().includes(q))
    : users

  const results = filtered.slice(0, 50).map(u => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
  }))

  // Pull credits + username — try auth UUIDs first, then fall back to 'default'
  const ids = results.map(r => r.id)
  const [{ data: statesByUuid }, { data: defaultState }] = await Promise.all([
    ids.length
      ? client.from('user_state').select('user_id, credits, username, prestige_level').in('user_id', ids)
      : Promise.resolve({ data: [] }),
    client.from('user_state').select('user_id, credits, username, prestige_level').eq('user_id', 'default').single(),
  ])

  const stateMap = Object.fromEntries((statesByUuid ?? []).map(s => [s.user_id, s]))

  return NextResponse.json(
    results.map(r => {
      // Use auth-UUID state if it exists, otherwise fall back to 'default' state
      const state = stateMap[r.id] ?? defaultState ?? null
      return {
        ...r,
        credits: state?.credits ?? null,
        username: state?.username ?? null,
        prestige_level: state?.prestige_level ?? 0,
      }
    })
  )
}
