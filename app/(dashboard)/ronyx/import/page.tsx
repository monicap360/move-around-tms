"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type DispatchRow = {
  start_time: string; dispatch_number: string; vendor: string; driver: string;
  phone: string; equipment_type: string; truck_number: string; truck_id: string;
  license_plate: string; customer: string; pickup_site: string; dropoff_site: string;
  job_service: string; job_status: string; quantity: string; unit: string;
  material: string; job_id: string; status: string;
};

type ParsedDoc =
  | { type: "payout_csv";   project: string; week_start: string; week_end: string; summaries: OOSummary[]; loads: ParsedLoad[]; grand_total: number }
  | { type: "dispatch_csv"; rows: DispatchRow[]; date: string; driver_count: number; truck_count: number; customers: string[] }
  | { type: "w9";           fields: ExtractedField[] }
  | { type: "contract";     fields: ExtractedField[] }
  | { type: "image";        filename: string }
  | { type: "unknown";      filename: string; text_preview: string; routing_hint?: string };

type UploadMeta = {
  upload_id:    string | null;
  routing_hint: string;
  module:       string;
  url:          string | null;
  db_tracked:   boolean;
};

// ─── Quoted CSV splitter ──────────────────────────────────
function splitCSVRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

// ─── Dispatch Schedule CSV detection + parser ─────────────
function isDispatchScheduleCSV(text: string): boolean {
  const firstLine = text.split(/\r?\n/)[0].toLowerCase();
  return (
    firstLine.includes("start time") &&
    firstLine.includes("driver") &&
    (firstLine.includes("truck number") || firstLine.includes("dispatch number"))
  );
}

function parseDispatchScheduleCSV(text: string): { rows: DispatchRow[]; date: string; driver_count: number; truck_count: number; customers: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], date: "", driver_count: 0, truck_count: 0, customers: [] };
  const headers = splitCSVRow(lines[0]);
  const rows: DispatchRow[] = lines.slice(1).map(line => {
    const vals = splitCSVRow(line);
    const get = (h: string) => vals[headers.indexOf(h)] ?? "";
    return {
      start_time:     get("Start Time"),
      dispatch_number:get("Dispatch Number"),
      vendor:         get("Vendor"),
      driver:         get("Driver"),
      phone:          get("Phone"),
      equipment_type: get("Requested Equipment Type Name"),
      truck_number:   get("Truck Number"),
      truck_id:       get("Truck ID"),
      license_plate:  get("Equipment License Number"),
      customer:       get("Customer"),
      pickup_site:    get("Pickup Site Name"),
      dropoff_site:   get("Dropoff Site Name"),
      job_service:    get("Job Service"),
      job_status:     get("Job Status"),
      quantity:       get("Job Quantity"),
      unit:           get("Job Quantity Unit"),
      material:       get("Material"),
      job_id:         get("Friendly Job ID"),
      status:         get("Status"),
    };
  }).filter(r => r.start_time || r.driver || r.truck_number);

  const firstDate = rows[0]?.start_time?.split(" ")[0] || "";
  const drivers  = new Set(rows.map(r => r.driver).filter(Boolean));
  const trucks   = new Set(rows.map(r => r.truck_number).filter(Boolean));
  const custs    = [...new Set(rows.map(r => r.customer).filter(Boolean))];
  return { rows, date: firstDate, driver_count: drivers.size, truck_count: trucks.size, customers: custs };
}

