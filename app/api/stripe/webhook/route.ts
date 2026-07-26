import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId  = session.metadata?.user_id
    const credits = parseInt(session.metadata?.credits ?? '0', 10)

    if (!userId || !credits) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const sb = serviceClient()

    // Idempotency — a select-then-insert check has the exact same race the credit update
    // below is designed to avoid (two near-simultaneous duplicate deliveries could both see
    // "not yet recorded" and both credit the account). The real guard is the unique
    // constraint on stripe_session_id: if this insert fails because the session is already
    // recorded, some delivery (possibly concurrent) already handled it — skip crediting.
    const { error: insertError } = await sb.from('purchases').insert({
      user_id:        userId,
      stripe_session_id: session.id,
      credits_granted: credits,
      amount_cents:   session.amount_total ?? 0,
    })

    if (insertError) {
      if (insertError.code !== '23505') {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    await sb.rpc('adjust_credits', { p_user_id: userId, p_delta: credits })
  }

  return NextResponse.json({ received: true })
}
