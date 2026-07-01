import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// Roster import — reads a multi-row driver roster spreadsheet (the office's master
// "Ronyx spreadsheet") and adds ONLY what is missing: new owner-operator companies
// and new drivers, deduped against what's already in the system. Never duplicates.
//
// POST formData: file=<xlsx|csv>, mode="preview"|"commit"
//   preview → returns the plan (new companies, new drivers, enrich, skipped) — writes nothing
//   commit  → creates the missing companies + drivers, fills blank CDL/medical on existing

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[.,]+$/g, "").trim();
// Order-insensitive name signature so "Vazquez, Jorge" matches "Jorge Vazquez".
// Drops suffix tags like "- E3"/"Jls" and 1-char tokens, then sorts the tokens.
const nameSig = (s: unknown) => String(s ?? "").toLowerCase().replace(/\b(jr|sr|e3|jls|iii|ii|iv)\b/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(t => t.length > 1).sort().join(" ").trim();
const stripCo = (s: string) => s.replace(/\b(llc|inc|trucking|transport|transportation|logistics|company|co|services|service|corp|group|enterprises)\b/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  if (typeof raw === "number") { const d = new Date((raw - 25569) * 86400000); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
  const s = String(raw).trim(); if (!s || /expired|n\/a|cant|cannot|unable|read/i.test(s)) return null;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let [m, day, y] = parts.map(p => p.replace(/[^0-9]/g, ""));
    if (m && day && y) { const year = y.length === 2 ? "20" + y : y.padStart(4, "0"); const dt = new Date(`${year}-${m.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`); if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10); }
  }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const ALIASES: Record<string, string[]> = {
  name: ["driver name", "name", "full name", "driver"],
  cdl_number: ["cdl #", "cdl#", "cdl number", "cdl no", "license number"],
  cdl_expiration: ["cdl expir", "cdl exp", "cdl expiration", "license expiration"],
  truck_number: ["truck #", "truck#", "truck number", "truck no", "unit"],
  med_card_number: ["medical card #", "medical card#", "medical card no", "med card #", "medical card number"],
  med_card_expiration: ["medical card expir", "medical card exp", "med card expir", "medical exp"],
  job_assignment: ["job assignment", "assignment", "dispatcher"],
  company: ["company name", "company", "owner operator", "carrier"],
  notes: ["notes", "note", "comments"],
  email: ["email", "e-mail"],
};
function mapHeaders(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  for (const [field, al] of Object.entries(ALIASES)) {
    idx[field] = headers.findIndex(h => al.some(a => norm(h) === a || norm(h).includes(a)));
  }
  return idx;
}

type Row = { name: string; cdl_number: string; cdl_expiration: string | null; truck_number: string; med_card_number: string; med_card_expiration: string | null; job_assignment: string; company: string; notes: string; email: string };

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const mode = String(form.get("mode") || "preview");
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (/\.pdf$/i.test(file.name)) return NextResponse.json({ error: "PDF can't be read as a roster — please upload the Excel (.xlsx) or CSV version of the spreadsheet." }, { status: 400 });

  // Parse the workbook
  let rows: unknown[][] = [];
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any);
    const ws = wb.worksheets[0];
    ws?.eachRow({ includeEmpty: false }, r => rows.push((r.values as unknown[]).slice(1).map(v => (v === null || v === undefined ? "" : (typeof v === "object" && (v as any).text ? (v as any).text : v)))));
  } catch (e: any) {
    return NextResponse.json({ error: "Couldn't read that file. Save it as .xlsx or .csv and try again." }, { status: 400 });
  }
  if (rows.length < 2) return NextResponse.json({ error: "The spreadsheet looks empty." }, { status: 400 });

  const headers = (rows[0] as unknown[]).map(h => String(h || ""));
  const col = mapHeaders(headers);
  if (col.name < 0) return NextResponse.json({ error: `Couldn't find a "Driver Name" column. Headers found: ${headers.join(", ")}` }, { status: 400 });

  const get = (arr: unknown[], f: string) => col[f] >= 0 ? String(arr[col[f]] ?? "").trim() : "";

  // Parse + dedupe within the sheet (by company+driver), merging the most complete values.
  const sheet = new Map<string, Row>();
  for (const raw of rows.slice(1)) {
    const arr = raw as unknown[];
    const name = get(arr, "name");
    if (!name || /^[`']/.test(name)) continue;
    let company = get(arr, "company");
    const job = get(arr, "job_assignment");
    if (!company) company = job; // BAS / TC Red Wine direct drivers
    if (!company) continue;
    const key = `${norm(company)}|${nameSig(name)}`;
    const next: Row = {
      name, company, job_assignment: job,
      cdl_number: get(arr, "cdl_number"), cdl_expiration: normalizeDate(get(arr, "cdl_expiration")),
      truck_number: get(arr, "truck_number"), med_card_number: get(arr, "med_card_number"),
      med_card_expiration: normalizeDate(get(arr, "med_card_expiration")),
      notes: get(arr, "notes"), email: get(arr, "email"),
    };
    const prev = sheet.get(key);
    if (!prev) sheet.set(key, next);
    else sheet.set(key, {
      ...prev,
      cdl_number: prev.cdl_number || next.cdl_number, cdl_expiration: prev.cdl_expiration || next.cdl_expiration,
      truck_number: prev.truck_number || next.truck_number, med_card_number: prev.med_card_number || next.med_card_number,
      med_card_expiration: prev.med_card_expiration || next.med_card_expiration,
      notes: prev.notes || next.notes, email: prev.email || next.email,
    });
  }
  const parsed = [...sheet.values()];

  // Load existing OOs + drivers
  const { data: oos } = await sb.from("ronyx_owner_operators").select("id, company_name").eq("organization_id", orgId).limit(5000);
  const ooList = oos || [];
  const ooByNorm = new Map<string, { id: string; company_name: string }>();
  const ooByCore = new Map<string, { id: string; company_name: string }>();
  for (const o of ooList as any[]) { ooByNorm.set(norm(o.company_name), o); const core = stripCo(norm(o.company_name)); if (core.length > 3 && !ooByCore.has(core)) ooByCore.set(core, o); }
  const ooIds = ooList.map((o: any) => o.id);
  const ooNameById = new Map<string, string>(); for (const o of ooList as any[]) ooNameById.set(o.id, o.company_name);

  const { data: drv } = ooIds.length ? await sb.from("ronyx_oo_drivers").select("id, oo_id, name, cdl_number, cdl_expiration, med_card_number, med_card_expiration, truck_number").in("oo_id", ooIds).limit(10000) : { data: [] as any[] };
  // Index existing drivers by their name tokens so we can match a person even when
  // names differ by ORDER ("Vazquez, Jorge" vs "Jorge Vazquez") or a MIDDLE NAME
  // ("Moore, Mark" vs "Mark Anthony Moore"). We require first+last to both match
  // (>= 2 shared tokens), preferring a match inside the same owner-operator company.
  const toks = (s: unknown) => nameSig(s).split(" ").filter(Boolean);
  const existingDrivers = (drv || []).map((d: any) => ({ ...d, _toks: toks(d.name), _co: norm(ooNameById.get(d.oo_id) || "") }));
  function matchExisting(name: string, companyKey: string): any | null {
    const t = toks(name); if (!t.length) return null;
    const tset = new Set(t);
    if (t.length < 2) { // single-token name — require exact token match to stay safe
      return existingDrivers.find((d: any) => d._toks.length === 1 && d._toks[0] === t[0]) || null;
    }
    let best: any = null, bestShared = 0, bestSameCo = false;
    for (const d of existingDrivers) {
      let shared = 0; for (const x of d._toks) if (tset.has(x)) shared++;
      if (shared < 2) continue;
      const sameCo = d._co === companyKey;
      if ((sameCo && !bestSameCo) || (sameCo === bestSameCo && shared > bestShared)) { best = d; bestShared = shared; bestSameCo = sameCo; }
    }
    return best;
  }

  // Resolve each sheet company to an existing OO (or mark new)
  const matchOO = (company: string) => ooByNorm.get(norm(company)) || ooByCore.get(stripCo(norm(company))) || null;

  const newCompanies = new Map<string, string>(); // norm -> display
  const newDrivers: any[] = [];
  const enrich: any[] = [];
  let skipped = 0;

  for (const r of parsed) {
    const existingOO = matchOO(r.company);
    const companyKey = norm(existingOO?.company_name || r.company);
    // Match the person (order- and middle-name-tolerant), preferring same company.
    const existingDriver = matchExisting(r.name, companyKey);

    if (!existingOO && !newCompanies.has(norm(r.company))) newCompanies.set(norm(r.company), r.company);

    if (existingDriver) {
      const fills: string[] = [];
      if (!existingDriver.cdl_number && r.cdl_number) fills.push("CDL #");
      if (!existingDriver.cdl_expiration && r.cdl_expiration) fills.push("CDL exp");
      if (!existingDriver.med_card_number && r.med_card_number) fills.push("Med card #");
      if (!existingDriver.med_card_expiration && r.med_card_expiration) fills.push("Med exp");
      if (!existingDriver.truck_number && r.truck_number) fills.push("Truck #");
      if (fills.length) enrich.push({ id: existingDriver.id, name: existingDriver.name, company: ooNameById.get(existingDriver.oo_id) || existingOO?.company_name || "", fills, data: r });
      else skipped++;
    } else {
      newDrivers.push({ ...r, _company: existingOO?.company_name || r.company });
    }
  }

  const summary = {
    file: file.name, totalRows: rows.length - 1, parsedDrivers: parsed.length,
    newCompanies: [...newCompanies.values()].sort(),
    newDriverCount: newDrivers.length, enrichCount: enrich.length, skipped,
    newDriversSample: newDrivers.slice(0, 40).map(d => ({ name: d.name, company: d._company, cdl: d.cdl_number || "", cdl_exp: d.cdl_expiration || "", med_exp: d.med_card_expiration || "" })),
    enrichSample: enrich.slice(0, 25).map(e => ({ name: e.name, company: e.company, fills: e.fills })),
  };

  if (mode !== "commit") return NextResponse.json({ ok: true, mode: "preview", ...summary });

  // ── COMMIT ──
  // Records created by an import are stamped so the office can tell them apart
  // from hand-entered records (surfaced as an "Imported — needs review" badge).
  const IMPORT_STAMP = `[IMPORTED ${new Date().toISOString().slice(0, 10)} — needs review]`;

  // 1) create new companies
  const createdCompanyId = new Map<string, string>();
  for (const [nkey, display] of newCompanies) {
    const { data, error } = await sb.from("ronyx_owner_operators").insert({ organization_id: orgId, company_name: display, status: "active", notes: IMPORT_STAMP }).select("id, company_name").single();
    if (!error && data) { createdCompanyId.set(nkey, data.id); ooByNorm.set(norm(data.company_name), data); }
  }
  const resolveId = (company: string) => (matchOO(company)?.id) || createdCompanyId.get(norm(company)) || null;

  // Track every driver row we create or change, so the UI can highlight exactly
  // what this import touched.
  const affectedIds: string[] = [];

  // 2) insert new drivers (strip-and-retry on unknown columns)
  async function insertDriver(payload: Record<string, unknown>): Promise<string | null> {
    const { data, error } = await sb.from("ronyx_oo_drivers").insert(payload).select("id").single();
    if (error) {
      const m = error.message?.match(/Could not find the '(.+?)' column/) || error.message?.match(/column "(.+?)"/);
      if (m && m[1] in payload && m[1] !== "name" && m[1] !== "oo_id") { const p = { ...payload }; delete p[m[1]]; return insertDriver(p); }
      return null;
    }
    return data?.id ?? null;
  }
  let driversCreated = 0;
  for (const d of newDrivers) {
    const oo_id = resolveId(d._company); if (!oo_id) continue;
    const notes = [IMPORT_STAMP, d.notes, d.email ? `Email: ${d.email}` : ""].filter(Boolean).join(" · ");
    const id = await insertDriver({
      oo_id, name: d.name, status: "active",
      cdl_number: d.cdl_number || null, cdl_expiration: d.cdl_expiration || null,
      med_card_number: d.med_card_number || null, med_card_expiration: d.med_card_expiration || null,
      truck_number: d.truck_number || null, job_assignment: d.job_assignment || null, notes: notes || null,
    });
    if (id) { driversCreated++; affectedIds.push(id); }
  }

  // 3) enrich blank fields on existing drivers
  let enriched = 0;
  for (const e of enrich) {
    const patch: Record<string, unknown> = {};
    if (e.fills.includes("CDL #")) patch.cdl_number = e.data.cdl_number;
    if (e.fills.includes("CDL exp")) patch.cdl_expiration = e.data.cdl_expiration;
    if (e.fills.includes("Med card #")) patch.med_card_number = e.data.med_card_number;
    if (e.fills.includes("Med exp")) patch.med_card_expiration = e.data.med_card_expiration;
    if (e.fills.includes("Truck #")) patch.truck_number = e.data.truck_number;
    if (Object.keys(patch).length) { const { error } = await sb.from("ronyx_oo_drivers").update(patch).eq("id", e.id); if (!error) { enriched++; affectedIds.push(e.id); } }
  }

  return NextResponse.json({ ok: true, mode: "commit", companiesCreated: createdCompanyId.size, driversCreated, enriched, skipped, affectedIds });
}
