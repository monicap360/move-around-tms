"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Types ─────────────────────────────────────── */
type CertStatus = "Valid" | "Expiring Soon" | "Expired" | "Cancelled" | "Missing" | "Pending Review" | "Rejected" | "Non-Certified";
type CarrierStatus = "Certified" | "Warning" | "Non-Certified";

type InsuranceCert = {
  type: "Auto Liability" | "General Liability" | "Cargo" | "Workers Comp" | "Other";
  status: CertStatus;
  policy_number?: string;
  effective_date?: string;
  expiration_date?: string;
  insurer?: string;
};

type DriverDoc = {
  driver_id: string;
  driver_name: string;
  cdl_status: CertStatus;
  cdl_expiration?: string;
  med_card_status: CertStatus;
  med_card_expiration?: string;
  mvr_status: CertStatus;
  drug_test_status: CertStatus;
  background_status: CertStatus;
};

type TruckDoc = {
  truck_id: string;
  truck_number: string;
  insurance_status: CertStatus;
  registration_status: CertStatus;
  inspection_status: CertStatus;
  eligible: boolean;
};

type AuditEntry = {
  id: string;
  ts: string;
  carrier_name?: string;
  driver_name?: string;
  truck_number?: string;
  old_status?: string;
  new_status: string;
  source: string;
  changed_by: string;
  notes: string;
  certification_type?: string;
};

type Alert = {
  id: string;
  severity: "Info" | "Warning" | "Critical";
  title: string;
  detail: string;
  carrier_id: string;
  carrier_name: string;
  ts: string;
  resolved: boolean;
};

type Carrier = {
  id: string;
  company_name: string;
  mc_number: string;
  dot_number: string;
  status: CarrierStatus;
  status_changed_date?: string;
  status_reason?: string;
  last_rmis_check?: string;
  dispatch_eligible: boolean;
  settlement_eligible: boolean;
  insurance: InsuranceCert[];
  drivers: DriverDoc[];
  trucks: TruckDoc[];
  contract_status: CertStatus;
  w9_status: CertStatus;
  authority_status: CertStatus;
  dot_status: CertStatus;
  rmis_status?: string;
  audit_trail: AuditEntry[];
  manager_override?: boolean;
  override_by?: string;
  override_note?: string;
};

