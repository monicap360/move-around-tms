// GoCardless — recurring ACH bank debit (no cards, no Stripe). Activates when
// GOCARDLESS_ACCESS_TOKEN is set; otherwise callers get a "not connected" signal.
const TOKEN = process.env.GOCARDLESS_ACCESS_TOKEN || "";
const ENV = (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase();
const BASE = ENV === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";

export function gcConfigured(): boolean { return !!TOKEN; }

async function gc(path: string, method: string, body?: any): Promise<any> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `GoCardless error ${res.status}`);
  return j;
}

// Create a Billing Request (ACH mandate) + a hosted flow. Returns the URL the
// customer visits to authorize bank debits, plus the billing request id.
export async function createMandateFlow(opts: { company: string; email?: string | null; name?: string | null; redirectUri: string }): Promise<{ billingRequestId: string; authUrl: string }> {
  const br = await gc("/billing_requests", "POST", {
    billing_requests: { mandate_request: { scheme: "ach", currency: "USD" } },
  });
  const brId = br.billing_requests.id;
  const [given, ...rest] = String(opts.name || "").trim().split(/\s+/);
  const flow = await gc("/billing_request_flows", "POST", {
    billing_request_flows: {
      redirect_uri: opts.redirectUri,
      exit_uri: opts.redirectUri,
      links: { billing_request: brId },
      prefilled_customer: {
        company_name: opts.company || undefined,
        email: opts.email || undefined,
        given_name: given || undefined,
        family_name: rest.join(" ") || undefined,
      },
    },
  });
  return { billingRequestId: brId, authUrl: flow.billing_request_flows.authorisation_url };
}

// Create a recurring subscription on an active mandate (cents amount).
export async function createSubscription(opts: { mandateId: string; amountCents: number; cycle: "monthly" | "annual"; name: string }): Promise<any> {
  return gc("/subscriptions", "POST", {
    subscriptions: {
      amount: opts.amountCents,
      currency: "USD",
      name: opts.name,
      interval_unit: opts.cycle === "annual" ? "yearly" : "monthly",
      links: { mandate: opts.mandateId },
    },
  });
}
