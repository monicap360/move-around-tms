// Verify a staff PIN. Rate-limited per org+staff to make short PINs safe against
// brute force. Returns the staff identity on success; never returns the hash.

import { NextResponse } from "next/server";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const hashPin = (pin: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");

// In-memory throttle (per server instance): 8 attempts / 5 min per org+staff.
const attempts = new Map<string, number[]>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter(t => now - t < 5 * 60_000);
  hits.push(now);
  attempts.set(key, hits);
  return hits.length > 8;
}

export async function POST(req: Request) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ ok: false, error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const pin = String(body.pin || "");
  if (!id || !/^\d{4,6}$/.test(pin)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

  if (tooMany(`${orgId}:${id}`)) {
    return NextResponse.json({ ok: false, error: "Too many attempts — wait a few minutes." }, { status: 429 });
  }

  const { data } = await (supabaseAdmin as any)
    .from("ronyx_admin_settings")
    .select("setting_value")
    .eq("organization_id", orgId).eq("setting_group", "auth").eq("setting_key", "staff_pins")
    .maybeSingle();
  let v = data?.setting_value;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  const roster: any[] = Array.isArray(v?.staff) ? v.staff : [];
  const s = roster.find(x => x.id === id && x.active !== false);

  if (s && s.pin_hash && crypto.timingSafeEqual(Buffer.from(s.pin_hash), Buffer.from(hashPin(pin, s.salt)))) {
    return NextResponse.json({ ok: true, staff: { id: s.id, name: s.name, role: s.role } });
  }
  return NextResponse.json({ ok: false, error: "Incorrect PIN." }, { status: 401 });
}
