"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type LoadStatus = "ordered" | "dispatched" | "in_transit" | "delivered" | "billing";

type LoadCard = {
  id: string;
  customer: string;
  material: string;
  qty: string;
  age: string;
  driver: string;
  truck: string;
  pit: string;
  site: string;
  status: LoadStatus;
  actionLabel: string;
  price: string;
  alert?: string;
};

const statusColumns: { key: LoadStatus; title: string; subtitle: string }[] = [
  { key: "ordered", title: "ORDERED", subtitle: "(Waiting)" },
  { key: "dispatched", title: "DISPATCHED", subtitle: "(At Pit/Ready)" },
  { key: "in_transit", title: "IN TRANSIT", subtitle: "(On Road)" },
  { key: "delivered", title: "DELIVERED", subtitle: "(On Site)" },
  { key: "billing", title: "BILLING", subtitle: "(Paperwork)" },
];

const demoLoads: LoadCard[] = [
  {
    id: "LD-4032",
    customer: "Jones Const",
    material: '12yd 3/4" Gravel',
    qty: "12yd",
    age: "⏳ 2h ago",
    driver: "Unassigned",
    truck: "TBD",
    pit: "Pit 3",
    site: "Riverside",
    status: "ordered",
    actionLabel: "Dispatch",
    price: "$720.00",
  },
  {
    id: "LD-4029",
    customer: "City Project",
    material: "18T Fill Sand",
    qty: "18T",
    age: "🕐 7:15 AM",
    driver: "S. Grant",
    truck: "#18",
    pit: "Pit 7",
    site: "Main St",
    status: "dispatched",
    actionLabel: "En Route",
    price: "$855.00",
  },
  {
    id: "LD-4025",
    customer: "Thompson Co",
    material: "10yd Topsoil",
    qty: "10yd",
    age: "🚛 D. Perez",
    driver: "D. Perez",
    truck: "#12",
    pit: "Pit 7",
    site: "1500 Main St",
    status: "in_transit",
    actionLabel: "Delivering",
    price: "$640.00",
  },
  {
    id: "LD-4021",
    customer: "Riverside",
    material: "15yd Base",
    qty: "15yd",
    age: "📍 On Site",
    driver: "S. Grant",
    truck: "#18",
    pit: "Pit 7",
    site: "2500 River Rd",
    status: "delivered",
    actionLabel: "Get POD",
    price: "$855.00",
    alert: "⚠️ No POD 45 min",
  },
  {
    id: "LD-4018",
    customer: "Main St",
    material: "✅ Signed",
    qty: "15yd",
    age: "💰 $855.00",
    driver: "J. Smith",
    truck: "#7",
    pit: "Pit 3",
    site: "1500 Main St",
    status: "billing",
    actionLabel: "Invoice",
    price: "$855.00",
  },
  {
    id: "LD-4015",
    customer: "Jones Const",
    material: "⚠️ Dispute",
    qty: "11yd",
    age: "⏱ 3h",
    driver: "D. Perez",
    truck: "#12",
    pit: "Pit 3",
    site: "Oakridge Site",
    status: "billing",
    actionLabel: "Review",
    price: "$690.00",
    alert: "⚠️ Dispute flagged",
  },
];

