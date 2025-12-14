/**
 * Client-side helper to create a checkout session for the merch store.
 *
 * This calls the server-side route at `/api/merch/create-checkout` which
 * contains the provider integration. Keep provider secrets server-side.
 */
export async function createCheckout(items: any[] = []) {
  const res = await fetch('/api/merch/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err?.error || 'Failed to create checkout')
  }

  return res.json()
}
