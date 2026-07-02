import { NextResponse } from "next/server";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ auth — separate from the Ronyx tenant PIN system.
// Signed, stateless session token (HMAC-SHA256); middleware verifies the same
// signature with Web Crypto, so secret + base64url encoding must match exactly.
const SECRET = () => process.env.HQ_SESSION_SECRET || process.env.PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "movearound-hq-dev-secret";
const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hashPin = (pin: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
function sign(payload: Record<string, unknown>): string {
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET()).update(p).digest();
  return `${p}.${b64url(sig)}`;
}
const SESSION_HOURS = 24 * 7;

// GET → active HQ users for the login picker (no hashes).
export async function GET() {
  const { data } = await supabaseAdmin.from("hq_users").select("id, name, role").eq("active", true).order("name");
  return NextResponse.json({ users: (data || []).map(u => ({ id: u.id, name: u.name, role: u.role })) });
}

// In-memory throttle: 8 tries / 5 min per user.
const attempts = new Map<string, number[]>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter(t => now - t < 5 * 60_000);
  hits.push(now); attempts.set(key, hits);
  return hits.length > 8;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const pin = String(body.pin || "");
  if (!id || !/^\d{4,6}$/.test(pin)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  if (tooMany(id)) return NextResponse.json({ ok: false, error: "Too many attempts — wait a few minutes." }, { status: 429 });

  const { data: u } = await supabaseAdmin.from("hq_users").select("*").eq("id", id).eq("active", true).maybeSingle();
  if (u && u.pin_hash && crypto.timingSafeEqual(Buffer.from(u.pin_hash), Buffer.from(hashPin(pin, u.salt)))) {
    const token = sign({ uid: u.id, name: u.name, role: u.role, exp: Date.now() + SESSION_HOURS * 3600_000 });
    const res = NextResponse.json({ ok: true, user: { id: u.id, name: u.name, role: u.role } });
    res.cookies.set("hq_session", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600 });
    return res;
  }
  return NextResponse.json({ ok: false, error: "Incorrect PIN." }, { status: 401 });
}
