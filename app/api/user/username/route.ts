import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Filter } from 'bad-words'
import { getUserId } from '@/lib/get-user-id'

const filter = new Filter()

// Additional terms bad-words misses — expand as needed
const EXTRA_BLOCKED = [
  'nigger', 'nigga', 'nigg', 'n1gger', 'n1gga',
  'chink', 'spic', 'wetback', 'kike', 'gook',
  'faggot', 'fag', 'tranny', 'retard', 'cunt',
  'nazi', 'hitler', 'kkk',
]

function isBadUsername(name: string): boolean {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (filter.isProfane(name)) return true
  return EXTRA_BLOCKED.some(w => lower.includes(w))
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()
  const { data } = await sb
    .from('user_state')
    .select('username')
    .eq('user_id', userId)
    .single()
  return NextResponse.json({ username: data?.username ?? null })
}

export async function PATCH(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await req.json() as { username?: string }
  const name = username?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  if (name.length < 3 || name.length > 20) {
    return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return NextResponse.json({ error: 'Only letters, numbers, _ and - are allowed' }, { status: 400 })
  }
  if (isBadUsername(name)) {
    return NextResponse.json({ error: 'That username is not allowed' }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await sb
    .from('user_state')
    .update({ username: name })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ username: name })
}
