import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Compliance follow-up list — drivers needing document attention. Reads BOTH the date columns
// AND the free-text notes (where the dispatch import recorded "Missing back of DL", "Inspection
// Expired", etc.). Returns each driver once with their worst issue + all issues.
export async function GET() {
  try {
    const orgId = await resolveOrgId();
    let q = supabaseAdmin.from("drivers")
      .select("id, name, phone, carrier_name, notes, license_expiration_date, license_expiration, medical_card_expiration, mvr_expiration")
      .neq("status", "deleted");
    if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
    const { data, error } = await q.limit(5000);
    if (error) return NextResponse.json({ drivers: [] });

    const today = new Date(); const in30 = new Date(today.getTime() + 30 * 86400000);
    const out: any[] = [];
    for (const d of data || []) {
      const issues: { label: string; level: "critical" | "warning" }[] = [];
      const n = (d.notes || "").toLowerCase();
      // notes-based flags (from the dispatch import)
      if (/missing back of dl & inspection/.test(n)) issues.push({ label: "Missing back of DL + inspection", level: "critical" });
      else if (/missing back of dl & medical|missing medical and back dl/.test(n)) issues.push({ label: "Missing back of DL + medical", level: "critical" });
      else if (/missing back of dl/.test(n)) issues.push({ label: "Missing back of DL", level: "critical" });
      if (/medical missing|missing medical/.test(n)) issues.push({ label: "Medical card missing", level: "critical" });
      if (/insurance missing/.test(n)) issues.push({ label: "Insurance missing", level: "critical" });
      if (/expired dl|dl expir/.test(n)) issues.push({ label: "Driver license expired/expiring", level: "critical" });
      if (/medical expired/.test(n)) issues.push({ label: "Medical card expired", level: "critical" });
      if (/inspection expired/.test(n)) issues.push({ label: "Annual inspection expired", level: "critical" });
      if (/expiring/.test(n) && !/expired/.test(n)) issues.push({ label: "Document expiring soon", level: "warning" });
      // date-based flags
      const dchecks: [string, string][] = [["CDL", d.license_expiration_date || d.license_expiration], ["Medical card", d.medical_card_expiration], ["MVR", d.mvr_expiration]];
      for (const [lbl, raw] of dchecks) {
        if (!raw) continue; const dt = new Date(raw); if (isNaN(+dt)) continue;
        if (dt < today) issues.push({ label: `${lbl} expired (${String(raw).slice(0, 10)})`, level: "critical" });
        else if (dt <= in30) issues.push({ label: `${lbl} expiring (${String(raw).slice(0, 10)})`, level: "warning" });
      }
      if (!issues.length) continue;
      const critical = issues.some(i => i.level === "critical");
      out.push({ id: d.id, name: d.name, phone: d.phone || null, carrier: d.carrier_name || null, level: critical ? "critical" : "warning", issues: issues.map(i => i.label) });
    }
    out.sort((a, b) => (a.level === b.level ? (a.name || "").localeCompare(b.name || "") : a.level === "critical" ? -1 : 1));
    return NextResponse.json({ drivers: out, total: out.length, critical: out.filter(d => d.level === "critical").length });
  } catch (e: any) { return NextResponse.json({ drivers: [], error: e?.message }); }
}

// POST {driverId, by} — record that a driver was contacted (appended to their notes).
export async function POST(req: NextRequest) {
  try {
    await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    if (!body.driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });
    const { data: d } = await supabaseAdmin.from("drivers").select("notes").eq("id", body.driverId).maybeSingle();
    const stamp = new Date().toISOString().slice(0, 10);
    const note = `[followed up ${stamp}${body.by ? " by " + body.by : ""}]`;
    const notes = [d?.notes, note].filter(Boolean).join(" | ");
    const { error } = await supabaseAdmin.from("drivers").update({ notes }).eq("id", body.driverId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
