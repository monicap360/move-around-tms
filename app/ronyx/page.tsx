"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const quickActions = [
  { title: "+ Create Load", href: "/ronyx/loads" },
  { title: "📄 New Ticket", href: "/ronyx/tickets" },
  { title: "👤 Assign Driver", href: "/ronyx/drivers" },
  { title: "🚛 Find Backhaul", href: "/ronyx/loads" },
  { title: "⚙️ Quick Dispatch", href: "/ronyx/loads" },
  { title: "💰 Run Payroll", href: "/ronyx/payroll" },
];

export default function RonyxDashboard() {
  const [filter, setFilter] = useState("All");
  const [exceptions, setExceptions] = useState([
    {
      id: "ex-245",
      title: "#245 - Site Delay (45m)",
      detail: "Oak Street Subdivision",
    },
    {
      id: "ex-238",
      title: "#238 - Scale Ticket Unclear",
      detail: "Needs office review",
    },
    {
      id: "ex-vulcan",
      title: "Vulcan Pit - Heavy Queue",
      detail: "Avg. wait: 25m",
    },
  ]);

  const [liveLoads, setLiveLoads] = useState([
    {
      id: "14287",
      driver: "J. Smith",
      status: "AT PIT",
      location: "Vulcan Quarry",
      tons: "22.0",
      ticket: true,
      pod: false,
      invoiceReady: false,
    },
    {
      id: "14288",
      driver: "M. Jones",
      status: "EN ROUTE",
      location: "Hwy 10",
      tons: "18.5",
      ticket: false,
      pod: false,
      invoiceReady: false,
    },
    {
      id: "14289",
      driver: "R. Garcia",
      status: "DELIVERING",
      location: "Oak Street",
      tons: "24.0",
      ticket: true,
      pod: true,
      invoiceReady: true,
    },
    {
      id: "14290",
      driver: "T. Chen",
      status: "LOADING",
      location: "Central Pit",
      tons: "20.0",
      ticket: false,
      pod: false,
      invoiceReady: false,
    },
  ]);
  const [pulseCards, setPulseCards] = useState([
    { label: "Today's Pulse", value: "Live", note: "Real-time command center" },
    { label: "Trucks Active", value: "18/24", note: "6 in staging" },
    { label: "Est. Revenue", value: "$42,180", note: "Updates with ticket OCR" },
    { label: "Loads Today", value: "142/150", note: "8 remaining" },
    { label: "Avg. Cycle", value: "3.8h", note: "From En Route → Delivered" },
  ]);
  const filteredLoads =
    filter === "All"
      ? liveLoads
      : liveLoads.filter((load) => load.status.replace(" ", "_") === filter);

  useEffect(() => {
    async function loadSnapshot() {
      try {
        const res = await fetch("/api/dashboard-snapshot", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.summary_metrics) {
          const summary = data.summary_metrics;
          setPulseCards([
            { label: "Today's Pulse", value: "Live", note: "Real-time command center" },
            { label: "Trucks Active", value: `${summary.active_trucks}/${summary.total_trucks}`, note: "Live fleet status" },
            { label: "Est. Revenue", value: `$${summary.estimated_revenue.toLocaleString()}`, note: "Updates with ticket OCR" },
            { label: "Loads Today", value: `${summary.loads_completed}/${summary.loads_planned}`, note: "Progress today" },
            { label: "Avg. Cycle", value: `${(summary.avg_cycle_time_minutes / 60).toFixed(1)}h`, note: "En Route → Delivered" },
          ]);
        }
        if (Array.isArray(data?.live_loads)) {
          setLiveLoads(
            data.live_loads.map((load: any) => ({
              id: load.load_id,
              driver: load.driver_name,
              status: load.status.replace("_", " "),
              location: load.status === "AT_PIT" ? load.source : load.destination || load.source,
              tons: load.net_tons?.toString() || "--",
              ticket: Boolean(load.attachments?.ticket_image),
              pod: Boolean(load.attachments?.delivery_proof && load.attachments?.signature),
              invoiceReady: Boolean(load.invoice_ready),
            })),
          );
        }
        if (Array.isArray(data?.active_exceptions)) {
          setExceptions(
            data.active_exceptions.map((item: any) => ({
              id: `${item.type}-${item.load_id}`,
              title: item.message,
              detail: item.timestamp,
            })),
          );
        }
      } catch {
        // Keep fallback data if snapshot fails.
      }
    }

    void loadSnapshot();
  }, []);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-blue: #0ea5e9;
          --ronyx-red: #ef4444;
          --primary: #0ea5e9;
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
          --secondary: #6b7280;
          --disabled: #374151;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
        }
        .ronyx-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 100vh;
        }
        .ronyx-sidebar {
          background: #f1f5fb;
          border-right: 1px solid var(--ronyx-border);
          display: flex;
          flex-direction: column;
        }
        .ronyx-brand {
          padding: 24px;
          border-bottom: 1px solid var(--ronyx-border);
        }
        .ronyx-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: var(--ronyx-accent);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-nav {
          flex: 1;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }
        .ronyx-nav a {
          padding: 12px 14px;
          border-radius: 12px;
          color: rgba(15, 23, 42, 0.8);
          text-decoration: none;
          border: 1px solid var(--ronyx-border);
          font-weight: 600;
          background: rgba(29, 78, 216, 0.06);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }
        .ronyx-nav a:hover {
          border-color: rgba(29, 78, 216, 0.35);
          color: #0f172a;
          background: rgba(29, 78, 216, 0.14);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }
        .ronyx-support {
          padding: 20px 24px;
          border-top: 1px solid var(--ronyx-border);
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.65);
        }
        .ronyx-main {
          padding: 28px 32px 40px;
        }
        .ronyx-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--ronyx-border);
          margin-bottom: 24px;
        }
        .ronyx-topbar input {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 14px;
          color: #0f172a;
          width: 280px;
        }
        .ronyx-pill {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action {
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-card h3 {
          margin: 0 0 8px;
          font-size: 1rem;
        }
        .ronyx-table {
          display: grid;
          gap: 12px;
        }
        .ronyx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .quick-actions-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-primary,
        .btn-secondary,
        .btn-success,
        .btn-warning,
        .btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          padding: 0 20px;
          height: 40px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
        }
        .btn-primary {
          background: var(--primary);
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #0c94d1;
        }
        .btn-primary:active {
          background: #0a83b9;
        }
        .btn-secondary {
          background: var(--secondary);
          color: #ffffff;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .btn-secondary:active {
          background: #374151;
        }
        .btn-success {
          background: var(--success);
          color: #ffffff;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-success:active {
          background: #047857;
        }
        .btn-warning {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #d97706;
        }
        .btn-warning:active {
          background: #b45309;
        }
        .btn-danger {
          background: var(--danger);
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        .btn-danger:active {
          background: #b91c1c;
        }
        .btn-sm {
          height: 32px;
          padding: 0 12px;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .in-transit {
          background: #dbeafe;
          color: #1e40af;
        }
        .completed {
          background: #d1fae5;
          color: #065f46;
        }
        .flagged {
          background: #fef3c7;
          color: #92400e;
        }
        .alert-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
      `}</style>

      <div className="ronyx-container">
        <div className="ronyx-topbar">
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Dump Fleet Command Center</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Live control for dispatch, backhauls, and ticket accuracy.
            </p>
          </div>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 22 }}>
          {pulseCards.map((stat) => (
            <div key={stat.label} className="ronyx-card">
              <div style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--ronyx-accent)", marginTop: 6 }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.8rem", marginTop: 6 }}>
                {stat.note}
              </div>
            </div>
          ))}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Live Fleet Map (Interactive)</h3>
            <Link href="/ronyx/tracking" className="ronyx-action">
              Open Tracking
            </Link>
          </div>
          <div style={{ height: 260, borderRadius: 16, border: "1px dashed rgba(29, 78, 216, 0.4)", background: "#fff" }}>
            <div style={{ padding: 16, color: "rgba(15,23,42,0.6)", fontSize: "0.9rem" }}>
              Map preview: Vulcan Pit cluster • Truck #245 in transit • Oak Street site.
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="ronyx-pill">Quick Filters</span>
            {["All", "EN_ROUTE", "AT_PIT", "DELIVERING", "DELAYED"].map((item) => (
              <button
                key={item}
                className={`btn-sm ${filter === item ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFilter(item)}
              >
                {item.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>

        <section className="ronyx-grid">
          <div className="ronyx-card" style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>Today’s Loads & Action Queue</h3>
              <Link href="/ronyx/loads" className="ronyx-action">
                View all
              </Link>
            </div>
            <div className="ronyx-table">
              <div className="ronyx-row" style={{ fontWeight: 700 }}>
                <span>Load #</span>
                <span>Driver</span>
                <span>Status</span>
                <span>Location</span>
                <span>Tons</span>
                <span>Ticket</span>
                <span>POD</span>
                <span>Actions</span>
              </div>
              {filteredLoads.map((load) => (
                <div key={load.id} className="ronyx-row">
                  <span>#{load.id}</span>
                  <span>{load.driver}</span>
                  <span className={`status-badge ${load.status === "EN ROUTE" ? "in-transit" : load.status === "AT PIT" ? "flagged" : "completed"}`}>
                    {load.status}
                  </span>
                  <span>{load.location}</span>
                  <span>{load.tons}</span>
                  <Link href={`/ronyx/tickets?load=${load.id}`} className="ronyx-action">
                    {load.ticket ? "📎" : "--"}
                  </Link>
                  <Link href={`/ronyx/tickets?pod=${load.id}`} className="ronyx-action">
                    {load.pod ? "✅" : "--"}
                  </Link>
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/ronyx/loads?load=${load.id}`} className="btn-sm btn-secondary">
                      Message
                    </Link>
                    <Link href={`/ronyx/loads?track=${load.id}`} className="btn-sm btn-secondary">
                      Track
                    </Link>
                    {load.invoiceReady ? (
                      <Link href={`/ronyx/accounts-receivable?invoice=${load.id}`} className="btn-sm btn-primary">
                        Invoice
                      </Link>
                    ) : (
                      <Link href={`/ronyx/loads?monitor=${load.id}`} className="btn-sm btn-warning">
                        Monitor
                      </Link>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/ronyx/loads" className="btn-primary">
                Assign New Load
              </Link>
              <Link href="/ronyx/reports?filter=eod" className="btn-secondary">
                Generate End-of-Day Report
              </Link>
              <Link href="/ronyx/loads" className="btn-secondary">
                View All
              </Link>
            </div>
          </div>

          <div className="ronyx-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>Exceptions & Alerts ({exceptions.length})</h3>
              <button className="ronyx-action" onClick={() => setExceptions([])}>
                Acknowledge All
              </button>
            </div>
            <div className="ronyx-table">
              {exceptions.length === 0 ? (
                <div className="alert-bar">All clear. No active exceptions.</div>
              ) : (
                exceptions.map((exception) => (
                  <button
                    key={exception.id}
                    className="alert-bar"
                    style={{ textAlign: "left" }}
                    onClick={() => setFilter("DELAYED")}
                  >
                    <span>▶️ {exception.title}</span>
                    <span style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.8rem" }}>{exception.detail}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
