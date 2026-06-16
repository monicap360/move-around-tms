"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ─── Types ─────────────────────────────────────────────── */
type TicketStatus  = "uploaded" | "missing" | "unclear";
type PodStatus     = "uploaded" | "missing";
type PayrollStatus = "ready" | "hold_ticket" | "hold_pod" | "hold_mismatch" | "review";
type BillingStatus = "ready" | "hold" | "review";
type LoadFilter    = "all" | "ticket_missing" | "unclear" | "pod_missing" | "billing_ready" | "payroll_hold" | "delayed";

type LoadItem = {
  id: string;
  driver: string;
  truck: string;
  status: string;
  pickup: string;
  dropoff: string;
  material: string;
  tons: string;
  ticketStatus: TicketStatus;
  podStatus: PodStatus;
  payrollStatus: PayrollStatus;
  billingStatus: BillingStatus;
  delay: number;
  invoiceReady: boolean;
};

type AlertItem = {
  id: string;
  category: string;
  title: string;
  detail: string;
  impact: string;
  action: string;
  owner: string;
};

/* ─── Helpers ────────────────────────────────────────────── */
function computeNextAction(l: LoadItem): string {
  if (l.delay > 30)                       return `Message driver — delayed ${l.delay}m`;
  if (l.ticketStatus === "missing")        return "Request ticket proof from driver";
  if (l.ticketStatus === "unclear")        return "Review unclear scale ticket";
  if (l.podStatus === "missing" && ["COMPLETED","DELIVERING"].includes(l.status)) return "Request POD from driver";
  if (l.billingStatus === "ready")         return "Send to invoice";
  if (l.payrollStatus !== "ready")         return "Review payroll hold";
  return "Monitor";
}

function payrollLabel(s: PayrollStatus) {
  if (s === "ready")          return { text: "Ready",         color: "#16a34a", bg: "#f0fdf4" };
  if (s === "hold_ticket")    return { text: "Hold — Ticket", color: "#dc2626", bg: "#fef2f2" };
  if (s === "hold_pod")       return { text: "Hold — POD",    color: "#dc2626", bg: "#fef2f2" };
  if (s === "hold_mismatch")  return { text: "Hold — Mismatch",color:"#ea580c", bg: "#fff7ed" };
  return                              { text: "Review",        color: "#ca8a04", bg: "#fefce8" };
}

function billingLabel(s: BillingStatus) {
  if (s === "ready")  return { text: "Ready",  color: "#16a34a", bg: "#f0fdf4" };
  if (s === "hold")   return { text: "Hold",   color: "#dc2626", bg: "#fef2f2" };
  return                     { text: "Review", color: "#ca8a04", bg: "#fefce8" };
}

function tktColor(s: TicketStatus) {
  if (s === "uploaded") return "#16a34a";
  if (s === "unclear")  return "#ca8a04";
  return "#dc2626";
}

/* ─── Default seed data ──────────────────────────────────── */
const SEED_LOADS: LoadItem[] = [
  { id:"14287", driver:"J. Smith",  truck:"#201", status:"AT PIT",    pickup:"Vulcan Quarry",  dropoff:"Hwy 10 Site",    material:"Limestone", tons:"22.0", ticketStatus:"uploaded", podStatus:"missing",  payrollStatus:"hold_pod",   billingStatus:"hold",   delay:0,  invoiceReady:false },
  { id:"14288", driver:"M. Jones",  truck:"#238", status:"EN ROUTE",  pickup:"Hwy 10",         dropoff:"Oak Street",     material:"Aggregate", tons:"18.5", ticketStatus:"missing",  podStatus:"missing",  payrollStatus:"hold_ticket",billingStatus:"hold",   delay:0,  invoiceReady:false },
  { id:"14289", driver:"R. Garcia", truck:"#245", status:"DELIVERING", pickup:"Central Pit",   dropoff:"Oak Street Sub", material:"Sand",      tons:"24.0", ticketStatus:"uploaded", podStatus:"uploaded", payrollStatus:"ready",      billingStatus:"ready",  delay:0,  invoiceReady:true  },
  { id:"14290", driver:"T. Chen",   truck:"#256", status:"LOADING",    pickup:"Central Pit",   dropoff:"River Rd Site",  material:"Gravel",    tons:"20.0", ticketStatus:"unclear",  podStatus:"missing",  payrollStatus:"review",     billingStatus:"review", delay:0,  invoiceReady:false },
  { id:"14291", driver:"A. Reyes",  truck:"#271", status:"DELAYED",    pickup:"Vulcan Quarry", dropoff:"Park Ave Site",  material:"Limestone", tons:"21.5", ticketStatus:"uploaded", podStatus:"missing",  payrollStatus:"hold_pod",   billingStatus:"hold",   delay:45, invoiceReady:false },
];