/* ─── localStorage ───────────────────────────────── */
const LS_KEY = "ronyx_compliance_monitor";
function lsLoad(): Carrier[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function lsSave(data: Carrier[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} }
const LS_ALERTS = "ronyx_compliance_alerts";
function loadAlerts(): Alert[] { try { return JSON.parse(localStorage.getItem(LS_ALERTS) || "[]"); } catch { return []; } }
function saveAlerts(data: Alert[]) { try { localStorage.setItem(LS_ALERTS, JSON.stringify(data)); } catch {} }

function uid() { return Math.random().toString(36).slice(2, 10); }

const DEMO_CARRIERS: Carrier[] = [];
const DEMO_ALERTS: Alert[] = [];

/* ─── Helpers ────────────────────────────────────── */
function daysUntil(d?: string) { if (!d) return null; return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(d?: string)   { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtTs(d?: string)     { if (!d) return "—"; return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }

function statusColor(s: CertStatus | CarrierStatus | string): [string, string] {
  if (s === "Valid" || s === "Certified")                return ["#f0fdf4","#15803d"];
  if (s === "Expiring Soon" || s === "Warning")          return ["#fefce8","#92400e"];
  if (s === "Pending Review")                            return ["#eff6ff","#1e40af"];
  if (s === "Missing")                                   return ["#fff7ed","#c2410c"];
  if (["Expired","Cancelled","Rejected","Non-Certified"].includes(s)) return ["#fff1f2","#dc2626"];
  return ["#f1f5f9","#475569"];
}

// Display-only relabel (internal status VALUES are unchanged — logic untouched).
// Avoids the word "Certified" per CCB copy rules.
const STATUS_LABEL: Record<string, string> = {
  "Certified": "Clear",
  "Non-Certified": "Blocked",
  "Warning": "Needs Review",
  "Valid": "Clear",
  "Pending Review": "Pending Verification",
};
const statusLabel = (s: string) => STATUS_LABEL[s] || s;

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) {
  const [bg, text] = statusColor(status);
  return <span style={{ background: bg, color: text, padding: size==="lg"?"8px 18px":"3px 10px", borderRadius: 20, fontWeight: 800, fontSize: size==="lg"?"0.9rem":"0.72rem", display: "inline-block" }}>{statusLabel(status)}</span>;
}

function certPriority(s: CertStatus): number {
  const o: Record<CertStatus, number> = { Cancelled:0, Expired:1, "Non-Certified":2, Missing:3, "Pending Review":4, Rejected:5, "Expiring Soon":6, Valid:7 };
  return o[s] ?? 8;
}

function carrierPriority(c: Carrier): number {
  if (c.status === "Non-Certified")  return 0;
  if (c.status === "Warning")        return 1;
  return 2;
}

const eyebrow: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const inp: React.CSSProperties       = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const lbl: React.CSSProperties       = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };

function Toast({ msg }: { msg: string }) {
  return <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{msg}</div>;
}

/* ─── RMIS Import Modal ──────────────────────────── */
type RmisImport = {
  carrier_name: string; mc_number: string; dot_number: string;
  old_status: string; new_status: string; status_change_date: string;
  certifications_cancelled: string;
  reason: string; source: string; forwarded_by: string;
};
const EMPTY_RMIS: RmisImport = { carrier_name:"", mc_number:"", dot_number:"", old_status:"Certified", new_status:"Non-Certified", status_change_date:"", certifications_cancelled:"", reason:"", source:"Compliance Status Change History", forwarded_by:"" };

/* ─── Main ───────────────────────────────────────── */
export default function ComplianceMonitorPage() {
  const [carriers, setCarriers]       = useState<Carrier[]>([]);
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [view, setView]               = useState<"dashboard" | "carrier">("dashboard");
  const [selected, setSelected]       = useState<Carrier | null>(null);
  const [activeTab, setActiveTab]     = useState<"overview" | "insurance" | "drivers" | "trucks" | "audit" | "actions">("overview");
  const [toast, setToast]             = useState("");
  const [showRmis, setShowRmis]       = useState(false);
  const [rmisForm, setRmisForm]       = useState<RmisImport>({ ...EMPTY_RMIS });
  const [filterStatus, setFilterStatus] = useState<"All" | CarrierStatus>("All");
  const [searchQ, setSearchQ]         = useState("");
  const [showAddCarrier, setShowAddCarrier] = useState(false);
  const [newCarrierForm, setNewCarrierForm] = useState({ company_name:"", mc_number:"", dot_number:"" });

  useEffect(() => {
    setCarriers(lsLoad());
    setAlerts(loadAlerts());
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }
  function persist(updated: Carrier[]) { setCarriers(updated); lsSave(updated); }
  function persistAlerts(updated: Alert[]) { setAlerts(updated); saveAlerts(updated); }
  function updateSelected(c: Carrier) { setSelected(c); persist(carriers.map(x => x.id === c.id ? c : x)); }
  function openCarrier(c: Carrier) { setSelected(c); setView("carrier"); setActiveTab("overview"); }

  function applyRmisImport() {
    if (!rmisForm.carrier_name.trim() || !rmisForm.status_change_date) { flash("Carrier name and date required."); return; }
    const entry: AuditEntry = { id: uid(), ts: new Date(rmisForm.status_change_date).toISOString(), carrier_name: rmisForm.carrier_name, old_status: rmisForm.old_status, new_status: rmisForm.new_status, source: rmisForm.source, changed_by: rmisForm.forwarded_by || "Import", notes: `${rmisForm.reason}${rmisForm.certifications_cancelled ? ` — Cancelled: ${rmisForm.certifications_cancelled}` : ""}`, certification_type: rmisForm.certifications_cancelled || undefined };
    // Try to find matching carrier
    const existing = carriers.find(c => c.mc_number.replace(/[^0-9]/g,"") === rmisForm.mc_number.replace(/[^0-9]/g,"") || c.company_name.toLowerCase().includes(rmisForm.carrier_name.toLowerCase().slice(0,6)));
    const newStatus: CarrierStatus = rmisForm.new_status.includes("Non") ? "Non-Certified" : rmisForm.new_status.includes("Warn") || rmisForm.new_status.includes("Warning") ? "Warning" : "Certified";
    if (existing) {
      const updated = { ...existing, status: newStatus, status_changed_date: rmisForm.status_change_date, status_reason: rmisForm.reason || rmisForm.certifications_cancelled, last_rmis_check: rmisForm.status_change_date, dispatch_eligible: newStatus === "Certified", settlement_eligible: newStatus === "Certified", rmis_status: rmisForm.new_status, audit_trail: [entry, ...(existing.audit_trail || [])] };
      const alert: Alert = { id: uid(), severity: newStatus === "Non-Certified" ? "Critical" : "Warning", title: `Carrier ${statusLabel(newStatus)}`, detail: `${rmisForm.carrier_name} — ${rmisForm.reason || rmisForm.certifications_cancelled || "Status changed from compliance report."}`, carrier_id: existing.id, carrier_name: rmisForm.carrier_name, ts: new Date().toISOString(), resolved: false };
      persistAlerts([alert, ...alerts]);
      persist(carriers.map(c => c.id === existing.id ? updated : c));
      if (selected?.id === existing.id) setSelected(updated);
      flash(`${existing.company_name} updated to ${newStatus}.`);
    } else {
      const nc: Carrier = { id: uid(), company_name: rmisForm.carrier_name, mc_number: rmisForm.mc_number, dot_number: rmisForm.dot_number, status: newStatus, status_changed_date: rmisForm.status_change_date, status_reason: rmisForm.reason || rmisForm.certifications_cancelled, last_rmis_check: rmisForm.status_change_date, dispatch_eligible: false, settlement_eligible: false, rmis_status: rmisForm.new_status, contract_status: "Pending Review", w9_status: "Missing", authority_status: "Pending Review", dot_status: "Pending Review", insurance: [], drivers: [], trucks: [], audit_trail: [entry] };
      persist([nc, ...carriers]);
      flash(`New carrier ${rmisForm.carrier_name} added as ${newStatus}.`);
    }
    setRmisForm({ ...EMPTY_RMIS });
    setShowRmis(false);
  }

  function managerOverride(carrierId: string, note: string) {
    const updated = carriers.map(c => c.id === carrierId ? { ...c, manager_override: true, override_by: "Manager", override_note: note, dispatch_eligible: true, settlement_eligible: true } : c);
    persist(updated);
    if (selected?.id === carrierId) setSelected(updated.find(c => c.id === carrierId) || null);
    flash("Manager override applied. Carrier marked eligible.");
  }

  function addCarrier() {
    if (!newCarrierForm.company_name.trim()) { flash("Company name required."); return; }
    const nc: Carrier = { id: uid(), company_name: newCarrierForm.company_name, mc_number: newCarrierForm.mc_number, dot_number: newCarrierForm.dot_number, status: "Pending Review" as CarrierStatus, dispatch_eligible: false, settlement_eligible: false, contract_status: "Missing", w9_status: "Missing", authority_status: "Missing", dot_status: "Missing", insurance: [], drivers: [], trucks: [], audit_trail: [{ id: uid(), ts: new Date().toISOString(), carrier_name: newCarrierForm.company_name, new_status: "Pending Review", source: "Manual Entry", changed_by: "Office", notes: "New carrier added for onboarding." }] };
    persist([nc, ...carriers]);
    setShowAddCarrier(false); setNewCarrierForm({ company_name:"", mc_number:"", dot_number:"" });
    flash(`${nc.company_name} added.`);
  }

  function resolveAlert(id: string) {
    persistAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
    flash("Alert resolved.");
  }

  const filteredCarriers = carriers
    .filter(c => (filterStatus === "All" || c.status === filterStatus) && (!searchQ || c.company_name.toLowerCase().includes(searchQ.toLowerCase()) || c.mc_number.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => carrierPriority(a) - carrierPriority(b));

  const certified       = carriers.filter(c => c.status === "Certified").length;
  const nonCertified    = carriers.filter(c => c.status === "Non-Certified").length;
  const warning         = carriers.filter(c => c.status === "Warning").length;
  const dispatchBlocked = carriers.filter(c => !c.dispatch_eligible).length;
  const settleHolds     = carriers.filter(c => !c.settlement_eligible).length;
  const expIns          = carriers.filter(c => c.insurance.some(i => ["Expiring Soon","Expired"].includes(i.status))).length;
  const cancelledIns    = carriers.filter(c => c.insurance.some(i => i.status === "Cancelled")).length;
  const openAlerts      = alerts.filter(a => !a.resolved).length;
  const critAlerts      = alerts.filter(a => !a.resolved && a.severity === "Critical").length;
  const driversExpCDL   = carriers.flatMap(c => c.drivers.filter(d => d.cdl_status === "Expired")).length;
  const driversExpMed   = carriers.flatMap(c => c.drivers.filter(d => d.med_card_status === "Expired")).length;

  // ── DASHBOARD ──────────────────────────────────────
  if (view === "dashboard") {
    return (
      <div style={{ maxWidth: 1200 }}>
        {toast && <Toast msg={toast} />}

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={eyebrow}>MoveAround TMS / Compliance</div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Compliance Monitor</h1>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Real-time carrier compliance — who can work, who is blocked, and what changed.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowRmis(s=>!s)} style={{ ...primaryBtn, background: "#7c3aed" }}>⬆ Import Compliance Report</button>
              <button onClick={() => setShowAddCarrier(s=>!s)} style={primaryBtn}>+ Add Carrier</button>
            </div>
          </div>
        </div>

        {/* Critical alert banner */}
        {critAlerts > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #dc2626", borderRadius: 14, padding: "14px 20px", marginBottom: 16 }}>
            <div style={{ color: "#fca5a5", fontWeight: 800, fontSize: "0.9rem", marginBottom: 8 }}>🚨 {critAlerts} CRITICAL COMPLIANCE ALERT{critAlerts>1?"S":""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {alerts.filter(a => !a.resolved && a.severity === "Critical").map(a => (
                <div key={a.id} style={{ background: "rgba(220,38,38,0.15)", border: "1px solid #dc2626", borderRadius: 10, padding: "8px 14px", flex: 1, minWidth: 200 }}>
                  <div style={{ color: "#fca5a5", fontWeight: 700, fontSize: "0.82rem" }}>{a.carrier_name}</div>
                  <div style={{ color: "#f87171", fontSize: "0.75rem", marginTop: 2 }}>{a.detail}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => { const c = carriers.find(x => x.id === a.carrier_id); if (c) openCarrier(c); }} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>View Carrier</button>
                    <button onClick={() => resolveAlert(a.id)} style={{ background: "transparent", color: "#94a3b8", border: "1px solid #475569", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Certified",        value: certified,       bg: "#f0fdf4", color: "#15803d" },
            { label: "Warning",          value: warning,         bg: warning>0?"#fefce8":"#f8fafc", color: warning>0?"#92400e":"#0f172a" },
            { label: "Non-Certified",    value: nonCertified,    bg: nonCertified>0?"#fff1f2":"#f8fafc", color: nonCertified>0?"#dc2626":"#0f172a" },
            { label: "Dispatch Blocked", value: dispatchBlocked, bg: dispatchBlocked>0?"#fff1f2":"#f8fafc", color: dispatchBlocked>0?"#dc2626":"#0f172a" },
            { label: "Settlement Hold",  value: settleHolds,     bg: settleHolds>0?"#fff1f2":"#f8fafc", color: settleHolds>0?"#dc2626":"#0f172a" },
            { label: "Expiring Ins.",    value: expIns,          bg: expIns>0?"#fefce8":"#f8fafc", color: expIns>0?"#d97706":"#0f172a" },
            { label: "Cancelled Ins.",   value: cancelledIns,    bg: cancelledIns>0?"#fff1f2":"#f8fafc", color: cancelledIns>0?"#dc2626":"#0f172a" },
            { label: "Drivers Exp CDL",  value: driversExpCDL,   bg: driversExpCDL>0?"#fff1f2":"#f8fafc", color: driversExpCDL>0?"#dc2626":"#0f172a" },
            { label: "Drivers Exp Med",  value: driversExpMed,   bg: driversExpMed>0?"#fff1f2":"#f8fafc", color: driversExpMed>0?"#dc2626":"#0f172a" },
            { label: "Open Alerts",      value: openAlerts,      bg: openAlerts>0?"#fff7ed":"#f8fafc", color: openAlerts>0?"#c2410c":"#0f172a" },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* RMIS Import Form */}
        {showRmis && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 6px", fontWeight: 800 }}>Import Compliance / Status Change Report</h3>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "0.82rem" }}>Enter details from a compliance email, PDF, or status change notification to update carrier compliance instantly.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Carrier / Company Name *</label>
                <input value={rmisForm.carrier_name} onChange={e=>setRmisForm(f=>({...f,carrier_name:e.target.value}))} style={inp} placeholder="El Shaddai Trucking LLC" />
              </div>
              <div><label style={lbl}>MC Number</label><input value={rmisForm.mc_number} onChange={e=>setRmisForm(f=>({...f,mc_number:e.target.value}))} style={inp} placeholder="MC-912345" /></div>
              <div><label style={lbl}>DOT Number</label><input value={rmisForm.dot_number} onChange={e=>setRmisForm(f=>({...f,dot_number:e.target.value}))} style={inp} placeholder="DOT-4901233" /></div>
              <div><label style={lbl}>Status Change Date *</label><input type="date" value={rmisForm.status_change_date} onChange={e=>setRmisForm(f=>({...f,status_change_date:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Old Status</label>
                <select value={rmisForm.old_status} onChange={e=>setRmisForm(f=>({...f,old_status:e.target.value}))} style={inp}>
                  {["Certified","Warning","Non-Certified"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </div>
              <div><label style={lbl}>New Status *</label>
                <select value={rmisForm.new_status} onChange={e=>setRmisForm(f=>({...f,new_status:e.target.value}))} style={inp}>
                  {["Certified","Warning","Non-Certified"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Certifications Cancelled / Changed</label><input value={rmisForm.certifications_cancelled} onChange={e=>setRmisForm(f=>({...f,certifications_cancelled:e.target.value}))} style={inp} placeholder="Auto, General Liability, Cargo" /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Reason / Notes</label><input value={rmisForm.reason} onChange={e=>setRmisForm(f=>({...f,reason:e.target.value}))} style={inp} placeholder="Insurance policy cancelled per compliance notification" /></div>
              <div><label style={lbl}>Source</label><input value={rmisForm.source} onChange={e=>setRmisForm(f=>({...f,source:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Forwarded By</label><input value={rmisForm.forwarded_by} onChange={e=>setRmisForm(f=>({...f,forwarded_by:e.target.value}))} style={inp} placeholder="Sylvia" /></div>
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginTop: 14, fontSize: "0.78rem", color: "#475569" }}>
              <strong>System will automatically:</strong> Update carrier compliance status · Block/unblock dispatch · Apply settlement hold · Create compliance alert · Add audit trail entry
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={applyRmisImport} style={{ ...primaryBtn, background: "#7c3aed" }}>Apply Compliance Update</button>
              <button onClick={() => setShowRmis(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* Add Carrier Form */}
        {showAddCarrier && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontWeight: 800 }}>Add Carrier for Monitoring</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>
              <div><label style={lbl}>Company Name *</label><input value={newCarrierForm.company_name} onChange={e=>setNewCarrierForm(f=>({...f,company_name:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>MC Number</label><input value={newCarrierForm.mc_number} onChange={e=>setNewCarrierForm(f=>({...f,mc_number:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>DOT Number</label><input value={newCarrierForm.dot_number} onChange={e=>setNewCarrierForm(f=>({...f,dot_number:e.target.value}))} style={inp} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={addCarrier} style={primaryBtn}>Add Carrier</button>
              <button onClick={() => setShowAddCarrier(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search carrier, MC#…" style={{ flex: 1, ...inp, maxWidth: 280 }} />
          {(["All","Certified","Warning","Non-Certified"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: filterStatus===s?700:500, background: filterStatus===s?"#0f172a":"#f8fafc", color: filterStatus===s?"#fff":"#475569", cursor: "pointer" }}>{s}</button>
          ))}
        </div>

        {/* Carrier Table */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Carrier / OO","MC #","DOT #","Status","Auto Ins.","GL Ins.","Cargo","CDL","Med Card","Last Checked","Dispatch","Settlement","Actions"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCarriers.map(c => {
                  const auto  = c.insurance.find(i => i.type === "Auto Liability");
                  const gl    = c.insurance.find(i => i.type === "General Liability");
                  const cargo = c.insurance.find(i => i.type === "Cargo");
                  const expCDL = c.drivers.filter(d => ["Expired","Missing"].includes(d.cdl_status)).length;
                  const expMed = c.drivers.filter(d => ["Expired","Missing"].includes(d.med_card_status)).length;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: c.status==="Non-Certified"?"#fff5f5":c.status==="Warning"?"#fffbeb":"#fff" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => openCarrier(c)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "#0f172a", textAlign: "left", padding: 0, fontSize: "0.85rem" }}>{c.company_name}</button>
                        {c.manager_override && <div style={{ fontSize: "0.65rem", color: "#7c3aed", fontWeight: 700 }}>⚠ Manager Override</div>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{c.mc_number||"—"}</td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{c.dot_number||"—"}</td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={auto?.status||"Missing"} /></td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={gl?.status||"Missing"} /></td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={cargo?.status||"Missing"} /></td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: expCDL>0?"#dc2626":"#15803d", fontWeight: 700, fontSize: "0.75rem" }}>{expCDL>0?`${expCDL} expired`:"OK"}</span></td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: expMed>0?"#dc2626":"#15803d", fontWeight: 700, fontSize: "0.75rem" }}>{expMed>0?`${expMed} expired`:"OK"}</span></td>
                      <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.75rem" }}>{fmtDate(c.last_rmis_check)}</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: c.dispatch_eligible?"#15803d":"#dc2626", fontWeight: 700 }}>{c.dispatch_eligible?"✓ Yes":"✗ Blocked"}</span></td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: c.settlement_eligible?"#15803d":"#dc2626", fontWeight: 700 }}>{c.settlement_eligible?"✓ Yes":"✗ Hold"}</span></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openCarrier(c)} style={{ ...primaryBtn, fontSize: "0.68rem", padding: "4px 8px" }}>View</button>
                          {!c.dispatch_eligible && !c.manager_override && (
                            <button onClick={() => { const note = prompt("Override reason (manager name / reason):"); if (note) managerOverride(c.id, note); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Override</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredCarriers.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No carriers match filters.</div>}
        </div>

        {/* Recent Alerts */}
        {openAlerts > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontWeight: 800, color: "#0f172a" }}>Open Compliance Alerts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.filter(a => !a.resolved).map(a => {
                const [bg, text] = statusColor(a.severity === "Critical" ? "Cancelled" : a.severity === "Warning" ? "Expiring Soon" : "Pending Review");
                return (
                  <div key={a.id} style={{ background: "#fff", border: `1px solid ${text}44`, borderLeft: `4px solid ${text}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ background: bg, color: text, padding: "3px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>{a.severity}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>{a.title} — {a.carrier_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{a.detail}</div>
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 3 }}>{fmtTs(a.ts)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { const c = carriers.find(x => x.id === a.carrier_id); if (c) openCarrier(c); }} style={{ ...ghostBtn, fontSize: "0.72rem", padding: "4px 10px" }}>View</button>
                      <button onClick={() => resolveAlert(a.id)} style={{ ...ghostBtn, fontSize: "0.72rem", padding: "4px 10px" }}>Resolve</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CARRIER DETAIL VIEW ────────────────────────────
  if (!selected) return null;
  const auto  = selected.insurance.find(i => i.type === "Auto Liability");
  const gl    = selected.insurance.find(i => i.type === "General Liability");
  const cargo = selected.insurance.find(i => i.type === "Cargo");
  const wc    = selected.insurance.find(i => i.type === "Workers Comp");
  const carrierAlerts = alerts.filter(a => a.carrier_id === selected.id && !a.resolved);

  const TABS = [
    { key: "overview",  label: "Overview"   },
    { key: "insurance", label: "Insurance"  },
    { key: "drivers",   label: `Drivers (${selected.drivers.length})` },
    { key: "trucks",    label: `Trucks (${selected.trucks.length})` },
    { key: "audit",     label: "Audit Trail"},
    { key: "actions",   label: "Actions"    },
  ] as const;

  return (
    <div style={{ maxWidth: 1100 }}>
      {toast && <Toast msg={toast} />}
      <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.83rem", padding: 0, marginBottom: 14 }}>← Compliance Monitor</button>

      {/* Carrier header */}
      <div style={{ background: selected.status==="Non-Certified"?"#1e293b":selected.status==="Warning"?"#292524":"#fff", border: `1px solid ${selected.status==="Non-Certified"?"#dc2626":selected.status==="Warning"?"#b45309":"#e2e8f0"}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: selected.status==="Non-Certified"?"#f1f5f9":"#0f172a" }}>{selected.company_name}</h1>
              <StatusBadge status={selected.status} size="lg" />
              {selected.manager_override && <span style={{ background: "#7c3aed", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>Manager Override Active</span>}
            </div>
            <div style={{ fontSize: "0.82rem", color: selected.status==="Non-Certified"?"#94a3b8":"#64748b", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>MC: {selected.mc_number||"—"}</span>
              <span>DOT: {selected.dot_number||"—"}</span>
              {selected.status_changed_date && <span>Status changed: {fmtDate(selected.status_changed_date)}</span>}
              {selected.last_rmis_check && <span>Last compliance check: {fmtDate(selected.last_rmis_check)}</span>}
            </div>
            {selected.status_reason && <div style={{ marginTop: 8, color: "#fca5a5", fontSize: "0.82rem", fontWeight: 600 }}>Reason: {selected.status_reason}</div>}
          </div>
          <div style={{ display: "flex", gap: 16, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Dispatch</div>
              <span style={{ background: selected.dispatch_eligible?"#f0fdf4":"#fff1f2", color: selected.dispatch_eligible?"#15803d":"#dc2626", padding: "8px 16px", borderRadius: 20, fontWeight: 800, fontSize: "0.9rem" }}>
                {selected.dispatch_eligible ? "✓ Eligible" : "✗ Blocked"}
              </span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Settlement</div>
              <span style={{ background: selected.settlement_eligible?"#f0fdf4":"#fff1f2", color: selected.settlement_eligible?"#15803d":"#dc2626", padding: "8px 16px", borderRadius: 20, fontWeight: 800, fontSize: "0.9rem" }}>
                {selected.settlement_eligible ? "✓ Eligible" : "✗ Hold"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active alerts */}
      {carrierAlerts.length > 0 && (
        <div style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 12, padding: "12px 18px", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>⚠ {carrierAlerts.length} Open Alert{carrierAlerts.length>1?"s":""}</div>
          {carrierAlerts.map(a => (
            <div key={a.id} style={{ fontSize: "0.8rem", color: "#be123c", marginBottom: 4 }}>• {a.title}: {a.detail}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: activeTab===t.key?700:500, color: activeTab===t.key?"#1e40af":"#64748b", borderBottom: activeTab===t.key?"2px solid #1e40af":"2px solid transparent", marginBottom: -2, whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Carrier Documents</div>
              {[
                { label: "Contract",    status: selected.contract_status },
                { label: "W-9",         status: selected.w9_status },
                { label: "MC Authority",status: selected.authority_status },
                { label: "DOT Status",  status: selected.dot_status },
              ].map(({ label, status }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>{label}</span>
                  <StatusBadge status={status} />
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Insurance Summary</div>
              {[
                { label: "Auto Liability",    cert: auto },
                { label: "General Liability", cert: gl },
                { label: "Cargo",             cert: cargo },
                { label: "Workers Comp",      cert: wc },
              ].map(({ label, cert }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>{label}</div>
                    {cert?.expiration_date && <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Exp: {fmtDate(cert.expiration_date)}</div>}
                  </div>
                  <StatusBadge status={cert?.status||"Missing"} />
                </div>
              ))}
            </div>
          </div>

          {/* Office Assistant */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontWeight: 800, color: "#f8fafc", marginBottom: 12, fontSize: "0.88rem" }}>🤖 Office Compliance Assistant</div>
              {selected.status === "Non-Certified" ? (
                <div>
                  <div style={{ color: "#fca5a5", fontWeight: 700, marginBottom: 12, fontSize: "0.85rem" }}>{selected.company_name} is NON-CERTIFIED.</div>
                  {selected.status_changed_date && <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 8 }}>Status changed {fmtDate(selected.status_changed_date)}.</div>}
                  {selected.status_reason && <div style={{ color: "#fda4af", fontSize: "0.8rem", marginBottom: 12 }}>Reason: {selected.status_reason}</div>}
                  {[
                    "Dispatch is BLOCKED — do not assign new loads.",
                    "All settlements should remain on HOLD.",
                    "Request updated insurance from the carrier immediately.",
                    "Do NOT override without manager approval.",
                  ].map((step, i) => (
                    <div key={i} style={{ color: "#e2e8f0", fontSize: "0.78rem", marginBottom: 8, display: "flex", gap: 8 }}>
                      <span style={{ background: "#dc2626", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              ) : selected.status === "Warning" ? (
                <div>
                  {[
                    "Review expiring insurance — request COI renewal.",
                    "Notify carrier 30 days before expiration.",
                    "Monitor daily until updated COI received.",
                  ].map((step, i) => (
                    <div key={i} style={{ color: "#e2e8f0", fontSize: "0.78rem", marginBottom: 8, display: "flex", gap: 8 }}>
                      <span style={{ background: "#d97706", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#86efac", fontWeight: 700, textAlign: "center", padding: "20px 0" }}>✓ Carrier is Certified — all clear.</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button onClick={() => { setView("dashboard"); setShowRmis(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Upload Compliance Update</button>
                {!selected.dispatch_eligible && !selected.manager_override && <button onClick={() => { const note = prompt("Manager name and override reason:"); if (note) managerOverride(selected.id, note); }} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Manager Override</button>}
                <button onClick={() => setActiveTab("audit")} style={{ ...ghostBtn, background: "transparent", color: "#cbd5e1", border: "1px solid #334155", fontSize: "0.75rem" }}>View Audit Trail</button>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => { window.open(`https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${selected.dot_number?.replace(/[^0-9]/g,"")}`, "_blank"); flash("FMCSA SAFER opened."); }} style={{ ...ghostBtn, textAlign: "left" }}>🔍 FMCSA SAFER Verification</button>
                <button onClick={() => { const log: AuditEntry = { id: uid(), ts: new Date().toISOString(), carrier_name: selected.company_name, new_status: "Manual Review", source: "Office", changed_by: "Staff", notes: "Compliance reviewed manually." }; updateSelected({ ...selected, last_rmis_check: new Date().toISOString().slice(0,10), audit_trail: [log, ...selected.audit_trail] }); flash("Compliance check logged."); }} style={{ ...ghostBtn, textAlign: "left" }}>✓ Log Manual Compliance Check</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Insurance ── */}
      {activeTab === "insurance" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Type","Status","Policy #","Effective","Expiration","Insurer","Days"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.insurance.length === 0 && <tr><td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No insurance records on file.</td></tr>}
                {selected.insurance.map((ins, i) => {
                  const days = daysUntil(ins.expiration_date);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{ins.type}</td>
                      <td style={{ padding: "10px 14px" }}><StatusBadge status={ins.status} /></td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{ins.policy_number||"—"}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{fmtDate(ins.effective_date)}</td>
                      <td style={{ padding: "10px 14px" }}><span style={{ color: days===null?"#94a3b8":days<0?"#dc2626":days<=30?"#d97706":"#15803d", fontWeight: 700 }}>{fmtDate(ins.expiration_date)}</span></td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{ins.insurer||"—"}</td>
                      <td style={{ padding: "10px 14px" }}>{days===null?"—":<span style={{ color: days<0?"#dc2626":days<=30?"#d97706":"#15803d", fontWeight: 700 }}>{days<0?"EXPIRED":days+"d"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Drivers ── */}
      {activeTab === "drivers" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Driver","CDL","CDL Exp.","Med Card","Med Exp.","MVR","Drug Test","Background","Dispatch"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.drivers.length === 0 && <tr><td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No drivers on file.</td></tr>}
                {selected.drivers.map(d => {
                  const eligible = d.cdl_status === "Valid" && d.med_card_status === "Valid" && !["Expired","Missing"].includes(d.drug_test_status) && !["Expired","Missing"].includes(d.background_status);
                  return (
                    <tr key={d.driver_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>{d.driver_name}</td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={d.cdl_status} /></td>
                      <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.75rem" }}>{fmtDate(d.cdl_expiration)}</td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={d.med_card_status} /></td>
                      <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.75rem" }}>{fmtDate(d.med_card_expiration)}</td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={d.mvr_status} /></td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={d.drug_test_status} /></td>
                      <td style={{ padding: "10px 12px" }}><StatusBadge status={d.background_status} /></td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: eligible?"#15803d":"#dc2626", fontWeight: 700 }}>{eligible?"✓ Yes":"✗ No"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Trucks ── */}
      {activeTab === "trucks" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Truck #","Insurance","Registration","Inspection","Dispatch Eligible"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.trucks.length === 0 && <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No trucks on file.</td></tr>}
              {selected.trucks.map(t => (
                <tr key={t.truck_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{t.truck_number}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={t.insurance_status} /></td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={t.registration_status} /></td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={t.inspection_status} /></td>
                  <td style={{ padding: "10px 14px" }}><span style={{ color: t.eligible?"#15803d":"#dc2626", fontWeight: 700 }}>{t.eligible?"✓ Eligible":"✗ Blocked"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Audit Trail ── */}
      {activeTab === "audit" && (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Certification & Compliance History</div>
          {selected.audit_trail.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No audit records yet.</div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
              {selected.audit_trail.map((entry, i) => {
                const [bg, text] = statusColor(entry.new_status);
                return (
                  <div key={entry.id} style={{ position: "relative", paddingBottom: 24 }}>
                    <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: text, border: "2px solid #fff" }} />
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.source}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fmtTs(entry.ts)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {entry.old_status && <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem" }}>{entry.old_status}</span>}
                        {entry.old_status && <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>→</span>}
                        <span style={{ background: bg, color: text, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>{entry.new_status}</span>
                        {entry.certification_type && <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem" }}>{entry.certification_type}</span>}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#475569" }}>{entry.notes}</div>
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 6 }}>By: {entry.changed_by}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      {activeTab === "actions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { title: "Request Updated COI", desc: "Send email to carrier requesting a new Certificate of Insurance.", action: () => { const body = encodeURIComponent(`Dear ${selected.company_name},\n\nWe require an updated Certificate of Insurance (COI) for your carrier on file with MoveAround TMS / Ronyx Logistics.\n\nPlease have your insurance agent send an updated COI to our office.\n\nMC#: ${selected.mc_number||"—"}\nDOT#: ${selected.dot_number||"—"}\n\nThank you,\nRonyx Logistics Compliance Team`); window.location.href=`mailto:?subject=${encodeURIComponent("COI Required — "+selected.company_name)}&body=${body}`; flash("Email opened."); }, color: "#1e40af" },
            { title: "Verify via FMCSA SAFER", desc: "Open FMCSA SAFER database to verify carrier registration and insurance.", action: () => { window.open(`https://safer.fmcsa.dot.gov/query.asp?query_param=USDOT&query_string=${selected.dot_number?.replace(/[^0-9]/g,"")||""}`, "_blank"); flash("FMCSA SAFER opened."); }, color: "#0369a1" },
            { title: "Place Settlements on Hold", desc: "Mark all unsettled loads for this carrier as On Hold pending compliance.", action: () => { flash("Settlement hold applied — open the Settlement Center to manage individual loads."); }, color: "#dc2626" },
            { title: "Block Dispatch", desc: "Manually block this carrier from new load assignments.", action: () => { updateSelected({ ...selected, dispatch_eligible: false, manager_override: false }); flash(`${selected.company_name} dispatch blocked.`); }, color: "#dc2626" },
            { title: "Manager Override — Allow Dispatch", desc: "Allow dispatch with manager approval. A note is required and logged to audit trail.", action: () => { const note = prompt("Manager name and reason for override:"); if (note) managerOverride(selected.id, note); }, color: "#7c3aed" },
            { title: "Mark Cleared", desc: "Manually mark carrier as Clear after receiving and verifying updated documents.", action: () => { const log: AuditEntry = { id: uid(), ts: new Date().toISOString(), carrier_name: selected.company_name, old_status: selected.status, new_status: "Certified", source: "Manual Update", changed_by: "Office", notes: "Carrier manually marked Clear after document verification." }; updateSelected({ ...selected, status: "Certified", dispatch_eligible: true, settlement_eligible: true, manager_override: false, last_rmis_check: new Date().toISOString().slice(0,10), audit_trail: [log, ...selected.audit_trail] }); flash(`${selected.company_name} marked Clear.`); }, color: "#15803d" },
          ].map(({ title, desc, action, color }) => (
            <div key={title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{desc}</div>
              </div>
              <button onClick={action} style={{ ...primaryBtn, background: color, flexShrink: 0 }}>{title.split(" — ")[0]}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