// ─── CSV Payout Parser ────────────────────────────────────
function parsePayoutCSV(text: string): ParsedLoad[] {
  const lines = text.split("\n").map((l) => splitCSVRow(l));
  const loads: ParsedLoad[] = [];
  const truckOO: Record<string, string> = {};
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  for (const cols of lines) {
    const dateStr  = cols[0]?.trim();
    const truckRaw = cols[7]?.trim();
    if (!dateRe.test(dateStr) || !truckRaw) continue;

    const truckMatch = truckRaw.match(/^(\d{4,5})/);
    if (!truckMatch) continue;
    const truck = truckMatch[1];

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

// ─── Text document parsers ────────────────────────────────
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
  const subhaulerMatch = text.match(/SUB-HAULER[:\s]+([A-Z][^\n]{3,60})/i)
    || text.match(/SUBHAULER[:\s]+([A-Z][^\n]{3,60})/i);
  const attnMatch  = text.match(/ATTN[:\s]+([^\n]{2,60})/i);
  const phoneMatch = text.match(/(?:Phone|Tel|Ph)[:\s]+([\d\s\-\(\)\.]{7,20})/i);
  const emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const usdotMatch = text.match(/USDOT[#\s:]*(\d{4,8})/i);
  const einMatch   = text.match(/(?:EIN|Tax ID)[#\s:]*(\d{2}-\d{7})/i);
  const gcMatch    = text.match(/(?:General Contractor|GC)[:\s]+([A-Z][^\n]{3,60})/i);
  const projMatch  = text.match(/Project[:\s]+([^\n]{3,60})/i);
  const addrMatch  = text.match(/(\d{1,5}\s+\w[\w\s]+(?:St|Ave|Hwy|Dr|Blvd|Rd|Ln)[^\n]{0,40})/i);
  const dateMatch  = text.match(/(?:Commencement|Start Date|effective)[^\n]*?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);

  if (subhaulerMatch) fields.push({ label: "Subhauler Company",   value: subhaulerMatch[1].trim(), destination: "OO",        field: "company_name" });
  if (attnMatch)      fields.push({ label: "Contact Name (ATTN)", value: attnMatch[1].trim(),      destination: "OO",        field: "contact_name" });
  if (phoneMatch)     fields.push({ label: "Phone",               value: phoneMatch[1].trim(),     destination: "OO",        field: "contact_phone" });
  if (emailMatch)     fields.push({ label: "Email",               value: emailMatch[0],            destination: "OO",        field: "contact_email" });
  if (usdotMatch)     fields.push({ label: "USDOT#",              value: usdotMatch[1],            destination: "OO",        field: "dot_number" });
  if (einMatch)       fields.push({ label: "EIN",                 value: einMatch[1],              destination: "OO",        field: "ein" });
  if (addrMatch)      fields.push({ label: "Address",             value: addrMatch[1].trim(),      destination: "OO",        field: "business_address" });
  if (gcMatch)        fields.push({ label: "General Contractor",  value: gcMatch[1]?.trim() || "", destination: "Agreement", field: "gc_name" });
  if (projMatch)      fields.push({ label: "Project",             value: projMatch[1]?.trim() || "", destination: "Agreement", field: "project_name" });
  if (dateMatch)      fields.push({ label: "Start Date",          value: dateMatch[1],             destination: "Agreement", field: "commencement_date" });
  return fields;
}

// ─── File reader ──────────────────────────────────────────
async function readFileText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = (e) => res((e.target?.result as string) || "");
    reader.onerror = rej;
    reader.readAsText(file);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp|tiff)$/i.test(file.name);
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function parseDocument(file: File): Promise<ParsedDoc> {
  // Image files — no text extraction, just show the image
  if (isImageFile(file)) {
    return { type: "image", filename: file.name };
  }

  // PDFs — try to read as text (works for text-based PDFs, fails for scanned)
  if (isPdfFile(file)) {
    const text = await readFileText(file);
    const lowerText = text.toLowerCase();
    if (lowerText.includes("taxpayer identification") || lowerText.includes("form w-9") || lowerText.includes("w-9")) {
      const fields = extractW9Fields(text);
      if (fields.length > 0) return { type: "w9", fields };
    }
    if (lowerText.includes("sub-hauler") || lowerText.includes("subhauler") || lowerText.includes("hauling agreement") || lowerText.includes("exhibit a")) {
      const fields = extractContractFields(text);
      if (fields.length > 0) return { type: "contract", fields };
    }
    // PDF but couldn't extract structured data — just show the PDF in the iframe
    return { type: "unknown", filename: file.name, text_preview: "" };
  }

  // CSV / text
  const text = await readFileText(file);

  // Check for Daily Dispatch Schedule CSV BEFORE payout parser
  if (isDispatchScheduleCSV(text)) {
    const result = parseDispatchScheduleCSV(text);
    return { type: "dispatch_csv", ...result };
  }

  const loads = parsePayoutCSV(text);
  if (loads.length > 0) {
    const summaries  = summariseLoads(loads);
    const dates      = loads.map((l) => new Date(l.load_date)).sort((a, b) => a.getTime() - b.getTime());
    const week_start = dates[0]?.toLocaleDateString() || "";
    const week_end   = dates[dates.length - 1]?.toLocaleDateString() || "";
    const grand_total = summaries.reduce((s, o) => s + o.total, 0);
    return { type: "payout_csv", project: "Domino Project", week_start, week_end, summaries, loads, grand_total };
  }

  const lowerText = text.toLowerCase();
  if (lowerText.includes("taxpayer identification") || lowerText.includes("w-9")) {
    return { type: "w9", fields: extractW9Fields(text) };
  }
  if (lowerText.includes("sub-hauler") || lowerText.includes("subhauler")) {
    return { type: "contract", fields: extractContractFields(text) };
  }

  return { type: "unknown", filename: file.name, text_preview: text.slice(0, 400), routing_hint: undefined };
}

const ROUTING_LABELS: Record<string, { label: string; icon: string; color: string; href: string }> = {
  "dispatch-import":    { label: "Dispatch Guard Import",     icon: "📋", color: "#2563eb", href: "/ronyx/dispatch/daily-import" },
  "payout-import":      { label: "Payout Import",             icon: "💰", color: "#16a34a", href: "/ronyx/import" },
  "oo-w9":              { label: "OO W-9 Document",           icon: "📋", color: "#6366f1", href: "/ronyx/owner-operators" },
  "oo-compliance-doc":  { label: "OO Compliance Document",    icon: "🛡️", color: "#dc2626", href: "/ronyx/owner-operators" },
  "oo-contract":        { label: "OO Subhauler Contract",     icon: "📜", color: "#7c3aed", href: "/ronyx/owner-operators" },
  "ticket-scan":        { label: "Ticket / Fast Scan",        icon: "⚡", color: "#d97706", href: "/ronyx/tickets?tab=fastscan" },
  "driver-doc":         { label: "Driver Document",           icon: "👤", color: "#0891b2", href: "/ronyx/drivers" },
  "general":            { label: "General File — Backup Center", icon: "📄", color: "#64748b", href: "/ronyx/backup" },
};

// ─── Styles ───────────────────────────────────────────────
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 };
const lbl: React.CSSProperties  = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };

// ─── Main Page ─────────────────────────────────────────────
export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [parsing,   setParsing]   = useState(false);
  const [parsed,    setParsed]    = useState<ParsedDoc | null>(null);
  const [filename,  setFilename]  = useState("");
  const [fileSize,  setFileSize]  = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | "none">("none");
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);

  // W-9 / contract apply state
  const [ooList,       setOoList]       = useState<Array<{ id: string; company_name: string }>>([]);
  const [matchCompany, setMatchCompany] = useState("");
  const [applying,     setApplying]     = useState(false);
  const [applyResult,  setApplyResult]  = useState<string>("");

  // Load OO companies for dropdown
  useEffect(() => {
    fetch("/api/ronyx/owner-operators")
      .then((r) => r.json())
      .then(({ companies }) => setOoList((companies || []).map((c: any) => ({ id: c.id, company_name: c.company_name }))))
      .catch(() => {});
  }, []);

  function flash(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); }

  const processFile = useCallback(async (file: File) => {
    setParsing(true);
    setParsed(null);
    setFilename(file.name);
    setFileSize(file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`);
    setMatchCompany("");
    setApplyResult("");
    setUploadMeta(null);

    // Revoke old preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (isImageFile(file)) {
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewType("image");
    } else if (isPdfFile(file)) {
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewType("pdf");
    } else {
      setPreviewUrl(null);
      setPreviewType("none");
    }

    try {
      // Upload to storage + parse in parallel
      const [uploadResult, docResult] = await Promise.allSettled([
        (async () => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
          if (!res.ok) return null;
          return await res.json();
        })(),
        parseDocument(file),
      ]);

      if (uploadResult.status === "fulfilled" && uploadResult.value?.ok) {
        const d = uploadResult.value;
        setUploadMeta({
          upload_id:    d.upload_id || null,
          routing_hint: d.routing_hint || "general",
          module:       d.module || "general",
          url:          d.url || null,
          db_tracked:   d.db_tracked ?? false,
        });
      }

      if (docResult.status === "fulfilled") {
        setParsed(docResult.value);
      } else {
        flash("Could not parse file — stored but content unreadable.", false);
      }
    } catch {
      flash("Could not process file.", false);
    } finally {
      setParsing(false);
    }
  }, [previewUrl]);

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
          original_upload_id: uploadMeta?.upload_id,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash(`✅ ${d.jobs_created} loads imported — ${d.oos_created} new OOs, ${d.oos_matched} matched.`);
    } catch (err: any) {
      flash(err.message || "Import failed", false);
    } finally {
      setImporting(false);
    }
  }

  async function applyToOO() {
    if (!parsed || (parsed.type !== "w9" && parsed.type !== "contract")) return;
    if (!matchCompany.trim()) { flash("Select or type an OO company name.", false); return; }
    setApplying(true);
    setApplyResult("");
    try {
      const res  = await fetch(`/api/ronyx/owner-operators`);
      const data = await res.json();
      const oo   = (data.companies || []).find((c: any) =>
        c.company_name.toLowerCase().includes(matchCompany.toLowerCase()) ||
        matchCompany.toLowerCase().includes(c.company_name.toLowerCase())
      );
      if (!oo) throw new Error(`No OO found matching "${matchCompany}"`);

      const patch: Record<string, string> = {};
      for (const f of parsed.fields) {
        if (f.destination === "OO" && f.field !== "business_address_city" && f.field !== "w9_signed_date") {
          const current = oo[f.field];
          if (!current || String(current).trim() === "") {
            patch[f.field] = f.value;
          }
        }
      }

      const skipped = parsed.fields
        .filter((f) => f.destination === "OO" && !patch[f.field] && oo[f.field])
        .map((f) => f.label);

      await fetch(`/api/ronyx/owner-operators/${oo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, _original_upload_id: uploadMeta?.upload_id }),
      });

      const skippedNote = skipped.length ? ` (${skipped.length} fields skipped — already had data)` : "";
      setApplyResult(`✅ Updated ${oo.company_name}: ${Object.keys(patch).join(", ")}${skippedNote}`);
      flash(`✅ ${oo.company_name} updated.${skippedNote}`);
    } catch (err: any) {
      setApplyResult(`❌ ${err.message}`);
      flash(err.message || "Apply failed", false);
    } finally {
      setApplying(false);
    }
  }

  const routing = uploadMeta ? (ROUTING_LABELS[uploadMeta.routing_hint] || ROUTING_LABELS["general"]) : null;

  return (
    <div className="ronyx-shell">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: 420 }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Smart Import</p>
          <h1>Smart Document Upload</h1>
          <p className="ronyx-muted">Drop any file — payout CSVs, W-9s, contracts, COIs, dispatch schedules — and the system reads it and puts data in the right place.</p>
        </div>
      </header>

      {/* Drop zone */}
      <div
        style={{ ...card, borderStyle: "dashed", borderWidth: 2, borderColor: dragging ? "#3b82f6" : "#cbd5e1", background: dragging ? "#eff6ff" : "#f8fafc", textAlign: "center", padding: "48px 24px", cursor: "pointer", transition: "all 150ms" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !parsing && fileRef.current?.click()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>{parsing ? "⏳" : dragging ? "📂" : "📤"}</div>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", marginBottom: 6 }}>
          {parsing ? "Reading and storing file…" : "Drop any file here or click to browse"}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          CSV · PDF · Excel · Images · Word docs · All file types supported
        </div>
        <input ref={fileRef} type="file" accept="*" style={{ display: "none" }} onChange={onFileChange} disabled={parsing} />
      </div>

      {/* ── File Preview ── */}
      {(previewUrl || filename) && !parsing && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>
                {previewType === "image" ? "🖼️" : previewType === "pdf" ? "📄" : parsed?.type === "payout_csv" ? "📊" : "📁"}
              </span>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{filename}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{fileSize}</div>
              </div>
            </div>
            {/* Routing badge */}
            {routing && (
              <a href={routing.href} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: routing.color + "15", color: routing.color, border: `1px solid ${routing.color}30`, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                {routing.icon} {routing.label} →
              </a>
            )}
            {uploadMeta && !uploadMeta.upload_id && (
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>⚠ File stored but not tracked in Backup Center</span>
            )}
            {uploadMeta?.upload_id && (
              <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>🔒 Preserved in Backup Center</span>
            )}
          </div>

          {/* Image preview */}
          {previewType === "image" && previewUrl && (
            <div style={{ padding: 20, background: "#0f172a", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={filename} style={{ maxWidth: "100%", maxHeight: 480, borderRadius: 8, objectFit: "contain" }} />
            </div>
          )}

          {/* PDF preview */}
          {previewType === "pdf" && previewUrl && (
            <div style={{ background: "#1e293b" }}>
              <iframe
                src={previewUrl + "#toolbar=0&navpanes=0"}
                title={filename}
                style={{ width: "100%", height: 500, border: "none", display: "block" }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── File stored notice ── */}
      {uploadMeta?.upload_id && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#166534", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🔒</span>
          <span><strong>Original file preserved</strong> — {filename} stored as read-only source evidence. <a href="/ronyx/backup" style={{ color:"#16a34a", fontWeight:700 }}>View in Backup Center →</a></span>
        </div>
      )}

      {/* ── DISPATCH CSV result ── */}
      {parsed?.type === "dispatch_csv" && (
        <div style={{ ...card, borderLeft: "4px solid #2563eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>📋 Daily Dispatch Schedule Detected</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                📅 {parsed.date} &nbsp;·&nbsp;
                {parsed.rows.length} jobs &nbsp;·&nbsp;
                {parsed.driver_count} drivers &nbsp;·&nbsp;
                {parsed.truck_count} trucks &nbsp;·&nbsp;
                {parsed.customers.length} customers
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`/ronyx/dispatch/daily-import`}
                style={{ padding: "10px 20px", borderRadius: 9, background: "#1e40af", color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
                Open in Dispatch Guard →
              </a>
            </div>
          </div>

          {/* Customer breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
            {parsed.customers.map(c => {
              const cRows = parsed.rows.filter(r => r.customer === c);
              const totalLoads = cRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
              return (
                <div key={c} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#1e40af", marginBottom: 4 }}>{c}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{cRows.length} rows · {totalLoads.toLocaleString()} expected tickets</div>
                </div>
              );
            })}
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, marginBottom: 14 }}>
            {[
              { label: "Missing Driver", count: parsed.rows.filter(r => !r.driver).length, color: "#dc2626", bg: "#fee2e2" },
              { label: "Missing Truck",  count: parsed.rows.filter(r => !r.truck_number).length, color: "#ea580c", bg: "#ffedd5" },
              { label: "Missing License", count: parsed.rows.filter(r => !r.license_plate).length, color: "#ca8a04", bg: "#fef9c3" },
            ].filter(s => s.count > 0).map(s => (
              <span key={s.label} style={{ padding: "3px 10px", borderRadius: 6, background: s.bg, color: s.color, fontWeight: 700 }}>
                ⚠ {s.label}: {s.count} rows
              </span>
            ))}
            <span style={{ padding: "3px 10px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontWeight: 700 }}>
              🎫 {parsed.rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0).toLocaleString()} expected tickets
            </span>
          </div>

          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af" }}>
            <strong>Next step:</strong> Drop this file directly on the <a href="/ronyx/dispatch/daily-import" style={{ color: "#1d4ed8", fontWeight: 700 }}>Dispatch Guard Import page</a> for readiness analysis, RMIS compliance classification, and staff task creation.
          </div>
        </div>
      )}

      {/* ── PAYOUT CSV result ── */}
      {parsed?.type === "payout_csv" && (
        <div>
          <div style={{ ...card, borderLeft: "4px solid #22c55e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>✅ Payout Sheet Detected</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  📅 {parsed.week_start} – {parsed.week_end} &nbsp;·&nbsp;
                  🏢 {parsed.summaries.length} OO companies &nbsp;·&nbsp;
                  📦 {parsed.loads.length} load records &nbsp;·&nbsp;
                  💰 ${parsed.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                </div>
              </div>
              <button
                onClick={importPayout}
                disabled={importing}
                style={{ padding: "10px 24px", borderRadius: 10, background: "#0f172a", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", minWidth: 160 }}
              >
                {importing ? "Importing…" : `Import ${parsed.loads.length} Loads →`}
              </button>
            </div>

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
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>📋 W-9 Detected</div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
            {parsed.fields.length > 0 ? "Fields extracted below. Select the matching OO to apply data." : "Scanned/image PDF — could not extract text. File is preserved in Backup Center."}
          </p>

          {parsed.fields.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
              {parsed.fields.map((f) => (
                <div key={f.field} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={lbl}>{f.label} → {f.destination}</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{f.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={lbl}>Apply to OO</label>
              <input
                list="oo-list"
                value={matchCompany}
                onChange={(e) => setMatchCompany(e.target.value)}
                placeholder="Type or select OO company…"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
              <datalist id="oo-list">
                {ooList.map((oo) => <option key={oo.id} value={oo.company_name} />)}
              </datalist>
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
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>📜 Subhauler Contract Detected</div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
            {parsed.fields.length > 0 ? "Extracted fields below. Select the OO to update." : "Scanned/image PDF — could not extract text. File preserved in Backup Center."}
          </p>

          {parsed.fields.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
              {parsed.fields.map((f) => (
                <div key={f.field} style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ ...lbl, color: "#92400e" }}>{f.label} → {f.destination}</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{f.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={lbl}>Apply to OO</label>
              <input
                list="oo-list-contract"
                value={matchCompany}
                onChange={(e) => setMatchCompany(e.target.value)}
                placeholder="Type or select OO company…"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
              <datalist id="oo-list-contract">
                {ooList.map((oo) => <option key={oo.id} value={oo.company_name} />)}
              </datalist>
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

      {/* ── Image file ── */}
      {parsed?.type === "image" && (
        <div style={{ ...card, borderLeft: "4px solid #0891b2" }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>🖼️ Image Uploaded — {filename}</div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
            Image file preserved in Backup Center. To extract data from a ticket or COI image, use Fast Scan.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/ronyx/tickets?tab=fastscan" style={{ padding: "8px 18px", borderRadius: 8, background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Open Fast Scan →
            </a>
            <a href="/ronyx/backup" style={{ padding: "8px 18px", borderRadius: 8, background: "#f1f5f9", color: "#0f172a", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              View in Backup Center
            </a>
          </div>
        </div>
      )}

      {/* ── Unknown file ── */}
      {parsed?.type === "unknown" && (
        <div style={{ ...card, borderLeft: "4px solid #94a3b8" }}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>📄 {parsed.filename}</div>
          {parsed.text_preview ? (
            <>
              <p style={{ fontSize: 12, color: "#64748b" }}>Could not auto-detect document type. Text preview:</p>
              <pre style={{ background: "#f1f5f9", padding: 12, borderRadius: 8, fontSize: 11, color: "#475569", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                {parsed.text_preview}
              </pre>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "#64748b" }}>File preserved in Backup Center. PDF is scanned or image-based — data extraction requires a text-based PDF.</p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <a href="/ronyx/backup" style={{ padding: "8px 18px", borderRadius: 8, background: "#f1f5f9", color: "#0f172a", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>View in Backup Center →</a>
          </div>
        </div>
      )}

      {/* Help card — shown only when nothing uploaded yet */}
      {!parsed && !parsing && !filename && (
        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>What this tool handles</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { icon: "📊", label: "Payout CSV",         desc: "Auto-detects truck groups, OO companies, creates load records and new OOs" },
              { icon: "📋", label: "W-9 PDF",            desc: "Extracts company name, EIN, address — applies to the matching OO record" },
              { icon: "📜", label: "Subhauler Contract", desc: "Extracts contact info, USDOT, project, GC — updates OO + draft agreement" },
              { icon: "🛡️", label: "COI / Insurance",   desc: "Upload to OO record — preserved in Backup Center with file link" },
              { icon: "🖼️", label: "Ticket Images",      desc: "Preserved and routed to Fast Scan for OCR processing" },
              { icon: "📋", label: "Dispatch CSV",       desc: "Routes to Dispatch Guard — daily schedule import and RMIS compliance" },
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
