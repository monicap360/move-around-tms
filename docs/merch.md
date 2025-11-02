# Merch integration hooks

This file documents the lightweight hooks added to the repository to wire
the merch tab to a payment/checkout provider later. The approach preserves
custom pages and keeps provider secrets server-side.

Files added:

- `app/api/merch/create-checkout/route.ts`
  - Server-side scaffold. POSTs here with a JSON body { items: [...] }.
  - Replace the mock response with your provider integration (Stripe/Shopify).
  - Keep API keys in environment variables (e.g., STRIPE_SECRET_KEY).

- `lib/merchClient.ts`
  - Client helper that calls the API route above. Import and call from your
    merch page when the user clicks "Shop" or "Checkout".

Wiring example (in `app/merch/page.tsx`):

```tsx
import { createCheckout } from '@/lib/merchClient'

async function handleBuy() {
  const items = [{ id: 'shirt-s', quantity: 1 }]
  const { checkoutUrl } = await createCheckout(items)
  if (checkoutUrl) window.location.href = checkoutUrl
}
```

Security:
- Never expose provider secret keys to the browser. Call provider SDKs from
  the server route (`app/api/merch/create-checkout/route.ts`).
- Use environment variables (`.env.local`) for keys and add them to your
  deployment environment (Vercel, Netlify, etc.).

Next steps:
- Implement real provider integration in the server route. For Stripe, use
  the official SDK and return `session.url`. For Shopify, create a checkout
  and return the checkout URL.
