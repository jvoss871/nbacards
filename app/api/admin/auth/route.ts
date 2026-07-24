import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/auth  body: { token: string }
// Verifies the Supabase access token and grants admin session if the user ID matches ADMIN_USER_ID.
export async function POST(req: Request) {
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  const { token } = await req.json() as { token?: string }
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await sb.auth.getUser(token)

  if (!user || user.id !== adminUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', adminUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}

// DELETE /api/admin/auth — log out
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_session')
  return res
}
