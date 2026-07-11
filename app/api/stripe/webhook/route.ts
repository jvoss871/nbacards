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

    // Idempotency — skip if this session was already credited
    const { data: existing } = await sb
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (!existing) {
      await sb.from('purchases').insert({
        user_id:        userId,
        stripe_session_id: session.id,
        credits_granted: credits,
        amount_cents:   session.amount_total ?? 0,
      })

      const { data: state } = await sb
        .from('user_state')
        .select('credits')
        .eq('user_id', userId)
        .single()

      if (state) {
        await sb
          .from('user_state')
          .update({ credits: state.credits + credits })
          .eq('user_id', userId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
