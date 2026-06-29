// Durable DATABASE SNAPSHOTS stored in Supabase Storage (bucket: ronyx-backups) —
// complements the Backup Center (which tracks uploaded source files). NOT email/local.
//
// POST → Excel snapshot of drivers + owner-operator drivers + carriers → upload to
//        ronyx-backups/<org>/Ronyx_Backup_<timestamp>.xlsx
// GET  → list snapshots with short-lived signed download URLs.
//
// Schedule by pointing a Render Cron Job (or any scheduler) at POST this route daily.

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const BUCKET = "ronyx-backups";

// orgScoped: only tables that actually have an organization_id column (ronyx_oo_drivers
// does not — it links to a carrier via oo_id — so scoping it would return nothing).
const SHEETS: { name: string; table: string; cols: string[]; notDeleted?: boolean; orgScoped?: boolean }[] = [
  { name: "Drivers", table: "drivers", notDeleted: true, orgScoped: true, cols: ["id","full_name","name","phone","email","license_number","license_state","license_expiration_date","medical_card_expiration","mvr_expiration","assigned_truck_number","carrier_name","owner_operator_company","driver_type","status","dispatch_eligible","notes","updated_at"] },
  { name: "Owner-Operator Drivers", table: "ronyx_oo_drivers", notDeleted: true, orgScoped: false, cols: ["id","oo_id","name","phone","cdl_number","cdl_state","cdl_expiration","med_card_expiration","truck_number","status"] },
  { name: "Carrier Companies", table: "ronyx_owner_operators", orgScoped: true, cols: ["id","company_name","contact_name","contact_phone","contact_email","mc_number","dot_number","ein"] },
];

async function ensureBucket(sb: any) {
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) await sb.storage.createBucket(BUCKET, { public: false });
}

export async function POST() {
  const sb = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });

  try {
    await ensureBucket(sb);
    const wb = new ExcelJS.Workbook();
    const counts: Record<string, number> = {};
    for (const sh of SHEETS) {
      let q = sb.from(sh.table).select("*");
      if (sh.notDeleted) q = q.neq("status", "deleted");
      if (sh.orgScoped) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
      const { data: rows } = await q;
      const ws = wb.addWorksheet(sh.name);
      ws.columns = sh.cols.map((c) => ({ header: c, key: c, width: 18 }));
      ws.getRow(1).font = { bold: true };
      for (const r of rows || []) ws.addRow(sh.cols.reduce((o: any, c) => { o[c] = r[c] ?? ""; return o; }, {}));
      counts[sh.name] = (rows || []).length;
    }
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const path = `${orgId}/Ronyx_Backup_${stamp}.xlsx`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);

    await sb.from("ticket_audit_log").insert({
      action: "data_backup_created",
      description: `Database snapshot uploaded to Supabase Storage — ${Object.values(counts).reduce((a, b) => a + b, 0)} records`,
      metadata: { bucket: BUCKET, path, counts },
    }).maybeSingle();

    return NextResponse.json({ ok: true, bucket: BUCKET, path, counts, sizeKB: Math.round(buf.length / 1024) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 200 });
  }
}

export async function GET() {
  const sb = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const { data: files } = await sb.storage.from(BUCKET).list(orgId, { limit: 100, sortBy: { column: "name", order: "desc" } });
  const backups = [];
  for (const f of files || []) {
    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(`${orgId}/${f.name}`, 3600);
    backups.push({ name: f.name, sizeKB: Math.round((f.metadata?.size || 0) / 1024), created_at: f.created_at, url: signed?.signedUrl || null });
  }
  return NextResponse.json({ backups });
}
