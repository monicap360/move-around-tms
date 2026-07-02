import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Returns the signed-in HQ user (from the hq_session cookie) so the shell can
// scope navigation by role (e.g. a sales rep only sees the Sales pipeline).
const SECRET = () => process.env.HQ_SESSION_SECRET || process.env.PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "movearound-hq-dev-secret";
const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function GET() {
  const token = (await cookies()).get("hq_session")?.value;
  if (!token) return NextResponse.json({ user: null });
  const dot = token.lastIndexOf(".");
  if (dot < 0) return NextResponse.json({ user: null });
  const p = token.slice(0, dot), sig = token.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", SECRET()).update(p).digest());
  if (expected !== sig) return NextResponse.json({ user: null });
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (payload.exp && Date.now() > payload.exp) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { name: payload.name || "", role: payload.role || "" } });
  } catch { return NextResponse.json({ user: null }); }
}
