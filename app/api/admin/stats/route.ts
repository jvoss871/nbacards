import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Supabase's admin API caps a single page at 1000 — loop until a page comes
// back short so the count stays accurate past that many registered users.
async function countAllUsers(sb: ReturnType<typeof serviceClient>): Promise<number> {
  let total = 0
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break
    total += data.users.length
    if (data.users.length < perPage) break
    page++
  }
  return total
}

export async function GET() {
  const sb = serviceClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [userCount, revenueResult, revenue30dResult, flagsResult] = await Promise.all([
    countAllUsers(sb),
    sb.rpc('sum_completed_purchases'),
    sb.rpc('sum_completed_purchases', { since: thirtyDaysAgo }),
    sb.from('question_flags').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  if (revenueResult.error) return NextResponse.json({ error: revenueResult.error.message }, { status: 500 })
  if (revenue30dResult.error) return NextResponse.json({ error: revenue30dResult.error.message }, { status: 500 })

  const revenueCents = revenueResult.data ?? 0
  const revenueCents30d = revenue30dResult.data ?? 0

  const pendingFlags = flagsResult.count ?? 0

  return NextResponse.json({ userCount, revenueCents, revenueCents30d, pendingFlags })
}
