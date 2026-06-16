"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────
type RawRow = Record<string, string>;

type RowReadiness = "ready" | "needs_review" | "critical";

type AnalyzedRow = {
  raw: RawRow;
  readiness: RowReadiness;
  issues: string[];
  driver: string; truck: string; customer: string;
  quantity: number; job_id: string; status: string;
  start_time: string; pickup: string; dropoff: string;
  license_plate: string; vendor: string; material: string;
  rmis_note: string;
};

type FileAnalysis = {
  rows: AnalyzedRow[];
  ready_rows:    AnalyzedRow[];
  review_rows:   AnalyzedRow[];
  critical_rows: AnalyzedRow[];
  date_range: string;
  expected_tickets: number;
  customers: { name: string; rows: number; tickets: number }[];
  warnings: { label: string; count: number; severity: "error" | "warning" }[];
};

type ImportBatch = {
  id: string; import_name: string; source_file_name: string; schedule_date: string;
  total_rows: number; ready_count: number; blocked_count: number; needs_docs_count: number;
  in_progress_count: number; completed_count: number; to_pickup_count: number; to_dropoff_count: number;
  created_at: string;
};

type ImportResult = {
  ok: boolean; import_id: string; jobs_created: number; alerts_created: number;
  compliance_summary: Record<string, number>; dispatch_summary: Record<string, number>;
};

type Alert = {
  id: string; severity: string; alert_type: string; title: string;
  message?: string; recommended_action?: string; status: string; dispatch_job_id: string;
};

