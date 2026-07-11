import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const sb = serviceClient()

  const [usersResult, revenueResult, flagsResult] = await Promise.all([
    sb.auth.admin.listUsers({ perPage: 1000 }),
    sb.from('purchases').select('amount_cents').eq('status', 'completed'),
    sb.from('question_flags').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const userCount = usersResult.data?.users?.length ?? 0

  const revenueCents = (revenueResult.data ?? []).reduce(
    (sum: number, row: { amount_cents: number }) => sum + row.amount_cents,
    0,
  )

  const pendingFlags = flagsResult.count ?? 0

  return NextResponse.json({ userCount, revenueCents, pendingFlags })
}
