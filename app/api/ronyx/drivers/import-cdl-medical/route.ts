import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
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

  // Load all driver profiles for fuzzy matching
  const { data: allDrivers } = await sb
    .from("driver_profiles")
    .select("id, full_name, license_expiration_date, medical_card_expiration")
    .limit(2000);

  // @ts-ignore
  const dataRows = rows.slice(1) as unknown[][];
  const results: { name: string; matched?: string; cdl_date?: string | null; med_date?: string | null; status: string }[] = [];
  let updated = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const row of dataRows) {
    const arr    = row as unknown[];
    const rawName = String(arr[nameCol] || "").trim();
    if (!rawName) continue;

    const cdlDate  = cdlCol  >= 0 ? normalizeDate(arr[cdlCol])  : null;
    const medDate  = medCol  >= 0 ? normalizeDate(arr[medCol])  : null;
    const cdlClass = classCol >= 0 ? String(arr[classCol] || "").trim().replace(/class\s*/i,"").toUpperCase() : null;
    const cdlNum   = cdlNumCol >= 0 ? String(arr[cdlNumCol] || "").trim() : null;

    if (!cdlDate && !medDate && !cdlClass && !cdlNum) { skipped++; continue; }

    // Fuzzy match
    const scored = (allDrivers || [])
      .map(d => ({ ...d, score: scoreName(d.full_name || "", rawName) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score < 0.4) {
      results.push({ name: rawName, status: "unmatched" });
      unmatched++;
      continue;
    }

    // Build update patch
    const patch: Record<string, string | null> = {};
    if (cdlDate  && cdlDate  !== best.license_expiration_date) patch.license_expiration_date = cdlDate;
    if (medDate  && medDate  !== best.medical_card_expiration) patch.medical_card_expiration  = medDate;
    if (cdlClass && ["A","B","C"].includes(cdlClass)) patch.license_class = cdlClass;
    if (cdlNum)  patch.license_number = cdlNum;

    if (Object.keys(patch).length === 0) {
      results.push({ name: rawName, matched: best.full_name || best.id, status: "no_change" });
      continue;
    }

    const { error } = await sb
      .from("driver_profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", best.id);

    if (error) {
      results.push({ name: rawName, matched: best.full_name || best.id, status: `error: ${error.message}` });
    } else {
      results.push({ name: rawName, matched: best.full_name || best.id, cdl_date: cdlDate, med_date: medDate, status: "updated" });
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    unmatched,
    total_rows: dataRows.length,
    results: results.slice(0, 100), // first 100 for debug view
  });
}
