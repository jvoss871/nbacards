import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — list all prospects for a year
export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get('year') ?? DRAFT_YEAR)
  const { data, error } = await sb
    .from('draft_prospects')
    .select('*')
    .eq('year', year)
    .order('projected_min', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data ?? [] })
}

// POST — add one or more prospects
// Body: { year?, prospects: { name, position?, school?, projected_min?, projected_max? }[] }
export async function POST(req: Request) {
  const { year = DRAFT_YEAR, prospects } = await req.json()
  if (!Array.isArray(prospects) || !prospects.length) {
    return NextResponse.json({ error: 'prospects array required' }, { status: 400 })
  }
  const rows = prospects.map((p: { name: string; position?: string; school?: string; projected_min?: number; projected_max?: number }) => ({
    year,
    name: p.name.trim(),
    position: p.position ?? null,
    school: p.school ?? null,
    projected_min: p.projected_min ?? null,
    projected_max: p.projected_max ?? null,
  }))
  const { data, error } = await sb.from('draft_prospects').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length ?? 0, prospects: data })
}

// DELETE — remove a prospect by id
export async function DELETE(req: Request) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb.from('draft_prospects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
