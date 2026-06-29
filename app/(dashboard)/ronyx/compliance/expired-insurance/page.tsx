"use client";

import { useEffect, useState } from "react";

/* ─── Types ────────────────────────────────────────────── */
type InsRow = {
  id:               string;
  company:          string;
  driver_name:      string;
  truck_number:     string;
  policy_type:      string;
  insurance_provider: string;
  policy_number:    string;
  expiration_date:  string | null;
  days:             number | null;
  status:           "expired" | "critical" | "warning" | "good" | "missing";
  dispatch_blocked: boolean;
  payroll_blocked:  boolean;
  file_url:         string | null;
  file_name:        string;
  last_reminder:    string | null;
  assigned_staff:   string;
  notes:            string;
  oo_id:            string;
  reviewed:         boolean;
};

type AuditEntry = { id: string; ts: string; action: string; note: string; row_id: string };

/* ─── Constants ─────────────────────────────────────────── */
const POLICY_TYPES = [
  "Auto Liability",
  "General Liability",
  "Physical Damage",
  "Trailer Interchange",
  "Workers Comp",
  "COI / Certificate of Insurance",
  "COI — M.A. Mortenson",
  "COI — Ronyx Logistics",
  "COI — BAS Equipment",
  "Contract",
];

const OO_DOC_MAP: Record<string, string> = {
  "Auto Liability Insurance":    "Auto Liability",
  "General Liability Insurance": "General Liability",
  "Cargo Insurance":             "Cargo",
  "Workers Comp Insurance":      "Workers Comp",
  "Insurance Certificate (COI)": "COI / Certificate of Insurance",
  "COI — M.A. Mortenson":       "COI — M.A. Mortenson",
  "COI — Ronyx Logistics":      "COI — Ronyx Logistics",
  "COI — BAS Equipment":        "COI — BAS Equipment",
  "Contract":                    "Contract",
};

const STATUS_CFG = {
  expired:  { label:"EXPIRED",        bg:"#fff1f2", color:"#dc2626", border:"#fca5a5",  sort: 0 },
  missing:  { label:"MISSING",        bg:"#fff1f2", color:"#7f1d1d", border:"#fca5a5",  sort: 1 },
  critical: { label:"EXPIRES ≤ 7d",   bg:"#fff7ed", color:"#c2410c", border:"#fdba74",  sort: 2 },
  warning:  { label:"EXPIRES ≤ 30d",  bg:"#fefce8", color:"#b45309", border:"#fde68a",  sort: 3 },
  good:     { label:"CURRENT",        bg:"#f0fdf4", color:"#15803d", border:"#86efac",  sort: 4 },
};

const FILTER_TABS = [
  { key:"all",            label:"All" },
  { key:"expired",        label:"Expired" },
  { key:"missing",        label:"Missing" },
  { key:"critical",       label:"≤ 7 Days" },
  { key:"warning",        label:"≤ 30 Days" },
  { key:"dispatch",       label:"Dispatch Blocked" },
  { key:"payroll",        label:"Payroll Hold" },
];

