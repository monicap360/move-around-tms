"use client";

import { useState } from "react";
import Link from "next/link";

const loadTabs = [
  "Active Loads",
  "Available Loads",
  "Completed Loads",
  "Cancelled Loads",
  "Load Board Search",
  "Assigned Drivers",
];

const detailTabs = [
  "Load Details",
  "Documents",
  "Payments & Settlements",
  "Tracking / GPS",
  "Status Updates",
  "Customer Info",
];

export default function RonyxLoadsPage() {
  const [activeTab, setActiveTab] = useState(loadTabs[0]);
  const [detailTab, setDetailTab] = useState(detailTabs[0]);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-success: #16a34a;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
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
        .ronyx-tab {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: transparent;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.7);
          cursor: pointer;
        }
        .ronyx-tab.active {
          background: rgba(29, 78, 216, 0.14);
          color: #0f172a;
          border-color: rgba(29, 78, 216, 0.35);
        }
        .status {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status.good {
          color: var(--ronyx-success);
          background: rgba(22, 163, 74, 0.12);
        }
        .status.warn {
          color: var(--ronyx-warning);
          background: rgba(245, 158, 11, 0.12);
        }
        .status.bad {
          color: var(--ronyx-danger);
          background: rgba(239, 68, 68, 0.12);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Loads</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Manage active, available, completed, and cancelled loads with full dispatch detail.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {loadTabs.map((tab) => (
              <button
                key={tab}
                className={`ronyx-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeTab}</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/ronyx/dispatch" className="ronyx-action">
                Dispatch
              </Link>
              <Link href="/ronyx/tickets" className="ronyx-action">
                Tickets
              </Link>
            </div>
          </div>
          <div className="ronyx-grid">
            {[
              {
                id: "LD-6121",
                route: "Pit 7 → I‑45 Jobsite",
                status: "In Transit",
                driver: "D. Perez",
                customer: "Metro Paving",
              },
              {
                id: "LD-6124",
                route: "Pit 3 → Beltway 8",
                status: "Loading",
                driver: "S. Grant",
                customer: "Gulf Aggregate",
              },
              {
                id: "LD-6129",
                route: "Pit 5 → Katy Site",
                status: "Delivered",
                driver: "J. Lane",
                customer: "City Site",
              },
            ].map((load) => (
              <div key={load.id} className="ronyx-row">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {load.id} • {load.route}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    Driver: {load.driver} • Customer: {load.customer}
                  </div>
                </div>
                <span className="status good">{load.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {detailTabs.map((tab) => (
              <button
                key={tab}
                className={`ronyx-tab ${detailTab === tab ? "active" : ""}`}
                onClick={() => setDetailTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailTab === "Load Details" && (
            <div className="ronyx-grid">
              {[
                "Load number",
                "Pickup & delivery dates",
                "Shipper & receiver details",
                "Commodity",
                "Weight & pieces",
                "Rate confirmation",
                "Contact info",
                "Instructions / Notes",
              ].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Captured</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Documents" && (
            <div className="ronyx-grid">
              {["BOL", "Rate Confirmations", "Receipts", "POD"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <button className="ronyx-action">Upload / Download</button>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Payments & Settlements" && (
            <div className="ronyx-grid">
              {["Freight Rate", "Detention / Layover", "Fuel Surcharge", "Driver Pay Breakdown"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status warn">Review</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Tracking / GPS" && (
            <div className="ronyx-grid">
              {["Live GPS Location", "ETA Updates", "Geofence Events"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Live</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Status Updates" && (
            <div className="ronyx-grid">
              {["Dispatched", "In Transit", "Delivered", "POD Received", "Paid"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Enabled</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Customer Info" && (
            <div className="ronyx-grid">
              {["Broker / Shipper Contact", "Credit Terms", "Notes / History"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Available</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
