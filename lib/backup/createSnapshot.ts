// Shared full-database snapshot → Supabase Storage (bucket: ronyx-backups).
// Used by the gated Backup Center route and the unguarded cron route.

import ExcelJS from "exceljs";
import supabaseAdmin from "@/lib/supabaseAdmin";

const BUCKET = "ronyx-backups";

// Back up EVERYTHING — every core table, all columns. (Excel sheet names ≤ 31 chars.)
const TABLES: { sheet: string; table: string }[] = [
  { sheet: "Drivers", table: "drivers" },
  { sheet: "Owner-Operator Drivers", table: "ronyx_oo_drivers" },
  { sheet: "Carrier Companies", table: "ronyx_owner_operators" },
  { sheet: "Driver Profiles", table: "driver_profiles" },
  { sheet: "Loads", table: "loads" },
  { sheet: "Dispatch Jobs", table: "dispatch_jobs" },
  { sheet: "Tickets", table: "aggregate_tickets" },
  { sheet: "Trucks", table: "ronyx_trucks" },
  { sheet: "Customers", table: "customers" },
  { sheet: "Uploaded Files", table: "original_uploads" },
  { sheet: "Import Batches", table: "driver_import_batches" },
  { sheet: "Dispatch Imports", table: "dispatch_imports" },
];

async function ensureBucket(sb: any) {
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) await sb.storage.createBucket(BUCKET, { public: false });
}

// Fetch ALL rows of a table (paginated). Tries org-scoping; falls back to unscoped
// for tables that have no organization_id column (e.g. ronyx_oo_drivers).
async function fetchAll(sb: any, table: string, orgId: string): Promise<any[]> {
  const run = (scoped: boolean, from: number) => {
    let q = sb.from(table).select("*").range(from, from + 999);
    if (scoped) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
    return q;
  };
  const all: any[] = [];
  let scoped = true;
  for (let from = 0; from < 50000; from += 1000) {
    let { data, error } = await run(scoped, from);
    if (error && scoped) { scoped = false; ({ data, error } = await run(false, from)); }
    if (error || !data) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

export type SnapshotResult =
  | { ok: true; bucket: string; path: string; counts: Record<string, number>; sizeKB: number }
  | { ok: false; error: string };

export async function createSnapshot(orgId: string, source = "manual"): Promise<SnapshotResult> {
  const sb = supabaseAdmin as any;
  try {
    await ensureBucket(sb);
    const wb = new ExcelJS.Workbook();
    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      const rows = await fetchAll(sb, t.table, orgId);
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const ws = wb.addWorksheet(t.sheet.slice(0, 31));
      if (cols.length) {
        ws.columns = cols.map((c) => ({ header: c, key: c, width: 16 }));
        ws.getRow(1).font = { bold: true };
        for (const r of rows) {
          ws.addRow(cols.reduce((o: any, c) => {
            let v = r[c];
            if (v !== null && typeof v === "object") v = JSON.stringify(v);
            o[c] = v ?? "";
            return o;
          }, {}));
        }
      }
      counts[t.sheet] = rows.length;
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
      description: `Database snapshot uploaded to Supabase Storage (${source}) — ${Object.values(counts).reduce((a, b) => a + b, 0)} records`,
      metadata: { bucket: BUCKET, path, counts, source },
    }).maybeSingle();

    return { ok: true, bucket: BUCKET, path, counts, sizeKB: Math.round(buf.length / 1024) };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}