export default function RonyxWorkflowsPage() {
  const [view, setView] = useState<"board" | "list" | "driver">("board");
  const [selected, setSelected] = useState<LoadCard | null>(demoLoads[3] || null);

  const loadsByStatus = useMemo(() => {
    return statusColumns.reduce<Record<LoadStatus, LoadCard[]>>((acc, column) => {
      acc[column.key] = demoLoads.filter((load) => load.status === column.key);
      return acc;
    }, {} as Record<LoadStatus, LoadCard[]>);
  }, []);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1300px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-tab {
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: rgba(29, 78, 216, 0.06);
          padding: 8px 16px;
          font-weight: 600;
        }
        .ronyx-tab.active {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          align-items: start;
        }
        .ronyx-col {
          background: #fff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 12px;
        }
        .ronyx-load {
          background: #fefefe;
          border: 1px solid rgba(29, 78, 216, 0.16);
          border-radius: 14px;
          padding: 12px;
          margin-top: 10px;
          cursor: pointer;
        }
        .ronyx-load strong {
          display: block;
          margin-bottom: 6px;
        }
        .ronyx-muted {
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.85rem;
        }
        .ronyx-row {
          display: grid;
          grid-template-columns: repeat(6, minmax(100px, 1fr));
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
          align-items: center;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-muted" style={{ fontWeight: 600 }}>Workflows</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 6 }}>Hauling Operations Board</h1>
            <p className="ronyx-muted">Live visual control from order to cash. Drag, drop, and resolve.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/ronyx/workflows/rules" className="ronyx-action">
              ⚙️ Workflow Rules
            </Link>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button className={`ronyx-tab ${view === "board" ? "active" : ""}`} onClick={() => setView("board")}>
            Board View
          </button>
          <button className={`ronyx-tab ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            List View
          </button>
          <button className={`ronyx-tab ${view === "driver" ? "active" : ""}`} onClick={() => setView("driver")}>
            Driver View
          </button>
        </section>

        {view === "board" && (
          <section className="ronyx-board">
            {statusColumns.map((column) => (
              <div key={column.key} className="ronyx-col">
                <div style={{ fontWeight: 700 }}>
                  {column.title}
                </div>
                <div className="ronyx-muted">{column.subtitle}</div>
                {loadsByStatus[column.key].map((load) => (
                  <div key={load.id} className="ronyx-load" onClick={() => setSelected(load)}>
                    <strong>{load.id}</strong>
                    <div className="ronyx-muted">{load.customer}</div>
                    <div>{load.material}</div>
                    <div className="ronyx-muted" style={{ marginTop: 6 }}>{load.age}</div>
                    <div style={{ marginTop: 8 }}>
                      <button className="ronyx-action">{load.actionLabel}</button>
                    </div>
                    {load.alert && (
                      <div className="ronyx-muted" style={{ marginTop: 8, color: "#b45309" }}>{load.alert}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {view === "list" && (
          <section className="ronyx-card">
            <div className="ronyx-row" style={{ fontWeight: 700 }}>
              <span>Load #</span>
              <span>Customer</span>
              <span>Driver</span>
              <span>Status</span>
              <span>Next Action</span>
              <span>Age</span>
            </div>
            {demoLoads.map((load) => (
              <div key={load.id} className="ronyx-row" style={{ marginTop: 10 }}>
                <span>{load.id}</span>
                <span>{load.customer}</span>
                <span>{load.driver}</span>
                <span>{load.status.replace("_", " ")}</span>
                <span>{load.actionLabel}</span>
                <span>{load.age}</span>
              </div>
            ))}
          </section>
        )}

        {view === "driver" && (
          <section className="ronyx-card">
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10 }}>Good Morning, D. Perez (Truck #12)</h2>
            <div className="ronyx-card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>NOW: LD-4025 - Thompson Co</div>
              <div className="ronyx-muted">10yd Topsoil | Pit 7 → 1500 Main St</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="ronyx-action">At Pit</button>
                <button className="ronyx-action">Loading</button>
                <button className="ronyx-action">En Route</button>
                <button className="ronyx-action">Delivered</button>
              </div>
            </div>
            <div className="ronyx-card">
              <div style={{ fontWeight: 700 }}>NEXT: LD-4030 - Jones Const</div>
              <div className="ronyx-muted">12yd Gravel | Pit 3 → Oakridge Site</div>
              <button className="ronyx-action" style={{ marginTop: 10 }}>View Directions</button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button className="ronyx-action">Start Shift</button>
              <button className="ronyx-action">Log Break</button>
              <button className="ronyx-action">Report Issue</button>
            </div>
          </section>
        )}

        {selected && view === "board" && (
          <section className="ronyx-card" style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {selected.id} - {selected.customer} ({selected.material})
            </div>
            <div className="ronyx-muted">Status: {selected.status.replace("_", " ")} • Driver: {selected.driver} | Truck {selected.truck}</div>
            <div className="ronyx-muted">Pit: {selected.pit} | Site: {selected.site}</div>
            <div className="ronyx-muted">Price: {selected.price}</div>
            {selected.alert && <div style={{ marginTop: 8, color: "#b45309" }}>{selected.alert}</div>}
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ronyx-action">Message Driver</button>
              <button className="ronyx-action">Call Site</button>
              <button className="ronyx-action">Mark POD Received</button>
              <button className="ronyx-action">Create Invoice</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
