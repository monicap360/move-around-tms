import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// POST /api/ronyx/drivers/import-cdl-medical
// Accepts .xlsx / .xls / .csv with CDL and Medical Card expiration data.
// Matches rows to driver_profiles by name (fuzzy), then updates
// license_expiration_date and medical_card_expiration fields.
// Does NOT overwrite ronyx_driver_documents — use document upload for files.

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  // Excel numeric date serial
  if (typeof raw === "number") {
    const d = new Date((raw - 25569) * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (!s) return null;
  // Try common formats: M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try M/D/YY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const [m, day, y] = parts;
    const year = y.length === 2 ? "20" + y : y;
    const attempt = new Date(`${year}-${m.padStart(2,"0")}-${day.padStart(2,"0")}`);
    if (!isNaN(attempt.getTime())) return attempt.toISOString().slice(0, 10);
  }
  return null;
}

function scoreName(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.88;
  const parts = nb.split(/\s+/);
  let hit = 0;
  for (const p of parts) if (p.length > 1 && na.includes(p)) hit++;
  return (hit / Math.max(parts.length, 1)) * 0.75;
}

// Column header aliases
const CDL_ALIASES      = ["cdl expiration","cdl exp","cdl expiry","cdl exp date","license expiration","dl expiration","dl exp"];
const MED_ALIASES      = ["med card expiration","medical card expiration","medical card exp","med exp","medical exp","med card exp date","medical card"];
const NAME_ALIASES     = ["driver name","name","full name","driver","employee name"];
const CDL_CLASS_ALIASES = ["cdl class","class","license class","cdl type"];
const CDL_NUM_ALIASES  = ["cdl number","cdl #","dl number","license number","dl #"];

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.some(a => h.toLowerCase().trim().includes(a)));
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const ws = workbook.worksheets[0];
  const rows: unknown[][] = [];
  ws?.eachRow({ includeEmpty: true }, (row) => {
    rows.push((row.values as unknown[]).slice(1).map((v) => (v === null || v === undefined ? "" : v)));
  });

  if (rows.length < 2) return NextResponse.json({ error: "Spreadsheet appears empty" }, { status: 400 });

  // @ts-ignore
  const headers = (rows[0] as unknown[]).map(h => String(h || ""));
  const nameCol    = findCol(headers, NAME_ALIASES);
  const cdlCol     = findCol(headers, CDL_ALIASES);
  const medCol     = findCol(headers, MED_ALIASES);
  const classCol   = findCol(headers, CDL_CLASS_ALIASES);
  const cdlNumCol  = findCol(headers, CDL_NUM_ALIASES);

  if (nameCol === -1) {
    return NextResponse.json({
      error: `Could not find driver name column. Headers found: ${headers.join(", ")}`,
      headers,
    }, { status: 400 });
  }

  const todayIso = new Date().toISOString();

  // Load every place a driver's dates can live, scoped to this org, so the dates
  // land wherever the driver actually exists (compliance views read from all of
  // these). OO drivers are scoped through their parent owner-operator company.
  const { data: ooCos } = await sb.from("ronyx_owner_operators").select("id").eq("organization_id", orgId).limit(5000);
  const ooIds = (ooCos || []).map((c: { id: string }) => c.id);

  const [{ data: profiles }, { data: w2 }, ood] = await Promise.all([
    sb.from("driver_profiles").select("id, full_name, license_expiration_date, medical_card_expiration").eq("organization_id", orgId).limit(5000),
    sb.from("drivers").select("id, full_name, license_expiration_date, medical_card_expiration").eq("organization_id", orgId).limit(5000),
    ooIds.length
      ? sb.from("ronyx_oo_drivers").select("id, name, cdl_expiration, med_card_expiration").in("oo_id", ooIds).limit(5000)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);
  const ooRows = (ood as { data: Record<string, unknown>[] | null }).data || [];

  function bestMatch(list: Record<string, unknown>[] | null, nameField: string, raw: string): Record<string, unknown> | null {
    if (!list?.length) return null;
    const scored = list.map((d) => ({ d, score: scoreName(String(d[nameField] || ""), raw) })).sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].score >= 0.4 ? scored[0].d : null;
  }

  const dataRows = rows.slice(1) as unknown[][];
  const results: { name: string; matched?: string; status: string }[] = [];
  let updated = 0, skipped = 0, unmatched = 0;

  for (const row of dataRows) {
    const arr = row as unknown[];
    const rawName = String(arr[nameCol] || "").trim();
    if (!rawName) continue;

    const cdlDate  = cdlCol  >= 0 ? normalizeDate(arr[cdlCol]) : null;
    const medDate  = medCol  >= 0 ? normalizeDate(arr[medCol]) : null;
    const cdlClass = classCol >= 0 ? String(arr[classCol] || "").trim().replace(/class\s*/i, "").toUpperCase() : null;
    const cdlNum   = cdlNumCol >= 0 ? String(arr[cdlNumCol] || "").trim() : null;
    if (!cdlDate && !medDate && !cdlClass && !cdlNum) { skipped++; continue; }

    let didUpdate = false, matchedName = "";

    // driver_profiles (license_expiration_date / medical_card_expiration)
    const p = bestMatch(profiles as Record<string, unknown>[], "full_name", rawName);
    if (p) {
      const patch: Record<string, string> = {};
      if (cdlDate) patch.license_expiration_date = cdlDate;
      if (medDate) patch.medical_card_expiration = medDate;
      if (cdlClass && ["A", "B", "C"].includes(cdlClass)) patch.license_class = cdlClass;
      if (cdlNum) patch.license_number = cdlNum;
      if (Object.keys(patch).length) { const { error } = await sb.from("driver_profiles").update({ ...patch, updated_at: todayIso }).eq("id", p.id as string); if (!error) { didUpdate = true; matchedName = String(p.full_name || matchedName); } }
    }

    // drivers (W2)
    const w = bestMatch(w2 as Record<string, unknown>[], "full_name", rawName);
    if (w) {
      const patch: Record<string, string> = {};
      if (cdlDate) patch.license_expiration_date = cdlDate;
      if (medDate) patch.medical_card_expiration = medDate;
      if (cdlNum) patch.license_number = cdlNum;
      if (Object.keys(patch).length) { const { error } = await sb.from("drivers").update(patch).eq("id", w.id as string); if (!error) { didUpdate = true; matchedName = String(w.full_name || matchedName); } }
    }

    // owner-operator drivers (cdl_expiration / med_card_expiration)
    const o = bestMatch(ooRows, "name", rawName);
    if (o) {
      const patch: Record<string, string> = {};
      if (cdlDate) patch.cdl_expiration = cdlDate;
      if (medDate) patch.med_card_expiration = medDate;
      if (cdlNum) patch.cdl_number = cdlNum;
      if (Object.keys(patch).length) { const { error } = await sb.from("ronyx_oo_drivers").update(patch).eq("id", o.id as string); if (!error) { didUpdate = true; matchedName = String(o.name || matchedName); } }
    }

    if (didUpdate) { updated++; results.push({ name: rawName, matched: matchedName, status: "updated" }); }
    else if (p || w || o) { results.push({ name: rawName, matched: matchedName, status: "no_change" }); }
    else { unmatched++; results.push({ name: rawName, status: "unmatched" }); }
  }

  return NextResponse.json({
    success: true,
    updated, skipped, unmatched,
    total_rows: dataRows.length,
    results: results.slice(0, 100),
  });
}
