import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SLOT_POSITION: Record<number, string> = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' }

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const sb = serviceClient()

  const { data: entries, error } = await sb
    .from('hall_of_fame')
    .select('*')
    .order('inducted_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inductees = await Promise.all(
    (entries ?? []).map(async (entry, idx) => {
      const { data: legends } = await sb
        .from('user_legends')
        .select('prestige_number, legend:legends(*)')
        .eq('user_id', entry.user_id)
        .order('prestige_number')

      return {
        ...entry,
        inductee_number: idx + 1,
        starting_five: (legends ?? []).map(ul => ({
          slot: ul.prestige_number,
          position: SLOT_POSITION[ul.prestige_number] ?? '?',
          legend: ul.legend,
        })),
      }
    })
  )

  return NextResponse.json({ inductees })
}
