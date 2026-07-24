import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/waitlist
// Body: { email: string, wantsBeta?: boolean }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; wantsBeta?: boolean }
  const email = body.email?.trim().toLowerCase()

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await sb
    .from('waitlist_signups')
    .insert({ email, wants_beta: body.wantsBeta === true })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, alreadyJoined: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
