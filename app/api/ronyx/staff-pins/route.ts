// Staff PIN roster — stored in the existing ronyx_admin_settings key-value table
// (no migration needed). Each staff member has a name, role, and a salted SHA-256
// PIN hash. PIN hashes are NEVER returned to the client.
//
// GET  → list staff (id, name, role) only.
// POST → manage roster: { action: "add"|"set_pin"|"rename"|"remove", ... }
//
// NOTE (security): this is the staff *switcher* on a trusted device, not the
// internet-facing gate. For public exposure, put a device/org login in front and
// gate management behind an admin role. Verification is rate-limited in ./verify.

import { NextResponse } from "next/server";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const GROUP = "auth";
const KEY = "staff_pins";

type Staff = { id: string; name: string; role: string; salt: string; pin_hash: string; active: boolean; created_at: string };

const hashPin = (pin: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
const newId = () => crypto.randomBytes(6).toString("hex");
const newSalt = () => crypto.randomBytes(8).toString("hex");

async function readRoster(orgId: string): Promise<Staff[]> {
  const { data } = await (supabaseAdmin as any)
    .from("ronyx_admin_settings")
    .select("setting_value")
    .eq("organization_id", orgId).eq("setting_group", GROUP).eq("setting_key", KEY)
    .maybeSingle();
  let v = data?.setting_value;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  return Array.isArray(v?.staff) ? v.staff : [];
}

async function writeRoster(orgId: string, staff: Staff[]) {
  await (supabaseAdmin as any).from("ronyx_admin_settings").upsert({
    organization_id: orgId, setting_group: GROUP, setting_key: KEY,
    setting_value: { staff }, updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,setting_group,setting_key" });
}

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const roster = await readRoster(orgId);
  // Strip secrets — clients only ever see who exists.
  return NextResponse.json({
    staff: roster.filter(s => s.active !== false).map(s => ({ id: s.id, name: s.name, role: s.role, has_pin: !!s.pin_hash })),
  });
}

function validPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}

export async function POST(req: Request) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const roster = await readRoster(orgId);

  if (action === "add") {
    const name = String(body.name || "").trim();
    const role = String(body.role || "Staff").trim() || "Staff";
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!validPin(body.pin)) return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
    const salt = newSalt();
    roster.push({ id: newId(), name, role, salt, pin_hash: hashPin(body.pin, salt), active: true, created_at: new Date().toISOString() });
    await writeRoster(orgId, roster);
    return NextResponse.json({ ok: true });
  }

  if (action === "set_pin") {
    const s = roster.find(x => x.id === body.id);
    if (!s) return NextResponse.json({ error: "Staff not found." }, { status: 404 });
    if (!validPin(body.pin)) return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
    s.salt = newSalt(); s.pin_hash = hashPin(body.pin, s.salt);
    await writeRoster(orgId, roster);
    return NextResponse.json({ ok: true });
  }

  if (action === "rename") {
    const s = roster.find(x => x.id === body.id);
    if (!s) return NextResponse.json({ error: "Staff not found." }, { status: 404 });
    if (body.name) s.name = String(body.name).trim();
    if (body.role) s.role = String(body.role).trim();
    await writeRoster(orgId, roster);
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    await writeRoster(orgId, roster.filter(x => x.id !== body.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
