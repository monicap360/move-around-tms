// Driver Hours-of-Service tracker — stored in the existing ronyx_admin_settings
// key-value table (no migration needed). Until an ELD (Samsara/Motive/Geotab) is
// connected, the office logs each driver's hours USED today and we compute the
// FMCSA property-carrying remaining clocks: 11h drive / 14h on-duty / 70h cycle.
//
// When an ELD is added later, swap the source in GET to fetchHOS() from
// app/integrations/eld.ts and keep this shape — the load page won't change.
//
// GET  → { hos: { [driverId]: {driveUsed,dutyUsed,cycleUsed,updatedAt} }, limits }
// POST → { driverId, driveUsed, dutyUsed, cycleUsed } upserts one driver, returns map.

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const GROUP = "hos";
const KEY = "driver_hos";

// FMCSA property-carrying limits (hours).
export const HOS_LIMITS = { drive: 11, duty: 14, cycle: 70 };

type HosEntry = { driveUsed: number; dutyUsed: number; cycleUsed: number; updatedAt: string };
type HosMap = Record<string, HosEntry>;

async function readHos(orgId: string): Promise<HosMap> {
  const { data } = await (supabaseAdmin as any)
    .from("ronyx_admin_settings")
    .select("setting_value")
    .eq("organization_id", orgId).eq("setting_group", GROUP).eq("setting_key", KEY)
    .maybeSingle();
  let v = data?.setting_value;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  return v && typeof v === "object" && v.hos ? v.hos : {};
}

async function writeHos(orgId: string, hos: HosMap) {
  await (supabaseAdmin as any).from("ronyx_admin_settings").upsert({
    organization_id: orgId, setting_group: GROUP, setting_key: KEY,
    setting_value: { hos }, updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,setting_group,setting_key" });
}

const num = (x: any, max: number) => {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
};

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const hos = await readHos(orgId);
  return NextResponse.json({ hos, limits: HOS_LIMITS });
}

export async function POST(req: Request) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const driverId = String(body.driverId || "").trim();
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  const hos = await readHos(orgId);
  hos[driverId] = {
    driveUsed: num(body.driveUsed, HOS_LIMITS.drive),
    dutyUsed: num(body.dutyUsed, HOS_LIMITS.duty),
    cycleUsed: num(body.cycleUsed, HOS_LIMITS.cycle),
    updatedAt: new Date().toISOString(),
  };
  await writeHos(orgId, hos);
  return NextResponse.json({ ok: true, hos, limits: HOS_LIMITS });
}