/* ─── Helpers ────────────────────────────────────────────── */
function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function statusOf(days: number | null): InsRow["status"] {
  if (days === null)  return "missing";
  if (days < 0)       return "expired";
  if (days <= 7)      return "critical";
  if (days <= 30)     return "warning";
  return "good";
}
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ─── Page ───────────────────────────────────────────────── */
export default function ExpiredInsurancePage() {
  const [rows,       setRows]       = useState<InsRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [coFilter,   setCoFilter]   = useState("All");
  const [search,     setSearch]     = useState("");
  const [toast,      setToast]      = useState("");
  const [audit,      setAudit]      = useState<AuditEntry[]>([]);
  const [showAudit,  setShowAudit]  = useState(false);
  const [assignModal, setAssignModal] = useState<{ rowId: string; name: string } | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  function addAudit(row_id: string, action: string, note: string) {
    const entry: AuditEntry = { id: uid(), ts: new Date().toISOString(), action, note, row_id };
    setAudit(a => [entry, ...a]);
  }

  /* ── Load data ──────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then(({ companies = [] }) => {
        const out: InsRow[] = [];

        for (const co of companies) {
          const docs: any[] = co.documents || [];

          // Uploaded docs
          for (const doc of docs) {
            if (!OO_DOC_MAP[doc.type]) continue;
            const days = doc.expires_on ? daysUntil(doc.expires_on) : null;
            const status = statusOf(days);
            out.push({
              id:                 uid(),
              company:            co.company_name,
              driver_name:        "—",
              truck_number:       "—",
              policy_type:        OO_DOC_MAP[doc.type],
              insurance_provider: co.insurance_agent_name || "—",
              policy_number:      "—",
              expiration_date:    doc.expires_on || null,
              days,
              status,
              dispatch_blocked:   status === "expired" || status === "missing",
              payroll_blocked:    status === "expired",
              file_url:           doc.file_url  || null,
              file_name:          doc.file_name || "",
              last_reminder:      null,
              assigned_staff:     "",
              notes:              "",
              oo_id:              co.id,
              reviewed:           false,
            });
          }

          // Missing docs (never uploaded)
          for (const policyType of Object.keys(OO_DOC_MAP)) {
            if (!docs.some((d: any) => d.type === policyType)) {
              out.push({
                id:                 uid(),
                company:            co.company_name,
                driver_name:        "—",
                truck_number:       "—",
                policy_type:        OO_DOC_MAP[policyType],
                insurance_provider: co.insurance_agent_name || "—",
                policy_number:      "—",
                expiration_date:    null,
                days:               null,
                status:             "missing",
                dispatch_blocked:   true,
                payroll_blocked:    false,
                file_url:           null,
                file_name:          "",
                last_reminder:      null,
                assigned_staff:     "",
                notes:              "",
                oo_id:              co.id,
                reviewed:           false,
              });
            }
          }
        }

        // Sort: expired → missing → critical → warning → good
        out.sort((a, b) => (STATUS_CFG[a.status].sort ?? 9) - (STATUS_CFG[b.status].sort ?? 9));
        setRows(out);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Row mutations ──────────────────────────────────── */
  function mutate(id: string, patch: Partial<InsRow>, auditMsg: string, auditNote = "") {
    setRows(r => r.map(row => row.id === id ? { ...row, ...patch } : row));
    addAudit(id, auditMsg, auditNote);
  }

  function blockDispatch(row: InsRow) {
    mutate(row.id, { dispatch_blocked: true }, "Block Dispatch", `Dispatch blocked for ${row.company} — ${row.policy_type}`);
    flash(`Dispatch blocked for ${row.company}.`);
  }
  function restoreDispatch(row: InsRow) {
    mutate(row.id, { dispatch_blocked: false }, "Restore Dispatch", `Dispatch restored for ${row.company} — ${row.policy_type}`);
    flash(`Dispatch restored for ${row.company}.`);
  }
  function holdPayroll(row: InsRow) {
    mutate(row.id, { payroll_blocked: true }, "Hold Payroll", `Payroll hold set for ${row.company}`);
    flash(`Payroll hold set for ${row.company}.`);
  }
  function markReviewed(row: InsRow) {
    mutate(row.id, { reviewed: true }, "Mark Reviewed", `${row.policy_type} reviewed for ${row.company}`);
    flash("Marked as reviewed.");
  }

  /* ── Email COI request ──────────────────────────────── */
  function requestCOI(row: InsRow) {
    const sub = encodeURIComponent(`Updated Insurance Certificate Needed — ${row.company}`);
    const body = encodeURIComponent(
      `Hi ${row.company},\n\n` +
      `Our records show your ${row.policy_type} insurance${row.expiration_date ? ` expired on ${fmtDate(row.expiration_date)}` : " is missing from our records"}.\n\n` +
      `Please send an updated Certificate of Insurance as soon as possible. ` +
      `Dispatch and/or payroll may remain on hold until the updated document is received and verified.\n\n` +
      `Please email the updated COI to: operations@ronyxlogistics.com\n\n` +
      `Thank you,\nRonyx Logistics Operations`
    );
    window.location.href = `mailto:?subject=${sub}&body=${body}`;
    mutate(row.id, { last_reminder: new Date().toISOString() }, "Request COI", `COI request email sent for ${row.policy_type}`);
    flash("COI request email opened.");
  }

  /* ── Open doc ───────────────────────────────────────── */
  async function openDoc(url: string, print = false) {
    try {
      const res  = await fetch(`/api/ronyx/view-doc?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const signed = data.signed_url || url;
      if (print) { const w = window.open(signed); if (w) w.onload = () => w.print(); }
      else        window.open(signed, "_blank");
    } catch { window.open(url, "_blank"); }
  }

  /* ── Export ─────────────────────────────────────────── */
  function exportCSV() {
    const hdr = ["Company","Policy Type","Driver","Truck","Provider","Policy#","Expiration","Status","Days","Dispatch Blocked","Payroll Blocked","Last Reminder","Reviewed","File Name"];
    const lines = visible.map(r => [
      `"${r.company}"`,`"${r.policy_type}"`,`"${r.driver_name}"`,`"${r.truck_number}"`,
      `"${r.insurance_provider}"`,`"${r.policy_number}"`,r.expiration_date||"Not set",
      r.status.toUpperCase(), r.days !== null ? String(r.days) : "—",
      r.dispatch_blocked?"Yes":"No", r.payroll_blocked?"Yes":"No",
      r.last_reminder ? fmtDate(r.last_reminder) : "Never",
      r.reviewed?"Yes":"No", `"${r.file_name||"Not uploaded"}"`,
    ].join(","));
    const blob = new Blob([[hdr.join(","), ...lines].join("\n")], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expired-insurance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    flash("CSV exported.");
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(visible, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expired-insurance-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    flash("JSON exported.");
  }

  /* ── Derived ────────────────────────────────────────── */
  const companies = ["All", ...Array.from(new Set(rows.map(r => r.company))).sort()];
  const policyTypes = ["All", ...POLICY_TYPES];

  const visible = rows.filter(r => {
    if (filter === "dispatch" && !r.dispatch_blocked) return false;
    if (filter === "payroll"  && !r.payroll_blocked)  return false;
    if (!["all","dispatch","payroll"].includes(filter) && r.status !== filter) return false;
    if (typeFilter !== "All" && r.policy_type !== typeFilter) return false;
    if (coFilter   !== "All" && r.company     !== coFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.company.toLowerCase().includes(q) && !r.policy_type.toLowerCase().includes(q) && !r.policy_number.toLowerCase().includes(q) && !r.driver_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const expiredCount  = rows.filter(r => r.status === "expired").length;
  const missingCount  = rows.filter(r => r.status === "missing").length;
  const criticalCount = rows.filter(r => r.status === "critical").length;
  const warningCount  = rows.filter(r => r.status === "warning").length;
  const dispatchBlockedCount = rows.filter(r => r.dispatch_blocked).length;
  const payrollHoldCount     = rows.filter(r => r.payroll_blocked).length;

  /* ── Styles ─────────────────────────────────────────── */
  const card: React.CSSProperties      = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"20px 24px" };
  const primaryBtn: React.CSSProperties= { background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontWeight:700, cursor:"pointer", fontSize:"0.8rem", display:"inline-flex", alignItems:"center", gap:6 };
  const redBtn: React.CSSProperties   = { ...primaryBtn, background:"#dc2626" };
  const ghostBtn: React.CSSProperties = { padding:"7px 13px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:"0.78rem", fontWeight:600, color:"#475569", background:"#f8fafc", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 };

  if (loading) return (
    <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>
      <div style={{ fontSize:"2rem", marginBottom:12 }}>🔍</div>
      Loading insurance records…
    </div>
  );

  const urgentRows = rows.filter(r => r.status === "expired" || r.status === "missing" || r.status === "critical");

  return (
    <div style={{ display:"flex", gap:20, padding:"28px 24px", alignItems:"flex-start" }}>
      {/* ── Main content ────────────────────────────── */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:"fixed", bottom:24, right:24, background:"#0f172a", color:"#fff", padding:"10px 20px", borderRadius:10, fontWeight:700, fontSize:"0.85rem", zIndex:9999 }}>
            {toast}
          </div>
        )}

        {/* Assign modal */}
        {assignModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
            <div style={{ background:"#fff", borderRadius:16, padding:28, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginBottom:14 }}>Assign to Staff Member</div>
              <input
                autoFocus
                placeholder="Staff name or email…"
                value={assignModal.name}
                onChange={e => setAssignModal(m => m ? { ...m, name: e.target.value } : m)}
                style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontSize:"0.88rem", marginBottom:14, boxSizing:"border-box" }}
              />
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => {
                  mutate(assignModal.rowId, { assigned_staff: assignModal.name }, "Assign Staff", `Assigned to ${assignModal.name}`);
                  setAssignModal(null);
                  flash(`Assigned to ${assignModal.name}.`);
                }} style={primaryBtn}>Assign</button>
                <button onClick={() => setAssignModal(null)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:"0.68rem", fontWeight:800, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Compliance Center</div>
            <h1 style={{ margin:0, fontSize:"1.55rem", fontWeight:900, color:"#0f172a" }}>Expired Insurance Report</h1>
            <div style={{ fontSize:"0.78rem", color:"#64748b", marginTop:4 }}>
              {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric", year:"numeric" })} · {rows.length} records · {new Set(rows.map(r=>r.company)).size} companies
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => window.print()} style={ghostBtn}>🖨️ Print</button>
            <button onClick={exportCSV} style={ghostBtn}>📥 CSV</button>
            <button onClick={exportJSON} style={ghostBtn}>📋 JSON</button>
            <button onClick={() => setShowAudit(s=>!s)} style={ghostBtn}>📜 Audit Log ({audit.length})</button>
            <button onClick={() => {
              const sub = encodeURIComponent(`Insurance Expiry Alert — ${expiredCount} expired, ${missingCount} missing, ${criticalCount} critical`);
              const body = encodeURIComponent(
                `Insurance Expiry Summary — ${new Date().toLocaleDateString()}\n\n` +
                `Expired: ${expiredCount}  Missing: ${missingCount}  Critical (≤7d): ${criticalCount}  Warning (≤30d): ${warningCount}\n` +
                `Dispatch Blocked: ${dispatchBlockedCount}  Payroll Hold: ${payrollHoldCount}\n\n` +
                `TOP URGENT ITEMS:\n` +
                urgentRows.slice(0,8).map(r=>`• ${r.company} — ${r.policy_type} (${r.status.toUpperCase()}${r.expiration_date?" exp "+fmtDate(r.expiration_date):""}) — Dispatch ${r.dispatch_blocked?"BLOCKED":"OK"}`).join("\n") +
                `\n\nAction required: request updated COIs for all expired/missing items immediately.\n\n— Ronyx Logistics Operations`
              );
              window.location.href = `mailto:?subject=${sub}&body=${body}`;
              flash("Summary email opened.");
            }} style={redBtn}>📧 Email Alert</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10, marginBottom:20 }}>
          {[
            { label:"Expired",         value:expiredCount,        bg:"#fff1f2", color:"#dc2626", icon:"🔴" },
            { label:"Missing",         value:missingCount,        bg:"#fff1f2", color:"#7f1d1d", icon:"⛔" },
            { label:"Critical (≤ 7d)", value:criticalCount,       bg:"#fff7ed", color:"#c2410c", icon:"🟠" },
            { label:"Warning (≤ 30d)", value:warningCount,        bg:"#fefce8", color:"#b45309", icon:"🟡" },
            { label:"Dispatch Blocked",value:dispatchBlockedCount, bg:"#fdf2f8", color:"#9d174d", icon:"🚫" },
            { label:"Payroll Holds",   value:payrollHoldCount,    bg:"#fff7ed", color:"#9a3412", icon:"💰" },
          ].map(k => (
            <div key={k.label} style={{ background:k.bg, border:`1.5px solid ${k.color}25`, borderRadius:12, padding:"12px 14px", cursor:"pointer" }}
              onClick={() => {
                if (k.label==="Dispatch Blocked") setFilter("dispatch");
                else if (k.label==="Payroll Holds") setFilter("payroll");
                else if (k.label==="Expired") setFilter("expired");
                else if (k.label==="Missing") setFilter("missing");
                else if (k.label.includes("7d")) setFilter("critical");
                else if (k.label.includes("30d")) setFilter("warning");
              }}>
              <div style={{ fontSize:"1.5rem", fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:"0.68rem", fontWeight:700, color:k.color, marginTop:3 }}>{k.icon} {k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...card, marginBottom:16, padding:"14px 18px" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {FILTER_TABS.map(t => {
              const count = t.key==="all" ? rows.length
                : t.key==="dispatch" ? dispatchBlockedCount
                : t.key==="payroll"  ? payrollHoldCount
                : rows.filter(r=>r.status===t.key).length;
              return (
                <button key={t.key} onClick={()=>setFilter(t.key)} style={{ padding:"5px 11px", borderRadius:8, fontSize:"0.75rem", fontWeight:700, cursor:"pointer", border:"1.5px solid", borderColor:filter===t.key?"#1e40af":"#e2e8f0", background:filter===t.key?"#1e40af":"#fff", color:filter===t.key?"#fff":"#475569" }}>
                  {t.label} <span style={{ marginLeft:4, background:filter===t.key?"rgba(255,255,255,0.2)":"#e2e8f0", padding:"1px 6px", borderRadius:10, fontSize:"0.65rem" }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div>
              <label style={{ fontSize:"0.68rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Policy Type</label>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 10px", fontSize:"0.8rem" }}>
                {policyTypes.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:"0.68rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Company</label>
              <select value={coFilter} onChange={e=>setCoFilter(e.target.value)} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 10px", fontSize:"0.8rem" }}>
                {companies.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:"0.68rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Search</label>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Company, driver, policy…" style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 12px", fontSize:"0.8rem", width:200 }} />
            </div>
            <button onClick={()=>{setFilter("all");setTypeFilter("All");setCoFilter("All");setSearch("");}} style={{ ...ghostBtn, fontSize:"0.73rem" }}>Clear</button>
          </div>
        </div>

        {/* Audit log */}
        {showAudit && (
          <div style={{ ...card, marginBottom:16, background:"#fafafa" }}>
            <div style={{ fontWeight:800, color:"#0f172a", marginBottom:10 }}>📜 Audit Log — {audit.length} action{audit.length!==1?"s":""}</div>
            {audit.length === 0 ? (
              <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>No actions recorded yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto" }}>
                {audit.map(a => (
                  <div key={a.id} style={{ display:"flex", gap:12, alignItems:"baseline", fontSize:"0.78rem", borderBottom:"1px solid #f1f5f9", paddingBottom:4 }}>
                    <span style={{ color:"#94a3b8", whiteSpace:"nowrap" }}>{new Date(a.ts).toLocaleTimeString()}</span>
                    <span style={{ fontWeight:700, color:"#0f172a" }}>{a.action}</span>
                    <span style={{ color:"#64748b" }}>{a.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem" }}>
              Insurance Records · {visible.length} shown{visible.length!==rows.length?` of ${rows.length}`:""}
            </span>
          </div>
          {visible.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>✅</div>
              No records match this filter.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem", tableLayout:"fixed", minWidth:900 }}>
                <colgroup>
                  <col style={{ width:156 }} />
                  <col style={{ width:88 }} />
                  <col style={{ width:80 }} />
                  <col style={{ width:74 }} />
                  <col style={{ width:50 }} />
                  <col style={{ width:70 }} />
                  <col style={{ width:62 }} />
                  <col style={{ width:94 }} />
                  <col style={{ width:226 }} />
                </colgroup>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Company / Carrier","Policy Type","Expiration","Status","Days","Dispatch","Payroll","File","Actions"].map(h=>(
                      <th key={h} style={{ padding:"8px 8px", fontSize:"0.62rem", fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const cfg = STATUS_CFG[r.status];
                    return (
                      <tr key={r.id} style={{ borderBottom:"1px solid #f1f5f9", background: r.reviewed ? "#f9fff9" : r.status==="expired"||r.status==="missing" ? "#fff8f8" : "transparent" }}>
                        {/* Company */}
                        <td style={{ padding:"8px 8px" }}>
                          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.75rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.company}</div>
                          {r.assigned_staff && <div style={{ fontSize:"0.6rem", color:"#1e40af", marginTop:1 }}>👤 {r.assigned_staff}</div>}
                          {r.reviewed && <div style={{ fontSize:"0.6rem", color:"#15803d", fontWeight:700 }}>✓ Reviewed</div>}
                        </td>
                        {/* Policy type */}
                        <td style={{ padding:"8px 8px", color:"#374151", whiteSpace:"nowrap", fontWeight:600, fontSize:"0.72rem" }}>{r.policy_type}</td>
                        {/* Expiration */}
                        <td style={{ padding:"8px 8px", whiteSpace:"nowrap" }}>
                          {r.expiration_date
                            ? <span style={{ fontWeight:700, color: cfg.color, fontSize:"0.72rem" }}>{fmtDate(r.expiration_date)}</span>
                            : <span style={{ color:"#fca5a5", fontWeight:700, fontSize:"0.68rem" }}>{r.file_name ? "No date" : "Not uploaded"}</span>}
                        </td>
                        {/* Status */}
                        <td style={{ padding:"8px 8px" }}>
                          <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, padding:"2px 6px", borderRadius:20, fontWeight:800, fontSize:"0.62rem", whiteSpace:"nowrap" }}>
                            {r.status==="missing" && r.file_name ? "NO DATE" : cfg.label}
                          </span>
                        </td>
                        {/* Days */}
                        <td style={{ padding:"8px 8px", whiteSpace:"nowrap", fontWeight:700, fontSize:"0.72rem" }}>
                          {r.days !== null
                            ? <span style={{ color: r.days<0 ? "#dc2626" : r.days<=7 ? "#c2410c" : r.days<=30 ? "#b45309" : "#15803d" }}>
                                {r.days<0 ? `${Math.abs(r.days)}d ago` : `${r.days}d`}
                              </span>
                            : <span style={{ color:"#94a3b8" }}>—</span>}
                        </td>
                        {/* Dispatch */}
                        <td style={{ padding:"8px 8px" }}>
                          <span style={{ background:r.dispatch_blocked?"#fff1f2":"#f0fdf4", color:r.dispatch_blocked?"#dc2626":"#15803d", border:`1px solid ${r.dispatch_blocked?"#fca5a5":"#86efac"}`, padding:"2px 6px", borderRadius:20, fontWeight:700, fontSize:"0.62rem", whiteSpace:"nowrap" }}>
                            {r.dispatch_blocked ? "🚫 Block" : "✓ OK"}
                          </span>
                        </td>
                        {/* Payroll */}
                        <td style={{ padding:"8px 8px" }}>
                          <span style={{ background:r.payroll_blocked?"#fff7ed":"#f0fdf4", color:r.payroll_blocked?"#c2410c":"#15803d", border:`1px solid ${r.payroll_blocked?"#fdba74":"#86efac"}`, padding:"2px 6px", borderRadius:20, fontWeight:700, fontSize:"0.62rem", whiteSpace:"nowrap" }}>
                            {r.payroll_blocked ? "⏸ Hold" : "✓ OK"}
                          </span>
                        </td>
                        {/* File */}
                        <td style={{ padding:"8px 8px", overflow:"hidden" }}>
                          {r.file_name
                            ? <span style={{ fontSize:"0.67rem", color:"#475569" }} title={r.file_name}>📄 {r.file_name.slice(0,16)}{r.file_name.length>16?"…":""}</span>
                            : <span style={{ fontSize:"0.67rem", color:"#fca5a5", fontWeight:700 }}>⚠ Missing</span>}
                        </td>
                        {/* Actions */}
                        <td style={{ padding:"8px 8px" }}>
                          <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                            <button onClick={()=>requestCOI(r)} style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>📧 Request</button>
                            {r.file_url
                              ? <button onClick={()=>openDoc(r.file_url!)} style={{ background:"#dbeafe", color:"#1e40af", border:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>👁 View</button>
                              : <a href="/ronyx/owner-operators" style={{ background:"#fef3c7", color:"#92400e", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>📤 Upload</a>}
                            {r.dispatch_blocked
                              ? <button onClick={()=>restoreDispatch(r)} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #86efac", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>✓ Allow</button>
                              : <button onClick={()=>blockDispatch(r)} style={{ background:"#fff1f2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>🚫 Block</button>}
                            {!r.payroll_blocked
                              ? <button onClick={()=>holdPayroll(r)} style={{ background:"#fff7ed", color:"#c2410c", border:"1px solid #fdba74", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>⏸ Hold</button>
                              : null}
                            {!r.reviewed && <button onClick={()=>markReviewed(r)} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #86efac", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>✓ Done</button>}
                            <button onClick={()=>setAssignModal({ rowId:r.id, name:r.assigned_staff })} style={{ background:"#f8fafc", color:"#475569", border:"1px solid #e2e8f0", borderRadius:5, padding:"3px 7px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>👤 Assign</button>
                          </div>
                          {/* Next Best Action */}
                          {(r.status === "expired" || r.status === "missing" || r.status === "critical") && (
                            <div style={{ marginTop:6, background:"#fef3c7", border:"1px solid #fde68a", borderRadius:6, padding:"4px 8px", fontSize:"0.65rem", color:"#92400e", maxWidth:280 }}>
                              <strong>Next action:</strong> {r.status==="missing" ? `Upload ${r.policy_type} for ${r.company}.` : `Request updated ${r.policy_type} — expired ${r.days !== null ? Math.abs(r.days)+"d ago" : "/ not on file"}.`} Keep dispatch blocked until received.
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop:12, fontSize:"0.7rem", color:"#94a3b8", textAlign:"center" }}>
          Original uploaded files are never deleted. All documents remain preserved in the Backup Center.
        </div>
      </div>

      {/* ── Staff Guidance Panel ─────────────────────── */}
      <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ ...card, background:"#0f172a", color:"#fff", padding:"16px 18px" }}>
          <div style={{ fontSize:"0.68rem", fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Staff Guidance</div>
          <div style={{ fontWeight:900, fontSize:"1rem", marginBottom:4 }}>
            {expiredCount + missingCount > 0 ? `⚠️ ${expiredCount+missingCount} urgent items` : "✅ No urgent issues"}
          </div>
          <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>
            {expiredCount > 0 && <div>• {expiredCount} expired — dispatch blocked</div>}
            {missingCount > 0 && <div>• {missingCount} missing — upload needed</div>}
            {criticalCount > 0 && <div>• {criticalCount} expiring in ≤ 7 days</div>}
            {warningCount  > 0 && <div>• {warningCount} expiring in ≤ 30 days</div>}
          </div>
        </div>

        {/* Most urgent */}
        {urgentRows.length > 0 && (
          <div style={{ ...card }}>
            <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.78rem", marginBottom:10 }}>🔴 Needs Follow-up Today</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {urgentRows.slice(0,6).map(r => (
                <div key={r.id} style={{ padding:"8px 10px", background:"#fff1f2", border:"1px solid #fca5a5", borderRadius:8 }}>
                  <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.75rem" }}>{r.company}</div>
                  <div style={{ fontSize:"0.68rem", color:"#dc2626", fontWeight:600 }}>{r.policy_type}</div>
                  <div style={{ fontSize:"0.65rem", color:"#475569", marginTop:2 }}>
                    {r.expiration_date ? `Expired ${fmtDate(r.expiration_date)}` : "Not uploaded"}
                  </div>
                  <button onClick={()=>requestCOI(r)} style={{ marginTop:5, background:"#dc2626", color:"#fff", border:"none", borderRadius:6, padding:"3px 8px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer", width:"100%" }}>
                    📧 Request COI
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message template reference */}
        <div style={{ ...card, background:"#f0fdf4", border:"1px solid #86efac" }}>
          <div style={{ fontWeight:800, color:"#15803d", fontSize:"0.78rem", marginBottom:6 }}>📝 COI Request Template</div>
          <div style={{ fontSize:"0.68rem", color:"#374151", lineHeight:1.7 }}>
            Click <strong>Request COI</strong> on any row to open your email client with this template pre-filled:
            <br/><br/>
            <em style={{ color:"#0f172a" }}>"Hi [Carrier], your [Policy] expired on [Date]. Please send an updated COI to operations@ronyxlogistics.com. Dispatch/payroll may be on hold until verified."</em>
          </div>
        </div>
      </div>
    </div>
  );
}
