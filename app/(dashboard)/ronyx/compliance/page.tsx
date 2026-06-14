"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────── */
type DriverCompliance = {
  id: string;
  name: string;
  status: string;
  company_name?: string;
  cdl_expiration?: string;
  mvr_expiration?: string;
  medical_card_expiration?: string;
  license_number?: string;
  license_state?: string;
  phone?: string;
  email?: string;
};

type CabCard = {
  id: string;
  truck_number: string;
  plate?: string;
  state?: string;
  cab_card_expiration?: string;
  ifta_expiration?: string;
  registration_expiration?: string;
};

type Alert = {
  id: string;
  category: "CDL" | "Med Card" | "MVR" | "Cab Card" | "IFTA" | "Registration";
  driver_or_truck: string;
  expires_on: string;
  days: number;
  status: "critical" | "warning" | "upcoming";
  action_label: string;
  contact?: string;
  resolved?: boolean;
};

/* ─── Helpers ────────────────────────────────────── */
function daysUntil(d?: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function alertLevel(days: number | null): Alert["status"] {
  if (days === null || days < 0) return "critical";
  if (days <= 30)  return "critical";
  if (days <= 60)  return "warning";
  return "upcoming";
}
function statusColor(s: Alert["status"]): [string, string, string] {
  if (s === "critical") return ["#fff1f2", "#dc2626", "#fda4af"];
  if (s === "warning")  return ["#fff7ed", "#d97706", "#fed7aa"];
  return ["#fefce8", "#92400e", "#fde68a"];
}

const LS_ALERTS  = "ronyx_compliance_resolved";
const LS_CABCARD = "ronyx_cab_cards";

function loadResolved(): string[] { try { return JSON.parse(localStorage.getItem(LS_ALERTS) || "[]"); } catch { return []; } }
function saveResolved(ids: string[]) { try { localStorage.setItem(LS_ALERTS, JSON.stringify(ids)); } catch {} }
function loadCabCards(): CabCard[] { try { return JSON.parse(localStorage.getItem(LS_CABCARD) || "[]"); } catch { return []; } }
function saveCabCards(c: CabCard[]) { try { localStorage.setItem(LS_CABCARD, JSON.stringify(c)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }

const eyebrow: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };

const EMPTY_CAB: Omit<CabCard, "id"> = { truck_number: "", plate: "", state: "TX", cab_card_expiration: "", ifta_expiration: "", registration_expiration: "" };

export default function ComplianceCenterPage() {
  const [drivers, setDrivers]       = useState<DriverCompliance[]>([]);
  const [cabCards, setCabCards]     = useState<CabCard[]>([]);
  const [resolved, setResolved]     = useState<string[]>([]);
  const [activeTab, setActiveTab]   = useState<"overview" | "drivers" | "vehicles" | "cab-cards">("overview");
  const [filter, setFilter]         = useState<"all" | "critical" | "warning" | "upcoming">("all");
  const [showResolved, setShowResolved] = useState(false);
  const [showAddCab, setShowAddCab] = useState(false);
  const [cabForm, setCabForm]       = useState({ ...EMPTY_CAB });
  const [toast, setToast]           = useState("");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setResolved(loadResolved());
    setCabCards(loadCabCards());
    fetch("/api/ronyx/drivers/list")
      .then(r => r.ok ? r.json() : { drivers: [] })
      .then(d => { setDrivers(d.drivers || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  function resolve(id: string) {
    const next = [...resolved, id];
    setResolved(next); saveResolved(next);
    flash("Marked as resolved.");
  }
  function unresolve(id: string) {
    const next = resolved.filter(r => r !== id);
    setResolved(next); saveResolved(next);
  }

  // Build alerts from driver compliance data
  const driverAlerts: Alert[] = [];
  drivers.forEach(d => {
    const checks: [string | undefined, Alert["category"], string][] = [
      [d.cdl_expiration,           "CDL",      "Request CDL renewal"],
      [d.mvr_expiration,           "MVR",      "Request new MVR"],
      [d.medical_card_expiration,  "Med Card", "Schedule DOT physical"],
    ];
    checks.forEach(([date, cat, action]) => {
      const days = daysUntil(date);
      if (days !== null && days <= 90) {
        driverAlerts.push({ id: `${d.id}-${cat}`, category: cat, driver_or_truck: d.name, expires_on: date!, days, status: alertLevel(days), action_label: action, contact: d.phone || d.email });
      }
    });
  });

  // Build alerts from cab cards
  const vehicleAlerts: Alert[] = [];
  cabCards.forEach(c => {
    const checks: [string | undefined, Alert["category"], string][] = [
      [c.cab_card_expiration,      "Cab Card",    "Renew cab card at DMV"],
      [c.ifta_expiration,          "IFTA",        "Renew IFTA decal"],
      [c.registration_expiration,  "Registration","Renew vehicle registration"],
    ];
    checks.forEach(([date, cat, action]) => {
      const days = daysUntil(date);
      if (days !== null && days <= 90) {
        vehicleAlerts.push({ id: `${c.id}-${cat}`, category: cat, driver_or_truck: c.truck_number, expires_on: date!, days, status: alertLevel(days), action_label: action });
      }
    });
  });

  const allAlerts = [...driverAlerts, ...vehicleAlerts].sort((a, b) => a.days - b.days);
  const visible   = allAlerts.filter(a => (showResolved ? resolved.includes(a.id) : !resolved.includes(a.id)) && (filter === "all" || a.status === filter));
  const critical  = allAlerts.filter(a => a.status === "critical" && !resolved.includes(a.id)).length;
  const warning   = allAlerts.filter(a => a.status === "warning"  && !resolved.includes(a.id)).length;
  const upcoming  = allAlerts.filter(a => a.status === "upcoming" && !resolved.includes(a.id)).length;

  function addCabCard() {
    if (!cabForm.truck_number.trim()) { flash("Truck number is required."); return; }
    const next = [...cabCards, { id: uid(), ...cabForm }];
    setCabCards(next); saveCabCards(next);
    setCabForm({ ...EMPTY_CAB }); setShowAddCab(false);
    flash(`${cabForm.truck_number} added.`);
  }
  function removeCabCard(id: string) {
    const next = cabCards.filter(c => c.id !== id);
    setCabCards(next); saveCabCards(next);
  }

  function sendReminder(a: Alert) {
    if (!a.contact) { flash("No contact info on file for this driver."); return; }
    const sub = encodeURIComponent(`Action Required: ${a.category} expiring ${fmtDate(a.expires_on)}`);
    const body = encodeURIComponent(`Hi ${a.driver_or_truck},\n\nYour ${a.category} expires on ${fmtDate(a.expires_on)} (${a.days} days).\n\nPlease ${a.action_label.toLowerCase()} as soon as possible.\n\nMoveAround Compliance Team`);
    const contact = a.contact.includes("@") ? `mailto:${a.contact}?subject=${sub}&body=${body}` : `sms:${a.contact}?body=${body}`;
    window.location.href = contact;
    flash("Reminder opened.");
  }

  const TABS = ["overview", "drivers", "vehicles", "cab-cards"] as const;

  return (
    <div style={{ maxWidth: 1080 }}>
      {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={eyebrow}>MoveAround TMS / Compliance Center</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Compliance Center</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>CDL · Med Card · MVR · Cab Cards · IFTA · Registration — one place, one click to act.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Critical (≤30d)",  value: critical, bg: "#fff1f2", color: "#dc2626" },
          { label: "Warning (31–60d)", value: warning,  bg: "#fff7ed", color: "#d97706" },
          { label: "Upcoming (61–90d)",value: upcoming, bg: "#fefce8", color: "#92400e" },
          { label: "Drivers Tracked",  value: drivers.length,   bg: "#eff6ff", color: "#1e40af" },
          { label: "Vehicles Tracked", value: cabCards.length,  bg: "#f5f3ff", color: "#7c3aed" },
          { label: "Resolved",         value: resolved.length,  bg: "#f0fdf4", color: "#15803d" },
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
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === t ? 700 : 500, color: activeTab === t ? "#1e40af" : "#64748b", borderBottom: activeTab === t ? "2px solid #1e40af" : "2px solid transparent", marginBottom: -2, textTransform: "capitalize" }}>
            {t === "cab-cards" ? "Cab Cards" : t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div>
          {/* Filter row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {(["all","critical","warning","upcoming"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", border: "none", borderRadius: 20, fontWeight: filter === f ? 700 : 500, background: filter === f ? "#0f172a" : "#f1f5f9", color: filter === f ? "#fff" : "#475569", cursor: "pointer", fontSize: "0.8rem", textTransform: "capitalize" }}>{f === "all" ? `All (${allAlerts.filter(a => !resolved.includes(a.id)).length})` : `${f} (${allAlerts.filter(a=>a.status===f&&!resolved.includes(a.id)).length})`}</button>
            ))}
            <button onClick={() => setShowResolved(s=>!s)} style={{ ...ghostBtn, marginLeft: "auto" }}>{showResolved ? "← Back to Open" : `Show Resolved (${resolved.length})`}</button>
          </div>

          {loading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Loading compliance data…</div>}

          {!loading && visible.length === 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#15803d" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700 }}>{showResolved ? "No resolved items." : "All clear — no compliance items in the next 90 days."}</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map(a => {
              const [bg, color, border] = statusColor(a.status);
              return (
                <div key={a.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{a.driver_or_truck}</span>
                      <span style={{ background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>{a.category}</span>
                      <span style={{ color, fontWeight: 700, fontSize: "0.8rem" }}>{a.days < 0 ? `⚠ EXPIRED ${Math.abs(a.days)}d ago` : `${a.days} days left`}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#475569" }}>Expires {fmtDate(a.expires_on)} · {a.action_label}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!showResolved && a.contact && (
                      <button onClick={() => sendReminder(a)} style={{ ...primaryBtn, background: "#7c3aed", fontSize: "0.75rem", padding: "6px 12px" }}>Send Reminder</button>
                    )}
                    {showResolved
                      ? <button onClick={() => unresolve(a.id)} style={ghostBtn}>Reopen</button>
                      : <button onClick={() => resolve(a.id)} style={{ ...ghostBtn, background: "#f0fdf4", color: "#15803d", borderColor: "#86efac" }}>✓ Resolve</button>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Drivers tab ── */}
      {activeTab === "drivers" && (
        <div>
          <div style={eyebrow}>Driver Compliance Matrix</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2, marginBottom: 14 }}>{drivers.length} drivers — CDL, MVR, and medical card status at a glance</div>
          {loading ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Loading…</div> : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Driver", "Company", "CDL Expiration", "Med Card Exp.", "MVR Expiration", "Eligible"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: "0.68rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const cdlD = daysUntil(d.cdl_expiration);
                    const medD = daysUntil(d.medical_card_expiration);
                    const mvrD = daysUntil(d.mvr_expiration);
                    const eligible = (cdlD === null || cdlD > 0) && (medD === null || medD > 0);
                    function expBadge(days: number | null, date?: string) {
                      if (!date) return <span style={{ color: "#94a3b8" }}>Not set</span>;
                      const bg = days === null ? "#f1f5f9" : days < 0 ? "#fff1f2" : days <= 30 ? "#fff1f2" : days <= 90 ? "#fff7ed" : "#f0fdf4";
                      const col = days === null ? "#94a3b8" : days < 0 ? "#dc2626" : days <= 30 ? "#dc2626" : days <= 90 ? "#d97706" : "#15803d";
                      return <span style={{ background: bg, color: col, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.75rem" }}>{fmtDate(date)}{days !== null && days <= 90 ? ` (${days}d)` : ""}</span>;
                    }
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{d.name}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>{d.company_name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(cdlD, d.cdl_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(medD, d.medical_card_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(mvrD, d.mvr_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: eligible ? "#f0fdf4" : "#fff1f2", color: eligible ? "#15803d" : "#dc2626", padding: "3px 10px", borderRadius: 8, fontWeight: 800, fontSize: "0.75rem" }}>{eligible ? "✓ Eligible" : "✗ Hold"}</span>
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

      {/* ── Vehicles tab ── */}
      {activeTab === "vehicles" && (
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 14 }}>Vehicle compliance tracked via Cab Cards tab below. Add trucks there to see expiration alerts here.</div>
          {vehicleAlerts.length === 0 ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#15803d", fontWeight: 700 }}>No vehicle compliance alerts. Add cab cards to begin tracking.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vehicleAlerts.filter(a => !resolved.includes(a.id)).map(a => {
                const [bg, color, border] = statusColor(a.status);
                return (
                  <div key={a.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>Truck {a.driver_or_truck}</span>
                        <span style={{ background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>{a.category}</span>
                        <span style={{ color, fontWeight: 700, fontSize: "0.8rem" }}>{a.days < 0 ? `EXPIRED ${Math.abs(a.days)}d ago` : `${a.days} days`}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569" }}>{a.action_label} · Expires {fmtDate(a.expires_on)}</div>
                    </div>
                    <button onClick={() => resolve(a.id)} style={{ ...ghostBtn, background: "#f0fdf4", color: "#15803d", borderColor: "#86efac" }}>✓ Resolve</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Cab Cards tab ── */}
      {activeTab === "cab-cards" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={eyebrow}>Cab Card & Registration Tracker</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Track cab card, IFTA decal, and registration renewal dates per truck</div>
            </div>
            <button onClick={() => setShowAddCab(s => !s)} style={primaryBtn}>+ Add Truck</button>
          </div>

          {showAddCab && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                <div><label style={lbl}>Truck # *</label><input value={cabForm.truck_number} onChange={e => setCabForm(f=>({...f, truck_number: e.target.value}))} style={inp} placeholder="Truck 18" /></div>
                <div><label style={lbl}>Plate #</label><input value={cabForm.plate} onChange={e => setCabForm(f=>({...f, plate: e.target.value}))} style={inp} placeholder="ABC-1234" /></div>
                <div><label style={lbl}>State</label><input value={cabForm.state} onChange={e => setCabForm(f=>({...f, state: e.target.value}))} style={inp} placeholder="TX" maxLength={2} /></div>
                <div><label style={lbl}>Cab Card Expiration</label><input type="date" value={cabForm.cab_card_expiration} onChange={e => setCabForm(f=>({...f, cab_card_expiration: e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>IFTA Decal Expiration</label><input type="date" value={cabForm.ifta_expiration} onChange={e => setCabForm(f=>({...f, ifta_expiration: e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Registration Expiration</label><input type="date" value={cabForm.registration_expiration} onChange={e => setCabForm(f=>({...f, registration_expiration: e.target.value}))} style={inp} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addCabCard} style={primaryBtn}>Add</button>
                <button onClick={() => setShowAddCab(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {cabCards.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "50px 0", textAlign: "center", color: "#94a3b8" }}>No trucks tracked yet. Click + Add Truck above.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Truck #", "Plate", "State", "Cab Card Exp.", "IFTA Exp.", "Registration Exp.", ""].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: "0.68rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cabCards.map(c => {
                    function expBadge(date?: string) {
                      const days = daysUntil(date);
                      if (!date) return <span style={{ color: "#94a3b8" }}>—</span>;
                      const bg  = days === null ? "#f1f5f9" : days < 0 ? "#fff1f2" : days <= 30 ? "#fff1f2" : days <= 90 ? "#fff7ed" : "#f0fdf4";
                      const col = days === null ? "#94a3b8" : days < 0 ? "#dc2626" : days <= 30 ? "#dc2626" : days <= 90 ? "#d97706" : "#15803d";
                      return <span style={{ background: bg, color: col, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.75rem" }}>{fmtDate(date)}{days !== null && days <= 90 ? ` (${days}d)` : ""}</span>;
                    }
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{c.truck_number}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{c.plate || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{c.state || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(c.cab_card_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(c.ifta_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>{expBadge(c.registration_expiration)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => removeCabCard(c.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Remove</button>
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
    </div>
  );
}
