import { NextResponse } from 'next/server'

// POST /api/merch/create-checkout
// This is a safe, server-side scaffold for creating a checkout session with
// a third-party provider (Stripe, Shopify, etc.). It currently returns a
// mocked checkout URL. Replace the mock with provider integration when ready.

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    // expected shape: { items: [{ id, quantity, price }], metadata?: {} }
    const items = Array.isArray(body.items) ? body.items : []

    // TODO: integrate with Stripe/Shopify here using server-side secret keys.
    // Example (Stripe): create a Checkout session and return session.url
    // const session = await stripe.checkout.sessions.create({ ... })

    // For now return a mocked URL and echo the items back
    const mockCheckoutUrl = 'https://checkout.move-around-tms.example/mock-session'

    return NextResponse.json({
      ok: true,
      checkoutUrl: mockCheckoutUrl,
      itemsCount: items.length,
    })
  } catch (err) {
    // Keep errors generic to avoid leaking server details
    return NextResponse.json({ ok: false, error: 'failed to create checkout' }, { status: 500 })
  }
}
