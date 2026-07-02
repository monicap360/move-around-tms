import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// CCB self-service PIN change. The middleware already guarantees a valid session;
// we read the signed cookie to identify the user, then require the CURRENT pin to
// authorize the change. Temp PINs are flagged for change after 10 days.
const SECRET = () => process.env.CCB_SESSION_SECRET || process.env.PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "movearound-ccb-dev-secret";
const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hashPin = (pin: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
const CHANGE_AFTER_DAYS = 10;

async function uidFromSession(): Promise<string | null> {
  const token = (await cookies()).get("ccb_session")?.value;
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const p = token.slice(0, dot), sig = token.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", SECRET()).update(p).digest());
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload.uid || null;
  } catch { return null; }
}

// GET → whether this user should change their PIN (temp PIN older than 10 days).
export async function GET() {
  const uid = await uidFromSession();
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: u } = await supabaseAdmin.from("ccb_users").select("pin_set_at").eq("id", uid).maybeSingle();
  const setAt = u?.pin_set_at ? new Date(u.pin_set_at).getTime() : Date.now();
  const days = Math.floor((Date.now() - setAt) / 86400_000);
  return NextResponse.json({ pin_age_days: days, change_after_days: CHANGE_AFTER_DAYS, should_change: days >= CHANGE_AFTER_DAYS });
}

// POST { current_pin, new_pin } → verify current, set new.
export async function POST(req: Request) {
  const uid = await uidFromSession();
  if (!uid) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = String(body.current_pin || "");
  const next = String(body.new_pin || "");
  if (!/^\d{4,6}$/.test(next)) return NextResponse.json({ ok: false, error: "New PIN must be 4–6 digits." }, { status: 400 });
  if (next === current) return NextResponse.json({ ok: false, error: "New PIN must be different from the current one." }, { status: 400 });

  const { data: u } = await supabaseAdmin.from("ccb_users").select("*").eq("id", uid).eq("active", true).maybeSingle();
  if (!u || !u.pin_hash || !crypto.timingSafeEqual(Buffer.from(u.pin_hash), Buffer.from(hashPin(current, u.salt)))) {
    return NextResponse.json({ ok: false, error: "Current PIN is incorrect." }, { status: 401 });
  }
  const salt = crypto.randomBytes(8).toString("hex");
  const { error } = await supabaseAdmin.from("ccb_users").update({ salt, pin_hash: hashPin(next, salt), pin_set_at: new Date().toISOString() }).eq("id", uid);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