// ─── CSV Parser ───────────────────────────────────────────
function parseCSV(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = "", inQ = false;
    for (const c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    values.push(cur.trim());
    const obj: RawRow = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// ─── Row analysis ─────────────────────────────────────────
function analyzeRow(row: RawRow): AnalyzedRow {
  const driver   = row["Driver"]?.trim() || "";
  const truck    = row["Truck Number"]?.trim() || "";
  const customer = row["Customer"]?.trim() || "";
  const quantity = parseFloat(row["Job Quantity"] || "0") || 0;
  const job_id   = row["Friendly Job ID"]?.trim() || "";
  const status   = row["Job Status"]?.trim() || row["Status"]?.trim() || "";
  const license  = row["Equipment License Number"]?.trim() || "";
  const material = row["Material"]?.trim() || "";
  const rmis     = row["See Notes!!"]?.trim() || row["RMIS Notes"]?.trim() || "standard";

  const issues: string[] = [];
  let readiness: RowReadiness = "ready";

  if (!driver && !truck) {
    issues.push("Missing driver and truck");
    readiness = "critical";
  } else {
    if (!driver) { issues.push("Missing driver"); if (readiness !== "critical") readiness = "critical"; }
    if (!truck)  { issues.push("Missing truck number"); if (readiness !== "critical") readiness = "critical"; }
  }

  if (!customer) { issues.push("Missing customer"); if (readiness === "ready") readiness = "needs_review"; }
  if (!license)  { issues.push("No equipment license"); if (readiness === "ready") readiness = "needs_review"; }
  if (!material) { issues.push("No material listed"); if (readiness === "ready") readiness = "needs_review"; }
  if (rmis && rmis.toLowerCase() !== "standard" && rmis !== "") {
    const rLow = rmis.toLowerCase();
    if (rLow.includes("missing")) { issues.push(`RMIS: ${rmis}`); if (readiness === "ready") readiness = "needs_review"; }
  }

  return {
    raw: row, readiness, issues,
    driver, truck, customer, quantity, job_id, status,
    start_time: row["Start Time"]?.trim() || "",
    pickup:  row["Pickup Site Name"]?.trim() || "",
    dropoff: row["Dropoff Site Name"]?.trim() || "",
    license_plate: license, vendor: row["Vendor"]?.trim() || "",
    material, rmis_note: rmis,
  };
}

function analyzeFile(rows: RawRow[], filename: string): FileAnalysis {
  const analyzed = rows.map(analyzeRow);
  const ready    = analyzed.filter(r => r.readiness === "ready");
  const review   = analyzed.filter(r => r.readiness === "needs_review");
  const critical = analyzed.filter(r => r.readiness === "critical");

  const dates = analyzed.map(r => r.start_time).filter(Boolean).sort();
  const dateRange = dates.length
    ? (dates[0].slice(0, 10) === dates[dates.length - 1].slice(0, 10)
      ? dates[0].slice(0, 10)
      : `${dates[0].slice(0, 10)} – ${dates[dates.length - 1].slice(0, 10)}`)
    : "";

  const expectedTickets = analyzed.reduce((s, r) => s + r.quantity, 0);

  const custMap: Record<string, { rows: number; tickets: number }> = {};
  for (const r of analyzed) {
    if (!r.customer) continue;
    if (!custMap[r.customer]) custMap[r.customer] = { rows: 0, tickets: 0 };
    custMap[r.customer].rows++;
    custMap[r.customer].tickets += r.quantity;
  }
  const customers = Object.entries(custMap)
    .sort((a, b) => b[1].rows - a[1].rows)
    .map(([name, v]) => ({ name, ...v }));

  const missingDriver  = analyzed.filter(r => !r.driver).length;
  const missingTruck   = analyzed.filter(r => !r.truck).length;
  const missingBoth    = analyzed.filter(r => !r.driver && !r.truck).length;
  const missingLicense = analyzed.filter(r => !r.license_plate).length;
  const missingMaterial= analyzed.filter(r => !r.material).length;

  const warnings: FileAnalysis["warnings"] = [];
  if (missingBoth)     warnings.push({ label: `Missing both driver and truck`, count: missingBoth, severity: "error" });
  else if (missingDriver) warnings.push({ label: `Missing driver`, count: missingDriver, severity: "error" });
  if (missingTruck && !missingBoth) warnings.push({ label: `Missing truck number`, count: missingTruck, severity: "error" });
  if (missingLicense)  warnings.push({ label: `Missing equipment license`, count: missingLicense, severity: "warning" });
  if (missingMaterial) warnings.push({ label: `Missing material`, count: missingMaterial, severity: "warning" });

  return { rows: analyzed, ready_rows: ready, review_rows: review, critical_rows: critical, date_range: dateRange, expected_tickets: expectedTickets, customers, warnings };
}

// ─── Severity helpers ─────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: "#dc2626", high: "#ea580c", warning: "#ca8a04", low: "#16a34a",
  clear: "#0891b2", verified_pending_match: "#6366f1", inspection_check: "#f59e0b", needs_review: "#64748b",
};
const SEV_BG: Record<string, string> = {
  critical: "#fee2e2", high: "#ffedd5", warning: "#fef9c3",
  low: "#dcfce7", clear: "#e0f2fe", verified_pending_match: "#ede9fe",
  inspection_check: "#fefce8", needs_review: "#f1f5f9",
};
const SEV_LABEL: Record<string, string> = {
  critical: "BLOCKED", high: "NEEDS DOCS", warning: "FOLLOW UP", low: "VERIFY",
  clear: "READY", verified_pending_match: "VERIFY", inspection_check: "INSPECTION?", needs_review: "REVIEW",
};
const STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", in_progress: "#2563eb", to_pickup: "#7c3aed",
  to_dropoff: "#f59e0b", cancelled: "#94a3b8",
};
const READINESS_STYLE: Record<RowReadiness, { color: string; bg: string; label: string }> = {
  ready:        { color: "#166534", bg: "#dcfce7", label: "Ready" },
  needs_review: { color: "#92400e", bg: "#fef9c3", label: "Review" },
  critical:     { color: "#991b1b", bg: "#fee2e2", label: "Missing" },
};

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 };

