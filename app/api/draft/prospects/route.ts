import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const year = new URL(req.url).searchParams.get('year') ?? String(DRAFT_YEAR)

  const { data, error } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('year', year)
    .order('projected_min', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data ?? [] })
}
