"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────
type DispatchJob = {
  id:                      string;
  start_time?:             string | null;
  truck_number?:           string | null;
  vendor_name?:            string | null;
  driver_name?:            string | null;
  driver_phone?:           string | null;
  rmis_note?:              string | null;
  rmis_status:             string;
  compliance_status:       string;
  compliance_severity:     string;
  compliance_issue?:       string | null;
  compliance_action?:      string | null;
  customer_name?:          string | null;
  pickup_site_name?:       string | null;
  dropoff_site_name?:      string | null;
  job_service?:            string | null;
  job_status?:             string | null;
  dispatch_status:         string;
  job_quantity?:           number | null;
  material?:               string | null;
  friendly_job_id?:        string | null;
  expected_ticket_count?:  number;
  scanned_ticket_count?:   number;
  payroll_status:          string;
};

type ImportBatch = {
  id:               string;
  import_name:      string;
  source_file_name: string;
  schedule_date:    string;
  total_rows:       number;
  ready_count:      number;
  blocked_count:    number;
  needs_docs_count: number;
  in_progress_count: number;
  completed_count:  number;
  to_pickup_count:  number;
  to_dropoff_count: number;
  created_at:       string;
};

type Alert = {
  id:                 string;
  severity:           string;
  alert_type:         string;
  title:              string;
  message?:           string;
  recommended_action?: string;
  status:             string;
  dispatch_job_id:    string;
};

type ImportResult = {
  ok:                  boolean;
  import_id:           string;
  jobs_created:        number;
  alerts_created:      number;
  compliance_summary:  Record<string, number>;
  dispatch_summary:    Record<string, number>;
};

// ─── CSV Parser ───────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines  = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas
    const values: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    values.push(cur.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v));
}

// ─── Severity helpers ─────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical:             "#dc2626",
  high:                 "#ea580c",
  warning:              "#ca8a04",
  low:                  "#16a34a",
  clear:                "#0891b2",
  verified_pending_match: "#6366f1",
  inspection_check:     "#f59e0b",
  needs_review:         "#64748b",
};
const SEV_BG: Record<string, string> = {
  critical: "#fee2e2", high: "#ffedd5", warning: "#fef9c3",
  low: "#dcfce7", clear: "#e0f2fe", verified_pending_match: "#ede9fe",
  inspection_check: "#fefce8", needs_review: "#f1f5f9",
};
const SEV_LABEL: Record<string, string> = {
  critical: "BLOCKED", high: "NEEDS DOCS", warning: "FOLLOW UP",
  low: "VERIFY", clear: "READY", verified_pending_match: "VERIFY",
  inspection_check: "INSPECTION?", needs_review: "REVIEW", unknown: "UNKNOWN",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", in_progress: "#2563eb",
  to_pickup: "#7c3aed", to_dropoff: "#f59e0b",
  cancelled: "#94a3b8", unknown: "#64748b",
};

// ─── Styles ───────────────────────────────────────────────
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 };

