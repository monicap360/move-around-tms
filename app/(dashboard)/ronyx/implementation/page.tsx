"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Color tokens ──────────────────────────────────────────────────────────────
const BG   = "#0b0f1c";
const CARD = "#0f1628";
const BORD = "rgba(255,255,255,0.07)";
const TXT  = "#e2e8f0";
const MUTE = "#64748b";
const BLUE = "#3b82f6";
const GRN  = "#10b981";
const AMB  = "#f59e0b";
const RED  = "#ef4444";
const PURP = "#8b5cf6";
const CYAN = "#06b6d4";

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = "overview" | "launch-plan" | "my-work" | "training" | "data-imports" | "support" | "feedback" | "go-live" | "audit-log";

type ImportPhase = {
  key: string; label: string; subtitle: string; icon: string;
  csvHeaders: string[]; exampleRow: string[];
  endpoint: string; table: string; dispatchMode?: boolean;
};

type SessionRow = {
  phase: string; status: string; import_count: number;
  error_count: number; last_error: string | null; completed_at: string | null;
};

type ParsedRow = Record<string, string>;

// ── Static config ─────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",     label: "Overview",         icon: "⌂"  },
  { id: "launch-plan",  label: "Launch Plan",      icon: "📅" },
  { id: "my-work",      label: "My Work",          icon: "✓"  },
  { id: "training",     label: "Team Training",    icon: "🎓" },
  { id: "data-imports", label: "Data Imports",     icon: "📥" },
  { id: "support",      label: "Support Center",   icon: "💬" },
  { id: "feedback",     label: "Feedback & Ideas", icon: "💡" },
  { id: "go-live",      label: "Go-Live Control",  icon: "🚀" },
  { id: "audit-log",    label: "Audit Log",        icon: "📋" },
];

const BLOCKERS = [
  { id: "b1", title: "Upload missing driver documents",      description: "9 drivers are missing CDL, MVR, or medical certificates — they cannot be dispatched or included in payroll.", module: "Driver Profiles", owner: "Compliance",     due: "Jul 8",  action: "Review Drivers", href: "/ronyx/drivers"       },
  { id: "b2", title: "Configure payroll rate rules",         description: "12 drivers have no approved pay rates. Payroll cannot run until each driver has a rate configured.",            module: "Payroll",         owner: "Payroll Manager", due: "Jul 10", action: "Configure Rates", href: "/ronyx/payroll"       },
  { id: "b3", title: "Confirm truck compliance documents",   description: "4 trucks are missing registration or insurance docs required for dispatch eligibility.",                         module: "Fleet",           owner: "Fleet Manager",   due: "Jul 12", action: "Review Fleet",    href: "/ronyx/fleet/trucks" },
];

const PIPELINE = [
  { n:1, title:"Foundation",            desc:"Organization setup, branding, staff accounts, permissions",       status:"complete",     pct:100, tasks:8,  owner:"Account Manager",    due:"Jun 1, 2026",  blockers:0 },
  { n:2, title:"People & Assets",       desc:"Drivers, owner operators, trucks, compliance documents",          status:"in_progress",  pct:65,  tasks:24, owner:"Compliance Admin",   due:"Jul 5, 2026",  blockers:2 },
  { n:3, title:"Operations",            desc:"Customers, projects, rate cards, dispatch workflow",              status:"needs_review", pct:40,  tasks:18, owner:"Dispatcher",          due:"Jul 8, 2026",  blockers:1 },
  { n:4, title:"Ticket & Revenue Flow", desc:"Fast Scan, ticket approval, payroll, billing workflow",           status:"not_started",  pct:0,   tasks:22, owner:"Billing Admin",       due:"Jul 12, 2026", blockers:0 },
  { n:5, title:"Team Training",         desc:"Dispatcher, payroll, compliance, driver mobile training",         status:"in_progress",  pct:55,  tasks:14, owner:"Operations Manager",  due:"Jul 13, 2026", blockers:0 },
  { n:6, title:"Go-Live Readiness",     desc:"Final audit, first live dispatch, first payroll, first invoice",  status:"blocked",      pct:15,  tasks:11, owner:"Account Manager",     due:"Jul 15, 2026", blockers:3 },
];

const TRAINING_CARDS = [
  { role:"Dispatcher",       icon:"📡", done:3, total:5,  users:3, color:BLUE },
  { role:"Payroll Staff",    icon:"💵", done:1, total:6,  users:1, color:GRN  },
  { role:"Compliance Staff", icon:"🛡️", done:4, total:4,  users:2, color:PURP },
  { role:"Billing Admin",    icon:"🧾", done:2, total:5,  users:1, color:CYAN },
  { role:"Fleet Manager",    icon:"🚛", done:0, total:4,  users:0, color:AMB  },
  { role:"Drivers (Mobile)", icon:"📱", done:7, total:18, users:7, color:BLUE },
];

const MY_WORK: Record<string, { task:string; priority:"critical"|"high"|"normal"; due:string }[]> = {
  compliance: [
    { task:"Review 9 missing driver documents (CDL, MVR, medical)", priority:"critical", due:"Jul 8"  },
    { task:"Approve 4 expiring medical cards",                       priority:"high",     due:"Jul 10" },
    { task:"Upload 2 pending MVR documents",                         priority:"normal",   due:"Jul 12" },
  ],
  dispatcher: [
    { task:"Confirm rate cards for 3 active projects",         priority:"high",     due:"Jul 8"  },
    { task:"Test dispatch workflow with 2 sample jobs",        priority:"normal",   due:"Jul 10" },
    { task:"Review RMIS compliance before first live dispatch",priority:"critical", due:"Jul 12" },
  ],
  payroll: [
    { task:"Configure pay rates for 12 drivers",    priority:"critical", due:"Jul 8"  },
    { task:"Review ticket-to-pay rules",            priority:"high",     due:"Jul 10" },
    { task:"Complete first payroll test run",       priority:"normal",   due:"Jul 13" },
  ],
  billing: [
    { task:"Confirm invoice template",                       priority:"normal", due:"Jul 10" },
    { task:"Review billing-ready ticket workflow end-to-end",priority:"high",   due:"Jul 11" },
    { task:"Test first customer invoice generation",         priority:"normal", due:"Jul 13" },
  ],
  fleet: [
    { task:"Upload 4 missing truck registration documents", priority:"critical", due:"Jul 8"  },
    { task:"Review truck insurance expiration dates",       priority:"high",     due:"Jul 10" },
    { task:"Add 2 trucks to annual inspection schedule",    priority:"normal",   due:"Jul 12" },
  ],
  admin: [
    { task:"Assign staff permissions for 5 pending users",       priority:"high",     due:"Jul 5"  },
    { task:"Review owner operator setup for 3 companies",        priority:"normal",   due:"Jul 8"  },
    { task:"Confirm go-live approval chain with all dept. heads",priority:"critical", due:"Jul 13" },
  ],
};

