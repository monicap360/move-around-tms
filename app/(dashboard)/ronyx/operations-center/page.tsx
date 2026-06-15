"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────── */
type ExceptionItem = {
  id: string;
  category: "Payroll Hold" | "Billing Hold" | "Missing Ticket" | "Missing Signature" | "Ticket Exception" | "Unmatched Scale" | "Awaiting Approval" | "Driver Safety" | "Open Defect";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  driver?: string;
  truck?: string;
  date: string;
  resolved: boolean;
  assigned_to?: string;
};

type Accident = {
  id: string;
  date: string;
  driver: string;
  truck: string;
  location: string;
  description: string;
  severity: "minor" | "moderate" | "serious" | "fatality";
  dot_reportable: boolean;
  claim_number?: string;
  status: "Open" | "Under Review" | "Closed";
};

type SafetyMeeting = {
  id: string;
  date: string;
  topic: string;
  attendees: string;
  notes?: string;
};

/* ─── Helpers ────────────────────────────────────── */
const LS_EXCEPTIONS = "ronyx_operations_exceptions";
const LS_ACCIDENTS  = "ronyx_safety_accidents";
const LS_MEETINGS   = "ronyx_safety_meetings";
function ls<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function lss(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDate(d?: string) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const DEMO_EXCEPTIONS: ExceptionItem[] = [];
const DEMO_ACCIDENTS: Accident[] = [];
const DEMO_MEETINGS: SafetyMeeting[] = [];

const eyebrow: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };

function sevColor(s: "critical" | "warning" | "info"): [string, string, string] {
  if (s === "critical") return ["#fff1f2", "#dc2626", "#fda4af"];
  if (s === "warning")  return ["#fff7ed", "#d97706", "#fed7aa"];
  return ["#eff6ff", "#1e40af", "#bfdbfe"];
}
function accSevBg(s: Accident["severity"]): [string, string] {
  if (s === "fatality")  return ["#fff1f2", "#7f1d1d"];
  if (s === "serious")   return ["#fff1f2", "#dc2626"];
  if (s === "moderate")  return ["#fff7ed", "#d97706"];
  return ["#f0fdf4", "#15803d"];
}

