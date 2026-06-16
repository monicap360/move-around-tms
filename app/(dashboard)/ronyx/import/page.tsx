"use client";

import { useCallback, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────
type ParsedLoad = {
  company_name: string;
  truck_number: string;
  load_date:    string;
  origin:       string;
  destination:  string;
  loads_count:  number;
  rate:         number;
  total:        number;
  notes?:       string;
};

type OOSummary = {
  company_name: string;
  total:        number;
  trucks:       string[];
  loads:        ParsedLoad[];
};

type ExtractedField = { label: string; value: string; destination: string; field: string };

type ParsedDoc =
  | { type: "payout_csv"; project: string; week_start: string; week_end: string; summaries: OOSummary[]; loads: ParsedLoad[]; grand_total: number }
  | { type: "w9";         fields: ExtractedField[] }
  | { type: "contract";   fields: ExtractedField[] }
  | { type: "unknown";    filename: string; text_preview: string };

// ─── CSV Payout Parser ────────────────────────────────────
function parsePayoutCSV(text: string): ParsedLoad[] {
  const lines = text.split("\n").map((l) => l.split(",").map((c) => c.replace(/"/g, "").trim()));
  const loads: ParsedLoad[] = [];
  const truckOO: Record<string, string> = {};
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  for (const cols of lines) {
    const dateStr  = cols[0]?.trim();
    const truckRaw = cols[7]?.trim();
    if (!dateRe.test(dateStr) || !truckRaw) continue;

    // Truck# column: may have text notes ("OK", "deduct 500", etc.) after the number
    const truckMatch = truckRaw.match(/^(\d{4,5})/);
    if (!truckMatch) continue;
    const truck = truckMatch[1];

    // OO company appears in col 8 on first row for this truck
    const ooName = cols[8]?.trim();
    if (ooName && ooName.length > 1 && !ooName.match(/^\d/)) {
      truckOO[truck] = ooName;
    }
    const company = truckOO[truck];
    if (!company) continue;

    const loadsCount = Number(cols[4]?.replace(/[^0-9.]/g, "") || 0);
    const rate       = Number(cols[5]?.replace(/[^0-9.]/g, "") || 0);
    const total      = Number(cols[6]?.replace(/[^0-9.]/g, "") || 0);
    if (!loadsCount && !total) continue;

    // Notes: any text in col 7 after the truck number, or col 8 if company already known
    const noteInTruck = truckRaw.replace(/^\d+/, "").trim();
    const noteInOO    = (ooName && ooName !== company) ? ooName : "";
    const notes       = [noteInTruck, noteInOO].filter(Boolean).join(" ") || undefined;

    loads.push({
      company_name: company,
      truck_number: truck,
      load_date:    dateStr,
      origin:       cols[2]?.trim() || "",
      destination:  cols[3]?.trim() || "",
      loads_count:  loadsCount,
      rate,
      total: total || loadsCount * rate,
      notes,
    });
  }
  return loads;
}

function summariseLoads(loads: ParsedLoad[]): OOSummary[] {
  const map: Record<string, OOSummary> = {};
  for (const l of loads) {
    if (!map[l.company_name]) {
      map[l.company_name] = { company_name: l.company_name, total: 0, trucks: [], loads: [] };
    }
    const s = map[l.company_name];
    s.total += l.total;
    if (!s.trucks.includes(l.truck_number)) s.trucks.push(l.truck_number);
    s.loads.push(l);
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ─── Text document heuristic parser ──────────────────────
function extractW9Fields(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  const einMatch  = text.match(/\b(\d{2}[-–]\d{7})\b/);
  const nameMatch = text.match(/(?:Name of entity\/individual[^\n]*\n)([^\n]+)/i)
    || text.match(/^1\s+([A-Z][^\n]{3,60})\n/m);

  const addrLines = text.match(/(\d{1,5}\s+[A-Za-z][\w\s]+(?:St|Ave|Dr|Rd|Blvd|Ln|Way|Ct|Hwy)[^\n]{0,40})/i);
  const cityMatch = text.match(/([A-Za-z\s]+),\s*(TX|CA|FL|NY|IN|OH)\s+(\d{5})/i);
  const dateMatch = text.match(/(?:Date|Signed)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  if (nameMatch)  fields.push({ label: "Company / Entity Name", value: nameMatch[1].trim(), destination: "OO", field: "company_name" });
  if (einMatch)   fields.push({ label: "EIN",                   value: einMatch[1],          destination: "OO", field: "ein" });
  if (addrLines)  fields.push({ label: "Address",               value: addrLines[1].trim(),  destination: "OO", field: "business_address" });
  if (cityMatch)  fields.push({ label: "City / State / ZIP",    value: `${cityMatch[1].trim()}, ${cityMatch[2]} ${cityMatch[3]}`, destination: "OO", field: "business_address_city" });
  if (dateMatch)  fields.push({ label: "Signed Date",           value: dateMatch[1],         destination: "OO", field: "w9_signed_date" });

  return fields;
}

function extractContractFields(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  // Company name – appears after "SUB-HAULER:" or at top
  const subhaulerMatch = text.match(/SUB-HAULER[:\s]+([A-Z][^\n]{3,60})/i)
    || text.match(/SUBHAULER[:\s]+([A-Z][^\n]{3,60})/i);
  const attnMatch  = text.match(/ATTN[:\s]+([^\n]{2,60})/i);
  const phoneMatch = text.match(/(?:Phone|Tel|Ph)[:\s]+([\d\s\-\(\)\.]{7,20})/i);
  const emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const usdotMatch = text.match(/USDOT[#\s:]*(\d{4,8})/i);
  const einMatch   = text.match(/(?:EIN|Tax ID)[#\s:]*(\d{2}-\d{7})/i);
  const gcMatch    = text.match(/(?:General Contractor|GC)[:\s]+([A-Z][^\n]{3,60})/i)
    || text.match(/TC Redwine Services/i);
  const projMatch  = text.match(/Project[:\s]+([^\n]{3,60})/i)
    || text.match(/Domino Project/i);

  const addrMatch  = text.match(/(\d{1,5}\s+\w[\w\s]+(?:St|Ave|Hwy|Dr|Blvd|Rd|Ln)[^\n]{0,40})/i);
  const dateMatch  = text.match(/(?:Commencement|Start Date|effective)[^\n]*?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);

  if (subhaulerMatch) fields.push({ label: "Subhauler Company",   value: subhaulerMatch[1].trim(), destination: "OO",                    field: "company_name" });
  if (attnMatch)      fields.push({ label: "Contact Name (ATTN)", value: attnMatch[1].trim(),      destination: "OO",                    field: "contact_name" });
  if (phoneMatch)     fields.push({ label: "Phone",               value: phoneMatch[1].trim(),     destination: "OO",                    field: "contact_phone" });
  if (emailMatch)     fields.push({ label: "Email",               value: emailMatch[0],            destination: "OO",                    field: "contact_email" });
  if (usdotMatch)     fields.push({ label: "USDOT#",              value: usdotMatch[1],            destination: "OO",                    field: "dot_number" });
  if (einMatch)       fields.push({ label: "EIN",                 value: einMatch[1],              destination: "OO",                    field: "ein" });
  if (addrMatch)      fields.push({ label: "Address",             value: addrMatch[1].trim(),      destination: "OO",                    field: "business_address" });
  if (gcMatch)        fields.push({ label: "General Contractor",  value: typeof gcMatch === "string" ? gcMatch : gcMatch[1]?.trim() || "TC Redwine Services, LLC", destination: "Agreement", field: "gc_name" });
  if (projMatch)      fields.push({ label: "Project",             value: typeof projMatch === "string" ? "Domino Project" : projMatch[1]?.trim() || "Domino Project", destination: "Agreement", field: "project_name" });
  if (dateMatch)      fields.push({ label: "Start Date",          value: dateMatch[1],             destination: "Agreement",             field: "commencement_date" });

  return fields;
}

// ─── File reader ──────────────────────────────────────────
async function readFileText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = (e) => res((e.target?.result as string) || "");
    reader.onerror = rej;
    reader.readAsText(file);
  });
}

async function parseDocument(file: File): Promise<ParsedDoc> {
  const ext  = file.name.split(".").pop()?.toLowerCase() || "";
  const text = await readFileText(file);

  // CSV — check if it looks like a payout sheet
  if (ext === "csv" || ext === "txt") {
    const loads = parsePayoutCSV(text);
    if (loads.length > 0) {
      const summaries = summariseLoads(loads);
      // Guess week range
      const dates = loads.map((l) => new Date(l.load_date)).sort((a, b) => a.getTime() - b.getTime());
      const week_start = dates[0]?.toLocaleDateString() || "";
      const week_end   = dates[dates.length - 1]?.toLocaleDateString() || "";
      const grand_total = summaries.reduce((s, o) => s + o.total, 0);
      return { type: "payout_csv", project: "Domino Project", week_start, week_end, summaries, loads, grand_total };
    }
  }

  // PDF / text — detect W-9 vs contract
  const lowerText = text.toLowerCase();
  if (lowerText.includes("taxpayer identification") || lowerText.includes("form w-9") || lowerText.includes("w-9")) {
    return { type: "w9", fields: extractW9Fields(text) };
  }
  if (lowerText.includes("sub-hauler") || lowerText.includes("subhauler") || lowerText.includes("hauling agreement") || lowerText.includes("exhibit a")) {
    return { type: "contract", fields: extractContractFields(text) };
  }

  return { type: "unknown", filename: file.name, text_preview: text.slice(0, 400) };
}

// ─── Upload original file to storage ─────────────────────
async function uploadOriginalFile(file: File, module: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file",   file);
    fd.append("module", module);
    const res = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
    const d   = await res.json();
    return d.upload_id || null;
  } catch {
    return null;
  }
}

// ─── Apply extracted fields to OO ─────────────────────────
// SAFETY: Only fills in fields that are currently empty. Never overwrites existing data.
async function applyFieldsToOO(fields: ExtractedField[], companyName: string, originalUploadId: string | null) {
  const res  = await fetch(`/api/ronyx/owner-operators`);
  const data = await res.json();
  const oo   = (data.companies || []).find((c: any) =>
    c.company_name.toLowerCase().includes(companyName.toLowerCase()) ||
    companyName.toLowerCase().includes(c.company_name.toLowerCase())
  );
  if (!oo) return { ok: false, message: `No OO found matching "${companyName}"` };

  const patch: Record<string, string> = {};
  for (const f of fields) {
    if (f.destination === "OO" && f.field !== "business_address_city" && f.field !== "w9_signed_date") {
      // Only set if the field is currently empty — never overwrite existing data
      const current = oo[f.field];
      if (!current || String(current).trim() === "") {
        patch[f.field] = f.value;
      }
    }
  }

  // Merge city into address only if address is being set and doesn't already have city
  const city = fields.find((f) => f.field === "business_address_city");
  if (city && patch.business_address && !patch.business_address.includes(city.value.split(",")[0])) {
    patch.business_address = `${patch.business_address}, ${city.value}`;
  }

  const skipped = fields
    .filter((f) => f.destination === "OO" && !patch[f.field] && oo[f.field])
    .map((f) => f.label);

  await fetch(`/api/ronyx/owner-operators/${oo.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...patch, _original_upload_id: originalUploadId }),
  });
  return {
    ok:             true,
    oo_name:        oo.company_name,
    oo_id:          oo.id,
    updated_fields: Object.keys(patch),
    skipped_fields: skipped,
  };
}

// ─── Styles ───────────────────────────────────────────────
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 };
const lbl: React.CSSProperties  = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };

// ─── Main Page ─────────────────────────────────────────────
export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing,  setParsing]  = useState(false);
  const [parsed,   setParsed]   = useState<ParsedDoc | null>(null);
  const [filename, setFilename] = useState("");
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [importing,        setImporting]       = useState(false);
  const [originalUploadId, setOriginalUploadId] = useState<string | null>(null);
  const [fileStored,       setFileStored]       = useState(false);

  // W-9 / contract apply state
  const [matchCompany, setMatchCompany] = useState("");
  const [applying,     setApplying]     = useState(false);
  const [applyResult,  setApplyResult]  = useState<string>("");

  function flash(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); }

  const processFile = useCallback(async (file: File) => {
    setParsing(true);
    setParsed(null);
    setFilename(file.name);
    setMatchCompany("");
    setApplyResult("");
    setOriginalUploadId(null);
    setFileStored(false);
    try {
      // 1. Store original file first — read-only source evidence
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const module = ["csv","txt","xlsx"].includes(ext) ? "payout" : "contracts";
      const uploadId = await uploadOriginalFile(file, module);
      setOriginalUploadId(uploadId);
      setFileStored(!!uploadId);

      // 2. Parse for display
      const doc = await parseDocument(file);
      setParsed(doc);
    } catch {
      flash("Could not parse file.", false);
    } finally {
      setParsing(false);
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  }

  async function importPayout() {
    if (!parsed || parsed.type !== "payout_csv") return;
    setImporting(true);
    try {
      const res = await fetch("/api/ronyx/payout-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name:       parsed.project,
          week_start:         parsed.week_start,
          week_end:           parsed.week_end,
          loads:              parsed.loads,
          file_name:          filename,
          original_upload_id: originalUploadId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash(`✅ ${d.jobs_created} loads imported — ${d.oos_created} new OOs created, ${d.oos_matched} matched.`);
    } catch (err: any) {
      flash(err.message || "Import failed", false);
    } finally {
      setImporting(false);
    }
  }

  async function applyToOO() {
    if (!parsed || (parsed.type !== "w9" && parsed.type !== "contract")) return;
    if (!matchCompany.trim()) { flash("Enter the OO company name to match.", false); return; }
    setApplying(true);
    setApplyResult("");
    try {
      const result = await applyFieldsToOO(parsed.fields, matchCompany, originalUploadId);
      if (!result.ok) throw new Error(result.message);
      const skippedNote = result.skipped_fields?.length
        ? ` (${result.skipped_fields.length} fields skipped — already had data)`
        : "";
      setApplyResult(`✅ Updated ${result.oo_name}: ${result.updated_fields?.join(", ")}${skippedNote}`);
      flash(`✅ ${result.oo_name} updated.${skippedNote}`);
    } catch (err: any) {
      setApplyResult(`❌ ${err.message}`);
      flash(err.message || "Apply failed", false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="ronyx-shell">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Smart Import</p>
          <h1>Smart Document Upload</h1>
          <p className="ronyx-muted">Drop any file — payout CSVs, W-9s, subhauler contracts — and the system reads it and puts the data in the right place.</p>
        </div>
      </header>

      {/* Drop zone */}
      <div
        style={{ ...card, borderStyle: "dashed", borderWidth: 2, borderColor: dragging ? "#3b82f6" : "#cbd5e1", background: dragging ? "#eff6ff" : "#f8fafc", textAlign: "center", padding: "48px 24px", cursor: "pointer" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", marginBottom: 6 }}>
          {parsing ? "Reading file…" : "Drop file here or click to browse"}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Supported: Payout CSV, W-9 PDF/text, Subhauler Contract, Insurance Certificate
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt,.pdf" style={{ display: "none" }} onChange={onFileChange} />
      </div>

      {/* File preserved notice */}
      {fileStored && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#166534", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🔒</span>
          <span><strong>Original file preserved</strong> — {filename} is stored as read-only source evidence. Staff corrections only update parsed records. <a href="/ronyx/backup" style={{ color:"#16a34a", fontWeight:700 }}>View in Backup Center →</a></span>
        </div>
      )}

      {/* ── PAYOUT CSV result ── */}
      {parsed?.type === "payout_csv" && (
        <div>
          <div style={{ ...card, borderLeft: "4px solid #22c55e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>✅ Indiana Payout Sheet Detected</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  📅 {parsed.week_start} – {parsed.week_end} &nbsp;·&nbsp;
                  🏗 {parsed.project} &nbsp;·&nbsp;
                  🏢 {parsed.summaries.length} OO companies &nbsp;·&nbsp;
                  📦 {parsed.loads.length} load records &nbsp;·&nbsp;
                  💰 ${parsed.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                </div>
              </div>
              <button
                onClick={importPayout}
                disabled={importing}
                style={{ padding: "10px 24px", borderRadius: 10, background: "#0f172a", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", minWidth: 140 }}
              >
                {importing ? "Importing…" : `Import ${parsed.loads.length} Loads`}
              </button>
            </div>

            {/* OO summary table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left" }}>
                    {["OO Company", "Trucks", "Loads", "Total"].map((h) => (
                      <th key={h} style={{ padding: "6px 10px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.summaries.map((s) => (
                    <tr key={s.company_name} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>{s.company_name}</td>
                      <td style={{ padding: "8px 10px", color: "#64748b" }}>{s.trucks.join(", ")}</td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{s.loads.length}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#166534" }}>
                        ${s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── W-9 result ── */}
      {parsed?.type === "w9" && (
        <div style={{ ...card, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>📋 W-9 Detected — {filename}</div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
            Extracted fields below. Match to an OO and click Apply to update their record.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
            {parsed.fields.map((f) => (
              <div key={f.field} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={lbl}>{f.label} → {f.destination}</div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {parsed.fields.length === 0 && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>⚠ Could not extract structured data from this PDF. Try uploading a text-based PDF or pasting the data.</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Match to OO (type company name)</label>
              <input
                value={matchCompany}
                onChange={(e) => setMatchCompany(e.target.value)}
                placeholder="e.g. J&J Alvarado LLC"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={applyToOO}
              disabled={applying || !matchCompany.trim()}
              style={{ padding: "10px 22px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {applying ? "Applying…" : "Apply to OO →"}
            </button>
          </div>
          {applyResult && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: applyResult.startsWith("✅") ? "#166534" : "#dc2626" }}>{applyResult}</div>}
        </div>
      )}

      {/* ── Contract result ── */}
      {parsed?.type === "contract" && (
        <div style={{ ...card, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>📜 Subhauler Contract Detected — {filename}</div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
            Extracted fields from the contract. Match to an OO to populate their record and create a draft agreement.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
            {parsed.fields.map((f) => (
              <div key={f.field} style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ ...lbl, color: "#92400e" }}>{f.label} → {f.destination}</div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {parsed.fields.length === 0 && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>⚠ Could not extract structured data. This may be a scanned image — text extraction requires a text-based PDF.</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Match to OO</label>
              <input
                value={matchCompany}
                onChange={(e) => setMatchCompany(e.target.value)}
                placeholder="e.g. Fan Fan Trucking LLC"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={applyToOO}
              disabled={applying || !matchCompany.trim()}
              style={{ padding: "10px 22px", borderRadius: 8, background: "#f59e0b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {applying ? "Applying…" : "Apply to OO →"}
            </button>
          </div>
          {applyResult && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: applyResult.startsWith("✅") ? "#166534" : "#dc2626" }}>{applyResult}</div>}
        </div>
      )}

      {/* ── Unknown file ── */}
      {parsed?.type === "unknown" && (
        <div style={{ ...card, borderLeft: "4px solid #94a3b8" }}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>📄 {parsed.filename}</div>
          <p style={{ fontSize: 12, color: "#64748b" }}>Could not auto-detect document type. Text preview:</p>
          <pre style={{ background: "#f1f5f9", padding: 12, borderRadius: 8, fontSize: 11, color: "#475569", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
            {parsed.text_preview}
          </pre>
        </div>
      )}

      {/* Help card */}
      {!parsed && !parsing && (
        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>What this tool handles</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { icon: "📊", label: "Payout CSV (Indiana format)", desc: "Auto-detects truck groups, OO companies, creates load records + new OOs" },
              { icon: "📋", label: "W-9 PDF", desc: "Extracts company name, EIN, address — applies to the matching OO record" },
              { icon: "📜", label: "Subhauler Contract PDF", desc: "Extracts contact info, USDOT, project, GC — updates OO + draft agreement" },
              { icon: "🛡️", label: "Insurance Certificate", desc: "Coming soon — extracts coverage limits and expiration date" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