const SUPPORT_TICKETS = [
  { id:"SR-001", title:"Which column maps to RMIS note in dispatch CSV?", type:"How-To Question",  status:"open", priority:"high",   module:"Dispatch", updated:"Today at 10:42 AM", contact:"MoveAround Support" },
  { id:"SR-002", title:"Payroll rate import showing duplicate error",      type:"Data Import Help", status:"open", priority:"normal", module:"Payroll",  updated:"Jun 18, 2026",      contact:"MoveAround Support" },
];

const SUPPORT_TYPES = ["System Problem","How-To Question","Data Import Help","Training Request","Feature Request","Billing Question","Urgent Dispatch Issue","Payroll Issue","Compliance Issue"];

const GO_LIVE_CHECKS = [
  { id:"gl1",  label:"Staff owner assigned",              done:true  },
  { id:"gl2",  label:"Driver records imported",           done:true  },
  { id:"gl3",  label:"Trucks imported",                   done:true  },
  { id:"gl4",  label:"Compliance documents reviewed",     done:false },
  { id:"gl5",  label:"Rate cards configured",             done:false },
  { id:"gl6",  label:"Payroll rules configured",          done:true  },
  { id:"gl7",  label:"Billing rules configured",          done:true  },
  { id:"gl8",  label:"Ticket workflow tested",            done:true  },
  { id:"gl9",  label:"First dispatch test completed",     done:false },
  { id:"gl10", label:"First payroll test completed",      done:true  },
  { id:"gl11", label:"First invoice test completed",      done:true  },
];

const AUDIT_LOG = [
  { ts:"Jun 20 · 09:12", user:"Monica P.", action:"Uploaded Daily Dispatch CSV",          module:"Dispatch",   result:"42 jobs imported"      },
  { ts:"Jun 18 · 14:33", user:"Monica P.", action:"Imported Drivers batch",               module:"Drivers",    result:"18 records"            },
  { ts:"Jun 18 · 11:00", user:"Monica P.", action:"Imported Trucks batch",                module:"Fleet",      result:"12 records"            },
  { ts:"Jun 15 · 10:20", user:"Monica P.", action:"Imported Customers batch",             module:"Customers",  result:"8 records"             },
  { ts:"Jun 14 · 16:45", user:"System",    action:"Dispatch Guard™ automated run",        module:"Dispatch",   result:"3 compliance alerts"   },
  { ts:"Jun 14 · 08:00", user:"Monica P.", action:"Opened Support Request SR-002",        module:"Payroll",    result:"Awaiting response"     },
  { ts:"Jun 13 · 15:30", user:"System",    action:"Larry readiness scan completed",       module:"All",        result:"Readiness: 68%"        },
  { ts:"Jun 10 · 09:00", user:"Monica P.", action:"Imported Owner Operators batch",       module:"Owner Ops",  result:"16 companies"          },
];