const SEED_ALERTS: AlertItem[] = [
  { id:"a1", category:"site_delay",    title:"Truck #271 — Site Delay 45m",        detail:"Park Ave Site",  impact:"Cycle time above target, may reduce loads today.", action:"Message driver, check site wait time, reroute next truck if needed.", owner:"Dispatch" },
  { id:"a2", category:"ticket_unclear",title:"Load #14290 — Scale Ticket Unclear",  detail:"OCR confidence low", impact:"Cannot pay or invoice until resolved.",         action:"Open Fast Scan and review ticket image.",                            owner:"Fast Scan Staff" },
  { id:"a3", category:"pit_queue",     title:"Vulcan Pit — Heavy Queue",            detail:"Avg wait: 25m",  impact:"Slowing cycle time for 4 trucks.",                  action:"Notify dispatch, consider delaying non-critical pickups.",            owner:"Dispatch" },
];

const BACKHAUL_OPPS = [
  { id:"b1", truck:"#245", from:"Oak Street Sub", to:"Vulcan Yard",    material:"Return aggregate", distance:"8 mi",  revenue:"$420" },
  { id:"b2", truck:"#238", from:"Oak Street",     to:"Hwy 10 Pit",     material:"Sand return",      distance:"12 mi", revenue:"$610" },
];

