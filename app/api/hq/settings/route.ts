import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ billing settings — your invoice/ACH details + GoCardless token.
const PLAIN = ["billing_from", "billing_bank", "billing_routing", "billing_account", "billing_remit", "gocardless_env"];

export async function GET() {
  const { data } = await supabaseAdmin.from("hq_settings").select("key, value");
  const cfg: Record<string, string> = {};
  for (const r of data || []) cfg[r.key] = r.value;
  const token = cfg["gocardless_token"] || process.env.GOCARDLESS_ACCESS_TOKEN || "";
  const out: Record<string, any> = {};
  for (const k of PLAIN) out[k] = cfg[k] || "";
  out.gocardless_connected = !!token;
  out.gocardless_last4 = token ? token.slice(-4) : "";
  out.gocardless_env = cfg["gocardless_env"] || (process.env.GOCARDLESS_ENVIRONMENT || "sandbox");
  return NextResponse.json({ settings: out });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const rows: { key: string; value: string; updated_at: string }[] = [];
  const now = new Date().toISOString();
  for (const k of PLAIN) if (k in b) rows.push({ key: k, value: String(b[k] ?? ""), updated_at: now });
  // Only overwrite the token if a real (unmasked) value was submitted.
  if (b.gocardless_token && !/^[•*]+$/.test(b.gocardless_token) && !b.gocardless_token.startsWith("****")) {
    rows.push({ key: "gocardless_token", value: String(b.gocardless_token).trim(), updated_at: now });
  }
  if (rows.length) {
    const { error } = await supabaseAdmin.from("hq_settings").upsert(rows, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
