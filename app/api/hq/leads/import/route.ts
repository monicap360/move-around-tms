import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Bulk-import carrier leads, keeping only fleets at/above a truck threshold
// (default 75). Rows are parsed client-side from an uploaded CSV.
export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
  const minTrucks = Number(body.min_trucks ?? 75) || 75;
  const owner = (body.owner_name || "").toString().trim() || null; // imports land unassigned in the pool
  if (!rows.length) return NextResponse.json({ error: "No rows provided." }, { status: 400 });

  let skippedLow = 0, skippedNoName = 0;
  const toInsert = [];
  for (const r of rows) {
    const company = String(r.company_name || "").trim();
    const trucks = parseInt(String(r.trucks_count ?? "").replace(/[^0-9]/g, ""), 10);
    if (!company) { skippedNoName++; continue; }
    if (!Number.isFinite(trucks) || trucks < minTrucks) { skippedLow++; continue; }
    toInsert.push({
      organization_id: orgId,
      owner_name: owner,
      company_name: company,
      contact_name: String(r.contact_name || "").trim() || null,
      phone: String(r.phone || "").trim() || null,
      email: String(r.email || "").trim() || null,
      source: String(r.source || "Imported list").trim() || "Imported list",
      trucks_count: trucks,
      stage: "new",
    });
  }
  if (!toInsert.length) return NextResponse.json({ ok: true, added: 0, skipped_low: skippedLow, skipped_no_name: skippedNoName, note: `No rows had ${minTrucks}+ trucks.` });

  // Insert in chunks
  let added = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { data, error } = await supabaseAdmin.from("ronyx_sales_leads").insert(chunk).select("id");
    if (error) return NextResponse.json({ error: error.message, added }, { status: 500 });
    added += data?.length || 0;
  }
  return NextResponse.json({ ok: true, added, skipped_low: skippedLow, skipped_no_name: skippedNoName });
}