const IMPORT_PHASES: ImportPhase[] = [
  { key:"customers",         label:"Customers",         subtitle:"Companies you haul for",                                    icon:"🏢", csvHeaders:["customer_name","contact_name","contact_email","contact_phone","billing_address","notes"],                                                                                                                            exampleRow:["Martin Marietta","Jane Smith","jsmith@mm.com","409-555-0100","100 Commerce Dr, Houston TX","Net 30"],                                                    endpoint:"/api/ronyx/implementation/import", table:"ronyx_customers"    },
  { key:"drivers",           label:"Drivers",           subtitle:"W2 and 1099 drivers",                                       icon:"🧑‍✈️", csvHeaders:["full_name","phone","email","license_number","license_state","license_expiration_date","hire_date","pay_rate","equipment_type","status"],                                                                        exampleRow:["John Doe","409-555-0200","jdoe@email.com","TX1234567","TX","2027-06-01","2024-01-15","0.85","Dump Truck","active"],                                        endpoint:"/api/ronyx/implementation/import", table:"driver_profiles"    },
  { key:"trucks",            label:"Trucks & Equipment",subtitle:"Your fleet",                                                icon:"🚛", csvHeaders:["truck_number","make","model","year","vin","plate","truck_type","status","notes"],                                                                                                                               exampleRow:["T-101","Peterbilt","389","2022","1NP5LB9X1ND123456","TX-AB1234","End Dump","active","Primary unit"],                                                     endpoint:"/api/ronyx/implementation/import", table:"ronyx_trucks"       },
  { key:"owner_operators",   label:"Owner Operators",   subtitle:"Sub-haulers and OO companies",                             icon:"🤝", csvHeaders:["company_name","contact_name","contact_phone","contact_email","mc_number","dot_number","ein","business_address","status"],                                                                                       exampleRow:["1974 Trucking LLC","Mike Rivera","409-555-0300","m.rivera@1974trucking.com","MC-123456","DOT-789012","12-3456789","200 Port Rd, Galveston TX","active"],    endpoint:"/api/ronyx/implementation/import", table:"ronyx_owner_operators" },
  { key:"historical_tickets",label:"Historical Tickets",subtitle:"Past load tickets for baseline payroll and billing",       icon:"🗂️", csvHeaders:["ticket_number","ticket_date","driver_name","truck_number","job_name","material","unit_type","quantity","pay_rate","bill_rate","status"],                                                                        exampleRow:["T-2025-001","2025-06-01","John Doe","T-101","Martin Marietta - Galveston","Crushed Limestone","Ton","22.5","9.00","14.50","paid"],                        endpoint:"/api/ronyx/implementation/import", table:"aggregate_tickets"  },
  { key:"daily_dispatch",    label:"Daily Dispatch",    subtitle:"Import today's dispatch sheet — populates Dispatch Command Center", icon:"📋", csvHeaders:["Driver","Truck Number","See Notes!!","Customer","Start Time","Pickup Site Name","Dropoff Site Name","Job Quantity","Job Quantity Unit","Material","Friendly Job ID","Vendor","Equipment License Number","Job Status"], exampleRow:["John Doe","T-101","Have DL & Medical","Martin Marietta","2026-06-20 06:00","Vulcan Materials","Martin Marietta Galveston","1","Load","Crushed Limestone","MM-001","Vulcan","TX AB1234","scheduled"], endpoint:"/api/ronyx/dispatch-import", table:"", dispatchMode:true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildCsv(headers: string[], example: string[]): string {
  const esc = (v: string) => v.includes(",") ? `"${v}"` : v;
  return [headers.map(esc).join(","), example.map(esc).join(",")].join("\n");
}

function parseLine(line: string): string[] {
  const vals: string[] = []; let cur = "", inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  vals.push(cur.trim());
  return vals;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const hdrs = parseLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).map(l => Object.fromEntries(hdrs.map((h, i) => [h, parseLine(l)[i] ?? ""]))).filter(r => Object.values(r).some(v => v));
}

function parseCsvRaw(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const hdrs = parseLine(lines[0]);
  return lines.slice(1).map(l => Object.fromEntries(hdrs.map((h, i) => [h, parseLine(l)[i] ?? ""]))).filter(r => Object.values(r).some(v => v));
}

function sevColor(s: string) { return s === "critical" ? RED : s === "high" ? AMB : s === "normal" ? BLUE : GRN; }
function sevBg(s: string)    { return s === "critical" ? "rgba(239,68,68,0.08)" : s === "high" ? "rgba(245,158,11,0.08)" : s === "normal" ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.08)"; }
function statusColor(s: string) { return s === "complete" ? GRN : s === "in_progress" ? BLUE : s === "needs_review" ? AMB : s === "blocked" ? RED : MUTE; }
function statusLabel(s: string) { return s === "complete" ? "Complete" : s === "in_progress" ? "In Progress" : s === "needs_review" ? "Needs Review" : s === "blocked" ? "Blocked" : "Not Started"; }

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerLaunchCenterPage() {
  const [tab, setTab]       = useState<TabId>("overview");
  const [sessions, setSessions]   = useState<Record<string, SessionRow>>({});
  const [activePhase, setActivePhase]   = useState<string | null>(null);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [preview, setPreview]           = useState<ParsedRow[]>([]);
  const [dispatchImportId, setDispatchImportId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [myRole, setMyRole] = useState("compliance");
  const [glChecks, setGlChecks] = useState(() => GO_LIVE_CHECKS.map(c => ({ ...c })));
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [supportForm, setSupportForm]       = useState(false);
  const [supportType, setSupportType]       = useState("How-To Question");
  const [supportTitle, setSupportTitle]     = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [feedbackText, setFeedbackText]     = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => { void loadSessions(); }, []);

  async function loadSessions() {
    try {
      const res = await fetch("/api/ronyx/implementation");
      const data = await res.json();
      const map: Record<string, SessionRow> = {};
      for (const row of (data.sessions ?? [])) map[row.phase] = row;
      setSessions(map);
    } catch {}
  }

  function downloadTemplate(phase: ImportPhase) {
    const csv = buildCsv(phase.csvHeaders, phase.exampleRow);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `movearound_${phase.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPreview(parseCsv(ev.target?.result as string).slice(0, 5)); setImportResult(null); };
    reader.readAsText(file);
  }, []);

  async function runImport(phase: ImportPhase) {
    const file = fileRef.current?.files?.[0]; if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text); if (!rows.length) return;
    setImporting(true); setImportResult(null); setDispatchImportId(null);
    try {
      if (phase.dispatchMode) {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch("/api/ronyx/dispatch-import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: parseCsvRaw(text), file_name: file.name, schedule_date: today, import_name: `Dispatch ${today}`, create_tasks: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Dispatch import failed");
        setDispatchImportId(data.import_id ?? null);
        setImportResult({ inserted: data.jobs_created ?? 0, errors: [] });
        setSessions(prev => ({ ...prev, daily_dispatch: { phase: "daily_dispatch", status: "complete", import_count: data.jobs_created ?? 0, error_count: 0, last_error: null, completed_at: new Date().toISOString() } }));
      } else {
        const res = await fetch("/api/ronyx/implementation/import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: phase.key, table: phase.table, rows }),
        });
        const data = await res.json();
        setImportResult({ inserted: data.inserted ?? 0, errors: data.errors ?? [] });
        await loadSessions();
      }
    } catch (err) { setImportResult({ inserted: 0, errors: [(err as Error).message] }); }
    finally { setImporting(false); }
  }

  const glBlocked = glChecks.filter(c => !c.done).length;
  const dataPct   = IMPORT_PHASES.length > 0 ? Math.round((IMPORT_PHASES.filter(p => sessions[p.key]?.status === "complete").length / IMPORT_PHASES.length) * 100) : 0;

  // ─── Overview ──────────────────────────────────────────────────────────────
  function renderOverview() {
    return (
      <div>
        {/* KPI Row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
          {[
            { label:"Launch Readiness",    value:"68%",       sub:"Overall system setup progress",      color:BLUE, icon:"📊" },
            { label:"Critical Blockers",   value:"3",         sub:"Items preventing full go-live",       color:RED,  icon:"🔴" },
            { label:"Tasks Due This Week", value:"8",         sub:"Assigned onboarding work",            color:AMB,  icon:"📅" },
            { label:"Staff Trained",       value:"4 of 9",    sub:"Users who completed role training",   color:GRN,  icon:"🎓" },
            { label:"Data Imported",       value:`${dataPct || 72}%`, sub:"Drivers, trucks, projects, rates, tickets", color:PURP, icon:"📥" },
            { label:"Support Requests",    value:"2 Open",    sub:"Priority requests needing attention", color:CYAN, icon:"💬" },
          ].map(k => (
            <div key={k.label} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, padding:"20px 22px", borderTop:`3px solid ${k.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", color:MUTE, marginBottom:6 }}>{k.label}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:12, color:MUTE, marginTop:5 }}>{k.sub}</div>
                </div>
                <span style={{ fontSize:22, opacity:0.5 }}>{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Do This First */}
        <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.22)", borderRadius:16, padding:24, marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <span style={{ fontSize:22 }}>🚨</span>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:RED }}>Do This First™</div>
              <div style={{ fontSize:13, color:"#fca5a5", marginTop:1 }}>3 items are blocking your go-live. Resolve these before anything else.</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
            {BLOCKERS.map((b, i) => (
              <div key={b.id} style={{ background:"rgba(10,15,30,0.7)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:"16px 18px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:RED, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:TXT, marginBottom:4 }}>{b.title}</div>
                    <div style={{ fontSize:13, color:"#94a3b8", marginBottom:10 }}>{b.description}</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" as const, alignItems:"center", fontSize:12 }}>
                      <span style={{ background:"rgba(239,68,68,0.12)", color:RED, padding:"2px 8px", borderRadius:5, fontWeight:700 }}>Critical</span>
                      <span style={{ color:MUTE }}>Owner: <b style={{ color:"#94a3b8" }}>{b.owner}</b></span>
                      <span style={{ color:MUTE }}>Module: <b style={{ color:"#94a3b8" }}>{b.module}</b></span>
                      <span style={{ color:MUTE }}>Due: <b style={{ color:AMB }}>{b.due}</b></span>
                    </div>
                  </div>
                  <a href={b.href} style={{ background:RED, color:"#fff", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" as const, flexShrink:0 }}>{b.action} →</a>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" as const }}>
            {["Resolve Next Task","Assign Staff Member","Send Reminder","Mark Complete","View All Blockers"].map(btn => (
              <button key={btn} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#fca5a5", padding:"7px 13px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>{btn}</button>
            ))}
          </div>
        </div>

        {/* Larry */}
        <div style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.22)", borderRadius:16, padding:24, marginBottom:24 }}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:50, height:50, borderRadius:14, background:"rgba(139,92,246,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🤖</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:16, color:PURP, marginBottom:2 }}>Larry — Your Launch Guide™</div>
              <div style={{ fontSize:12, color:MUTE, marginBottom:12 }}>Larry watches your setup progress, finds missing information, and gives your staff the next best action.</div>
              <div style={{ background:"rgba(139,92,246,0.09)", border:"1px solid rgba(139,92,246,0.18)", borderRadius:10, padding:"14px 16px", marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", color:PURP, marginBottom:6 }}>Today's Recommendation</div>
                <div style={{ fontSize:14, color:TXT, lineHeight:1.65 }}>
                  Finish driver document review <b>before</b> importing payroll rates. 9 drivers have missing CDL, MVR, or medical certificates. Resolving compliance first prevents downstream payroll holds and RMIS dispatch blocks that will delay your go-live.
                </div>
              </div>
              <div style={{ fontSize:12, color:"#a78bfa", marginBottom:12 }}>
                Watching: Drivers · Fleet · Compliance · Dispatch · Tickets · Payroll · Billing · Staff Training · Data Imports
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" as const }}>
                <button style={{ background:PURP, color:"#fff", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:700, border:"none", cursor:"pointer" }}>Start Recommended Task</button>
                <button style={{ background:"rgba(139,92,246,0.14)", color:PURP, border:"1px solid rgba(139,92,246,0.28)", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>Ask Larry</button>
                <button onClick={() => setTab("launch-plan")} style={{ background:"transparent", color:MUTE, border:`1px solid ${BORD}`, padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>View Launch Checklist</button>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline summary */}
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ fontWeight:800, fontSize:16, color:TXT }}>Launch Pipeline</div>
            <button onClick={() => setTab("launch-plan")} style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.22)", color:BLUE, padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>View Full Plan →</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
            {PIPELINE.map(p => (
              <div key={p.n} style={{ display:"flex", alignItems:"center", gap:14, background:p.status==="complete" ? "rgba(16,185,129,0.05)" : p.status==="blocked" ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)", border:`1px solid ${statusColor(p.status)}18`, borderRadius:10, padding:"12px 16px" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`${statusColor(p.status)}18`, border:`2px solid ${statusColor(p.status)}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:statusColor(p.status), flexShrink:0 }}>{p.n}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:TXT }}>{p.title}</span>
                    {p.blockers > 0 && <span style={{ fontSize:10, background:"rgba(239,68,68,0.12)", color:RED, padding:"2px 7px", borderRadius:5, fontWeight:700 }}>{p.blockers} BLOCKED</span>}
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${p.pct}%`, background:statusColor(p.status), borderRadius:999 }} />
                  </div>
                </div>
                <div style={{ textAlign:"right" as const, flexShrink:0, minWidth:72 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:statusColor(p.status) }}>{p.pct}%</div>
                  <div style={{ fontSize:11, color:MUTE }}>{statusLabel(p.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Launch Plan ───────────────────────────────────────────────────────────
  function renderLaunchPlan() {
    return (
      <div>
        <div style={{ fontSize:13, color:MUTE, marginBottom:20 }}>6 phases from initial setup to first live dispatch and invoice. Complete in order.</div>
        {PIPELINE.map((p, idx) => {
          const isOpen = expandedPhase === idx;
          return (
            <div key={p.n} style={{ background:CARD, border:`1px solid ${isOpen ? statusColor(p.status) : BORD}`, borderRadius:14, marginBottom:10, overflow:"hidden" }}>
              <button onClick={() => setExpandedPhase(isOpen ? null : idx)} style={{ width:"100%", display:"flex", alignItems:"center", gap:16, padding:"18px 22px", background:"none", border:"none", cursor:"pointer", textAlign:"left" as const }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`${statusColor(p.status)}14`, border:`2px solid ${statusColor(p.status)}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:statusColor(p.status), flexShrink:0 }}>{p.n}</div>
                <div style={{ flex:1, textAlign:"left" as const }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontWeight:800, fontSize:15, color:TXT }}>Phase {p.n}: {p.title}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5, fontWeight:700, background:`${statusColor(p.status)}14`, color:statusColor(p.status) }}>{statusLabel(p.status)}</span>
                    {p.blockers > 0 && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5, fontWeight:700, background:"rgba(239,68,68,0.1)", color:RED }}>{p.blockers} blocker{p.blockers>1?"s":""}</span>}
                  </div>
                  <div style={{ fontSize:13, color:MUTE }}>{p.desc}</div>
                </div>
                <div style={{ flexShrink:0, textAlign:"right" as const, marginRight:8 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:statusColor(p.status) }}>{p.pct}%</div>
                  <div style={{ fontSize:11, color:MUTE }}>{p.tasks} tasks</div>
                </div>
                <span style={{ color:MUTE, fontSize:16 }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div style={{ borderTop:`1px solid ${BORD}`, padding:"18px 22px" }}>
                  <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden", marginBottom:16 }}>
                    <div style={{ height:"100%", width:`${p.pct}%`, background:statusColor(p.status), borderRadius:999 }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                    {[["Owner", p.owner, TXT],["Due Date", p.due, p.status==="blocked" ? RED : AMB],["Remaining", `${p.tasks - Math.floor(p.tasks*p.pct/100)} of ${p.tasks} tasks`, TXT]].map(([label, value, color]) => (
                      <div key={label as string} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 14px" }}>
                        <div style={{ fontSize:11, color:MUTE, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:color as string }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {p.blockers > 0 && (
                    <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.18)", borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
                      <div style={{ fontSize:13, color:RED, fontWeight:700 }}>⚠ {p.blockers} blocker{p.blockers>1?"s":""} — phase is waiting on unresolved critical items</div>
                    </div>
                  )}
                  <button style={{ background:BLUE, color:"#fff", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:700, border:"none", cursor:"pointer" }}>View Phase Tasks →</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── My Work ───────────────────────────────────────────────────────────────
  function renderMyWork() {
    const tasks = MY_WORK[myRole] ?? [];
    return (
      <div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, color:MUTE, marginBottom:10 }}>Select your role to see your personalized task list:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {Object.keys(MY_WORK).map(r => (
              <button key={r} onClick={() => setMyRole(r)} style={{ padding:"8px 16px", borderRadius:999, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", background:myRole===r ? BLUE : "rgba(255,255,255,0.05)", color:myRole===r ? "#fff" : MUTE, textTransform:"capitalize" as const }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, padding:22 }}>
          <div style={{ fontWeight:800, fontSize:15, color:TXT, marginBottom:4, textTransform:"capitalize" as const }}>{myRole} — Work Today</div>
          <div style={{ fontSize:13, color:MUTE, marginBottom:18 }}>{tasks.length} task{tasks.length!==1?"s":""} assigned</div>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, background:sevBg(t.priority), border:`1px solid ${sevColor(t.priority)}20`, borderRadius:10, padding:"13px 16px" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:sevColor(t.priority), flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:TXT }}>{t.task}</div>
                  <div style={{ fontSize:12, color:MUTE, marginTop:2 }}>Due: <span style={{ color:t.priority==="critical" ? RED : AMB }}>{t.due}</span></div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:5, background:sevColor(t.priority)+"20", color:sevColor(t.priority), flexShrink:0, textTransform:"uppercase" as const }}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Team Training ────────────────────────────────────────────────────────
  function renderTraining() {
    return (
      <div>
        <div style={{ fontSize:13, color:MUTE, marginBottom:20 }}>Track training completion by role. Share role-specific modules with each staff member on day one.</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
          {TRAINING_CARDS.map(t => {
            const pct = t.total > 0 ? Math.round(t.done/t.total*100) : 0;
            const done = pct === 100;
            return (
              <div key={t.role} style={{ background:CARD, border:`1px solid ${done ? t.color+"44" : BORD}`, borderRadius:14, padding:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <span style={{ fontSize:24 }}>{t.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:TXT }}>{t.role}</div>
                    <div style={{ fontSize:12, color:MUTE }}>{t.users} user{t.users!==1?"s":""}</div>
                  </div>
                  {done && <span style={{ fontSize:11, background:GRN+"22", color:GRN, padding:"3px 9px", borderRadius:5, fontWeight:700 }}>✓ Complete</span>}
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:999, overflow:"hidden", marginBottom:8 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:t.color, borderRadius:999 }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:MUTE }}>{t.done} of {t.total} lessons complete</span>
                  <button style={{ background:`${t.color}20`, color:t.color, border:"none", padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    {done ? "View Certificate" : t.done > 0 ? "Continue Training" : "Start Training"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:"rgba(59,130,246,0.05)", border:"1px solid rgba(59,130,246,0.18)", borderRadius:12, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:BLUE, marginBottom:12 }}>Training Topics Available</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {["Dispatch Board","Driver Profiles","Fleet & Maintenance","Fast Scan Ticket Upload","Payroll Review","Billing Ready Queue","Compliance Center","Driver Mobile Ticket Upload"].map(t => (
              <span key={t} style={{ background:"rgba(59,130,246,0.1)", color:BLUE, padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Data Imports ─────────────────────────────────────────────────────────
  function renderDataImports() {
    const done  = IMPORT_PHASES.filter(p => sessions[p.key]?.status === "complete").length;
    const pct   = IMPORT_PHASES.length > 0 ? Math.round(done/IMPORT_PHASES.length*100) : 0;
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:13, color:MUTE }}><span style={{ color:GRN, fontWeight:700 }}>{done} of {IMPORT_PHASES.length}</span> import phases complete</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:GRN }}>{pct}%</span>
            <div style={{ width:160, height:6, background:"rgba(255,255,255,0.07)", borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:GRN, borderRadius:999 }} />
            </div>
          </div>
        </div>
        {IMPORT_PHASES.map((phase, idx) => {
          const session = sessions[phase.key];
          const isDone  = session?.status === "complete";
          const isOpen  = activePhase === phase.key;
          return (
            <div key={phase.key} style={{ background:CARD, border:`1px solid ${isOpen ? BLUE : isDone ? GRN+"44" : BORD}`, borderRadius:14, marginBottom:10, overflow:"hidden" }}>
              <button onClick={() => { setActivePhase(isOpen ? null : phase.key); setPreview([]); setImportResult(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" as const }}>
                <span style={{ fontSize:20 }}>{phase.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:TXT }}>Phase {idx+1}: {phase.label}</div>
                  <div style={{ fontSize:12, color:MUTE }}>{phase.subtitle}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {isDone && <span style={{ background:GRN+"22", color:GRN, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>✓ {session.import_count} imported</span>}
                  {session?.status === "error" && <span style={{ background:RED+"22", color:RED, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>Error</span>}
                  <span style={{ color:MUTE, fontSize:16 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${BORD}` }}>
                  <p style={{ fontSize:13, color:MUTE, marginTop:12, marginBottom:14 }}>
                    {phase.dispatchMode ? "Upload your dispatch CSV to populate the Dispatch Command Center. Each row creates a job with automatic RMIS compliance classification." : `Download the template, fill it with your ${phase.label.toLowerCase()} data, then upload it. Each row becomes a live record in the system.`}
                  </p>
                  <button onClick={() => downloadTemplate(phase)} style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.22)", color:BLUE, padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:14 }}>
                    ⬇ Download {phase.label} Template (.csv)
                  </button>
                  <div style={{ background:"#070b14", borderRadius:8, padding:12, marginBottom:14 }}>
                    <div style={{ fontSize:11, color:MUTE, marginBottom:6, fontWeight:600 }}>COLUMNS</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                      {phase.csvHeaders.map(h => <span key={h} style={{ background:"rgba(255,255,255,0.05)", color:"#94a3b8", padding:"3px 8px", borderRadius:5, fontSize:11, fontFamily:"monospace" }}>{h}</span>)}
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display:"block", marginBottom:10, fontSize:13, color:MUTE }} />
                  {preview.length > 0 && (
                    <div style={{ overflowX:"auto", marginBottom:14 }}>
                      <div style={{ fontSize:12, color:BLUE, fontWeight:600, marginBottom:6 }}>Preview — first 5 rows</div>
                      <table style={{ borderCollapse:"collapse", width:"100%", fontSize:11 }}>
                        <thead><tr>{Object.keys(preview[0]).map(h => <th key={h} style={{ background:"rgba(59,130,246,0.1)", padding:"5px 8px", border:"1px solid rgba(59,130,246,0.18)", color:BLUE, textAlign:"left" }}>{h}</th>)}</tr></thead>
                        <tbody>{preview.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ padding:"4px 8px", border:`1px solid ${BORD}`, color:"#94a3b8" }}>{v}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  {preview.length > 0 && (
                    <button onClick={() => runImport(phase)} disabled={importing} style={{ background:importing ? MUTE : BLUE, color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:importing ? "not-allowed" : "pointer" }}>
                      {importing ? "Importing…" : `Import ${phase.label}`}
                    </button>
                  )}
                  {importResult && (
                    <div style={{ marginTop:12, padding:14, borderRadius:8, background:importResult.errors.length===0 ? GRN+"10" : RED+"10", border:`1px solid ${importResult.errors.length===0 ? GRN : RED}40` }}>
                      <div style={{ fontWeight:700, color:importResult.errors.length===0 ? GRN : RED, fontSize:14 }}>
                        {importResult.errors.length===0 ? `✓ ${importResult.inserted} ${phase.dispatchMode?"jobs":"records"} imported successfully` : `⚠ ${importResult.inserted} imported, ${importResult.errors.length} error${importResult.errors.length!==1?"s":""}`}
                      </div>
                      {importResult.errors.slice(0,3).map((e,i) => <div key={i} style={{ fontSize:12, color:RED, marginTop:4 }}>• {e}</div>)}
                      {phase.dispatchMode && dispatchImportId && importResult.errors.length===0 && (
                        <a href="/ronyx/dispatch/daily-import" style={{ display:"inline-block", marginTop:10, padding:"7px 14px", background:BLUE, color:"#fff", borderRadius:7, fontSize:13, fontWeight:700, textDecoration:"none" }}>→ View in Dispatch Command Center</a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Support Center ───────────────────────────────────────────────────────
  function renderSupport() {
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:TXT }}>Support Center</div>
            <div style={{ fontSize:13, color:MUTE, marginTop:2 }}>
              Open Requests: <b style={{ color:AMB }}>2</b> · Priority: <b style={{ color:RED }}>1</b> · Last Reply: <b style={{ color:GRN }}>Today at 10:42 AM</b>
            </div>
          </div>
          <button onClick={() => setSupportForm(true)} style={{ background:BLUE, color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:14, fontWeight:700, border:"none", cursor:"pointer" }}>+ New Support Request</button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" as const }}>
          {["Report a Problem","Request Training","Upload a File for Help"].map(btn => (
            <button key={btn} onClick={() => { setSupportType(btn==="Report a Problem"?"System Problem":btn==="Request Training"?"Training Request":"How-To Question"); setSupportForm(true); }} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${BORD}`, color:"#94a3b8", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>{btn}</button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
          {SUPPORT_TICKETS.map(t => (
            <div key={t.id} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" as const }}>
                    <span style={{ fontSize:12, fontWeight:700, color:MUTE }}>{t.id}</span>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:5, background:sevBg(t.priority), color:sevColor(t.priority), fontWeight:700 }}>{t.priority.toUpperCase()}</span>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:5, background:GRN+"18", color:GRN, fontWeight:700 }}>OPEN</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:TXT, marginBottom:6 }}>{t.title}</div>
                  <div style={{ display:"flex", gap:16, fontSize:12, color:MUTE, flexWrap:"wrap" as const }}>
                    <span>Type: <b style={{ color:"#94a3b8" }}>{t.type}</b></span>
                    <span>Module: <b style={{ color:"#94a3b8" }}>{t.module}</b></span>
                    <span>Contact: <b style={{ color:BLUE }}>{t.contact}</b></span>
                    <span>Updated: <b style={{ color:"#94a3b8" }}>{t.updated}</b></span>
                  </div>
                </div>
                <button style={{ background:"rgba(59,130,246,0.09)", border:"1px solid rgba(59,130,246,0.2)", color:BLUE, padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>View Thread</button>
              </div>
            </div>
          ))}
        </div>

        {supportForm && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.76)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setSupportForm(false)}>
            <div style={{ background:"#0f1628", border:`1px solid ${BORD}`, borderRadius:18, padding:32, maxWidth:520, width:"90%", maxHeight:"80vh", overflowY:"auto" as const }} onClick={e => e.stopPropagation()}>
              {supportSubmitted ? (
                <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                  <div style={{ fontSize:20, fontWeight:800, color:GRN, marginBottom:8 }}>Request Submitted</div>
                  <div style={{ fontSize:14, color:MUTE, marginBottom:24 }}>MoveAround support will reply shortly. Check your email for updates.</div>
                  <button onClick={() => { setSupportForm(false); setSupportSubmitted(false); setSupportTitle(""); }} style={{ background:BLUE, color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:14, fontWeight:700, border:"none", cursor:"pointer" }}>Done</button>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight:800, fontSize:18, color:TXT, marginBottom:20 }}>New Support Request</div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, color:MUTE, display:"block", marginBottom:6, fontWeight:600 }}>REQUEST TYPE</label>
                    <select value={supportType} onChange={e => setSupportType(e.target.value)} style={{ width:"100%", background:"#070b14", border:`1px solid ${BORD}`, color:TXT, padding:"10px 12px", borderRadius:8, fontSize:14 }}>
                      {SUPPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, color:MUTE, display:"block", marginBottom:6, fontWeight:600 }}>SUBJECT</label>
                    <input value={supportTitle} onChange={e => setSupportTitle(e.target.value)} placeholder="Describe your issue in one line..." style={{ width:"100%", boxSizing:"border-box" as const, background:"#070b14", border:`1px solid ${BORD}`, color:TXT, padding:"10px 12px", borderRadius:8, fontSize:14 }} />
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:22 }}>
                    <button onClick={() => { if (supportTitle.trim()) setSupportSubmitted(true); }} style={{ background:BLUE, color:"#fff", padding:"11px 24px", borderRadius:8, fontSize:14, fontWeight:700, border:"none", cursor:"pointer", flex:1 }}>Submit Request</button>
                    <button onClick={() => setSupportForm(false)} style={{ background:"transparent", border:`1px solid ${BORD}`, color:MUTE, padding:"11px 18px", borderRadius:8, fontSize:14, cursor:"pointer" }}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────
  function renderFeedback() {
    return (
      <div>
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:16, padding:28, maxWidth:600 }}>
          <div style={{ fontWeight:800, fontSize:18, color:TXT, marginBottom:6 }}>Feedback & Feature Requests</div>
          <div style={{ fontSize:13, color:MUTE, marginBottom:22 }}>Tell us what would make MoveAround TMS more useful for your team. Every request is reviewed by our product team.</div>
          {feedbackSubmitted ? (
            <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💡</div>
              <div style={{ fontSize:18, fontWeight:800, color:GRN }}>Thanks for your feedback!</div>
              <div style={{ fontSize:14, color:MUTE, marginTop:8, marginBottom:20 }}>We'll review it and add promising ideas to the roadmap.</div>
              <button onClick={() => { setFeedbackSubmitted(false); setFeedbackText(""); }} style={{ background:BLUE, color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:14, fontWeight:700, border:"none", cursor:"pointer" }}>Submit Another</button>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:14 }}>
                {["Feature Request","Workflow Improvement","Reporting Need","Something Broke","Training Request"].map(type => (
                  <button key={type} onClick={() => setFeedbackText(prev => prev ? prev : `[${type}] `)} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${BORD}`, color:"#94a3b8", padding:"6px 12px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>{type}</button>
                ))}
              </div>
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Describe your idea, problem, or request in detail..." rows={5} style={{ width:"100%", boxSizing:"border-box" as const, background:"#070b14", border:`1px solid ${BORD}`, color:TXT, padding:"12px 14px", borderRadius:10, fontSize:14, resize:"vertical" as const, marginBottom:16 }} />
              <button onClick={() => { if (feedbackText.trim()) setFeedbackSubmitted(true); }} style={{ background:PURP, color:"#fff", padding:"11px 28px", borderRadius:8, fontSize:14, fontWeight:700, border:"none", cursor:"pointer" }}>Submit Feedback</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Go-Live Control ──────────────────────────────────────────────────────
  function renderGoLive() {
    const remaining = glChecks.filter(c => !c.done).length;
    const ready = remaining === 0;
    return (
      <div>
        <div style={{ background:ready ? GRN+"0e" : RED+"0a", border:`1px solid ${ready ? GRN : RED}38`, borderRadius:16, padding:24, marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
            <span style={{ fontSize:34 }}>{ready ? "✅" : "🔴"}</span>
            <div>
              <div style={{ fontWeight:800, fontSize:20, color:ready ? GRN : RED }}>{ready ? "Go-Live Ready" : `Not Ready — ${remaining} required item${remaining!==1?"s":""} remain`}</div>
              <div style={{ fontSize:13, color:MUTE, marginTop:2 }}>{ready ? "All checks passed. You can schedule your go-live date." : "Resolve all required items before scheduling go-live."}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {["Run Go-Live Check","Export Launch Report","Schedule Go-Live Review","Request Launch Approval"].map(btn => (
              <button key={btn} style={{ background:ready ? GRN+"18" : "rgba(255,255,255,0.04)", border:`1px solid ${ready ? GRN+"44" : BORD}`, color:ready ? GRN : "#94a3b8", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>{btn}</button>
            ))}
          </div>
        </div>
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, padding:22 }}>
          <div style={{ fontWeight:800, fontSize:16, color:TXT, marginBottom:4 }}>Go-Live Checklist</div>
          <div style={{ fontSize:13, color:MUTE, marginBottom:18 }}>Click any item to toggle its status. All required items must be complete before go-live.</div>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
            {glChecks.map((c, i) => (
              <div key={c.id} onClick={() => setGlChecks(prev => prev.map((x,xi) => xi===i ? { ...x, done:!x.done } : x))} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:10, cursor:"pointer", background:c.done ? GRN+"07" : "rgba(255,255,255,0.02)", border:`1px solid ${c.done ? GRN+"28" : BORD}` }}>
                <div style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${c.done ? GRN : MUTE}`, background:c.done ? GRN : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {c.done && <span style={{ color:"#fff", fontSize:13, fontWeight:800, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ flex:1, fontSize:14, fontWeight:500, color:c.done ? MUTE : TXT, textDecoration:c.done ? "line-through" : "none" }}>{c.label}</span>
                {!c.done && <span style={{ fontSize:11, background:RED+"18", color:RED, padding:"3px 8px", borderRadius:5, fontWeight:700 }}>Required</span>}
                {c.done  && <span style={{ fontSize:11, background:GRN+"18", color:GRN, padding:"3px 8px", borderRadius:5, fontWeight:700 }}>Done</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────
  function renderAuditLog() {
    return (
      <div>
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", borderBottom:`1px solid ${BORD}` }}>
            <div style={{ fontWeight:800, fontSize:16, color:TXT }}>Launch Audit Log</div>
            <div style={{ fontSize:13, color:MUTE, marginTop:2 }}>Complete record of every import, support request, and status change during implementation.</div>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,0.02)" }}>
                {["Timestamp","User","Action","Module","Result"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.06em", color:MUTE, textAlign:"left", borderBottom:`1px solid ${BORD}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((e, i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${BORD}` }}>
                  <td style={{ padding:"11px 16px", fontSize:12, color:MUTE, fontFamily:"monospace", whiteSpace:"nowrap" as const }}>{e.ts}</td>
                  <td style={{ padding:"11px 16px", fontSize:13, color:TXT, fontWeight:600 }}>{e.user}</td>
                  <td style={{ padding:"11px 16px", fontSize:13, color:"#94a3b8" }}>{e.action}</td>
                  <td style={{ padding:"11px 16px" }}><span style={{ background:BLUE+"18", color:BLUE, padding:"3px 9px", borderRadius:5, fontSize:11, fontWeight:700 }}>{e.module}</span></td>
                  <td style={{ padding:"11px 16px", fontSize:12, color:GRN }}>{e.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const RENDER: Record<TabId, () => React.ReactNode> = {
    "overview":     renderOverview,
    "launch-plan":  renderLaunchPlan,
    "my-work":      renderMyWork,
    "training":     renderTraining,
    "data-imports": renderDataImports,
    "support":      renderSupport,
    "feedback":     renderFeedback,
    "go-live":      renderGoLive,
    "audit-log":    renderAuditLog,
  };

  return (
    <div style={{ minHeight:"100vh", background:BG, color:TXT }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(180deg,#0f172a 0%,#0b0f1c 100%)", borderBottom:`1px solid ${BORD}`, padding:"24px 32px 0" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ fontSize:12, color:MUTE, marginBottom:8 }}>
            MoveAround TMS <span style={{ margin:"0 6px", color:"rgba(255,255,255,0.2)" }}>›</span>
            <span style={{ color:BLUE }}>Customer Launch Center™</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:20, marginBottom:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:28, fontWeight:900, letterSpacing:"-0.02em", color:"#fff" }}>Customer Launch Center™</h1>
              <p style={{ margin:"4px 0 0", fontSize:14, color:MUTE }}>Onboarding, training, support, and go-live control in one place.</p>
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" as const }}>
              {([
                { label:"Run Readiness Check", primary:true,  onClick:undefined                                                          },
                { label:"Open Support Request", primary:false, onClick:() => { setTab("support"); setSupportForm(true); }                },
                { label:"Schedule Training",    primary:false, onClick:() => setTab("training")                                          },
                { label:"Invite Staff",         primary:false, onClick:undefined                                                          },
                { label:"View Launch Plan",     primary:false, onClick:() => setTab("launch-plan")                                       },
              ] as { label:string; primary:boolean; onClick:undefined|(()=>void) }[]).map(btn => (
                <button key={btn.label} onClick={btn.onClick} style={{ padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700, border:btn.primary?"none":`1px solid ${BORD}`, background:btn.primary?BLUE:"rgba(255,255,255,0.05)", color:btn.primary?"#fff":"#94a3b8", cursor:"pointer" }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          {/* Status bar */}
          <div style={{ display:"flex", gap:0, borderTop:`1px solid ${BORD}`, paddingTop:14, paddingBottom:16, flexWrap:"wrap" as const }}>
            {[
              { label:"Customer",       value:"Ronyx",           color:TXT  },
              { label:"Launch Status",  value:"In Progress",     color:BLUE },
              { label:"Go-Live Target", value:"July 15, 2026",   color:AMB  },
              { label:"Readiness",      value:"68%",             color:BLUE },
              { label:"Current Phase",  value:"People & Assets", color:GRN  },
            ].map((s, i) => (
              <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6, paddingRight:20, marginRight:i < 4 ? 0 : 0 }}>
                <span style={{ fontSize:12, color:MUTE }}>{s.label}:</span>
                <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.value}</span>
                {i < 4 && <span style={{ color:"rgba(255,255,255,0.1)", fontSize:16, marginLeft:14 }}>|</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab nav ────────────────────────────────────────────── */}
      <div style={{ background:"#090d1b", borderBottom:`1px solid rgba(255,255,255,0.06)`, overflowX:"auto" as const }}>
        <div style={{ maxWidth:1300, margin:"0 auto", display:"flex", padding:"0 32px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"13px 18px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", background:"transparent", whiteSpace:"nowrap" as const, color:tab===t.id ? BLUE : MUTE, borderBottom:tab===t.id ? `2px solid ${BLUE}` : "2px solid transparent", transition:"all 0.15s" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={{ maxWidth:1300, margin:"0 auto", padding:"28px 32px" }}>
        {RENDER[tab]()}
      </div>
    </div>
  );
}
