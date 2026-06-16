"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawRow = Record<string, string>;

type RMISClass = {
  classification: "Clear" | "Needs Document Upload" | "Needs Staff Review" | "Dispatch Block" | "RMIS Follow-Up" | "Unknown Note";
  severity:  "clear" | "low" | "warning" | "critical";
  meaning:   string;
  action:    string | null;
  task:      string | null;
};

type AnalyzedRow = {
  raw: RawRow;
  readiness: "ready" | "needs_review" | "critical";
  issues: string[];
  driver: string; truck: string; customer: string;
  qty: number; qty_unit: string;
  job_id: string; status: string;
  start_time: string; pickup: string; dropoff: string;
  license: string; vendor: string; material: string;
  rmis_note: string; rmis_class: RMISClass;
  exp_tickets: number; exp_time_proof: boolean;
};

type FileAnalysis = {
  rows: AnalyzedRow[];
  ready: AnalyzedRow[]; review: AnalyzedRow[]; critical: AnalyzedRow[];
  date_range: string;
  exp_tickets: number;
  customers: { name: string; rows: number; tickets: number }[];
  stats: {
    total: number; missing_driver: number; missing_truck: number; missing_both: number;
    missing_license: number; missing_material: number;
    rmis_critical: number; rmis_warning: number;
    unique_customers: number; unique_drivers: number; unique_trucks: number;
    duplicate_jobs: number;
  };
};

type MatchEntry = {
  driver: string; truck: string;
  company: string | null; owner_operator: string | null;
  confidence: number;
  status: "matched" | "conflict" | "missing_company" | "unknown_driver" | "unknown_truck" | "needs_review";
  next_action: string;
  driver_found: boolean; truck_found: boolean;
};

type ReadinessScore = {
  score: number;
  status: "Ready to Import" | "Import with Warnings" | "Needs Review Before Import" | "Blocked";
  driver_match: number; truck_match: number; company_match: number;
  rmis_status: string; ticket_status: string; dup_status: string;
};

type StaffTask = { role: string; tasks: { label: string; count: number; sev: "critical" | "warning" | "info" }[] };

type ImportBatch = {
  id: string; import_name: string; source_file_name: string; schedule_date: string;
  total_rows: number; ready_count: number; blocked_count: number; needs_docs_count: number;
  in_progress_count: number; completed_count: number; to_pickup_count: number; to_dropoff_count: number;
  created_at: string;
};

// ─── RMIS Classifier ──────────────────────────────────────────────────────────

