import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendMoveAroundEmail, sendCcbEmail, moveAroundEmailConfigured, ccbEmailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// MoveAround HQ — manage portal users (HQ + CCB) and send them access.
// Portals: HQ → hq_users (/hq/login), CCB → ccb_users (/ccb/login).
const TABLE = { HQ: "hq_users", CCB: "ccb_users" } as const;
const LOGIN = { HQ: "/hq/login", CCB: "/ccb/login" } as const;
const LABEL = { HQ: "MoveAround HQ", CCB: "Carrier Clearance Bureau" } as const;
type Portal = keyof typeof TABLE;
const hashPin = (pin: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
const baseUrl = (req: NextRequest) => {
  const env = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = req.headers.get("host") || "movearoundtms.com";
  return `https://${h}`;
};

export async function GET() {
  const out: any[] = [];
  for (const portal of Object.keys(TABLE) as Portal[]) {
    const { data } = await supabaseAdmin.from(TABLE[portal]).select("id, name, role, email, active").order("name");
    for (const u of data || []) out.push({ ...u, portal, login: LOGIN[portal] });
  }
  return NextResponse.json({ users: out });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));

  if (b.action === "send_access") {
    const portal = (b.portal as Portal); if (!TABLE[portal]) return NextResponse.json({ error: "Bad portal" }, { status: 400 });
    const { data: u } = await supabaseAdmin.from(TABLE[portal]).select("name, email").eq("id", b.id).maybeSingle();
    if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const to = b.email || u.email;
    const link = `${baseUrl(req)}${LOGIN[portal]}`;
    if (!to) return NextResponse.json({ ok: false, error: "No email on file for this user.", link });
    const text = `Hi ${String(u.name || "").split(" ")[0] || "there"},\n\nYou've been given access to ${LABEL[portal]}.\n\nSign in here: ${link}\nTap your name and enter your PIN. If you don't have a PIN yet, ask your admin to set one.\n\n— The ${LABEL[portal]} Team`;
    const send = portal === "CCB" ? sendCcbEmail : sendMoveAroundEmail;
    const configured = portal === "CCB" ? ccbEmailConfigured() : moveAroundEmailConfigured();
    if (!configured) return NextResponse.json({ ok: true, notified: false, link, note: `${LABEL[portal]} email isn't set up yet — copy this link and send it manually.` });
    const r = await send({ to, subject: `Your ${LABEL[portal]} access`, text }).catch(() => ({ ok: false }));
    return NextResponse.json({ ok: true, notified: (r as any)?.ok || false, link });
  }

  // create user
  const portal = (b.portal as Portal); if (!TABLE[portal]) return NextResponse.json({ error: "Pick a portal (HQ or CCB)." }, { status: 400 });
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!/^\d{4,6}$/.test(String(b.pin || ""))) return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
  const salt = crypto.randomBytes(8).toString("hex");
  const row: any = { name, role: String(b.role || portal).trim(), email: String(b.email || "").trim() || null, salt, pin_hash: hashPin(String(b.pin), salt), active: true };
  if (portal === "CCB") row.pin_set_at = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from(TABLE[portal]).insert(row).select("id, name, role, email").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, user: { ...data, portal, login: LOGIN[portal] } });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const portal = url.searchParams.get("portal") as Portal;
  const id = url.searchParams.get("id");
  if (!TABLE[portal] || !id) return NextResponse.json({ error: "portal + id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from(TABLE[portal]).update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