/* ─── Main component ──────────────────────────────────────── */
export default function DumpFleetCommandCenter() {
  const [loadFilter, setLoadFilter]   = useState<LoadFilter>("all");
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [eodOpen, setEodOpen]         = useState(false);
  const [loads, setLoads]             = useState<LoadItem[]>(SEED_LOADS);
  const [alerts, setAlerts]           = useState<AlertItem[]>(SEED_ALERTS);
  const [revenue, setRevenue]         = useState({ estimated: 42180, readyToBill: 31600, atRisk: 4200, blockedTicket: 2800, blockedPod: 1400 });
  const [pulseRaw, setPulseRaw]       = useState({ active: 18, total: 24, avgCycle: "3.8h", loadsToday: 142, loadsPlanned: 150 });

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/dashboard-snapshot", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.summary_metrics) {
          const m = data.summary_metrics;
          setPulseRaw({ active: m.active_trucks, total: m.total_trucks, avgCycle: `${(m.avg_cycle_time_minutes/60).toFixed(1)}h`, loadsToday: m.loads_completed, loadsPlanned: m.loads_planned });
          setRevenue(r => ({ ...r, estimated: m.estimated_revenue ?? r.estimated }));
        }
        if (Array.isArray(data?.live_loads) && data.live_loads.length) {
          setLoads(data.live_loads.map((l: any): LoadItem => ({
            id:            l.load_id,
            driver:        l.driver_name,
            truck:         l.truck_number ?? "—",
            status:        (l.status ?? "").replace("_"," "),
            pickup:        l.source ?? "—",
            dropoff:       l.destination ?? "—",
            material:      l.material ?? "—",
            tons:          l.net_tons?.toString() ?? "—",
            ticketStatus:  l.attachments?.ticket_image ? "uploaded" : "missing",
            podStatus:     (l.attachments?.delivery_proof && l.attachments?.signature) ? "uploaded" : "missing",
            payrollStatus: l.payroll_status ?? "review",
            billingStatus: l.invoice_ready ? "ready" : "hold",
            delay:         l.delay_minutes ?? 0,
            invoiceReady:  Boolean(l.invoice_ready),
          })));
        }
        if (Array.isArray(data?.active_exceptions) && data.active_exceptions.length) {
          setAlerts(data.active_exceptions.map((e: any, i: number): AlertItem => ({
            id:       `exc-${i}`,
            category: e.type ?? "unknown",
            title:    e.message ?? "Exception",
            detail:   e.timestamp ?? "",
            impact:   e.impact ?? "Review required.",
            action:   e.action ?? "Investigate and resolve.",
            owner:    e.owner ?? "Dispatch",
          })));
        }
      } catch { /* keep seed data */ }
    }
    void load();
  }, []);

  const stats = useMemo(() => ({
    trucksActive:   pulseRaw.active,
    trucksTotal:    pulseRaw.total,
    ticketsMissing: loads.filter(l => l.ticketStatus === "missing").length,
    ticketsUnclear: loads.filter(l => l.ticketStatus === "unclear").length,
    podMissing:     loads.filter(l => l.podStatus === "missing" && ["COMPLETED","DELIVERING"].includes(l.status)).length,
    readyForBilling:loads.filter(l => l.billingStatus === "ready").length,
    payrollHold:    loads.filter(l => l.payrollStatus !== "ready").length,
    delayed:        loads.filter(l => l.delay > 0).length,
    pitQueue:       alerts.filter(a => a.category === "pit_queue").length,
    backhaulAvail:  BACKHAUL_OPPS.length,
    revenueAtRisk:  revenue.atRisk,
  }), [loads, alerts, revenue, pulseRaw]);

  const filteredLoads = useMemo(() => {
    if (loadFilter === "all")            return loads;
    if (loadFilter === "ticket_missing") return loads.filter(l => l.ticketStatus === "missing");
    if (loadFilter === "unclear")        return loads.filter(l => l.ticketStatus === "unclear");
    if (loadFilter === "pod_missing")    return loads.filter(l => l.podStatus === "missing");
    if (loadFilter === "billing_ready")  return loads.filter(l => l.billingStatus === "ready");
    if (loadFilter === "payroll_hold")   return loads.filter(l => l.payrollStatus !== "ready");
    if (loadFilter === "delayed")        return loads.filter(l => l.delay > 0);
    return loads;
  }, [loads, loadFilter]);

  const firstAction = alerts.length > 0
    ? (alerts.find(a => a.category === "site_delay")?.title ?? alerts[0].title)
    : stats.ticketsUnclear > 0
    ? "Review unclear scale tickets in Ticket Accuracy Center"
    : stats.podMissing > 0
    ? "Request missing PODs before end-of-day closeout"
    : stats.revenueAtRisk > 0
    ? "Review billing blockers in Revenue Guard"
    : "All operations clear — prepare End-of-Day closeout";

  const KPI_CARDS: { label: string; value: string|number; filter?: LoadFilter; color: string; alert?: boolean }[] = [
    { label: "Trucks Active",    value: `${stats.trucksActive}/${stats.trucksTotal}`, color: "#1d4ed8" },
    { label: "Est. Revenue",     value: `$${revenue.estimated.toLocaleString()}`,     color: "#16a34a" },
    { label: "Loads Today",      value: `${pulseRaw.loadsToday}/${pulseRaw.loadsPlanned}`, color: "#475569" },
    { label: "Avg Cycle",        value: pulseRaw.avgCycle,                             color: "#475569" },
    { label: "Tickets Missing",  value: stats.ticketsMissing, filter: "ticket_missing", color: "#dc2626", alert: stats.ticketsMissing > 0 },
    { label: "Tickets Unclear",  value: stats.ticketsUnclear, filter: "unclear",        color: "#ea580c", alert: stats.ticketsUnclear > 0 },
    { label: "POD Missing",      value: stats.podMissing,     filter: "pod_missing",    color: "#ea580c", alert: stats.podMissing > 0 },
    { label: "Ready for Billing",value: stats.readyForBilling,filter: "billing_ready",  color: "#16a34a" },
    { label: "Payroll Hold",     value: stats.payrollHold,    filter: "payroll_hold",   color: "#dc2626", alert: stats.payrollHold > 0 },
    { label: "Delayed Trucks",   value: stats.delayed,        filter: "delayed",         color: "#dc2626", alert: stats.delayed > 0 },
    { label: "Pit Queue Risk",   value: stats.pitQueue,                                  color: stats.pitQueue > 0 ? "#ea580c" : "#64748b", alert: stats.pitQueue > 0 },
    { label: "Backhaul Avail.",  value: stats.backhaulAvail,                             color: "#1d4ed8" },
    { label: "Revenue at Risk",  value: `$${stats.revenueAtRisk.toLocaleString()}`,      color: stats.revenueAtRisk > 0 ? "#dc2626" : "#64748b", alert: stats.revenueAtRisk > 0 },
  ];

  const catColor = (c: string) => c === "site_delay" ? "#dc2626" : c === "ticket_unclear" ? "#ea580c" : c === "pit_queue" ? "#b45309" : c === "ticket_missing" || c === "pod_missing" ? "#ea580c" : "#64748b";
  const catBg    = (c: string) => c === "site_delay" ? "#fef2f2" : c === "ticket_unclear" ? "#fff7ed" : c === "pit_queue" ? "#fffbeb" : "#f8fafc";

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Live Operations</div>
            <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Dump Fleet Command Center</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Live control for dispatch, backhauls, ticket accuracy, delays, revenue, and proof-to-pay operations.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <Link href="/ronyx/loads"    style={{ padding: "9px 16px", background: "#1e40af", color: "#fff", borderRadius: 10, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>+ Assign Load</Link>
            <Link href="/ronyx/fast-scan" style={{ padding: "9px 16px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Fast Scan</Link>
            <Link href="/ronyx/payroll"  style={{ padding: "9px 16px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Payroll</Link>
            <button onClick={() => setEodOpen(o => !o)} style={{ padding: "9px 16px", background: eodOpen ? "#f1f5f9" : "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>EOD Closeout {eodOpen ? "▲" : "▼"}</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "flex", overflowX: "auto", borderTop: "1px solid #f1f5f9", marginLeft: -28, marginRight: -28, paddingLeft: 28 }}>
          {KPI_CARDS.map(k => (
            <button
              key={k.label}
              onClick={() => k.filter && setLoadFilter(k.filter)}
              style={{ padding: "11px 16px", background: loadFilter === k.filter ? "#f0f9ff" : "transparent", border: "none", borderBottom: `3px solid ${loadFilter === k.filter ? "#1e40af" : "transparent"}`, cursor: k.filter ? "pointer" : "default", minWidth: 94, textAlign: "center", flexShrink: 0, borderRight: "1px solid #f1f5f9" }}
            >
              <div style={{ fontSize: 19, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 9, color: k.alert ? k.color : "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2, whiteSpace: "nowrap" }}>{k.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── EOD Closeout Drawer ── */}
      {eodOpen && (
        <div style={{ background: "#0f172a", padding: "18px 28px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>End-of-Day Closeout</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Total Loads",    value: pulseRaw.loadsPlanned },
                  { label: "Completed",      value: pulseRaw.loadsToday },
                  { label: "Missing Ticket", value: stats.ticketsMissing, alert: true },
                  { label: "Missing POD",    value: stats.podMissing, alert: true },
                  { label: "Ready to Bill",  value: stats.readyForBilling },
                  { label: "Payroll Hold",   value: stats.payrollHold, alert: true },
                  { label: "Est. Revenue",   value: `$${revenue.estimated.toLocaleString()}` },
                  { label: "At Risk",        value: `$${revenue.atRisk.toLocaleString()}`, alert: true },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.alert && Number(s.value) > 0 ? "#ef4444" : "#10b981" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {[["Generate EOD Report","#1e40af","#fff"],["Send to Billing","#065f46","#fff"],["Send to Payroll","#7c3aed","#fff"],["Export CSV","#374151","#fff"],["Build Audit Packet","#374151","#fff"]].map(([label,bg,col]) => (
                <button key={label} style={{ padding: "8px 14px", background: bg as string, color: col as string, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "18px 24px 32px" }}>

        {/* ── 1. Live Mission Control ── */}
        {(alerts.length > 0 || stats.ticketsMissing > 0 || stats.delayed > 0) && (
          <div style={{ background: "#0f172a", borderRadius: 14, padding: "16px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Live Mission Control</div>
              <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.45 }}>
                Today's Focus: Keep trucks moving, clear ticket issues, reduce delays, and make sure every completed load is ready for billing and payroll.
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 18px", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Recommended First Action</div>
              <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 800 }}>{firstAction}</div>
            </div>
            {alerts.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 800, marginBottom: 4 }}>{alerts.length} live exception{alerts.length > 1 ? "s" : ""} need attention</div>
                {alerts.slice(0, 2).map(a => (
                  <div key={a.id} style={{ fontSize: 11, color: "#fca5a5", marginBottom: 2 }}>· {a.title}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 3. Live Fleet Map ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Live Fleet Map</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Real-time truck positions and status signals</div>
            </div>
            <Link href="/ronyx/tracking" style={{ padding: "7px 16px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Open Full Tracking →</Link>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            {[["#16a34a","Moving on time"],["#ca8a04","Waiting / queue"],["#dc2626","Delayed"],["#7c3aed","Ticket issue"],["#1d4ed8","Backhaul opp."]].map(([color,label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#475569" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color as string, display: "inline-block", flexShrink: 0 }} />{label}
              </div>
            ))}
          </div>
          <div style={{ height: 220, borderRadius: 12, border: "1px dashed #cbd5e1", background: "linear-gradient(135deg,#f0f9ff 0%,#f8fafc 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, padding: 16, display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start" }}>
              {loads.map(l => {
                const dot = l.delay > 0 ? "#dc2626" : l.ticketStatus === "unclear" ? "#7c3aed" : l.ticketStatus === "missing" ? "#ea580c" : "#16a34a";
                return (
                  <div key={l.id} style={{ background: "#fff", border: `2px solid ${dot}`, borderRadius: 10, padding: "8px 12px", fontSize: 11, boxShadow: "0 2px 6px rgba(0,0,0,0.07)", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                      <strong style={{ color: "#0f172a" }}>Truck {l.truck}</strong>
                    </div>
                    <div style={{ color: "#475569" }}>{l.driver}</div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{l.status} · {l.pickup}</div>
                    <div style={{ color: l.delay > 0 ? "#dc2626" : "#94a3b8", fontSize: 10, fontWeight: l.delay > 0 ? 700 : 400, marginTop: 2 }}>
                      {l.delay > 0 ? `Delayed ${l.delay}m` : `Ticket: ${l.ticketStatus}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 4. Today's Loads & Action Queue ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Today's Loads & Action Queue</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {loadFilter !== "all" && <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>Filter: {loadFilter.replace("_"," ")}</span>}
                {filteredLoads.length} load{filteredLoads.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setLoadFilter("all")} style={{ padding: "6px 12px", background: loadFilter === "all" ? "#1e40af" : "#f8fafc", color: loadFilter === "all" ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>All</button>
              {(["ticket_missing","unclear","pod_missing","billing_ready","payroll_hold","delayed"] as LoadFilter[]).map(f => (
                <button key={f} onClick={() => setLoadFilter(f)} style={{ padding: "6px 10px", background: loadFilter === f ? "#1e40af" : "#f8fafc", color: loadFilter === f ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                  {f.replace(/_/g," ")}
                </button>
              ))}
              <Link href="/ronyx/loads" style={{ padding: "6px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 11, textDecoration: "none" }}>View All →</Link>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 68 }} /><col style={{ width: 88 }} /><col style={{ width: 72 }} />
                <col style={{ width: 90 }} /><col style={{ width: 100 }} /><col style={{ width: 100 }} />
                <col style={{ width: 76 }} /><col style={{ width: 52 }} /><col style={{ width: 80 }} />
                <col style={{ width: 66 }} /><col style={{ width: 80 }} /><col style={{ width: 70 }} />
                <col style={{ width: 172 }} /><col style={{ width: 188 }} />
              </colgroup>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Load #","Driver","Truck","Status","Pickup / Pit","Dropoff / Site","Material","Tons","Ticket","POD","Payroll","Billing","Next Action","Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLoads.map(l => {
                  const pay = payrollLabel(l.payrollStatus);
                  const bil = billingLabel(l.billingStatus);
                  const next = computeNextAction(l);
                  const isReady = l.billingStatus === "ready";
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9", background: l.delay > 0 ? "#fff8f8" : "#fff" }}>
                      <td style={{ padding: "9px 8px", fontWeight: 800, fontSize: 13, color: "#0f172a" }}>#{l.id}</td>
                      <td style={{ padding: "9px 8px", fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{l.driver}</td>
                      <td style={{ padding: "9px 8px", fontSize: 12, color: "#475569" }}>{l.truck}</td>
                      <td style={{ padding: "9px 8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 5, background: l.delay > 0 ? "#fef2f2" : l.status === "COMPLETED" ? "#f0fdf4" : "#eff6ff", color: l.delay > 0 ? "#dc2626" : l.status === "COMPLETED" ? "#15803d" : "#1d4ed8" }}>
                          {l.delay > 0 ? `DELAYED ${l.delay}m` : l.status}
                        </span>
                      </td>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: "#475569" }}>{l.pickup}</td>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: "#475569" }}>{l.dropoff}</td>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: "#475569" }}>{l.material}</td>
                      <td style={{ padding: "9px 8px", fontSize: 12, fontWeight: 700 }}>{l.tons}</td>
                      <td style={{ padding: "9px 8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: tktColor(l.ticketStatus) }}>{l.ticketStatus === "uploaded" ? "✓" : l.ticketStatus === "unclear" ? "?" : "—"}</span>
                      </td>
                      <td style={{ padding: "9px 8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: l.podStatus === "uploaded" ? "#16a34a" : "#dc2626" }}>{l.podStatus === "uploaded" ? "✓" : "—"}</span>
                      </td>
                      <td style={{ padding: "9px 8px" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: pay.bg, color: pay.color }}>{pay.text}</span>
                      </td>
                      <td style={{ padding: "9px 8px" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: bil.bg, color: bil.color }}>{bil.text}</span>
                      </td>
                      <td style={{ padding: "9px 8px", fontSize: 11, fontWeight: 700, color: isReady ? "#16a34a" : next.includes("delay") ? "#dc2626" : "#0f172a" }}>{next}</td>
                      <td style={{ padding: "9px 8px" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          <Link href={`/ronyx/loads?load=${l.id}`} style={{ padding: "3px 6px", background: "#f8fafc", color: "#475569", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 9, textDecoration: "none", cursor: "pointer" }}>Msg</Link>
                          <Link href={`/ronyx/fast-scan?load=${l.id}`} style={{ padding: "3px 6px", background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 9, textDecoration: "none" }}>Ticket</Link>
                          {isReady && <Link href={`/ronyx/accounts-receivable?invoice=${l.id}`} style={{ padding: "3px 6px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 9, textDecoration: "none" }}>Invoice</Link>}
                          {!isReady && <Link href={`/ronyx/loads?monitor=${l.id}`} style={{ padding: "3px 6px", background: "#fff7ed", color: "#b45309", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 9, textDecoration: "none" }}>Monitor</Link>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredLoads.length && (
                  <tr><td colSpan={14} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No loads match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

          {/* ── 5. Ticket Accuracy Center ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 14 }}>Ticket Accuracy Center</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Expected",      value: loads.length,                                           color: "#475569" },
                { label: "Scanned",       value: loads.filter(l => l.ticketStatus === "uploaded").length, color: "#16a34a" },
                { label: "Missing",       value: stats.ticketsMissing,                                    color: "#dc2626", alert: true },
                { label: "Unclear",       value: stats.ticketsUnclear,                                    color: "#ea580c", alert: true },
                { label: "Ready to Bill", value: stats.readyForBilling,                                   color: "#16a34a" },
                { label: "Payroll Ready", value: loads.filter(l => l.payrollStatus === "ready").length,   color: "#16a34a" },
              ].map(s => (
                <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", textAlign: "center", border: s.alert && Number(s.value) > 0 ? `1px solid ${s.color}40` : "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {loads.filter(l => l.ticketStatus !== "uploaded").map(l => (
                <div key={l.id} style={{ border: `1px solid ${tktColor(l.ticketStatus)}30`, borderLeft: `4px solid ${tktColor(l.ticketStatus)}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 12 }}>Load #{l.id}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b" }}>{l.driver} · Truck {l.truck}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: l.ticketStatus === "missing" ? "#fef2f2" : "#fff7ed", color: tktColor(l.ticketStatus) }}>
                      {l.ticketStatus === "missing" ? "MISSING" : "UNCLEAR"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                    {l.ticketStatus === "unclear" ? "OCR confidence low — office review needed" : "No ticket uploaded — request from driver"}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Link href="/ronyx/fast-scan" style={{ padding: "4px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 5, fontWeight: 700, fontSize: 10, textDecoration: "none" }}>Open Fast Scan</Link>
                    <button style={{ padding: "4px 8px", background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Approve Ticket</button>
                    <button style={{ padding: "4px 8px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Hold Payroll</button>
                  </div>
                </div>
              ))}
              {!loads.filter(l => l.ticketStatus !== "uploaded").length && (
                <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>All Tickets Clear</div>
                  <div style={{ fontSize: 12 }}>No unclear or missing tickets.</div>
                </div>
              )}
            </div>
          </div>

          {/* ── 6. Exceptions & Alerts ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Exceptions & Alerts ({alerts.length})</div>
              {alerts.length > 0 && (
                <button onClick={() => setAlerts([])} style={{ padding: "5px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Acknowledge All</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>All Clear</div>
                  <div style={{ fontSize: 12 }}>No active exceptions.</div>
                </div>
              ) : (
                alerts.map(a => (
                  <div key={a.id}>
                    <button
                      onClick={() => setExpandedAlert(expandedAlert === a.id ? null : a.id)}
                      style={{ width: "100%", textAlign: "left", background: expandedAlert === a.id ? catBg(a.category) : "#f8fafc", border: `1px solid ${catColor(a.category)}25`, borderLeft: `4px solid ${catColor(a.category)}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{a.detail}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: catBg(a.category), color: catColor(a.category), borderRadius: 5 }}>{a.owner}</span>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{expandedAlert === a.id ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedAlert === a.id && (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}><strong>Impact:</strong> {a.impact}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}><strong>Action:</strong> {a.action}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button style={{ padding: "5px 10px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Message Driver</button>
                          <button style={{ padding: "5px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Notify Dispatch</button>
                          <button style={{ padding: "5px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }} onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}>Acknowledge</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

          {/* ── 7. Backhaul Opportunities ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>Backhaul Opportunities</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>Return loads near truck dropoff locations</div>
            {BACKHAUL_OPPS.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No backhaul opportunities identified.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {BACKHAUL_OPPS.map(b => (
                  <div key={b.id} style={{ border: "1px solid #bfdbfe", borderLeft: "4px solid #1d4ed8", borderRadius: 10, padding: "12px 14px", background: "#f0f9ff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>Truck {b.truck}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{b.from} → {b.to}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#16a34a" }}>{b.revenue}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{b.distance}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Material: {b.material}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button style={{ padding: "5px 10px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Assign Backhaul</button>
                      <button style={{ padding: "5px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Notify Driver</button>
                      <Link href="/ronyx/dispatch" style={{ padding: "5px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontWeight: 700, fontSize: 10, textDecoration: "none" }}>→ Dispatch Board</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 8. Revenue Guard Live ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>Revenue Guard — Live</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>Billing readiness and revenue at risk</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Estimated Revenue", value: `$${revenue.estimated.toLocaleString()}`,   color: "#1d4ed8", bg: "#eff6ff" },
                { label: "Ready to Bill",      value: `$${revenue.readyToBill.toLocaleString()}`, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Revenue at Risk",    value: `$${revenue.atRisk.toLocaleString()}`,      color: "#dc2626", bg: "#fef2f2" },
                { label: "Blocked — Ticket",   value: `$${revenue.blockedTicket.toLocaleString()}`,color:"#ea580c", bg: "#fff7ed" },
                { label: "Blocked — POD",      value: `$${revenue.blockedPod.toLocaleString()}`,   color:"#ea580c", bg: "#fff7ed" },
                { label: "Ready Loads",        value: stats.readyForBilling,                       color: "#16a34a", bg: "#f0fdf4" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setLoadFilter("billing_ready")} style={{ padding: "6px 12px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View Billing Ready</button>
              <button onClick={() => setLoadFilter("ticket_missing")} style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View Revenue at Risk</button>
              <Link href="/ronyx/reports?filter=eod" style={{ padding: "6px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 11, textDecoration: "none" }}>EOD Billing Report</Link>
            </div>
          </div>
        </div>

        {/* ── 9. Payroll Readiness ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Payroll Readiness</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Can every completed load be paid?</div>
            </div>
            <Link href="/ronyx/payroll" style={{ padding: "7px 14px", background: "#7c3aed", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Open Payroll →</Link>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["ready","hold_ticket","hold_pod","hold_mismatch","review"] as PayrollStatus[]).map(s => {
              const pl = payrollLabel(s);
              const cnt = loads.filter(l => l.payrollStatus === s).length;
              if (!cnt) return null;
              return (
                <div key={s} style={{ background: pl.bg, border: `1px solid ${pl.color}30`, borderRadius: 10, padding: "12px 16px", minWidth: 140 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: pl.color }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: pl.color, fontWeight: 700, marginTop: 2 }}>{pl.text}</div>
                </div>
              );
            })}
          </div>
          {loads.filter(l => l.payrollStatus !== "ready").length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {loads.filter(l => l.payrollStatus !== "ready").map(l => {
                const pl = payrollLabel(l.payrollStatus);
                return (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>#{l.id}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{l.driver} · Truck {l.truck}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: pl.bg, color: pl.color, marginLeft: "auto" }}>{pl.text}</span>
                    <button style={{ padding: "4px 8px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Review</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
