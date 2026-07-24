import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { CREDIT_PACKAGES } from '@/lib/stripe-packages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const { packageId, userId } = await req.json() as { packageId: string; userId: string }

  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
  if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'Missing user' }, { status: 400 })

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: pkg.priceCents,
        product_data: {
          name: `${pkg.credits.toLocaleString()} CardPicks Credits`,
          description: `Top up your CardPicks account with ${pkg.credits.toLocaleString()} credits`,
        },
      },
      quantity: 1,
    }],
    success_url: `${origin}/profile?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/profile`,
    metadata: {
      user_id:    userId,
      credits:    String(pkg.credits),
      package_id: packageId,
    },
  })

  return NextResponse.json({ url: session.url })
}
