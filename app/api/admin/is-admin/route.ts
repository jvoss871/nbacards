import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/is-admin — whether the caller's signed-in account is the configured admin.
// Used only to decide whether to show the Admin nav link — the actual admin routes are
// separately gated by middleware.ts regardless of what this returns.
export async function GET(req: Request) {
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId) return NextResponse.json({ isAdmin: false })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ isAdmin: false })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await sb.auth.getUser(token)

  return NextResponse.json({ isAdmin: user?.id === adminUserId })
}