function classifyRMIS(note: string): RMISClass {
  const n = (note ?? "").toLowerCase().trim();
  if (!n || n === "standard") return { classification: "Clear", severity: "clear", meaning: "Standard RMIS note — no compliance action needed.", action: null, task: null };
  if (/have\s+dl[\s,&]+medical[\s&,]+(and\s+)?inspection/i.test(n))
    return { classification: "Clear", severity: "low", meaning: "Driver has DL, Medical Card, and Inspection confirmed on RMIS.", action: "Verify inspection date is current.", task: null };
  if (/have\s+dl[\s,&]+medical/i.test(n))
    return { classification: "Clear", severity: "low", meaning: "DL and Medical Card confirmed — Inspection status unknown.", action: "Request DOT inspection document.", task: "Driver Coordinator: Request inspection document" };
  if (/request\s+(for\s+)?dl/i.test(n))
    return { classification: "Needs Document Upload", severity: "warning", meaning: "Driver's License was requested but not yet received.", action: "Follow up with driver for DL copy.", task: "Driver Coordinator: Request DL copy from driver" };
  if (/missing\s+medical/i.test(n))
    return { classification: "Dispatch Block", severity: "critical", meaning: "Medical Certificate is missing from RMIS — driver cannot be dispatched.", action: "Block dispatch until Medical Card is uploaded.", task: "Compliance Admin: Upload Medical Certificate — DISPATCH BLOCKED" };
  if (/missing\s+back\s+of\s+dl/i.test(n))
    return { classification: "Needs Document Upload", severity: "warning", meaning: "Back of driver's license not on RMIS file.", action: "Request back of DL from driver.", task: "Driver Coordinator: Request back of DL" };
  if (/uncertified/i.test(n))
    return { classification: "Dispatch Block", severity: "critical", meaning: "Driver is uncertified on RMIS — cannot dispatch until resolved.", action: "Block dispatch until RMIS certification is resolved.", task: "Compliance Admin: Resolve RMIS uncertified status — DISPATCH BLOCKED" };
  if (/email\s*(and|&|\+)\s*call/i.test(n))
    return { classification: "RMIS Follow-Up", severity: "warning", meaning: "RMIS requires email and phone follow-up for documents.", action: "Email and call driver or company for missing documents.", task: "Compliance Admin: Email & call for documents" };
  if (/email\s+for\s+docs/i.test(n))
    return { classification: "RMIS Follow-Up", severity: "warning", meaning: "RMIS requires email follow-up for missing documents.", action: "Email driver or company for missing documents.", task: "Compliance Admin: Email for documents" };
  if (/missing/i.test(n))
    return { classification: "Needs Document Upload", severity: "warning", meaning: `RMIS notes a missing document: "${note}"`, action: "Review missing document and request from driver.", task: "Driver Coordinator: Review and request missing document" };
  return { classification: "Unknown Note", severity: "warning", meaning: `Unrecognized RMIS note: "${note}"`, action: "Manually review this note with Compliance Admin.", task: "Compliance Admin: Manual review of RMIS note" };
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim());
  return lines.slice(1).map(line => {
    const vals: string[] = []; let cur = "", inQ = false;
    for (const c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    vals.push(cur.trim());
    const obj: RawRow = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// ─── Row / File Analysis ──────────────────────────────────────────────────────

function analyzeRow(row: RawRow): AnalyzedRow {
  const driver   = row["Driver"]?.trim() || "";
  const truck    = row["Truck Number"]?.trim() || "";
  const customer = row["Customer"]?.trim() || "";
  const qty_raw  = parseFloat(row["Job Quantity"] || "0") || 0;
  const qty_unit = row["Job Quantity Unit"]?.trim() || "Load";
  const rmis_raw = row["See Notes!!"]?.trim() || row["RMIS Notes"]?.trim() || "standard";
  const rmis_class = classifyRMIS(rmis_raw);

  const issues: string[] = [];
  let readiness: AnalyzedRow["readiness"] = "ready";

  if (!driver) { issues.push("Missing driver"); readiness = "critical"; }
  if (!truck)  { issues.push("Missing truck number"); readiness = "critical"; }
  if (!customer) { issues.push("Missing customer"); if (readiness === "ready") readiness = "needs_review"; }
  if (rmis_class.severity === "critical") { issues.push(`RMIS Dispatch Block`); readiness = "critical"; }
  else if (rmis_class.severity === "warning") { issues.push(`RMIS: ${rmis_raw}`); if (readiness === "ready") readiness = "needs_review"; }
  if (!row["Equipment License Number"]?.trim()) { issues.push("No equipment license"); if (readiness === "ready") readiness = "needs_review"; }
  if (!row["Material"]?.trim()) { issues.push("No material"); if (readiness === "ready") readiness = "needs_review"; }

  const exp_tickets    = qty_unit.toLowerCase().includes("load") ? qty_raw : 0;
  const exp_time_proof = qty_unit.toLowerCase().includes("hour");

  return {
    raw: row, readiness, issues,
    driver, truck, customer, qty: qty_raw, qty_unit,
    job_id:   row["Friendly Job ID"]?.trim() || "",
    status:   row["Job Status"]?.trim() || "",
    start_time: row["Start Time"]?.trim() || "",
    pickup:   row["Pickup Site Name"]?.trim() || "",
    dropoff:  row["Dropoff Site Name"]?.trim() || "",
    license:  row["Equipment License Number"]?.trim() || "",
    vendor:   row["Vendor"]?.trim() || "",
    material: row["Material"]?.trim() || "",
    rmis_note: rmis_raw, rmis_class,
    exp_tickets, exp_time_proof,
  };
}

function analyzeFile(rows: RawRow[]): FileAnalysis {
  const analyzed = rows.map(analyzeRow);
  const ready    = analyzed.filter(r => r.readiness === "ready");
  const review   = analyzed.filter(r => r.readiness === "needs_review");
  const critical = analyzed.filter(r => r.readiness === "critical");

  const dates = analyzed.map(r => r.start_time).filter(Boolean).sort();
  const date_range = dates.length
    ? (dates[0].slice(0,10) === dates[dates.length-1].slice(0,10)
      ? dates[0].slice(0,10)
      : `${dates[0].slice(0,10)} – ${dates[dates.length-1].slice(0,10)}`)
    : "";

  const exp_tickets = analyzed.reduce((s, r) => s + r.exp_tickets, 0);

  const custMap: Record<string, { rows: number; tickets: number }> = {};
  const driverSet = new Set<string>(), truckSet = new Set<string>();
  const jobCounts: Record<string, number> = {};
  for (const r of analyzed) {
    if (r.customer) { if (!custMap[r.customer]) custMap[r.customer] = { rows:0, tickets:0 }; custMap[r.customer].rows++; custMap[r.customer].tickets += r.exp_tickets; }
    if (r.driver) driverSet.add(r.driver);
    if (r.truck)  truckSet.add(r.truck);
    if (r.job_id) jobCounts[r.job_id] = (jobCounts[r.job_id]||0)+1;
  }
  const customers = Object.entries(custMap).sort((a,b)=>b[1].rows-a[1].rows).map(([name,v])=>({name,...v}));
  const missing_driver  = analyzed.filter(r=>!r.driver).length;
  const missing_truck   = analyzed.filter(r=>!r.truck).length;
  const missing_both    = analyzed.filter(r=>!r.driver&&!r.truck).length;
  const rmis_critical   = analyzed.filter(r=>r.rmis_class.severity==="critical").length;
  const rmis_warning    = analyzed.filter(r=>r.rmis_class.severity==="warning").length;

  return {
    rows: analyzed, ready, review, critical, date_range, exp_tickets, customers,
    stats: {
      total: analyzed.length, missing_driver, missing_truck, missing_both,
      missing_license: analyzed.filter(r=>!r.license).length,
      missing_material: analyzed.filter(r=>!r.material).length,
      rmis_critical, rmis_warning,
      unique_customers: customers.length,
      unique_drivers: driverSet.size,
      unique_trucks: truckSet.size,
      duplicate_jobs: Object.values(jobCounts).filter(v=>v>1).length,
    },
  };
}

// ─── Readiness Score ──────────────────────────────────────────────────────────

function calcScore(a: FileAnalysis, matches: MatchEntry[] | null): ReadinessScore {
  const total = a.stats.total;
  if (!total) return { score:0, status:"Blocked", driver_match:0, truck_match:0, company_match:0, rmis_status:"—", ticket_status:"—", dup_status:"—" };
  const dm = Math.round((total - a.stats.missing_driver) / total * 100);
  const tm = Math.round((total - a.stats.missing_truck)  / total * 100);
  const cm = matches ? Math.round(matches.filter(m=>m.status==="matched").length / Math.max(matches.length,1) * 100) : -1;
  const rmisOk = a.stats.rmis_critical === 0;
  const dupOk  = a.stats.duplicate_jobs === 0;
  const score  = Math.round(
    dm * 0.30 +
    tm * 0.30 +
    (cm < 0 ? 50 : cm) * 0.20 +
    (rmisOk ? 100 : a.stats.rmis_warning > 0 ? 60 : 25) * 0.10 +
    (dupOk  ? 100 : 50) * 0.10
  );
  const status: ReadinessScore["status"] = score >= 90 ? "Ready to Import" : score >= 70 ? "Import with Warnings" : score >= 50 ? "Needs Review Before Import" : "Blocked";
  return {
    score, status, driver_match: dm, truck_match: tm, company_match: cm,
    rmis_status:  a.stats.rmis_critical > 0 ? `${a.stats.rmis_critical} Dispatch Block${a.stats.rmis_critical>1?"s":""}` : a.stats.rmis_warning > 0 ? "Needs Review" : "Clear",
    ticket_status: "Ready",
    dup_status:    dupOk ? "Clear" : `${a.stats.duplicate_jobs} Duplicate${a.stats.duplicate_jobs>1?"s":""}`,
  };
}

// ─── Staff Tasks Builder ──────────────────────────────────────────────────────

function buildTasks(a: FileAnalysis, matches: MatchEntry[] | null): StaffTask[] {
  const out: StaffTask[] = [];

  const compliance: StaffTask["tasks"] = [];
  if (a.stats.rmis_critical > 0)  compliance.push({ label:`Resolve ${a.stats.rmis_critical} RMIS dispatch block${a.stats.rmis_critical>1?"s":""}`, count:a.stats.rmis_critical, sev:"critical" });
  if (a.stats.rmis_warning > 0)   compliance.push({ label:`Follow up on ${a.stats.rmis_warning} RMIS note${a.stats.rmis_warning>1?"s":""}`, count:a.stats.rmis_warning, sev:"warning" });
  const missingMedical = a.rows.filter(r=>/missing\s+medical/i.test(r.rmis_note)).length;
  if (missingMedical > 0) compliance.push({ label:`Upload ${missingMedical} Medical Certificate${missingMedical>1?"s":""}`, count:missingMedical, sev:"critical" });
  if (compliance.length) out.push({ role:"Compliance Admin", tasks:compliance });

  const driver: StaffTask["tasks"] = [];
  if (a.stats.missing_driver > 0) driver.push({ label:`Assign drivers to ${a.stats.missing_driver} row${a.stats.missing_driver>1?"s":""}`, count:a.stats.missing_driver, sev:"critical" });
  const missingCo = matches ? matches.filter(m=>m.status==="missing_company"||m.status==="unknown_driver").length : 0;
  if (missingCo > 0) driver.push({ label:`Assign company/carrier to ${missingCo} driver${missingCo>1?"s":""}`, count:missingCo, sev:"warning" });
  const reqDL = a.rows.filter(r=>/request.*dl/i.test(r.rmis_note)).length;
  if (reqDL > 0) driver.push({ label:`Request DL copy from ${reqDL} driver${reqDL>1?"s":""}`, count:reqDL, sev:"warning" });
  if (driver.length) out.push({ role:"Driver Coordinator", tasks:driver });

  const fleet: StaffTask["tasks"] = [];
  if (a.stats.missing_truck > 0) fleet.push({ label:`Assign trucks to ${a.stats.missing_truck} row${a.stats.missing_truck>1?"s":""}`, count:a.stats.missing_truck, sev:"critical" });
  const unknownTrucks = matches ? matches.filter(m=>m.status==="unknown_truck").length : 0;
  if (unknownTrucks > 0) fleet.push({ label:`Add ${unknownTrucks} truck${unknownTrucks>1?"s":""} to fleet records`, count:unknownTrucks, sev:"warning" });
  if (fleet.length) out.push({ role:"Fleet Manager", tasks:fleet });

  const dispatch: StaffTask["tasks"] = [];
  if (a.stats.rmis_critical > 0) dispatch.push({ label:`Review ${a.stats.rmis_critical} dispatch-blocked job${a.stats.rmis_critical>1?"s":""}`, count:a.stats.rmis_critical, sev:"critical" });
  if (a.review.length > 0)        dispatch.push({ label:`Review ${a.review.length} jobs in Needs Review queue`, count:a.review.length, sev:"warning" });
  if (dispatch.length) out.push({ role:"Dispatcher", tasks:dispatch });

  const fsTickets = Math.round(a.exp_tickets);
  if (fsTickets > 0) out.push({ role:"Fast Scan Staff", tasks:[{ label:`Prepare for ${fsTickets.toLocaleString()} incoming ticket proof scan${fsTickets>1?"s":""}`, count:fsTickets, sev:"info" }] });

  return out;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const SCORE_COLOR = (s: number) => s >= 90 ? "#16a34a" : s >= 70 ? "#ca8a04" : s >= 50 ? "#ea580c" : "#dc2626";
const SCORE_BG    = (s: number) => s >= 90 ? "#f0fdf4" : s >= 70 ? "#fef9c3" : s >= 50 ? "#ffedd5" : "#fee2e2";

const RMIS_CLS_COLOR: Record<string, string> = {
  "Clear":"#16a34a","Needs Document Upload":"#ca8a04","Needs Staff Review":"#ea580c",
  "Dispatch Block":"#dc2626","RMIS Follow-Up":"#7c3aed","Unknown Note":"#475569",
};
const RMIS_CLS_BG: Record<string, string> = {
  "Clear":"#f0fdf4","Needs Document Upload":"#fefce8","Needs Staff Review":"#ffedd5",
  "Dispatch Block":"#fee2e2","RMIS Follow-Up":"#f5f3ff","Unknown Note":"#f8fafc",
};

const MATCH_STYLE: Record<string, { color:string; bg:string; label:string }> = {
  matched:         { color:"#16a34a", bg:"#f0fdf4", label:"Matched" },
  conflict:        { color:"#dc2626", bg:"#fee2e2", label:"Conflict" },
  missing_company: { color:"#ca8a04", bg:"#fefce8", label:"Missing Company" },
  unknown_driver:  { color:"#ea580c", bg:"#ffedd5", label:"Unknown Driver" },
  unknown_truck:   { color:"#ea580c", bg:"#ffedd5", label:"Unknown Truck" },
  needs_review:    { color:"#7c3aed", bg:"#f5f3ff", label:"Needs Review" },
};

const SEV_COLOR: Record<string,string> = { critical:"#dc2626", high:"#ea580c", warning:"#ca8a04", low:"#16a34a", clear:"#0891b2" };
const SEV_BG:    Record<string,string> = { critical:"#fee2e2", high:"#ffedd5", warning:"#fef9c3", low:"#dcfce7", clear:"#e0f2fe" };
const SEV_LABEL: Record<string,string> = { critical:"BLOCKED", high:"NEEDS DOCS", warning:"FOLLOW UP", low:"VERIFY", clear:"READY" };

const card: React.CSSProperties = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"20px 24px", marginBottom:16 };

const SectionHead = ({ n, label }: { n: number; label: string }) => (
  <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.1em", color:"#94a3b8", marginBottom:12 }}>
    {n} · {label}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging,    setDragging]    = useState(false);
  const [filename,    setFilename]    = useState("");
  const [parsing,     setParsing]     = useState(false);
  const [analysis,    setAnalysis]    = useState<FileAnalysis | null>(null);
  const [matching,    setMatching]    = useState(false);
  const [matches,     setMatches]     = useState<MatchEntry[] | null>(null);
  const [createTasks, setCreateTasks] = useState(true);
  const [importing,   setImporting]   = useState<string | null>(null);
  const [batch,       setBatch]       = useState<any | null>(null);
  const [batchJobs,   setBatchJobs]   = useState<any[]>([]);
  const [batchAlerts, setBatchAlerts] = useState<any[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [previewFilter, setPreviewFilter] = useState<"all"|"ready"|"needs_review"|"critical">("all");
  const [pastImports, setPastImports] = useState<ImportBatch[]>([]);
  const [toast,       setToast]       = useState<{msg:string;ok:boolean}|null>(null);

  const readiness  = useMemo(() => analysis ? calcScore(analysis, matches) : null, [analysis, matches]);
  const staffTasks = useMemo(() => analysis ? buildTasks(analysis, matches) : null, [analysis, matches]);

  function flash(msg: string, ok = true) { setToast({msg,ok}); setTimeout(()=>setToast(null),6000); }

  useEffect(() => {
    fetch("/api/ronyx/dispatch-import").then(r=>r.json()).then(d=>setPastImports(d.imports||[])).catch(()=>{});
  }, [batch]);

  const runMatch = useCallback(async (fa: FileAnalysis) => {
    const drivers = [...new Set(fa.rows.map(r=>r.driver).filter(Boolean))];
    const trucks  = [...new Set(fa.rows.map(r=>r.truck).filter(Boolean))];
    if (!drivers.length && !trucks.length) { setMatches([]); return; }
    setMatching(true);
    try {
      const res  = await fetch("/api/ronyx/dispatch-import/match", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({drivers,trucks}) });
      const data = await res.json();
      const seen = new Set<string>();
      const entries: MatchEntry[] = [];
      for (const row of fa.rows) {
        const key = `${row.driver}||${row.truck}`;
        if (seen.has(key)) continue; seen.add(key);
        const dm = data.driver_matches?.[row.driver] || null;
        const tm = data.truck_matches?.[row.truck]   || null;
        const company = dm?.company_name || tm?.owner_operator_name || null;
        let status: MatchEntry["status"] = "needs_review";
        let confidence = 0.40, next_action = "Manual review required";
        if (!row.driver) { status = "unknown_driver"; confidence = 0.05; next_action = "Assign driver before dispatch"; }
        else if (!row.truck) { status = "unknown_truck"; confidence = 0.05; next_action = "Assign truck before dispatch"; }
        else if (dm?.found && tm?.found && company) { status = "matched"; confidence = dm.confidence || 0.85; next_action = "Ready to dispatch"; }
        else if (dm?.found && !company) { status = "missing_company"; confidence = 0.55; next_action = "Assign company/carrier to driver"; }
        else if (!dm?.found && row.driver) { status = "unknown_driver"; confidence = 0.15; next_action = "Add driver to system or verify spelling"; }
        else if (!tm?.found && row.truck)  { status = "unknown_truck";  confidence = 0.15; next_action = "Add truck to fleet records"; }
        entries.push({ driver: row.driver||"(not assigned)", truck: row.truck||"(not assigned)", company, owner_operator: tm?.owner_operator_name||null, confidence, status, next_action, driver_found:dm?.found||false, truck_found:tm?.found||false });
      }
      setMatches(entries);
    } catch { setMatches([]); }
    finally { setMatching(false); }
  }, []);

  const processFile = useCallback((file: File) => {
    setParsing(true); setAnalysis(null); setMatches(null); setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) || "";
      const fa   = analyzeFile(parseCSV(text));
      setAnalysis(fa); setParsing(false);
      runMatch(fa);
    };
    reader.readAsText(file);
  }, [runMatch]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) processFile(f); };

  async function runImport(mode: "ready"|"all"|"staff_only") {
    if (!analysis) return;
    if (mode === "staff_only") { flash("Needs Review rows sent to staff task queue."); return; }
    setImporting(mode);
    const rows = mode === "ready" ? analysis.ready.map(r=>r.raw) : analysis.rows.map(r=>r.raw);
    try {
      const res = await fetch("/api/ronyx/dispatch-import", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ rows, file_name:filename, schedule_date:analysis.date_range.split(" – ")[0]||new Date().toISOString().slice(0,10), import_name:`Dispatch ${analysis.date_range}`, create_tasks:createTasks }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash(`✅ ${d.jobs_created} jobs imported — ${d.alerts_created} compliance alerts created.`);
      loadBatch(d.import_id);
    } catch(err:any) { flash(err.message||"Import failed",false); }
    finally { setImporting(null); }
  }

  async function loadBatch(id: string) {
    const res = await fetch(`/api/ronyx/dispatch-import/${id}`);
    const d   = await res.json();
    setBatch(d.batch); setBatchJobs(d.jobs||[]); setBatchAlerts(d.alerts||[]);
    setAnalysis(null); setFilename(""); setMatches(null);
  }

  // Derived
  const rmisMap = new Map<string, {count:number;rows:AnalyzedRow[];cls:RMISClass}>();
  if (analysis) {
    for (const r of analysis.rows) {
      const note = r.rmis_note;
      if (!note || note.toLowerCase() === "standard") continue;
      const key = note.toLowerCase().trim();
      if (!rmisMap.has(key)) rmisMap.set(key, {count:0, rows:[], cls:r.rmis_class});
      const e = rmisMap.get(key)!; e.count++; e.rows.push(r);
    }
  }
  const customerList = analysis ? [...new Set(analysis.rows.map(r=>r.customer).filter(Boolean))] : [];
  const previewRows  = analysis ? (previewFilter==="all" ? analysis.rows : analysis.rows.filter(r=>r.readiness===previewFilter)) : [];
  const totalStaffTasks = (staffTasks||[]).flatMap(t=>t.tasks).reduce((s,t)=>s+(t.sev==="info"?0:t.count),0);

  // Batch filter
  const filteredJobs = batchJobs.filter(j => {
    if (batchFilter === "all") return true;
    if (batchFilter === "blocked")    return j.compliance_severity === "critical";
    if (batchFilter === "needs_docs") return ["high","warning"].includes(j.compliance_severity);
    if (batchFilter === "ready")      return ["clear","low"].includes(j.compliance_severity);
    return true;
  });

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", maxWidth:1100, margin:"0 auto", paddingBottom:60 }}>

      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, background:toast.ok?"#166534":"#991b1b", color:"#fff", fontSize:13, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", maxWidth:440 }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, fontWeight:800, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>
          Ronyx · Dispatch Guard™
        </div>
        <h1 style={{ margin:0, fontSize:"1.45rem", fontWeight:900, color:"#0f172a", letterSpacing:"-0.4px" }}>
          RONYX DAILY DISPATCH IMPORT CENTER
        </h1>
        <p style={{ margin:"5px 0 0", fontSize:12, color:"#64748b", lineHeight:1.5 }}>
          Upload, review, match, validate, and release daily RMIS dispatch schedules into Dispatch Guard, Fast Scan, Staff Tasks, Payroll, and Billing.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — IMPORT MISSION CONTROL
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ ...card, background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", border:"none", marginBottom:16 }}>
        <SectionHead n={1} label="Import Mission Control" />
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"flex-start", marginBottom: analysis ? 16 : 0 }}>
          <div style={{ flex:1, minWidth:240 }}>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>Today's Focus</div>
            <div style={{ fontSize:14, color:"#f1f5f9", fontWeight:600, lineHeight:1.5 }}>
              Review the daily RMIS schedule before releasing jobs into dispatch, Fast Scan, payroll, and billing.
            </div>
          </div>
          <div style={{ flex:1, minWidth:240, borderLeft:"1px solid #334155", paddingLeft:20 }}>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>
              {!analysis ? "Recommended First Action" : readiness?.score && readiness.score >= 90 ? "Ready to Import" : "Action Required"}
            </div>
            <div style={{ fontSize:13, color:"#f1f5f9", fontWeight:600, lineHeight:1.5 }}>
              {parsing ? "Reading file and analyzing rows…"
                : matching ? "Matching drivers and trucks against fleet database…"
                : !analysis ? "Upload the RMIS export to begin pre-dispatch intelligence review."
                : readiness?.status === "Blocked"
                ? `Resolve ${analysis.stats.rmis_critical} dispatch block${analysis.stats.rmis_critical>1?"s":""} before importing.`
                : (analysis.stats.missing_driver + analysis.stats.missing_truck) > 0
                ? `${analysis.stats.missing_driver + analysis.stats.missing_truck} rows missing driver or truck. Import ${analysis.ready.length} ready rows only.`
                : readiness?.status === "Import with Warnings"
                ? `${analysis.review.length} rows need review. Safe to import ${analysis.ready.length} ready rows now.`
                : `${analysis.rows.length} rows analyzed — all clear. Safe to import.`}
            </div>
          </div>
          {readiness && (
            <div style={{ flexShrink:0 }}>
              <div style={{ width:110, background:SCORE_BG(readiness.score), border:`2px solid ${SCORE_COLOR(readiness.score)}`, borderRadius:12, padding:"12px 0", textAlign:"center" }}>
                <div style={{ fontSize:30, fontWeight:900, color:SCORE_COLOR(readiness.score), lineHeight:1 }}>{readiness.score}%</div>
                <div style={{ fontSize:10, fontWeight:800, color:SCORE_COLOR(readiness.score), textTransform:"uppercase", letterSpacing:"0.06em", marginTop:3 }}>Readiness</div>
              </div>
            </div>
          )}
        </div>
        {analysis && (
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { n:analysis.ready.length,                          label:"Ready",            color:"#86efac", bg:"rgba(22,163,74,0.18)" },
              { n:analysis.review.length,                         label:"Needs Review",     color:"#fde68a", bg:"rgba(202,138,4,0.18)" },
              { n:analysis.critical.length,                       label:"Blocked/Critical", color:"#fca5a5", bg:"rgba(220,38,38,0.18)" },
              { n:Math.round(analysis.exp_tickets),               label:"Expected Tickets", color:"#bfdbfe", bg:"rgba(29,78,216,0.18)" },
              { n:totalStaffTasks,                                label:"Staff Tasks",      color:"#d9f99d", bg:"rgba(22,163,74,0.12)" },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:8, padding:"8px 14px", minWidth:88, textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.n.toLocaleString()}</div>
                <div style={{ fontSize:10, color:s.color, fontWeight:700, marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — UPLOAD
      ═══════════════════════════════════════════════════════════ */}
      {!batch && (
        <div style={card}>
          <SectionHead n={2} label="Upload / File Drop Zone" />
          <div
            style={{ border:`2px dashed ${dragging?"#3b82f6":"#cbd5e1"}`, borderRadius:12, background:dragging?"#eff6ff":"#f8fafc", textAlign:"center", padding:"32px 24px", cursor:"pointer", transition:"all 0.15s" }}
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={onDrop}
            onClick={()=>fileRef.current?.click()}
          >
            <div style={{ fontSize:38, marginBottom:10 }}>{parsing?"⏳":analysis?"✅":"📋"}</div>
            <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:6 }}>
              {parsing ? "Reading file…"
                : analysis ? `${filename} — ${analysis.rows.length} rows loaded`
                : "Drop RMIS Daily Dispatch CSV here or click to browse"}
            </div>
            <div style={{ fontSize:12, color:"#64748b" }}>Source: Tabitha / RMIS Daily Schedule Export · Formats: CSV, XLSX</div>
            {matching && <div style={{ fontSize:12, color:"#2563eb", fontWeight:700, marginTop:8 }}>🔍 Matching drivers & trucks against fleet database…</div>}
            {analysis && !matching && (
              <div style={{ fontSize:12, color:"#16a34a", fontWeight:700, marginTop:8 }}>
                ✓ {analysis.rows.length} rows parsed · Original file recorded in Backup Center · Review sections below before importing
              </div>
            )}
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" style={{ display:"none" }}
              onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value="";}} />
          </div>
          {analysis && (
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
              <button onClick={()=>{setAnalysis(null);setFilename("");setMatches(null);}}
                style={{ padding:"7px 14px", borderRadius:7, background:"#fff", border:"1px solid #e2e8f0", color:"#64748b", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                ✕ Clear &amp; Upload New File
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTIONS 3–12 — Pre-import intelligence (analysis view)
      ═══════════════════════════════════════════════════════════ */}
      {analysis && !batch && (<>

        {/* ─── 3. FILE SUMMARY ─────────────────────────────────── */}
        <div style={card}>
          <SectionHead n={3} label="File Summary" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:8, marginBottom:14 }}>
            {[
              { label:"File Name",       v:filename,                                                           sm:true },
              { label:"Rows Detected",   v:analysis.stats.total.toLocaleString(),                             color:"#0f172a" },
              { label:"Date Range",      v:analysis.date_range||"—",                                          sm:true },
              { label:"Customers",       v:analysis.stats.unique_customers,                                   color:"#0891b2" },
              { label:"Unique Drivers",  v:analysis.stats.unique_drivers,                                     color:"#1d4ed8" },
              { label:"Unique Trucks",   v:analysis.stats.unique_trucks,                                      color:"#7c3aed" },
              { label:"Missing Driver",  v:analysis.stats.missing_driver,                                     color:analysis.stats.missing_driver>0?"#dc2626":"#16a34a" },
              { label:"Missing Truck",   v:analysis.stats.missing_truck,                                      color:analysis.stats.missing_truck>0?"#dc2626":"#16a34a" },
              { label:"Missing Both",    v:analysis.stats.missing_both,                                       color:analysis.stats.missing_both>0?"#dc2626":"#16a34a" },
              { label:"RMIS Notes",      v:rmisMap.size,                                                       color:rmisMap.size>0?"#ca8a04":"#16a34a" },
              { label:"RMIS Blocks",     v:analysis.stats.rmis_critical,                                      color:analysis.stats.rmis_critical>0?"#dc2626":"#16a34a" },
              { label:"Duplicate Jobs",  v:analysis.stats.duplicate_jobs,                                     color:analysis.stats.duplicate_jobs>0?"#ea580c":"#16a34a" },
              { label:"Expected Tickets",v:Math.round(analysis.exp_tickets).toLocaleString(),                 color:"#2563eb" },
              { label:"Uploaded",        v:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),sm:true },
            ].map(s => (
              <div key={s.label} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:s.sm?12:20, fontWeight:s.sm?600:900, color:s.color||"#475569", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{String(s.v)}</div>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:"#0f172a", marginBottom:8 }}>Customers in This Import</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {analysis.customers.map(c => (
              <div key={c.name} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"8px 14px" }}>
                <div style={{ fontWeight:800, fontSize:12, color:"#1e40af" }}>{c.name}</div>
                <div style={{ fontSize:11, color:"#2563eb", marginTop:2 }}>{c.rows} jobs · <strong>{Math.round(c.tickets).toLocaleString()}</strong> expected tickets</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 4. IMPORT READINESS SCORE ───────────────────────── */}
        {readiness && (
          <div style={card}>
            <SectionHead n={4} label="Import Readiness Score" />
            <div style={{ display:"flex", gap:28, flexWrap:"wrap", alignItems:"flex-start" }}>
              <div style={{ textAlign:"center", minWidth:120 }}>
                <div style={{ width:100, height:100, borderRadius:"50%", border:`6px solid ${SCORE_COLOR(readiness.score)}`, background:SCORE_BG(readiness.score), display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
                  <div style={{ fontSize:26, fontWeight:900, color:SCORE_COLOR(readiness.score), lineHeight:1 }}>{readiness.score}%</div>
                </div>
                <div style={{ marginTop:8, fontWeight:800, fontSize:12, color:SCORE_COLOR(readiness.score) }}>{readiness.status}</div>
              </div>
              <div style={{ flex:1, minWidth:260 }}>
                {([
                  { label:"Driver Match",       pct:readiness.driver_match,  val:`${readiness.driver_match}%` },
                  { label:"Truck Match",        pct:readiness.truck_match,   val:`${readiness.truck_match}%` },
                  { label:"Company Match",      pct:readiness.company_match<0?50:readiness.company_match, val:readiness.company_match<0?"Matching…":`${readiness.company_match}%` },
                  { label:"RMIS Notes",         pct:readiness.rmis_status==="Clear"?100:readiness.rmis_status.includes("Block")?10:50, val:readiness.rmis_status },
                  { label:"Ticket Expectations",pct:100, val:readiness.ticket_status },
                  { label:"Duplicate Check",    pct:readiness.dup_status==="Clear"?100:40, val:readiness.dup_status },
                ] as const).map(b => (
                  <div key={b.label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:148, fontSize:12, fontWeight:600, color:"#475569", flexShrink:0 }}>{b.label}</div>
                    <div style={{ flex:1, height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${Math.max(0,Math.min(100,b.pct))}%`, height:"100%", background:SCORE_COLOR(b.pct), borderRadius:3, transition:"width 0.5s" }} />
                    </div>
                    <div style={{ width:100, fontSize:11, fontWeight:700, color:SCORE_COLOR(b.pct), textAlign:"right", flexShrink:0 }}>{b.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 5. AI IMPORT SUMMARY ────────────────────────────── */}
        {readiness && (() => {
          const concerns: string[] = [];
          if (analysis.stats.missing_driver > 0) concerns.push(`${analysis.stats.missing_driver} row${analysis.stats.missing_driver>1?"s":""} have no driver assigned`);
          if (analysis.stats.missing_truck  > 0) concerns.push(`${analysis.stats.missing_truck} row${analysis.stats.missing_truck>1?"s":""} have no truck number`);
          if (analysis.stats.rmis_critical  > 0) concerns.push(`${analysis.stats.rmis_critical} RMIS note${analysis.stats.rmis_critical>1?"s":""} create dispatch blocks`);
          if (analysis.stats.rmis_warning   > 0) concerns.push(`${analysis.stats.rmis_warning} RMIS note${analysis.stats.rmis_warning>1?"s":""} need staff follow-up`);
          if (analysis.stats.duplicate_jobs > 0) concerns.push(`${analysis.stats.duplicate_jobs} duplicate job ID${analysis.stats.duplicate_jobs>1?"s":""} found`);
          const intro = readiness.status==="Ready to Import" ? "This file is ready to import with no critical issues detected."
            : readiness.status==="Import with Warnings" ? "This file can be imported with warnings. Review issues before releasing jobs to dispatch."
            : readiness.status==="Needs Review Before Import" ? "This file needs review before importing. Several rows have missing data or compliance blocks."
            : "This file has critical dispatch blocks. Resolve blocked rows before importing.";
          const recommended = analysis.critical.length > 0
            ? `Import ${analysis.ready.length} ready rows only. Send ${analysis.critical.length} blocked row${analysis.critical.length>1?"s":""} to staff review.`
            : analysis.review.length > 0
            ? `Import ${analysis.ready.length} ready rows. Review ${analysis.review.length} row${analysis.review.length>1?"s":""} with warnings before releasing to dispatch.`
            : `Import all ${analysis.rows.length} rows — no critical issues detected.`;
          return (
            <div style={{ ...card, background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", border:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontSize:22 }}>🤖</span>
                <SectionHead n={5} label="AI Import Summary" />
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9", lineHeight:1.5, marginBottom:12 }}>{intro}</div>
              {concerns.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Main Concerns</div>
                  {concerns.map((c,i) => <div key={i} style={{ fontSize:12, color:"#fde68a", marginBottom:4 }}>⚠ {c}</div>)}
                </div>
              )}
              <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:8, padding:"12px 16px", marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Recommended Action</div>
                <div style={{ fontSize:13, color:"#86efac", fontWeight:700 }}>{recommended}</div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>document.getElementById("s6-match")?.scrollIntoView({behavior:"smooth"})} style={{ padding:"6px 14px", borderRadius:7, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Review Driver Matches</button>
                <button onClick={()=>document.getElementById("s7-rmis")?.scrollIntoView({behavior:"smooth"})} style={{ padding:"6px 14px", borderRadius:7, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Review RMIS Notes</button>
                <button onClick={()=>document.getElementById("s12-actions")?.scrollIntoView({behavior:"smooth"})} style={{ padding:"6px 14px", borderRadius:7, background:"#16a34a", border:"none", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Go to Import Actions ↓</button>
              </div>
            </div>
          );
        })()}

        {/* ─── 6. DRIVER / TRUCK / COMPANY MATCH REVIEW ───────── */}
        <div id="s6-match" style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:12 }}>
            <SectionHead n={6} label="Driver / Truck / Company Match Review" />
            {matches && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:-2 }}>
                {Object.entries({matched:"#16a34a",missing_company:"#ca8a04",unknown_driver:"#ea580c",unknown_truck:"#ea580c",conflict:"#dc2626"}).map(([k,c])=>{
                  const cnt = matches.filter(m=>m.status===k).length;
                  return cnt > 0 ? <span key={k} style={{ fontSize:10, fontWeight:700, color:c, padding:"2px 8px", background:c+"18", borderRadius:5 }}>{cnt} {MATCH_STYLE[k]?.label}</span> : null;
                })}
              </div>
            )}
          </div>
          {matching ? (
            <div style={{ textAlign:"center", padding:"24px", color:"#64748b", fontSize:13 }}>🔍 Checking drivers and trucks against fleet database…</div>
          ) : matches && matches.length > 0 ? (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Driver","Truck","Company / Carrier","Owner Operator","Confidence","Status","Next Action"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", color:"#64748b", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(0,60).map((m,i)=>{
                    const st = MATCH_STYLE[m.status] || MATCH_STYLE.needs_review;
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", background:m.status!=="matched"?st.bg+"44":"#fff" }}>
                        <td style={{ padding:"8px 10px", fontWeight:600, color:m.driver_found?"#0f172a":"#dc2626" }}>
                          {m.driver}
                          {!m.driver_found&&m.driver!=="(not assigned)"&&<span style={{ fontSize:9, color:"#dc2626", marginLeft:4, fontWeight:700 }}>NOT IN DB</span>}
                        </td>
                        <td style={{ padding:"8px 10px", fontWeight:800, color:m.truck_found?"#0f172a":"#dc2626" }}>
                          {m.truck}
                          {!m.truck_found&&m.truck!=="(not assigned)"&&<span style={{ fontSize:9, color:"#dc2626", marginLeft:4, fontWeight:700 }}>NOT IN FLEET</span>}
                        </td>
                        <td style={{ padding:"8px 10px", color:m.company?"#0f172a":"#94a3b8" }}>{m.company||"—"}</td>
                        <td style={{ padding:"8px 10px", color:"#475569" }}>{m.owner_operator||"—"}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ flex:1, height:5, background:"#f1f5f9", borderRadius:3, minWidth:50 }}>
                              <div style={{ width:`${m.confidence*100}%`, height:"100%", background:m.confidence>0.8?"#16a34a":m.confidence>0.5?"#ca8a04":"#dc2626", borderRadius:3 }} />
                            </div>
                            <span style={{ fontSize:10, fontWeight:700, color:"#64748b", flexShrink:0 }}>{Math.round(m.confidence*100)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700, background:st.bg, color:st.color, whiteSpace:"nowrap" }}>{st.label}</span>
                        </td>
                        <td style={{ padding:"8px 10px", fontSize:11, color:"#64748b" }}>{m.next_action}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matches.length > 60 && <div style={{ textAlign:"center", padding:8, fontSize:11, color:"#94a3b8" }}>…and {matches.length-60} more combinations</div>}
            </div>
          ) : (
            <div style={{ padding:"16px", background:"#f8fafc", borderRadius:8, color:"#94a3b8", fontSize:13, textAlign:"center" }}>
              {!matches ? "Loading match results…" : "No driver/truck data available for matching."}
            </div>
          )}
        </div>

        {/* ─── 7. RMIS COMPLIANCE NOTES CLASSIFIER ─────────────── */}
        <div id="s7-rmis" style={card}>
          <SectionHead n={7} label="RMIS Compliance Notes Classifier" />
          {rmisMap.size === 0 ? (
            <div style={{ padding:"14px 16px", background:"#f0fdf4", borderRadius:8, color:"#16a34a", fontWeight:700, fontSize:13 }}>
              ✅ No RMIS compliance notes in this file. All rows show "standard."
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[...rmisMap.entries()].map(([key, entry])=>{
                const clsColor = RMIS_CLS_COLOR[entry.cls.classification]||"#64748b";
                const clsBg    = RMIS_CLS_BG[entry.cls.classification]||"#f8fafc";
                return (
                  <div key={key} style={{ border:`1px solid ${clsColor}33`, borderRadius:10, padding:"14px 16px", background:clsBg }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:800, fontSize:13, color:"#0f172a" }}>"{entry.rows[0].rmis_note}"</span>
                        <span style={{ fontSize:9, fontWeight:800, color:"#fff", background:clsColor, borderRadius:5, padding:"2px 8px" }}>{entry.cls.classification.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:clsColor, background:clsColor+"18", borderRadius:6, padding:"2px 10px" }}>
                        {entry.count} row{entry.count>1?"s":""}
                      </span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10, fontSize:12 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:3 }}>System Meaning</div>
                        <div style={{ color:"#0f172a" }}>{entry.cls.meaning}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:3 }}>Severity</div>
                        <div style={{ color:clsColor, fontWeight:700 }}>
                          {entry.cls.severity==="critical"?"🚫 Dispatch Block":entry.cls.severity==="warning"?"⚠ Needs Review":entry.cls.severity==="low"?"ℹ Verify":"✅ Clear"}
                        </div>
                      </div>
                      {entry.cls.action && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:3 }}>Recommended Action</div>
                          <div style={{ color:"#0f172a" }}>{entry.cls.action}</div>
                        </div>
                      )}
                      {entry.cls.task && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:3 }}>Staff Task to Create</div>
                          <div style={{ color:clsColor, fontWeight:600 }}>{entry.cls.task}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                      {entry.rows.slice(0,5).map((r,i)=>(
                        <span key={i} style={{ padding:"2px 8px", background:"#fff", border:`1px solid ${clsColor}44`, borderRadius:5, fontSize:10, color:"#475569" }}>
                          {r.driver||"?"} / Truck {r.truck||"?"}
                        </span>
                      ))}
                      {entry.rows.length>5&&<span style={{ fontSize:10, color:"#94a3b8", padding:"2px 6px" }}>+{entry.rows.length-5} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 8. CUSTOMER DISPATCH REQUIREMENTS CHECK ─────────── */}
        <div style={card}>
          <SectionHead n={8} label="Customer Dispatch Requirements Check" />
          {customerList.length === 0 ? (
            <div style={{ color:"#94a3b8", fontSize:13 }}>No customer data found in this file.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {customerList.slice(0,6).map(customer=>{
                const cr = analysis.rows.filter(r=>r.customer===customer);
                const hasBlock = cr.some(r=>r.rmis_class.severity==="critical");
                const missingD  = cr.filter(r=>!r.driver).length;
                const missingT  = cr.filter(r=>!r.truck).length;
                const result = hasBlock||missingD>0||missingT>0 ? "Needs Review" : "Ready";
                return (
                  <div key={customer} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:"#0f172a" }}>{customer}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:"#64748b" }}>{cr.length} jobs · {Math.round(cr.reduce((s,r)=>s+r.exp_tickets,0)).toLocaleString()} tickets</span>
                        <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, background:result==="Ready"?"#f0fdf4":"#fef9c3", color:result==="Ready"?"#16a34a":"#ca8a04" }}>{result}</span>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, fontSize:11 }}>
                      {[
                        { h:"Driver Requirements", items:["CDL required","Medical Card required","MVR required"], warn:missingD>0?`${missingD} rows missing driver`:null },
                        { h:"Truck Requirements",  items:["Truck insurance required","Registration required","DOT Inspection required"], warn:missingT>0?`${missingT} rows missing truck`:null },
                        { h:"Owner Operator / COI", items:["Auto Liability COI","General Liability COI","Cargo (override allowed)","Workers Comp (override allowed)"], warn:null },
                      ].map(col=>(
                        <div key={col.h}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>{col.h}</div>
                          {col.items.map(item=>(
                            <div key={item} style={{ display:"flex", alignItems:"center", gap:4, color:"#475569", marginBottom:2 }}>
                              <span style={{ color:"#16a34a", flexShrink:0 }}>✓</span>{item}
                            </div>
                          ))}
                          {col.warn && <div style={{ color:"#dc2626", fontWeight:700, marginTop:4 }}>⚠ {col.warn}</div>}
                          {hasBlock && col.h==="Driver Requirements" && <div style={{ color:"#dc2626", fontWeight:700, marginTop:2 }}>🚫 RMIS block detected</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {customerList.length > 6 && (
                <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center", padding:8 }}>
                  +{customerList.length-6} more customers — full requirements in <Link href="/ronyx/compliance" style={{ color:"#2563eb" }}>Compliance Center</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 9. DISPATCH GUARD PREVIEW ───────────────────────── */}
        <div style={{ ...card, borderLeft:"4px solid #dc2626" }}>
          <SectionHead n={9} label="Dispatch Guard Preview" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:10, marginBottom:14 }}>
            {[
              { label:"Ready to Dispatch",   v:analysis.ready.length,                                             color:"#16a34a", bg:"#f0fdf4" },
              { label:"Needs Review",         v:analysis.review.length,                                           color:"#ca8a04", bg:"#fef9c3" },
              { label:"Dispatch Blocked",     v:analysis.critical.length,                                         color:"#dc2626", bg:"#fee2e2" },
              { label:"RMIS Block Notes",     v:analysis.stats.rmis_critical,                                     color:"#7c3aed", bg:"#f5f3ff" },
              { label:"Missing Driver/Truck", v:analysis.stats.missing_driver+analysis.stats.missing_truck,       color:"#ea580c", bg:"#ffedd5" },
              { label:"Staff Tasks to Create",v:totalStaffTasks,                                                   color:"#0891b2", bg:"#e0f2fe" },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.v.toLocaleString()}</div>
                <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {[
            { text:"Ready rows go to the Ready to Dispatch lane in the Dispatch Board.",           icon:"✅", color:"#16a34a", bg:"#f0fdf4" },
            { text:"Needs Review rows go to the Needs Review queue for staff resolution.",          icon:"⚠",  color:"#ca8a04", bg:"#fef9c3" },
            { text:"Dispatch Block rows are NOT released. They create compliance alerts immediately.", icon:"🚫",color:"#dc2626", bg:"#fee2e2" },
            { text:"Missing driver/truck rows create staff tasks and go to Needs Review.",           icon:"👤", color:"#ea580c", bg:"#ffedd5" },
          ].map(r=>(
            <div key={r.text} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px", background:r.bg, borderRadius:7, fontSize:12, color:r.color, fontWeight:600, marginBottom:6 }}>
              <span style={{ flexShrink:0 }}>{r.icon}</span>{r.text}
            </div>
          ))}

          {/* Inline row preview with filter tabs */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {(["all","ready","needs_review","critical"] as const).map(f=>(
                <button key={f} onClick={()=>setPreviewFilter(f)}
                  style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, cursor:"pointer", background:previewFilter===f?"#0f172a":"#fff", color:previewFilter===f?"#fff":"#475569" }}>
                  {f==="all"?`All (${analysis.rows.length})`:f==="ready"?`✓ Ready (${analysis.ready.length})`:f==="needs_review"?`⚠ Review (${analysis.review.length})`:`🚫 Critical (${analysis.critical.length})`}
                </button>
              ))}
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Status","Start Time","Truck","Driver","Customer","Route","Qty","RMIS"].map(h=>(
                      <th key={h} style={{ padding:"7px 10px", color:"#64748b", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0,25).map((r,i)=>{
                    const rs = r.readiness==="ready"?{color:"#166534",bg:"#dcfce7",label:"Ready"}:r.readiness==="needs_review"?{color:"#92400e",bg:"#fef9c3",label:"Review"}:{color:"#991b1b",bg:"#fee2e2",label:"Block"};
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", background:r.readiness==="critical"?"#fff5f5":r.readiness==="needs_review"?"#fffbeb":"#fff" }}>
                        <td style={{ padding:"6px 10px" }}>
                          <span style={{ fontSize:9, fontWeight:800, color:rs.color, background:rs.bg, borderRadius:4, padding:"2px 6px" }}>{rs.label}</span>
                          {r.issues.slice(0,1).map(iss=><div key={iss} style={{ fontSize:9, color:"#94a3b8", marginTop:1 }}>{iss}</div>)}
                        </td>
                        <td style={{ padding:"6px 10px", color:"#475569", whiteSpace:"nowrap" }}>{r.start_time.slice(0,16)}</td>
                        <td style={{ padding:"6px 10px", fontWeight:800, color:r.truck?"#0f172a":"#dc2626" }}>{r.truck||"—"}</td>
                        <td style={{ padding:"6px 10px", color:r.driver?"#0f172a":"#dc2626", fontWeight:600 }}>{r.driver||"—"}</td>
                        <td style={{ padding:"6px 10px", color:"#475569", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.customer||"—"}</td>
                        <td style={{ padding:"6px 10px", color:"#64748b", maxWidth:160 }}>
                          <div style={{ fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.pickup||"—"}</div>
                          <div style={{ fontSize:9, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>→ {r.dropoff||"—"}</div>
                        </td>
                        <td style={{ padding:"6px 10px", fontWeight:700, color:"#0f172a", textAlign:"right" }}>{r.qty||"—"}</td>
                        <td style={{ padding:"6px 10px", fontSize:10, color:"#64748b", fontStyle:r.rmis_note&&r.rmis_note.toLowerCase()!=="standard"?"italic":"normal", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {r.rmis_note||"standard"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {previewRows.length > 25 && <div style={{ textAlign:"center", padding:8, fontSize:11, color:"#94a3b8" }}>…and {previewRows.length-25} more rows — import to see all</div>}
          </div>
        </div>

        {/* ─── 10. FAST SCAN TICKET EXPECTATIONS ───────────────── */}
        <div style={card}>
          <SectionHead n={10} label="Fast Scan Ticket Expectations" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10, marginBottom:14 }}>
            {[
              { label:"Total Expected Tickets",  v:Math.round(analysis.exp_tickets).toLocaleString(), color:"#1d4ed8", bg:"#eff6ff" },
              { label:"Load Rows",               v:analysis.rows.filter(r=>r.exp_tickets>0).length,   color:"#0891b2", bg:"#e0f2fe" },
              { label:"Hour Rows",               v:analysis.rows.filter(r=>r.exp_time_proof).length,  color:"#7c3aed", bg:"#f5f3ff" },
              { label:"Ticket Required",         v:analysis.rows.filter(r=>r.exp_tickets>0).length,   color:"#16a34a", bg:"#f0fdf4" },
              { label:"Payroll Hold if Missing", v:analysis.rows.filter(r=>r.exp_tickets>0).length,   color:"#ca8a04", bg:"#fef9c3" },
              { label:"Billing Review if Missing",v:analysis.rows.filter(r=>r.exp_tickets>0).length,  color:"#ea580c", bg:"#ffedd5" },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.v}</div>
                <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#0f172a", marginBottom:8 }}>Expected Tickets by Customer</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {analysis.customers.map(c=>(
                <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, flexWrap:"wrap", gap:8 }}>
                  <span style={{ fontWeight:700, color:"#0f172a" }}>{c.name}</span>
                  <div style={{ display:"flex", gap:16 }}>
                    <span style={{ color:"#64748b" }}>{c.rows} jobs</span>
                    <span style={{ fontWeight:700, color:"#1d4ed8" }}>{Math.round(c.tickets).toLocaleString()} tickets</span>
                    <span style={{ fontWeight:600, color:"#ca8a04" }}>POD + Payroll required</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize:11, color:"#64748b", fontStyle:"italic", borderTop:"1px solid #f1f5f9", paddingTop:10 }}>
            Fast Scan staff should expect {Math.round(analysis.exp_tickets).toLocaleString()} ticket proof scans. Jobs missing expected tickets after completion will trigger payroll holds and billing review.
          </div>
        </div>

        {/* ─── 11. STAFF TASKS PREVIEW ─────────────────────────── */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:12 }}>
            <SectionHead n={11} label="Staff Tasks Preview" />
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, fontWeight:700, color:"#0f172a", cursor:"pointer" }}>
              <input type="checkbox" checked={createTasks} onChange={e=>setCreateTasks(e.target.checked)} style={{ width:14, height:14 }} />
              Create Staff Tasks on Import
            </label>
          </div>
          {!staffTasks || staffTasks.length === 0 ? (
            <div style={{ padding:"14px", background:"#f0fdf4", borderRadius:8, color:"#16a34a", fontWeight:700, fontSize:13 }}>✅ No staff tasks needed — file is clean.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
              {staffTasks.map(group=>(
                <div key={group.role} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontWeight:800, fontSize:12, color:"#0f172a", marginBottom:8 }}>{group.role}</div>
                  {group.tasks.map((t,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:5 }}>
                      <span style={{ flexShrink:0, marginTop:1 }}>{t.sev==="critical"?"🚫":t.sev==="warning"?"⚠":"ℹ"}</span>
                      <div>
                        <span style={{ fontSize:11, color:t.sev==="critical"?"#dc2626":t.sev==="warning"?"#ca8a04":"#0891b2", fontWeight:600 }}>{t.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── 12. IMPORT ACTIONS ──────────────────────────────── */}
        <div id="s12-actions" style={{ ...card, border:"2px solid #0f172a" }}>
          <SectionHead n={12} label="Import Actions" />
          <div style={{ background:"#f0fdf4", borderRadius:8, padding:"12px 16px", marginBottom:16, fontSize:12, color:"#166534", fontWeight:600 }}>
            💡 Recommended: <strong>Import Ready Rows Only.</strong> Send missing driver/truck/company rows to staff review before releasing to dispatch.
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
            <button onClick={()=>runImport("ready")} disabled={!!importing||analysis.ready.length===0}
              style={{ padding:"13px 24px", borderRadius:10, border:"none", background:"#16a34a", color:"#fff", fontWeight:900, fontSize:14, cursor:analysis.ready.length===0?"not-allowed":"pointer", opacity:analysis.ready.length===0?0.5:1, whiteSpace:"nowrap" }}>
              {importing==="ready" ? "Importing…" : `✅ Import ${analysis.ready.length} Ready Rows Only`}
            </button>
            <button onClick={()=>runImport("all")} disabled={!!importing}
              style={{ padding:"13px 20px", borderRadius:10, border:"2px solid #0f172a", background:"#fff", color:"#0f172a", fontWeight:800, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              {importing==="all" ? "Importing…" : `Import All ${analysis.rows.length} Rows`}
            </button>
            <button onClick={()=>runImport("staff_only")} disabled={!!importing}
              style={{ padding:"13px 20px", borderRadius:10, border:"2px solid #7c3aed", background:"#f5f3ff", color:"#7c3aed", fontWeight:800, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              📋 Send Needs Review to Staff
            </button>
            <button onClick={()=>{setAnalysis(null);setFilename("");setMatches(null);}} disabled={!!importing}
              style={{ padding:"13px 18px", borderRadius:10, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ✕ Cancel Import
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
            {[
              { label:"Ready Rows", v:analysis.ready.length, color:"#16a34a", bg:"#f0fdf4" },
              { label:"Will Be Reviewed", v:analysis.review.length, color:"#ca8a04", bg:"#fef9c3" },
              { label:"Will Stay Blocked", v:analysis.critical.length, color:"#dc2626", bg:"#fee2e2" },
              { label:"Compliance Alerts", v:analysis.stats.rmis_critical+analysis.stats.rmis_warning, color:"#7c3aed", bg:"#f5f3ff" },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.v}</div>
                <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:"uppercase", marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

      </>)}

      {/* ═══════════════════════════════════════════════════════════
          POST-IMPORT BATCH VIEW
      ═══════════════════════════════════════════════════════════ */}
      {batch && (
        <div>
          <div style={{ ...card, borderLeft:"4px solid #2563eb" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a" }}>✅ {batch.import_name}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                  {batch.total_rows} jobs imported · {batchAlerts.length} compliance alerts · {new Date(batch.created_at).toLocaleString()}
                </div>
              </div>
              <button onClick={()=>{setBatch(null);setBatchJobs([]);setBatchAlerts([]);setBatchFilter("all");}}
                style={{ padding:"9px 18px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#475569", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                ← Upload New Schedule
              </button>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:16 }}>
            {[
              { label:"Total Jobs",   v:batch.total_rows,        color:"#0f172a" },
              { label:"Blocked",      v:batch.blocked_count,     color:"#dc2626" },
              { label:"Needs Docs",   v:batch.needs_docs_count,  color:"#ea580c" },
              { label:"Ready",        v:batch.ready_count,       color:"#16a34a" },
              { label:"Completed",    v:batch.completed_count,   color:"#0891b2" },
              { label:"In Progress",  v:batch.in_progress_count, color:"#2563eb" },
              { label:"To Pickup",    v:batch.to_pickup_count,   color:"#7c3aed" },
              { label:"To Dropoff",   v:batch.to_dropoff_count,  color:"#f59e0b" },
            ].map(s=>(
              <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.v}</div>
                <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {batchAlerts.length > 0 && (
            <div style={{ ...card, borderLeft:"4px solid #dc2626", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:"0.95rem", color:"#0f172a", marginBottom:12 }}>
                🚨 {batchAlerts.length} Compliance Alert{batchAlerts.length>1?"s":""}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {batchAlerts.map((a:any)=>(
                  <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px", borderRadius:8, background:SEV_BG[a.severity]||"#f8fafc", border:`1px solid ${SEV_COLOR[a.severity]||"#e2e8f0"}22` }}>
                    <span style={{ padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:800, background:SEV_COLOR[a.severity]||"#94a3b8", color:"#fff", whiteSpace:"nowrap", marginTop:1 }}>
                      {SEV_LABEL[a.severity]||a.severity?.toUpperCase()}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:"#0f172a" }}>{a.title}</div>
                      <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{a.message}</div>
                      {a.recommended_action && <div style={{ fontSize:11, color:"#1d4ed8", marginTop:2, fontWeight:600 }}>→ {a.recommended_action}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {[
              { key:"all",        label:`All (${batchJobs.length})` },
              { key:"blocked",    label:`🚨 Blocked (${batchJobs.filter((j:any)=>j.compliance_severity==="critical").length})` },
              { key:"needs_docs", label:`⚠ Needs Docs (${batchJobs.filter((j:any)=>["high","warning"].includes(j.compliance_severity)).length})` },
              { key:"ready",      label:`✅ Ready (${batchJobs.filter((j:any)=>["clear","low"].includes(j.compliance_severity)).length})` },
            ].map(f=>(
              <button key={f.key} onClick={()=>setBatchFilter(f.key)}
                style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0", background:batchFilter===f.key?"#0f172a":"#fff", color:batchFilter===f.key?"#fff":"#475569", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ ...card, padding:0, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Compliance","Truck","Driver","Job ID","Route","Qty","RMIS Note"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j:any)=>(
                    <tr key={j.id} style={{ borderBottom:"1px solid #f1f5f9", background:j.compliance_severity==="critical"?"#fff5f5":"transparent" }}>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:800, color:SEV_COLOR[j.compliance_severity]||"#64748b", background:(SEV_COLOR[j.compliance_severity]||"#64748b")+"18", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>
                          {SEV_LABEL[j.compliance_severity]||j.compliance_status?.toUpperCase()}
                        </span>
                        {j.compliance_issue&&<div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{j.compliance_issue}</div>}
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:800, color:"#0f172a" }}>{j.truck_number||"—"}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <div style={{ fontWeight:600, color:"#0f172a" }}>{j.driver_name||"—"}</div>
                        {j.vendor_name&&<div style={{ fontSize:10, color:"#94a3b8" }}>{j.vendor_name}</div>}
                      </td>
                      <td style={{ padding:"9px 12px", color:"#6366f1", fontWeight:700 }}>{j.friendly_job_id||"—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569", maxWidth:220 }}>
                        <div style={{ fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.pickup_site_name||"—"}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>→ {j.dropoff_site_name||"—"}</div>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:"#0f172a", textAlign:"right" }}>{j.job_quantity??""}</td>
                      <td style={{ padding:"9px 12px", fontSize:11, color:"#64748b", fontStyle:"italic", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {j.rmis_note&&j.rmis_note.toLowerCase()!=="standard"?j.rmis_note:"standard"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredJobs.length===0&&<div style={{ textAlign:"center", padding:"32px", color:"#94a3b8", fontSize:13 }}>No jobs match this filter.</div>}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 13 — IMPORT HISTORY / AUDIT LOG
      ═══════════════════════════════════════════════════════════ */}
      {pastImports.length > 0 && (
        <div style={{ ...card, marginTop:8 }}>
          <SectionHead n={13} label="Import History / Audit Log" />
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                  {["Import Name","Date","Rows","Ready","Needs Docs","Blocked","Completed","Actions"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", color:"#64748b", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastImports.map(imp=>(
                  <tr key={imp.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"9px 10px", fontWeight:700, color:"#0f172a" }}>{imp.import_name}</td>
                    <td style={{ padding:"9px 10px", color:"#64748b", whiteSpace:"nowrap" }}>{new Date(imp.created_at).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                    <td style={{ padding:"9px 10px", fontWeight:800, color:"#0f172a", textAlign:"right" }}>{imp.total_rows}</td>
                    <td style={{ padding:"9px 10px", fontWeight:700, color:"#16a34a", textAlign:"right" }}>{imp.ready_count}</td>
                    <td style={{ padding:"9px 10px", fontWeight:700, color:"#ca8a04", textAlign:"right" }}>{imp.needs_docs_count}</td>
                    <td style={{ padding:"9px 10px", fontWeight:700, color: imp.blocked_count>0?"#dc2626":"#94a3b8", textAlign:"right" }}>{imp.blocked_count}</td>
                    <td style={{ padding:"9px 10px", fontWeight:700, color:"#0891b2", textAlign:"right" }}>{imp.completed_count}</td>
                    <td style={{ padding:"9px 10px" }}>
                      <button onClick={()=>loadBatch(imp.id)}
                        style={{ padding:"5px 12px", borderRadius:6, background:"#0f172a", color:"#fff", border:"none", fontWeight:700, fontSize:11, cursor:"pointer" }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