// ─── Main Page ────────────────────────────────────────────
export default function DailyImportPage() {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]     = useState(false);
  const [parsing,  setParsing]      = useState(false);
  const [preview,  setPreview]      = useState<Record<string, string>[]>([]);
  const [filename, setFilename]     = useState("");
  const [importing, setImporting]   = useState(false);
  const [result,   setResult]       = useState<ImportResult | null>(null);
  const [batch,    setBatch]        = useState<ImportBatch | null>(null);
  const [jobs,     setJobs]         = useState<DispatchJob[]>([]);
  const [alerts,   setAlerts]       = useState<Alert[]>([]);
  const [filter,   setFilter]       = useState<string>("all");
  const [pastImports, setPastImports] = useState<ImportBatch[]>([]);
  const [toast,    setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  function flash(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); }

  useEffect(() => {
    fetch("/api/ronyx/dispatch-import")
      .then((r) => r.json())
      .then((d) => setPastImports(d.imports || []));
  }, [result]);

  const processFile = useCallback((file: File) => {
    setParsing(true);
    setResult(null);
    setBatch(null);
    setJobs([]);
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const rows = parseCSV(text);
      setPreview(rows);
      setParsing(false);
    };
    reader.readAsText(file);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  async function runImport() {
    if (!preview.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/ronyx/dispatch-import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          rows:          preview,
          file_name:     filename,
          schedule_date: new Date().toISOString().split("T")[0],
          import_name:   `Dispatch ${new Date().toLocaleDateString()}`,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult(d);
      flash(`✅ ${d.jobs_created} jobs imported — ${d.alerts_created} compliance alerts created.`);
      // Load the detail
      loadBatch(d.import_id);
    } catch (err: any) {
      flash(err.message || "Import failed", false);
    } finally {
      setImporting(false);
    }
  }

  async function loadBatch(id: string) {
    const res = await fetch(`/api/ronyx/dispatch-import/${id}`);
    const d   = await res.json();
    setBatch(d.batch);
    setJobs(d.jobs || []);
    setAlerts(d.alerts || []);
    setResult(null);
    setPreview([]);
  }

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    if (filter === "all")          return true;
    if (filter === "blocked")      return j.compliance_severity === "critical";
    if (filter === "needs_docs")   return ["high", "warning"].includes(j.compliance_severity) && j.compliance_severity !== "critical";
    if (filter === "ready")        return ["clear", "low"].includes(j.compliance_severity);
    if (filter === "in_progress")  return j.dispatch_status === "in_progress";
    if (filter === "completed")    return j.dispatch_status === "completed";
    if (filter === "to_pickup")    return j.dispatch_status === "to_pickup";
    return true;
  });

  const criticalCount = jobs.filter((j) => j.compliance_severity === "critical").length;
  const needsDocsCount = jobs.filter((j) => ["high","warning"].includes(j.compliance_severity) && j.compliance_severity !== "critical").length;
  const readyCount     = jobs.filter((j) => ["clear","low"].includes(j.compliance_severity)).length;

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
          <p className="ronyx-muted">Upload the daily RMIS dispatch schedule to auto-classify compliance notes, create staff work queues, and connect to ticket scanning.</p>
        </div>
      </header>

      {/* Upload zone — only show if no batch loaded */}
      {!batch && (
        <div
          style={{ ...card, borderStyle:"dashed", borderWidth:2, borderColor: dragging ? "#3b82f6" : "#cbd5e1", background: dragging ? "#eff6ff" : "#f8fafc", textAlign:"center", padding:"40px 24px", cursor:"pointer" }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
          <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:6 }}>
            {parsing ? "Reading file…" : preview.length ? `${preview.length} rows ready — click Import below` : "Drop dispatch CSV here or click to browse"}
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>From Tabitha / RMIS daily schedule export</div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
            onChange={(e) => { const f=e.target.files?.[0]; if(f) processFile(f); e.target.value=""; }} />
        </div>
      )}

      {/* Preview header */}
      {preview.length > 0 && !batch && (
        <div style={{ ...card, borderLeft:"4px solid #2563eb" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:"1.05rem", color:"#0f172a" }}>📋 {filename}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                {preview.length} rows detected &nbsp;·&nbsp;
                {new Set(preview.map((r) => r["Driver"]?.trim()).filter(Boolean)).size} drivers &nbsp;·&nbsp;
                {new Set(preview.map((r) => r["Truck Number"]?.trim()).filter(Boolean)).size} trucks &nbsp;·&nbsp;
                {new Set(preview.map((r) => r["Vendor"]?.trim() || r["Carrier"]?.trim()).filter(Boolean)).size} vendors
              </div>
            </div>
            <button
              onClick={runImport}
              disabled={importing}
              style={{ padding:"11px 28px", borderRadius:10, background:"#0f172a", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer" }}
            >
              {importing ? "Importing…" : `Import ${preview.length} Jobs`}
            </button>
          </div>
          {/* Quick preview table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f1f5f9", textAlign:"left" }}>
                  {["Start Time","Truck","Driver","Status","Customer","Pickup","Dropoff","Loads","RMIS Note"].map((h) => (
                    <th key={h} style={{ padding:"5px 8px", color:"#64748b", fontWeight:700, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((r, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                    <td style={{ padding:"6px 8px", color:"#475569", whiteSpace:"nowrap" }}>{r["Start Time"]}</td>
                    <td style={{ padding:"6px 8px", fontWeight:700, color:"#0f172a" }}>{r["Truck Number"]}</td>
                    <td style={{ padding:"6px 8px", color:"#0f172a" }}>{r["Driver"]}</td>
                    <td style={{ padding:"6px 8px" }}>
                      <span style={{ fontSize:10, fontWeight:700, color: STATUS_COLOR[r["Job Status"]?.toLowerCase().replace(/ /g,"_")] || "#64748b" }}>
                        {r["Job Status"]}
                      </span>
                    </td>
                    <td style={{ padding:"6px 8px", color:"#475569" }}>{r["Customer"]}</td>
                    <td style={{ padding:"6px 8px", color:"#475569" }}>{r["Pickup Site Name"]?.slice(0,25)}</td>
                    <td style={{ padding:"6px 8px", color:"#475569" }}>{r["Dropoff Site Name"]?.slice(0,25)}</td>
                    <td style={{ padding:"6px 8px", fontWeight:600, color:"#0f172a", textAlign:"right" }}>{r["Job Quantity"]}</td>
                    <td style={{ padding:"6px 8px", color:"#64748b", fontStyle: r["See Notes!!"] && r["See Notes!!"].toLowerCase() !== "standard" ? "italic" : "normal" }}>
                      {r["See Notes!!"] || "standard"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center", paddingTop:8 }}>… and {preview.length - 8} more rows</div>}
          </div>
        </div>
      )}

      {/* ── Loaded batch view ── */}
      {batch && (
        <div>
          {/* Batch summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:12, marginBottom:20 }}>
            {[
              { label:"Total Jobs",   value: batch.total_rows,       color:"#0f172a" },
              { label:"Blocked",      value: batch.blocked_count,    color:"#dc2626" },
              { label:"Needs Docs",   value: batch.needs_docs_count, color:"#ea580c" },
              { label:"Ready",        value: batch.ready_count,      color:"#16a34a" },
              { label:"Completed",    value: batch.completed_count,  color:"#0891b2" },
              { label:"In Progress",  value: batch.in_progress_count, color:"#2563eb" },
              { label:"To Pickup",    value: batch.to_pickup_count,  color:"#7c3aed" },
              { label:"To Dropoff",   value: batch.to_dropoff_count, color:"#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:22, fontWeight:800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Compliance alerts */}
          {alerts.length > 0 && (
            <div style={{ ...card, borderLeft:"4px solid #dc2626", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:12 }}>
                🚨 Dispatch Guard found {alerts.length} compliance issue{alerts.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {alerts.map((a) => (
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
                      <button style={{ padding:"5px 10px", borderRadius:6, background:"#fff", border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer", color:"#0f172a" }}>Send Request</button>
                      <button style={{ padding:"5px 10px", borderRadius:6, background:"#fff", border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer", color:"#dc2626" }}>Block</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {[
              { key:"all",        label:`All (${jobs.length})` },
              { key:"blocked",    label:`🚨 Blocked (${criticalCount})` },
              { key:"needs_docs", label:`⚠ Needs Docs (${needsDocsCount})` },
              { key:"ready",      label:`✅ Ready (${readyCount})` },
              { key:"in_progress",label:`🔵 In Progress (${batch.in_progress_count})` },
              { key:"completed",  label:`✓ Completed (${batch.completed_count})` },
              { key:"to_pickup",  label:`📍 To Pickup (${batch.to_pickup_count})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0", background: filter === f.key ? "#0f172a" : "#fff", color: filter === f.key ? "#fff" : "#475569", fontWeight:700, fontSize:12, cursor:"pointer" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Jobs table */}
          <div style={{ ...card, padding:0, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Status","Truck","Driver","Phone","Job ID","Pickup → Dropoff","Loads","Material","Compliance"].map((h) => (
                      <th key={h} style={{ padding:"10px 12px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j) => (
                    <tr key={j.id} style={{ borderBottom:"1px solid #f1f5f9", background: j.compliance_severity === "critical" ? "#fff5f5" : "transparent" }}>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:800, color: STATUS_COLOR[j.dispatch_status] || "#64748b", background: (STATUS_COLOR[j.dispatch_status] || "#64748b") + "18", padding:"3px 7px", borderRadius:5 }}>
                          {j.dispatch_status?.replace(/_/g," ").toUpperCase() || j.job_status || "—"}
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
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:10, fontWeight:800, color: SEV_COLOR[j.compliance_severity] || "#64748b", background: (SEV_COLOR[j.compliance_severity] || "#64748b") + "18", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap", display:"inline-block" }}>
                            {SEV_LABEL[j.compliance_severity] || j.compliance_status?.toUpperCase()}
                          </span>
                          {j.compliance_issue && <div style={{ fontSize:10, color:"#64748b" }}>{j.compliance_issue}</div>}
                          {j.rmis_note && j.rmis_note.toLowerCase() !== "standard" && (
                            <div style={{ fontSize:10, color:"#94a3b8", fontStyle:"italic" }}>{j.rmis_note}</div>
                          )}
                        </div>
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

          <button onClick={() => { setBatch(null); setJobs([]); setAlerts([]); setPreview([]); setFilter("all"); }}
            style={{ padding:"9px 18px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#475569", fontWeight:700, fontSize:13, cursor:"pointer", marginTop:8 }}>
            ← Upload New Schedule
          </button>
        </div>
      )}

      {/* Past imports */}
      {!batch && pastImports.length > 0 && (
        <div style={{ ...card, marginTop:8 }}>
          <div style={{ fontWeight:700, color:"#0f172a", marginBottom:12, fontSize:"0.9rem" }}>Past Imports</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {pastImports.map((imp) => (
              <div key={imp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{imp.import_name}</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>
                    {imp.total_rows} jobs &nbsp;·&nbsp;
                    {imp.blocked_count ? <span style={{ color:"#dc2626", fontWeight:700 }}>{imp.blocked_count} blocked &nbsp;·&nbsp;</span> : null}
                    {imp.needs_docs_count ? <span style={{ color:"#ea580c" }}>{imp.needs_docs_count} needs docs &nbsp;·&nbsp;</span> : null}
                    {new Date(imp.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => loadBatch(imp.id)}
                  style={{ padding:"7px 14px", borderRadius:7, background:"#0f172a", color:"#fff", border:"none", fontWeight:700, fontSize:12, cursor:"pointer" }}
                >
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