// ─── Main Page ────────────────────────────────────────────
export default function DailyImportPage() {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [parsing,  setParsing]    = useState(false);
  const [analysis, setAnalysis]   = useState<FileAnalysis | null>(null);
  const [filename, setFilename]   = useState("");
  const [importing, setImporting] = useState<"ready" | "all" | null>(null);
  const [result,   setResult]     = useState<ImportResult | null>(null);
  const [batch,    setBatch]      = useState<ImportBatch | null>(null);
  const [jobs,     setJobs]       = useState<any[]>([]);
  const [alerts,   setAlerts]     = useState<Alert[]>([]);
  const [filter,   setFilter]     = useState("all");
  const [pastImports, setPastImports] = useState<ImportBatch[]>([]);
  const [toast,    setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<RowReadiness | "all">("all");

  function flash(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); }

  useEffect(() => {
    fetch("/api/ronyx/dispatch-import").then(r => r.json()).then(d => setPastImports(d.imports || []));
  }, [result]);

  const processFile = useCallback((file: File) => {
    setParsing(true);
    setResult(null); setBatch(null); setJobs([]); setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) || "";
      const rows = parseCSV(text);
      setAnalysis(analyzeFile(rows, file.name));
      setParsing(false);
    };
    reader.readAsText(file);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  async function runImport(mode: "ready" | "all") {
    if (!analysis) return;
    setImporting(mode);
    const rowsToImport = mode === "ready"
      ? analysis.ready_rows.map(r => r.raw)
      : analysis.rows.map(r => r.raw);

    try {
      const res = await fetch("/api/ronyx/dispatch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows:          rowsToImport,
          file_name:     filename,
          schedule_date: analysis.date_range.split(" – ")[0] || new Date().toISOString().slice(0, 10),
          import_name:   `Dispatch ${analysis.date_range}`,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult(d);
      flash(`✅ ${d.jobs_created} jobs imported — ${d.alerts_created} compliance alerts created.`);
      loadBatch(d.import_id);
    } catch (err: any) {
      flash(err.message || "Import failed", false);
    } finally {
      setImporting(null);
    }
  }

  async function loadBatch(id: string) {
    const res = await fetch(`/api/ronyx/dispatch-import/${id}`);
    const d   = await res.json();
    setBatch(d.batch); setJobs(d.jobs || []); setAlerts(d.alerts || []);
    setResult(null); setAnalysis(null);
  }

  const filteredJobs = jobs.filter(j => {
    if (filter === "all")         return true;
    if (filter === "blocked")     return j.compliance_severity === "critical";
    if (filter === "needs_docs")  return ["high","warning"].includes(j.compliance_severity) && j.compliance_severity !== "critical";
    if (filter === "ready")       return ["clear","low"].includes(j.compliance_severity);
    if (filter === "completed")   return j.dispatch_status === "completed";
    if (filter === "in_progress") return j.dispatch_status === "in_progress";
    if (filter === "to_pickup")   return j.dispatch_status === "to_pickup";
    return true;
  });

  const previewRows = analysis
    ? (previewFilter === "all" ? analysis.rows : analysis.rows.filter(r => r.readiness === previewFilter))
    : [];

  const criticalCount  = jobs.filter(j => j.compliance_severity === "critical").length;
  const needsDocsCount = jobs.filter(j => ["high","warning"].includes(j.compliance_severity) && j.compliance_severity !== "critical").length;
  const readyCount     = jobs.filter(j => ["clear","low"].includes(j.compliance_severity)).length;

  return (
    <div className="ronyx-shell">
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, background: toast.ok ? "#166534" : "#991b1b", color:"#fff", fontSize:13, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", maxWidth:400 }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Dispatch Guard™</p>
          <h1>Daily Dispatch Import</h1>
          <p className="ronyx-muted">Upload the daily RMIS dispatch schedule — auto-classifies compliance notes, analyzes import readiness, and creates staff work queues.</p>
        </div>
      </header>

      {/* Upload zone */}
      {!batch && (
        <div
          style={{ ...card, borderStyle:"dashed", borderWidth:2, borderColor: dragging ? "#3b82f6" : "#cbd5e1", background: dragging ? "#eff6ff" : "#f8fafc", textAlign:"center", padding:"36px 24px", cursor:"pointer" }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
          <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:6 }}>
            {parsing ? "Reading file…" : analysis ? `${analysis.rows.length} rows detected — review readiness below` : "Drop dispatch CSV here or click to browse"}
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>From Tabitha / RMIS daily schedule export</div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) processFile(f); e.target.value=""; }} />
        </div>
      )}

      {/* ── READINESS ANALYSIS ── */}
      {analysis && !batch && (
        <div>
          {/* File header */}
          <div style={{ ...card, borderLeft:"4px solid #2563eb", padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:"1.05rem", color:"#0f172a" }}>📋 {filename}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                  {analysis.rows.length} rows &nbsp;·&nbsp; {analysis.date_range} &nbsp;·&nbsp;
                  {analysis.customers.length} customer{analysis.customers.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
                <button onClick={() => runImport("ready")} disabled={!!importing || analysis.ready_rows.length === 0}
                  style={{ padding:"10px 18px", borderRadius:9, background:"#16a34a", color:"#fff", border:"none", fontWeight:800, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {importing === "ready" ? "Importing…" : `Import ${analysis.ready_rows.length} Ready Rows ✓`}
                </button>
                <button onClick={() => runImport("all")} disabled={!!importing}
                  style={{ padding:"10px 18px", borderRadius:9, background:"#0f172a", color:"#fff", border:"none", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {importing === "all" ? "Importing…" : `Import All ${analysis.rows.length}`}
                </button>
                <button onClick={() => { setAnalysis(null); setFilename(""); }}
                  style={{ padding:"10px 14px", borderRadius:9, background:"#fff", border:"1px solid #e2e8f0", color:"#475569", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  ✕ Clear
                </button>
              </div>
            </div>
          </div>

          {/* Readiness summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12, marginBottom:16 }}>
            {[
              { label:"Ready to Import",    value: analysis.ready_rows.length,    color:"#16a34a", bg:"#f0fdf4", border:"#86efac" },
              { label:"Needs Review",       value: analysis.review_rows.length,   color:"#92400e", bg:"#fef9c3", border:"#fde68a" },
              { label:"Critical — Missing", value: analysis.critical_rows.length, color:"#991b1b", bg:"#fee2e2", border:"#fca5a5" },
              { label:"Expected Tickets",   value: Math.round(analysis.expected_tickets).toLocaleString(), color:"#1e40af", bg:"#eff6ff", border:"#bfdbfe" },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:s.color, fontWeight:700, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div style={{ ...card, padding:"14px 18px", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:10 }}>⚠ Import Warnings</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {analysis.warnings.map(w => (
                  <div key={w.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:7,
                    background: w.severity === "error" ? "#fee2e2" : "#fef9c3",
                    border: `1px solid ${w.severity === "error" ? "#fca5a5" : "#fde68a"}` }}>
                    <span style={{ fontSize:14 }}>{w.severity === "error" ? "🚨" : "⚠"}</span>
                    <div style={{ flex:1, fontSize:12, fontWeight:600, color: w.severity === "error" ? "#991b1b" : "#92400e" }}>
                      {w.label}: <strong>{w.count} rows</strong>
                      {w.severity === "error" && <span style={{ fontWeight:400, marginLeft:6, color:"#64748b" }}>— these rows will go to Needs Review in Dispatch Board</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer breakdown */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:12, marginBottom:16 }}>
            {analysis.customers.map(c => (
              <div key={c.name} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px" }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#0f172a", marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>
                  {c.rows} rows &nbsp;·&nbsp;
                  <span style={{ fontWeight:700, color:"#1d4ed8" }}>{Math.round(c.tickets).toLocaleString()} expected tickets</span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview table with readiness filter */}
          <div style={{ ...card, padding:0, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", display:"flex", gap:6, flexWrap:"wrap" }}>
              {(["all","ready","needs_review","critical"] as const).map(f => (
                <button key={f} onClick={() => setPreviewFilter(f)}
                  style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer",
                    background: previewFilter === f ? "#0f172a" : "#fff",
                    color: previewFilter === f ? "#fff" : "#475569" }}>
                  {f === "all" ? `All (${analysis.rows.length})`
                    : f === "ready" ? `✓ Ready (${analysis.ready_rows.length})`
                    : f === "needs_review" ? `⚠ Review (${analysis.review_rows.length})`
                    : `🚨 Critical (${analysis.critical_rows.length})`}
                </button>
              ))}
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Readiness","Start Time","Truck","Driver","Customer","Pickup → Dropoff","Qty","RMIS"].map(h => (
                      <th key={h} style={{ padding:"7px 10px", color:"#64748b", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 20).map((r, i) => {
                    const rs = READINESS_STYLE[r.readiness];
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", background: r.readiness === "critical" ? "#fff5f5" : r.readiness === "needs_review" ? "#fffbeb" : "#fff" }}>
                        <td style={{ padding:"7px 10px" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <span style={{ fontSize:10, fontWeight:800, color:rs.color, background:rs.bg, borderRadius:5, padding:"2px 7px", whiteSpace:"nowrap", display:"inline-block" }}>{rs.label}</span>
                            {r.issues.slice(0,2).map(iss => (
                              <span key={iss} style={{ fontSize:9, color:"#94a3b8" }}>{iss}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:"7px 10px", color:"#475569", whiteSpace:"nowrap", fontSize:11 }}>{r.start_time.slice(0,16)}</td>
                        <td style={{ padding:"7px 10px", fontWeight:800, color: r.truck ? "#0f172a" : "#dc2626" }}>{r.truck || "—"}</td>
                        <td style={{ padding:"7px 10px", color: r.driver ? "#0f172a" : "#dc2626" }}>
                          <div style={{ fontWeight:600 }}>{r.driver || "—"}</div>
                          {r.vendor && <div style={{ fontSize:10, color:"#94a3b8" }}>{r.vendor}</div>}
                        </td>
                        <td style={{ padding:"7px 10px", color:"#475569", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.customer || "—"}</td>
                        <td style={{ padding:"7px 10px", color:"#64748b", maxWidth:180 }}>
                          <div style={{ fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.pickup || "—"}</div>
                          <div style={{ fontSize:10, color:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>→ {r.dropoff || "—"}</div>
                        </td>
                        <td style={{ padding:"7px 10px", fontWeight:700, color:"#0f172a", textAlign:"right" }}>{r.quantity || "—"}</td>
                        <td style={{ padding:"7px 10px", fontSize:11, color:"#64748b", fontStyle: r.rmis_note && r.rmis_note.toLowerCase() !== "standard" ? "italic" : "normal" }}>
                          {r.rmis_note || "standard"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {previewRows.length > 20 && (
              <div style={{ textAlign:"center", padding:"10px", fontSize:11, color:"#94a3b8", borderTop:"1px solid #f1f5f9" }}>
                … and {previewRows.length - 20} more rows — click Import to process all
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Loaded batch view ── */}
      {batch && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:12, marginBottom:20 }}>
            {[
              { label:"Total Jobs",   value: batch.total_rows,        color:"#0f172a" },
              { label:"Blocked",      value: batch.blocked_count,     color:"#dc2626" },
              { label:"Needs Docs",   value: batch.needs_docs_count,  color:"#ea580c" },
              { label:"Ready",        value: batch.ready_count,       color:"#16a34a" },
              { label:"Completed",    value: batch.completed_count,   color:"#0891b2" },
              { label:"In Progress",  value: batch.in_progress_count, color:"#2563eb" },
              { label:"To Pickup",    value: batch.to_pickup_count,   color:"#7c3aed" },
              { label:"To Dropoff",   value: batch.to_dropoff_count,  color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div style={{ ...card, borderLeft:"4px solid #dc2626", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:12 }}>
                🚨 Dispatch Guard found {alerts.length} compliance issue{alerts.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px", borderRadius:8, background: SEV_BG[a.severity] || "#f8fafc", border:`1px solid ${SEV_COLOR[a.severity] || "#e2e8f0"}22` }}>
                    <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:800, background: SEV_COLOR[a.severity] || "#94a3b8", color:"#fff", whiteSpace:"nowrap", marginTop:1 }}>
                      {SEV_LABEL[a.severity] || a.severity.toUpperCase()}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{a.title}</div>
                      <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{a.message}</div>
                      {a.recommended_action && <div style={{ fontSize:11, color:"#1d4ed8", marginTop:3, fontWeight:600 }}>→ {a.recommended_action}</div>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <button style={{ padding:"5px 10px", borderRadius:6, background:"#fff", border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer" }}>Send Request</button>
                      <button style={{ padding:"5px 10px", borderRadius:6, background:"#fff", border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer", color:"#dc2626" }}>Block</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {[
              { key:"all",         label:`All (${jobs.length})` },
              { key:"blocked",     label:`🚨 Blocked (${criticalCount})` },
              { key:"needs_docs",  label:`⚠ Needs Docs (${needsDocsCount})` },
              { key:"ready",       label:`✅ Ready (${readyCount})` },
              { key:"in_progress", label:`🔵 In Progress (${batch.in_progress_count})` },
              { key:"completed",   label:`✓ Completed (${batch.completed_count})` },
              { key:"to_pickup",   label:`📍 To Pickup (${batch.to_pickup_count})` },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0", background: filter === f.key ? "#0f172a" : "#fff", color: filter === f.key ? "#fff" : "#475569", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ ...card, padding:0, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Status","Truck","Driver","Phone","Job ID","Pickup → Dropoff","Loads","Material","Compliance"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j: any) => (
                    <tr key={j.id} style={{ borderBottom:"1px solid #f1f5f9", background: j.compliance_severity === "critical" ? "#fff5f5" : "transparent" }}>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:800, color: STATUS_COLOR[j.dispatch_status] || "#64748b", background: (STATUS_COLOR[j.dispatch_status] || "#64748b") + "18", padding:"3px 7px", borderRadius:5 }}>
                          {j.dispatch_status?.replace(/_/g," ").toUpperCase() || "—"}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:800, color:"#0f172a" }}>{j.truck_number || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#0f172a" }}>
                        <div style={{ fontWeight:600 }}>{j.driver_name || "—"}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{j.vendor_name || ""}</div>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#475569", whiteSpace:"nowrap" }}>{j.driver_phone || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#6366f1", fontWeight:700, whiteSpace:"nowrap" }}>{j.friendly_job_id || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569", maxWidth:220 }}>
                        <div style={{ fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{j.pickup_site_name || "—"}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>→ {j.dropoff_site_name || "—"}</div>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:"#0f172a", textAlign:"right" }}>{j.job_quantity ?? "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569", fontSize:12 }}>{j.material || "—"}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:800, color: SEV_COLOR[j.compliance_severity] || "#64748b", background: (SEV_COLOR[j.compliance_severity] || "#64748b") + "18", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap", display:"inline-block" }}>
                          {SEV_LABEL[j.compliance_severity] || j.compliance_status?.toUpperCase()}
                        </span>
                        {j.compliance_issue && <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{j.compliance_issue}</div>}
                        {j.rmis_note && j.rmis_note.toLowerCase() !== "standard" && (
                          <div style={{ fontSize:10, color:"#94a3b8", fontStyle:"italic", marginTop:1 }}>{j.rmis_note}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredJobs.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 24px", color:"#94a3b8", fontSize:13 }}>No jobs match this filter.</div>
            )}
          </div>

          <button onClick={() => { setBatch(null); setJobs([]); setAlerts([]); setFilter("all"); }}
            style={{ padding:"9px 18px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#475569", fontWeight:700, fontSize:13, cursor:"pointer", marginTop:8 }}>
            ← Upload New Schedule
          </button>
        </div>
      )}

      {/* Past imports */}
      {!batch && !analysis && pastImports.length > 0 && (
        <div style={{ ...card, marginTop:8 }}>
          <div style={{ fontWeight:700, color:"#0f172a", marginBottom:12, fontSize:"0.9rem" }}>Past Imports</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {pastImports.map(imp => (
              <div key={imp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{imp.import_name}</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>
                    {imp.total_rows} jobs &nbsp;·&nbsp;
                    {imp.blocked_count ? <span style={{ color:"#dc2626", fontWeight:700 }}>{imp.blocked_count} blocked &nbsp;·&nbsp;</span> : null}
                    {new Date(imp.created_at).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => loadBatch(imp.id)}
                  style={{ padding:"7px 14px", borderRadius:7, background:"#0f172a", color:"#fff", border:"none", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  View →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