export default function OperationsCenterPage() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [accidents,  setAccidents]  = useState<Accident[]>([]);
  const [meetings,   setMeetings]   = useState<SafetyMeeting[]>([]);
  const [activeTab,  setActiveTab]  = useState<"ops" | "safety" | "meetings">("ops");
  const [catFilter,  setCatFilter]  = useState("All");
  const [toast,      setToast]      = useState("");

  const [showAddAcc,  setShowAddAcc]  = useState(false);
  const [showAddMtg,  setShowAddMtg]  = useState(false);
  const [accForm, setAccForm] = useState<Omit<Accident,"id">>({ date: "", driver: "", truck: "", location: "", description: "", severity: "minor", dot_reportable: false, claim_number: "", status: "Open" });
  const [mtgForm, setMtgForm] = useState<Omit<SafetyMeeting,"id">>({ date: "", topic: "", attendees: "", notes: "" });

  useEffect(() => {
    setExceptions(ls<ExceptionItem[]>(LS_EXCEPTIONS, []));
    setAccidents(ls<Accident[]>(LS_ACCIDENTS, []));
    setMeetings(ls<SafetyMeeting[]>(LS_MEETINGS, []));
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  function resolveEx(id: string) {
    const next = exceptions.map(e => e.id === id ? { ...e, resolved: true } : e);
    setExceptions(next); lss(LS_EXCEPTIONS, next);
    flash("Exception resolved.");
  }
  function reopenEx(id: string) {
    const next = exceptions.map(e => e.id === id ? { ...e, resolved: false } : e);
    setExceptions(next); lss(LS_EXCEPTIONS, next);
  }
  function addException(category: ExceptionItem["category"], title: string, detail: string) {
    const ex: ExceptionItem = { id: uid(), category, severity: "warning", title, detail, date: new Date().toISOString().slice(0,10), resolved: false };
    const next = [ex, ...exceptions];
    setExceptions(next); lss(LS_EXCEPTIONS, next);
    flash("Exception logged.");
  }

  function addAccident() {
    if (!accForm.driver.trim() || !accForm.date) { flash("Driver and date are required."); return; }
    const next = [{ id: uid(), ...accForm }, ...accidents];
    setAccidents(next); lss(LS_ACCIDENTS, next);
    setAccForm({ date: "", driver: "", truck: "", location: "", description: "", severity: "minor", dot_reportable: false, claim_number: "", status: "Open" });
    setShowAddAcc(false); flash("Accident recorded.");
  }
  function addMeeting() {
    if (!mtgForm.topic.trim() || !mtgForm.date) { flash("Topic and date are required."); return; }
    const next = [{ id: uid(), ...mtgForm }, ...meetings];
    setMeetings(next); lss(LS_MEETINGS, next);
    setMtgForm({ date: "", topic: "", attendees: "", notes: "" });
    setShowAddMtg(false); flash("Safety meeting logged.");
  }
  function updateAccStatus(id: string, status: Accident["status"]) {
    const next = accidents.map(a => a.id === id ? { ...a, status } : a);
    setAccidents(next); lss(LS_ACCIDENTS, next);
    flash(`Status updated to ${status}.`);
  }

  const openExceptions = exceptions.filter(e => !e.resolved);
  const CATS = ["All", ...Array.from(new Set(exceptions.map(e => e.category)))];
  const visibleEx = openExceptions.filter(e => catFilter === "All" || e.category === catFilter);
  const critical  = openExceptions.filter(e => e.severity === "critical").length;
  const warning   = openExceptions.filter(e => e.severity === "warning").length;
  const safetyScore = Math.max(0, 100 - accidents.filter(a => a.status !== "Closed").length * 10 - openExceptions.filter(e => e.category === "Driver Safety").length * 5);

  const TABS = [
    { key: "ops",      label: "Operations Queue" },
    { key: "safety",   label: "Safety & Accidents" },
    { key: "meetings", label: "Safety Meetings" },
  ] as const;

  return (
    <div style={{ maxWidth: 1080 }}>
      {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={eyebrow}>MoveAround TMS / Operations Center</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Operations Center</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Where office staff fix problems — payroll holds, billing holds, ticket exceptions, safety incidents, and more.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Critical Issues",  value: critical,                                        bg: "#fff1f2", color: "#dc2626" },
          { label: "Warnings",         value: warning,                                         bg: "#fff7ed", color: "#d97706" },
          { label: "Total Open",       value: openExceptions.length,                           bg: "#f8fafc", color: "#0f172a" },
          { label: "Open Accidents",   value: accidents.filter(a=>a.status!=="Closed").length, bg: "#fff7ed", color: "#d97706" },
          { label: "Safety Score",     value: `${safetyScore}%`,                               bg: safetyScore>=90?"#f0fdf4":"#fff7ed", color: safetyScore>=90?"#15803d":"#d97706" },
          { label: "Resolved",         value: exceptions.filter(e=>e.resolved).length,         bg: "#f0fdf4", color: "#15803d" },
        ].map(({ label, value, bg, color }) => (
          <div key={label} style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={eyebrow}>{label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? "#1e40af" : "#64748b", borderBottom: activeTab === t.key ? "2px solid #1e40af" : "2px solid transparent", marginBottom: -2 }}>
            {t.label}{t.key === "ops" && openExceptions.length > 0 ? ` (${openExceptions.length})` : ""}
          </button>
        ))}
      </div>

      {/* ── Operations Queue ── */}
      {activeTab === "ops" && (
        <div>
          {/* Category filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "5px 12px", border: "none", borderRadius: 20, background: catFilter === c ? "#0f172a" : "#f1f5f9", color: catFilter === c ? "#fff" : "#475569", cursor: "pointer", fontSize: "0.78rem", fontWeight: catFilter === c ? 700 : 500 }}>{c}</button>
            ))}
            <button onClick={() => addException("Ticket Exception", "Manual exception", "Entered manually")} style={{ ...ghostBtn, marginLeft: "auto", fontSize: "0.75rem" }}>+ Log Exception</button>
          </div>

          {visibleEx.length === 0 ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#15803d" }}>Operations queue is clear!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleEx.map(ex => {
                const [bg, color, border] = sevColor(ex.severity);
                return (
                  <div key={ex.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, color: "#0f172a" }}>{ex.title}</span>
                          <span style={{ background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700 }}>{ex.category}</span>
                          <span style={{ background: ex.severity==="critical"?"#dc2626":ex.severity==="warning"?"#d97706":"#1e40af", color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700 }}>{ex.severity.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: 4 }}>{ex.detail}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                          {ex.driver && <span>Driver: {ex.driver} · </span>}
                          {ex.truck  && <span>Truck: {ex.truck} · </span>}
                          Logged {fmtDate(ex.date)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => resolveEx(ex.id)} style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>✓ Resolve</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {exceptions.filter(e=>e.resolved).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ ...eyebrow, marginBottom: 10 }}>Resolved ({exceptions.filter(e=>e.resolved).length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {exceptions.filter(e=>e.resolved).map(ex => (
                  <div key={ex.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "#64748b", textDecoration: "line-through", fontSize: "0.82rem" }}>{ex.title}</span>
                      <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#94a3b8" }}>{ex.category}</span>
                    </div>
                    <button onClick={() => reopenEx(ex.id)} style={{ ...ghostBtn, fontSize: "0.72rem", padding: "4px 10px" }}>Reopen</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Safety & Accidents ── */}
      {activeTab === "safety" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>Driver Safety Score</div>
                <div style={{ background: safetyScore>=90?"#f0fdf4":"#fff7ed", color: safetyScore>=90?"#15803d":"#d97706", padding: "5px 14px", borderRadius: 20, fontWeight: 900, fontSize: "1rem" }}>{safetyScore}%</div>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Based on open accidents and safety violations. Lower open items = higher score.</div>
            </div>
            <button onClick={() => setShowAddAcc(s=>!s)} style={primaryBtn}>+ Log Accident</button>
          </div>

          {showAddAcc && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontWeight: 800, color: "#0f172a" }}>Log Accident / Incident</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                <div><label style={lbl}>Date *</label><input type="date" value={accForm.date} onChange={e=>setAccForm(f=>({...f,date:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Driver *</label><input value={accForm.driver} onChange={e=>setAccForm(f=>({...f,driver:e.target.value}))} style={inp} placeholder="John Smith" /></div>
                <div><label style={lbl}>Truck #</label><input value={accForm.truck} onChange={e=>setAccForm(f=>({...f,truck:e.target.value}))} style={inp} placeholder="Truck 18" /></div>
                <div><label style={lbl}>Location</label><input value={accForm.location} onChange={e=>setAccForm(f=>({...f,location:e.target.value}))} style={inp} placeholder="I-45 South, Houston TX" /></div>
                <div><label style={lbl}>Severity</label>
                  <select value={accForm.severity} onChange={e=>setAccForm(f=>({...f,severity:e.target.value as Accident["severity"]}))} style={inp}>
                    <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option><option value="fatality">Fatality</option>
                  </select>
                </div>
                <div><label style={lbl}>Claim #</label><input value={accForm.claim_number||""} onChange={e=>setAccForm(f=>({...f,claim_number:e.target.value}))} style={inp} placeholder="CLM-2026-001" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Description</label><input value={accForm.description} onChange={e=>setAccForm(f=>({...f,description:e.target.value}))} style={inp} placeholder="Brief description of what happened" /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="dotreport" checked={accForm.dot_reportable} onChange={e=>setAccForm(f=>({...f,dot_reportable:e.target.checked}))} />
                  <label htmlFor="dotreport" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>DOT Reportable</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addAccident} style={primaryBtn}>Log Accident</button>
                <button onClick={() => setShowAddAcc(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {accidents.length === 0 ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#15803d", fontWeight: 700 }}>No accidents on record.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accidents.map(a => {
                const [bg, color] = accSevBg(a.severity);
                return (
                  <div key={a.id} style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, color: "#0f172a" }}>{a.driver}</span>
                          <span style={{ background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>{a.severity}</span>
                          {a.dot_reportable && <span style={{ background: "#fff1f2", color: "#dc2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>DOT REPORTABLE</span>}
                          <span style={{ background: a.status==="Closed"?"#f0fdf4":a.status==="Under Review"?"#fefce8":"#fff1f2", color: a.status==="Closed"?"#15803d":a.status==="Under Review"?"#92400e":"#dc2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>{a.status}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: 4 }}>{a.description}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                          {fmtDate(a.date)} · {a.truck} · {a.location}{a.claim_number ? ` · Claim: ${a.claim_number}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {a.status === "Open"         && <button onClick={() => updateAccStatus(a.id, "Under Review")} style={{ ...ghostBtn, fontSize: "0.75rem" }}>Start Review</button>}
                        {a.status === "Under Review" && <button onClick={() => updateAccStatus(a.id, "Closed")}      style={{ ...ghostBtn, background: "#f0fdf4", color: "#15803d", borderColor: "#86efac", fontSize: "0.75rem" }}>Close</button>}
                        {a.status === "Closed"       && <button onClick={() => updateAccStatus(a.id, "Open")}        style={{ ...ghostBtn, fontSize: "0.75rem" }}>Reopen</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Safety Meetings ── */}
      {activeTab === "meetings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={eyebrow}>Safety Meetings</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Log safety meetings, topics covered, and attendees</div>
            </div>
            <button onClick={() => setShowAddMtg(s=>!s)} style={primaryBtn}>+ Log Meeting</button>
          </div>

          {showAddMtg && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                <div><label style={lbl}>Date *</label><input type="date" value={mtgForm.date} onChange={e=>setMtgForm(f=>({...f,date:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Attendees</label><input value={mtgForm.attendees} onChange={e=>setMtgForm(f=>({...f,attendees:e.target.value}))} style={inp} placeholder="All drivers, dispatch team" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Topic *</label><input value={mtgForm.topic} onChange={e=>setMtgForm(f=>({...f,topic:e.target.value}))} style={inp} placeholder="Pre-trip inspection procedures" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Notes</label><input value={mtgForm.notes||""} onChange={e=>setMtgForm(f=>({...f,notes:e.target.value}))} style={inp} placeholder="Key takeaways, action items" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addMeeting} style={primaryBtn}>Log Meeting</button>
                <button onClick={() => setShowAddMtg(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {meetings.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No safety meetings logged yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {meetings.map(m => (
                <div key={m.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{m.topic}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{fmtDate(m.date)} · {m.attendees}</div>
                      {m.notes && <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: 6 }}>{m.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
