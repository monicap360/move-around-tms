"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────── */
type InspType = "Pre-Trip" | "Post-Trip" | "DVIR" | "Annual" | "DOT" | "Trailer" | "Equipment";

type Inspection = {
  id: string;
  type: InspType;
  truck: string;
  driver: string;
  date: string;
  result: "Pass" | "Fail" | "Pass w/ Defects";
  defects: string[];
  defects_resolved: boolean;
  odometer?: string;
  notes?: string;
  dot_inspection_level?: string;
};

/* ─── Helpers ────────────────────────────────────── */
const LS_KEY = "ronyx_inspections";
function ls<T>(k: string, fb: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function lss(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDate(d?: string) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const DEMO_INSPECTIONS: Inspection[] = [
  { id: "ins1", type: "Pre-Trip",  truck: "Truck 18", driver: "Carlos Ramirez", date: "2026-06-14", result: "Pass",             defects: [],                          defects_resolved: true,  odometer: "284,100" },
  { id: "ins2", type: "Post-Trip", truck: "Truck 22", driver: "Marcus Lee",     date: "2026-06-13", result: "Pass w/ Defects",  defects: ["Low air pressure – rear",  "Cracked mirror – passenger side"], defects_resolved: false, odometer: "211,445" },
  { id: "ins3", type: "Pre-Trip",  truck: "Truck 31", driver: "Daniel Torres",  date: "2026-06-13", result: "Fail",             defects: ["Brake issue – squeal on decel", "Tail light out – driver side"], defects_resolved: false, odometer: "198,220", notes: "Unit grounded. Do not dispatch until brakes cleared." },
  { id: "ins4", type: "Annual",    truck: "Truck 18", driver: "Maintenance",    date: "2026-04-01", result: "Pass",             defects: [],                          defects_resolved: true },
  { id: "ins5", type: "DOT",       truck: "Truck 22", driver: "Officer Nguyen", date: "2026-03-15", result: "Pass",             defects: [],                          defects_resolved: true,  dot_inspection_level: "Level I" },
];

const DEFECT_OPTIONS = [
  "Brake issue", "Tire issue", "Tail light out", "Headlight out", "Mirror damage",
  "Cracked windshield", "Leaking fluids", "Low air pressure", "Horn inoperative",
  "Wiper blade damage", "Seat belt issue", "Fire extinguisher missing", "Emergency kit missing",
  "Fuel leak", "Engine warning light", "Exhaust issue", "DOT placard missing", "Other",
];

const eyebrow: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const inp: React.CSSProperties     = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const lbl: React.CSSProperties     = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties   = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };

function resultStyle(r: Inspection["result"]): [string, string] {
  if (r === "Pass")            return ["#f0fdf4", "#15803d"];
  if (r === "Fail")            return ["#fff1f2", "#dc2626"];
  return ["#fefce8", "#92400e"];
}

const INSP_TYPES: InspType[] = ["Pre-Trip", "Post-Trip", "DVIR", "Annual", "DOT", "Trailer", "Equipment"];
const EMPTY_FORM: Omit<Inspection, "id"> = { type: "Pre-Trip", truck: "", driver: "", date: new Date().toISOString().slice(0,10), result: "Pass", defects: [], defects_resolved: true, odometer: "", notes: "" };

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [defectInput, setDefectInput] = useState("");
  const [typeFilter, setTypeFilter]   = useState("All");
  const [resultFilter, setResultFilter] = useState("All");
  const [activeTab, setActiveTab]     = useState<"list" | "fleet-health">("list");
  const [toast, setToast]             = useState("");

  useEffect(() => {
    const stored = ls<Inspection[]>(LS_KEY, []);
    setInspections(stored.length > 0 ? stored : DEMO_INSPECTIONS);
    if (stored.length === 0) lss(LS_KEY, DEMO_INSPECTIONS);
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  function persist(next: Inspection[]) { setInspections(next); lss(LS_KEY, next); }

  function addDefect() {
    const d = defectInput.trim();
    if (d && !form.defects.includes(d)) {
      setForm(f => ({ ...f, defects: [...f.defects, d], result: "Pass w/ Defects" }));
    }
    setDefectInput("");
  }
  function removeDefect(d: string) { setForm(f => ({ ...f, defects: f.defects.filter(x => x !== d) })); }

  function save() {
    if (!form.truck.trim() || !form.driver.trim()) { flash("Truck and driver are required."); return; }
    const result: Inspection["result"] = form.result === "Fail" ? "Fail" : form.defects.length > 0 ? "Pass w/ Defects" : "Pass";
    const insp: Inspection = { id: uid(), ...form, result, defects_resolved: form.defects.length === 0 };
    const next = [insp, ...inspections];
    persist(next);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    flash(`${form.type} inspection saved for ${form.truck}.`);
  }

  function resolveDefects(id: string) {
    persist(inspections.map(i => i.id === id ? { ...i, defects_resolved: true } : i));
    flash("Defects marked resolved.");
  }

  const all = inspections;
  const filtered = all.filter(i => (typeFilter === "All" || i.type === typeFilter) && (resultFilter === "All" || i.result === resultFilter));
  const openDefects  = all.filter(i => i.defects.length > 0 && !i.defects_resolved);
  const failedToday  = all.filter(i => i.result === "Fail" && !i.defects_resolved);
  const passRate     = all.length > 0 ? Math.round(all.filter(i => i.result === "Pass").length / all.length * 100) : 100;
  const trucks       = Array.from(new Set(all.map(i => i.truck)));
  const fleetScore   = Math.max(0, 100 - openDefects.length * 8 - failedToday.length * 15);

  // Per-truck health
  const truckHealth = trucks.map(t => {
    const ti = all.filter(i => i.truck === t);
    const lastInsp = ti[0];
    const openDef  = ti.filter(i => i.defects.length > 0 && !i.defects_resolved);
    const failed   = ti.some(i => i.result === "Fail" && !i.defects_resolved);
    return { truck: t, lastInsp, openDef, failed };
  });

  return (
    <div style={{ maxWidth: 1080 }}>
      {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={eyebrow}>MoveAround TMS / Inspections</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Inspections</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Pre-trip · Post-trip · DVIR · Annual · DOT · Trailer — defect tracking and fleet health score</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Fleet Health",      value: `${fleetScore}%`,     bg: fleetScore>=90?"#f0fdf4":"#fff7ed",  color: fleetScore>=90?"#15803d":"#d97706" },
          { label: "Pass Rate",         value: `${passRate}%`,       bg: "#f0fdf4", color: "#15803d" },
          { label: "Open Defects",      value: openDefects.length,   bg: openDefects.length>0?"#fff1f2":"#f8fafc", color: openDefects.length>0?"#dc2626":"#0f172a" },
          { label: "Failed (Uncleared)",value: failedToday.length,   bg: failedToday.length>0?"#fff1f2":"#f8fafc", color: failedToday.length>0?"#dc2626":"#0f172a" },
          { label: "Total Inspections", value: all.length,           bg: "#f8fafc", color: "#0f172a" },
          { label: "Trucks Inspected",  value: trucks.length,        bg: "#eff6ff", color: "#1e40af" },
        ].map(({ label, value, bg, color }) => (
          <div key={label} style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={eyebrow}>{label}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 900, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {([["list","Inspection Log"],["fleet-health","Fleet Health"]] as const).map(([k,label]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab===k?700:500, color: activeTab===k?"#1e40af":"#64748b", borderBottom: activeTab===k?"2px solid #1e40af":"2px solid transparent", marginBottom: -2 }}>{label}</button>
        ))}
      </div>

      {/* ── Inspection Log ── */}
      {activeTab === "list" && (
        <div>
          {/* Filters + Add */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp, width: "auto" }}>
              <option value="All">All Types</option>
              {INSP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} style={{ ...inp, width: "auto" }}>
              <option value="All">All Results</option>
              <option>Pass</option><option>Pass w/ Defects</option><option>Fail</option>
            </select>
            <button onClick={() => setShowForm(s=>!s)} style={{ ...primaryBtn, marginLeft: "auto" }}>+ Log Inspection</button>
          </div>

          {/* Open defects banner */}
          {openDefects.length > 0 && (
            <div style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>⚠</span>
              <div>
                <div style={{ fontWeight: 700, color: "#dc2626" }}>{openDefects.length} truck{openDefects.length>1?"s have":"has"} unresolved defects</div>
                <div style={{ fontSize: "0.78rem", color: "#991b1b" }}>{openDefects.map(i => i.truck).join(", ")} — verify resolved before dispatch</div>
              </div>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontWeight: 800 }}>Log Inspection</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                <div><label style={lbl}>Inspection Type</label>
                  <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value as InspType}))} style={inp}>
                    {INSP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Truck # *</label><input value={form.truck} onChange={e=>setForm(f=>({...f,truck:e.target.value}))} style={inp} placeholder="Truck 18" /></div>
                <div><label style={lbl}>Driver / Inspector *</label><input value={form.driver} onChange={e=>setForm(f=>({...f,driver:e.target.value}))} style={inp} placeholder="John Smith" /></div>
                <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Result</label>
                  <select value={form.result} onChange={e=>setForm(f=>({...f,result:e.target.value as Inspection["result"]}))} style={inp}>
                    <option>Pass</option><option>Pass w/ Defects</option><option>Fail</option>
                  </select>
                </div>
                <div><label style={lbl}>Odometer</label><input value={form.odometer||""} onChange={e=>setForm(f=>({...f,odometer:e.target.value}))} style={inp} placeholder="284,100" /></div>
                {form.type === "DOT" && (
                  <div><label style={lbl}>DOT Level</label>
                    <select value={form.dot_inspection_level||""} onChange={e=>setForm(f=>({...f,dot_inspection_level:e.target.value}))} style={inp}>
                      <option value="">Select…</option>
                      {["Level I","Level II","Level III","Level IV","Level V","Level VI"].map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Notes</label><input value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={inp} placeholder="Optional notes" /></div>

                {/* Defect adder */}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Defects Reported</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={defectInput} onChange={e => setDefectInput(e.target.value)} style={{ ...inp, flex: 1 }}>
                      <option value="">Select defect or type below…</option>
                      {DEFECT_OPTIONS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <input value={defectInput} onChange={e=>setDefectInput(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Or type custom defect…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDefect())} />
                    <button type="button" onClick={addDefect} style={{ ...primaryBtn, flexShrink: 0 }}>Add</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {form.defects.map(d => (
                      <span key={d} style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fda4af", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        {d} <button onClick={() => removeDefect(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0, fontWeight: 700 }}>✕</button>
                      </span>
                    ))}
                    {form.defects.length === 0 && <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>No defects — inspection passes clean</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={save} style={primaryBtn}>Save Inspection</button>
                <button onClick={() => { setShowForm(false); setForm({...EMPTY_FORM}); }} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {/* Inspection list */}
          {filtered.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No inspections match your filters.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date","Type","Truck","Driver","Result","Defects",""].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: "0.68rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => {
                    const [resBg, resColor] = resultStyle(i.result);
                    return (
                      <tr key={i.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{fmtDate(i.date)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: "#f1f5f9", color: "#0f172a", padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 }}>{i.type}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{i.truck}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{i.driver}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: resBg, color: resColor, padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}>{i.result}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {i.defects.length === 0 ? (
                            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>None</span>
                          ) : (
                            <div>
                              <div style={{ fontSize: "0.75rem", color: i.defects_resolved ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                                {i.defects.length} defect{i.defects.length>1?"s":""} · {i.defects_resolved ? "✓ Resolved" : "⚠ Open"}
                              </div>
                              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{i.defects.join(", ")}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {i.defects.length > 0 && !i.defects_resolved && (
                            <button onClick={() => resolveDefects(i.id)} style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Resolve Defects</button>
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
      )}

      {/* ── Fleet Health ── */}
      {activeTab === "fleet-health" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ background: fleetScore>=90?"#f0fdf4":"fleetScore>=70?#fff7ed":"#fff1f2", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 24px", textAlign: "center" }}>
              <div style={eyebrow}>Fleet Health Score</div>
              <div style={{ fontSize: "3rem", fontWeight: 900, color: fleetScore>=90?"#15803d":fleetScore>=70?"#d97706":"#dc2626", lineHeight: 1.1 }}>{fleetScore}%</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{fleetScore>=90?"Excellent":"fleetScore>=70?Needs attention":"Action required"}</div>
            </div>
            <div style={{ flex: 1, fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
              Fleet health score is calculated from open defects and unresolved failed inspections. Resolve defects to improve the score. Grounded trucks should not be dispatched.
            </div>
          </div>

          {truckHealth.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>Log inspections to see truck health here.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {truckHealth.map(({ truck, lastInsp, openDef, failed }) => {
                const status = failed ? "Grounded" : openDef.length > 0 ? "Defects" : "Clear";
                const statusBg    = status==="Grounded"?"#fff1f2":status==="Defects"?"#fff7ed":"#f0fdf4";
                const statusColor = status==="Grounded"?"#dc2626":status==="Defects"?"#d97706":"#15803d";
                return (
                  <div key={truck} style={{ background: "#fff", border: `2px solid ${statusColor}22`, borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "1.5rem" }}>🚛</div>
                      <span style={{ background: statusBg, color: statusColor, padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800 }}>
                        {status === "Grounded" ? "⛔ GROUNDED" : status === "Defects" ? "⚠ DEFECTS" : "✓ CLEAR"}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginTop: 8 }}>{truck}</div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>
                      Last inspection: {lastInsp ? `${lastInsp.type} · ${fmtDate(lastInsp.date)}` : "No inspections yet"}
                    </div>
                    {openDef.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}>
                        {openDef.reduce((s,i) => s + i.defects.length, 0)} open defect{openDef.reduce((s,i)=>s+i.defects.length,0)>1?"s":""}
                      </div>
                    )}
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8" }}>
                      <span>{lastInsp?.result || "—"}</span>
                      {lastInsp?.odometer && <span>🛣 {lastInsp.odometer} mi</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
