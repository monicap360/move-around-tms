"use client";

import { useEffect, useMemo, useState } from "react";

/* ─── Types ─────────────────────────────────────────────── */
type TruckStatus = "Available" | "On Route" | "In Maintenance" | "Out of Service" | "Inactive";
type MaintenanceRisk = "Low" | "Medium" | "High" | "Critical";

type Truck = {
  id: string;
  unit: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  plate: string;
  status: TruckStatus;
  driver: string;
  trailer: string;
  currentLoad: string;
  location: string;
  odometer: number;
  healthScore: number;
  readinessScore: number;
  maintenanceRisk: MaintenanceRisk;
  lastInspection: string;
  nextInspection: string;
  dotExpiry: string;
  registrationExpiry: string;
  insuranceExpiry: string;
  nextOilChange: number;
  brakePct: number;
  tirePct: number;
  revenueWeek: number;
  costPerMile: number;
  fuelEfficiency: number;
  utilization: number;
  aiNote: string;
};

/* ─── Static demo data (replace with Supabase fetch) ────── */
const DEMO_TRUCKS: Truck[] = [
  {
    id: "T001",
    unit: "Unit 214",
    year: 2021,
    make: "Kenworth",
    model: "T880",
    vin: "1XKWDB9X0MJ123456",
    plate: "TX-4821RX",
    status: "On Route",
    driver: "Carlos Ramirez",
    trailer: "End Dump 07",
    currentLoad: "LD-1048",
    location: "I-45 N, League City TX",
    odometer: 187_420,
    healthScore: 88,
    readinessScore: 91,
    maintenanceRisk: "Low",
    lastInspection: "2026-05-10",
    nextInspection: "2026-08-10",
    dotExpiry: "2026-12-31",
    registrationExpiry: "2026-11-15",
    insuranceExpiry: "2026-09-01",
    nextOilChange: 192_000,
    brakePct: 72,
    tirePct: 68,
    revenueWeek: 4820,
    costPerMile: 1.42,
    fuelEfficiency: 6.8,
    utilization: 87,
    aiNote: "Tire wear approaching 60% threshold — schedule rotation before next long haul.",
  },
  {
    id: "T002",
    unit: "Unit 118",
    year: 2019,
    make: "Peterbilt",
    model: "367",
    vin: "1XPFDB9X9KJ654321",
    plate: "TX-9903MV",
    status: "Available",
    driver: "Marcus Lee",
    trailer: "Belly Dump 03",
    currentLoad: "—",
    location: "Ronyx Yard, Galveston TX",
    odometer: 244_100,
    healthScore: 74,
    readinessScore: 79,
    maintenanceRisk: "Medium",
    lastInspection: "2026-03-22",
    nextInspection: "2026-06-22",
    dotExpiry: "2026-09-30",
    registrationExpiry: "2026-07-01",
    insuranceExpiry: "2026-08-15",
    nextOilChange: 245_000,
    brakePct: 55,
    tirePct: 61,
    revenueWeek: 3910,
    costPerMile: 1.67,
    fuelEfficiency: 5.9,
    utilization: 71,
    aiNote: "Brake pads below 60% — schedule inspection before next dispatch. Registration expires in 18 days.",
  },
  {
    id: "T003",
    unit: "Unit 301",
    year: 2017,
    make: "Mack",
    model: "Granite",
    vin: "1M1AX09YXHM987654",
    plate: "TX-2240KQ",
    status: "Out of Service",
    driver: "Daniel Torres",
    trailer: "Flatbed 11",
    currentLoad: "—",
    location: "Ronyx Yard, Texas City TX",
    odometer: 392_500,
    healthScore: 41,
    readinessScore: 22,
    maintenanceRisk: "Critical",
    lastInspection: "2025-12-01",
    nextInspection: "OVERDUE",
    dotExpiry: "2026-03-31",
    registrationExpiry: "2026-04-01",
    insuranceExpiry: "2026-02-28",
    nextOilChange: 393_000,
    brakePct: 28,
    tirePct: 31,
    revenueWeek: 0,
    costPerMile: 2.91,
    fuelEfficiency: 4.2,
    utilization: 0,
    aiNote: "CRITICAL: DOT annual inspection overdue, brakes at 28%, insurance expired. Do not dispatch until cleared.",
  },
  {
    id: "T004",
    unit: "Unit 127",
    year: 2023,
    make: "Kenworth",
    model: "T800",
    vin: "1XKWDB9X3PJ001122",
    plate: "TX-6617ZP",
    status: "Available",
    driver: "Jose Martinez",
    trailer: "End Dump 12",
    currentLoad: "—",
    location: "La Marque Yard, TX",
    odometer: 61_800,
    healthScore: 97,
    readinessScore: 99,
    maintenanceRisk: "Low",
    lastInspection: "2026-05-28",
    nextInspection: "2026-08-28",
    dotExpiry: "2027-05-31",
    registrationExpiry: "2027-03-01",
    insuranceExpiry: "2027-01-15",
    nextOilChange: 65_000,
    brakePct: 94,
    tirePct: 91,
    revenueWeek: 5240,
    costPerMile: 1.18,
    fuelEfficiency: 7.4,
    utilization: 93,
    aiNote: "Top performing unit. Next scheduled service in approx. 3,200 miles. No action required.",
  },
];

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string) {
  if (!iso || iso === "OVERDUE") return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntil(iso: string): number | null {
  if (!iso || iso === "OVERDUE") return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function docBadgeClass(iso: string): string {
  const d = daysUntil(iso);
  if (d === null || d < 0) return "fleet-doc-badge expired";
  if (d <= 30) return "fleet-doc-badge expiring";
  return "fleet-doc-badge good";
}

function healthColor(score: number): string {
  if (score >= 85) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function riskClass(r: MaintenanceRisk): string {
  if (r === "Low")      return "fleet-risk low";
  if (r === "Medium")   return "fleet-risk medium";
  if (r === "High")     return "fleet-risk high";
  return "fleet-risk critical";
}

function statusClass(s: TruckStatus): string {
  if (s === "Available")        return "fleet-status green";
  if (s === "On Route")         return "fleet-status blue";
  if (s === "In Maintenance")   return "fleet-status amber";
  return "fleet-status red";
}

/* ─── Gauge bar ─────────────────────────────────────────── */
function GaugeBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 70 ? "#10b981" : pct >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 3 }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

/* ─── Health ring ───────────────────────────────────────── */
function HealthRing({ score }: { score: number }) {
  const r = 26, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = healthColor(score);
  return (
    <svg width={66} height={66} style={{ flexShrink: 0 }}>
      <circle cx={33} cy={33} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle
        cx={33} cy={33} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 33 33)"
      />
      <text x={33} y={38} textAnchor="middle" fontSize={14} fontWeight={900} fill={color}>{score}</text>
    </svg>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function FleetCommandCenter() {
  const [trucks]      = useState<Truck[]>(DEMO_TRUCKS);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [riskFilter, setRisk]     = useState("All");
  const [expanded, setExpanded]   = useState<string | null>(null);

  const filtered = useMemo(() => trucks.filter((t) => {
    const q = search.toLowerCase();
    const matchQ = !q || t.unit.toLowerCase().includes(q) || t.driver.toLowerCase().includes(q) ||
      t.make.toLowerCase().includes(q) || t.model.toLowerCase().includes(q) || t.plate.toLowerCase().includes(q);
    const matchS = statusFilter === "All" || t.status === statusFilter;
    const matchR = riskFilter  === "All" || t.maintenanceRisk === riskFilter;
    return matchQ && matchS && matchR;
  }), [trucks, search, statusFilter, riskFilter]);

  const available   = trucks.filter((t) => t.status === "Available").length;
  const onRoute     = trucks.filter((t) => t.status === "On Route").length;
  const oos         = trucks.filter((t) => t.status === "Out of Service").length;
  const critRisk    = trucks.filter((t) => t.maintenanceRisk === "Critical" || t.maintenanceRisk === "High").length;
  const avgHealth   = Math.round(trucks.reduce((s, t) => s + t.healthScore, 0) / trucks.length);
  const avgUtil     = Math.round(trucks.reduce((s, t) => s + t.utilization, 0) / trucks.length);
  const weekRevenue = trucks.reduce((s, t) => s + t.revenueWeek, 0);

  return (
    <main className="premium-page">
      {/* ── Hero ── */}
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Fleet Command / Trucks</p>
          <h1>Fleet Intelligence</h1>
          <p>
            Real-time truck health, predictive maintenance, DOT compliance, fuel efficiency,
            revenue per unit, and out-of-service controls from one command center.
          </p>
        </div>
        <div className="premium-hero-actions">
          <button className="premium-button ghost">Export Fleet Report</button>
          <button className="premium-button dark">Schedule Maintenance</button>
          <button className="premium-button primary">+ Add Truck</button>
        </div>
      </section>

      {/* ── KPI strip ── */}
      <section className="premium-kpi-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {[
          { label: "Total Trucks",    val: trucks.length,           sub: "In fleet",           cls: "" },
          { label: "Available",       val: available,               sub: "Ready for dispatch", cls: "success" },
          { label: "On Route",        val: onRoute,                 sub: "Currently active",   cls: "blue" },
          { label: "Out of Service",  val: oos,                     sub: "Needs attention",    cls: "danger" },
          { label: "Avg Health",      val: `${avgHealth}%`,         sub: "Fleet health score", cls: "" },
          { label: "Utilization",     val: `${avgUtil}%`,           sub: "Fleet utilization",  cls: "" },
          { label: "Week Revenue",    val: `$${weekRevenue.toLocaleString()}`, sub: "All trucks combined", cls: "success" },
        ].map((k) => (
          <div key={k.label} className={`premium-kpi ${k.cls}`}>
            <span>{k.label}</span>
            <strong style={{ fontSize: "1.7rem" }}>{k.val}</strong>
            <p>{k.sub}</p>
          </div>
        ))}
      </section>

      <section className="premium-layout">
        <div className="premium-main-column">

          {/* ── Critical alerts ── */}
          {critRisk > 0 && (
            <div className="premium-panel">
              <div className="premium-panel-header">
                <div>
                  <p className="premium-eyebrow">Maintenance Alerts</p>
                  <h2>Fleet Risk Warnings</h2>
                  <span>Units requiring immediate attention before dispatch.</span>
                </div>
              </div>
              <div className="premium-alert-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {trucks.filter((t) => t.maintenanceRisk === "Critical" || t.maintenanceRisk === "High").map((t) => (
                  <div key={t.id} className={t.maintenanceRisk === "Critical" ? "premium-alert critical" : "premium-alert warning"}>
                    <div>
                      <strong>{t.unit} — {t.maintenanceRisk} Risk</strong>
                      <p>{t.make} {t.model} ({t.year})</p>
                      <span>{t.aiNote}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <p className="premium-eyebrow">Truck Directory</p>
                <h2>All Units</h2>
                <span>Click any row to expand health details, docs, and AI recommendations.</span>
              </div>
            </div>

            <div className="premium-filter-bar" style={{ gridTemplateColumns: "1fr 180px 180px" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit, driver, make, plate…" />
              <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option>Available</option>
                <option>On Route</option>
                <option>In Maintenance</option>
                <option>Out of Service</option>
                <option>Inactive</option>
              </select>
              <select value={riskFilter} onChange={(e) => setRisk(e.target.value)}>
                <option value="All">All Risk Levels</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.map((truck) => {
                const open = expanded === truck.id;
                return (
                  <div
                    key={truck.id}
                    style={{
                      border: `1px solid ${truck.maintenanceRisk === "Critical" ? "#fecdd3" : "rgba(148,163,184,0.3)"}`,
                      borderRadius: 24,
                      background: "linear-gradient(135deg, #ffffff, #f8fafc)",
                      overflow: "hidden",
                      transition: "box-shadow 0.18s",
                    }}
                  >
                    {/* ── Card header row ── */}
                    <div
                      onClick={() => setExpanded(open ? null : truck.id)}
                      style={{ padding: "18px 20px", cursor: "pointer", display: "grid", gridTemplateColumns: "66px 1fr auto", gap: 16, alignItems: "center" }}
                    >
                      <HealthRing score={truck.healthScore} />

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a", letterSpacing: "-0.03em" }}>{truck.unit}</span>
                          <span className={statusClass(truck.status)}>{truck.status}</span>
                          <span className={riskClass(truck.maintenanceRisk)}>{truck.maintenanceRisk} Risk</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#334155", fontWeight: 700, marginBottom: 3 }}>
                          {truck.year} {truck.make} {truck.model} · {truck.plate} · {truck.vin.slice(-6)}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: "4px 20px", width: "fit-content" }}>
                          {[
                            ["Driver",   truck.driver],
                            ["Trailer",  truck.trailer],
                            ["Load",     truck.currentLoad],
                            ["Location", truck.location],
                          ].map(([lbl, val]) => (
                            <div key={lbl} style={{ fontSize: 12, color: "#64748b" }}>
                              <span style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>{lbl}:</span>{" "}
                              <span style={{ fontWeight: 600 }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Week Revenue</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: truck.revenueWeek > 0 ? "#047857" : "#94a3b8", letterSpacing: "-0.04em" }}>
                            ${truck.revenueWeek.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cost/Mile</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>${truck.costPerMile.toFixed(2)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                          {open ? "▲ collapse" : "▼ details"}
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded section ── */}
                    {open && (
                      <div style={{ borderTop: "1px solid #f1f5f9", padding: "18px 20px", background: "#fafbff" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

                          {/* Health & components */}
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 }}>
                            <p className="premium-eyebrow" style={{ marginBottom: 12 }}>Component Health</p>
                            <GaugeBar pct={truck.brakePct} label="Brake Pads" />
                            <GaugeBar pct={truck.tirePct} label="Tires" />
                            <GaugeBar pct={Math.min(100, Math.max(0, Math.round((1 - (truck.odometer - truck.nextOilChange + 5000) / 5000) * 100)))} label="Oil Life" />
                            <GaugeBar pct={truck.readinessScore} label="Readiness Score" />
                            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                              <span>Odometer</span>
                              <strong style={{ color: "#0f172a" }}>{truck.odometer.toLocaleString()} mi</strong>
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                              <span>Next Oil Change</span>
                              <strong style={{ color: "#0f172a" }}>{truck.nextOilChange.toLocaleString()} mi</strong>
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                              <span>Fuel Efficiency</span>
                              <strong style={{ color: "#0f172a" }}>{truck.fuelEfficiency} MPG</strong>
                            </div>
                          </div>

                          {/* DOT & compliance docs */}
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 }}>
                            <p className="premium-eyebrow" style={{ marginBottom: 12 }}>DOT &amp; Documents</p>
                            {[
                              ["Annual Inspection", truck.lastInspection, truck.nextInspection],
                              ["DOT Medical / Cert",  truck.dotExpiry, ""],
                              ["Registration",       truck.registrationExpiry, ""],
                              ["Insurance",          truck.insuranceExpiry, ""],
                            ].map(([label, last, next]) => (
                              <div key={label} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                  {last && (
                                    <span className={docBadgeClass(last === "OVERDUE" ? "2020-01-01" : last)}>
                                      {last === "OVERDUE" ? "⚠ OVERDUE" : `Exp: ${fmtDate(last)}`}
                                    </span>
                                  )}
                                  {next && next !== "OVERDUE" && (
                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>→ Next: {fmtDate(next)}</span>
                                  )}
                                  {next === "OVERDUE" && (
                                    <span className="fleet-doc-badge expired">⚠ Next: OVERDUE</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div style={{ marginTop: 4 }}>
                              <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Utilization</div>
                              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                                <div style={{ width: `${truck.utilization}%`, height: "100%", background: truck.utilization >= 80 ? "#10b981" : truck.utilization >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginTop: 3 }}>{truck.utilization}% fleet utilization</div>
                            </div>
                          </div>

                          {/* AI recommendation */}
                          <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", border: "1px solid #1e3a8a", borderRadius: 18, padding: 16, color: "#fff" }}>
                            <p className="premium-eyebrow" style={{ color: "#93c5fd", marginBottom: 8 }}>AI Maintenance Insight</p>
                            <div style={{ fontSize: 13, color: "#dbeafe", lineHeight: 1.65, marginBottom: 16 }}>{truck.aiNote}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                                Schedule Service
                              </button>
                              <button style={{ background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "9px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                                Upload Document
                              </button>
                              {truck.status !== "Out of Service" ? (
                                <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                                  Mark Out of Service
                                </button>
                              ) : (
                                <button style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                                  Return to Service
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                  No trucks match your filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="premium-side-column">
          <div className="premium-panel">
            <p className="premium-eyebrow">Fleet Summary</p>
            <h2>Readiness Overview</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {trucks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", transition: "0.15s" }}
                >
                  <HealthRing score={t.healthScore} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{t.unit}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t.driver}</div>
                    <span className={statusClass(t.status)} style={{ fontSize: 11, padding: "2px 8px", marginTop: 3, display: "inline-block" }}>{t.status}</span>
                  </div>
                  <span className={riskClass(t.maintenanceRisk)} style={{ fontSize: 11 }}>{t.maintenanceRisk}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-panel">
            <p className="premium-eyebrow">Efficiency Snapshot</p>
            <h2>Cost &amp; Fuel</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {[...trucks].sort((a, b) => a.costPerMile - b.costPerMile).map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{t.unit}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t.fuelEfficiency} MPG</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: t.costPerMile < 1.5 ? "#047857" : t.costPerMile < 2 ? "#b45309" : "#be123c" }}>
                      ${t.costPerMile.toFixed(2)}/mi
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>cost per mile</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-panel dark-panel">
            <p className="premium-eyebrow">Quick Actions</p>
            <h2>Fleet Tools</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {["Add New Truck", "Schedule Bulk Inspection", "Export DOT Report", "Upload Insurance", "Assign Trailer", "View IFTA Fuel Log"].map((label) => (
                <button
                  key={label}
                  style={{ background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, textAlign: "left", transition: "0.15s" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <style>{`
        .fleet-status {
          display: inline-flex; align-items: center; border-radius: 999px;
          padding: 4px 10px; font-size: 11px; font-weight: 900;
        }
        .fleet-status.green  { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
        .fleet-status.blue   { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .fleet-status.amber  { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .fleet-status.red    { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }

        .fleet-risk {
          display: inline-flex; align-items: center; border-radius: 999px;
          padding: 3px 9px; font-size: 11px; font-weight: 900;
        }
        .fleet-risk.low      { background: #ecfdf5; color: #047857; }
        .fleet-risk.medium   { background: #fffbeb; color: #b45309; }
        .fleet-risk.high     { background: #fff7ed; color: #c2410c; }
        .fleet-risk.critical { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }

        .fleet-doc-badge {
          display: inline-flex; align-items: center; border-radius: 8px;
          padding: 3px 9px; font-size: 11px; font-weight: 800;
        }
        .fleet-doc-badge.good     { background: #ecfdf5; color: #047857; }
        .fleet-doc-badge.expiring { background: #fffbeb; color: #b45309; }
        .fleet-doc-badge.expired  { background: #fff1f2; color: #be123c; }
      `}</style>
    </main>
  );
}
