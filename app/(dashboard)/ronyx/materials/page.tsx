"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ModuleRow = {
  title: string;
  subtitle: string;
  status: string;
};

export default function RonyxMaterialsPage() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/ronyx/modules?section=materials", { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
    } catch (err) {
      console.error("Failed to load materials rows", err);
      setRows([]);
      setStatusMessage("Unable to load materials data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%),
            var(--ronyx-black);
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
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #ffffff;
          border-color: transparent;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(29, 78, 216, 0.4);
          font-size: 0.8rem;
          color: #1d4ed8;
          background: rgba(29, 78, 216, 0.1);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Materials & Rate Control</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Manage material rates, stockpiles, and customer pricing for every haul.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="ronyx-action primary" href="/ronyx/aggregates">
              Aggregates Hub
            </Link>
            <Link className="ronyx-action" href="/ronyx/projects">
              Project Pricing
            </Link>
            <button className="ronyx-action" onClick={loadRows}>
              Refresh
            </button>
          </div>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Active Materials", value: "18" },
            { label: "Top Margin", value: "Crushed Stone" },
            { label: "Inventory Watch", value: "Sand - Low" },
            { label: "Pending Rate Changes", value: "4" },
          ].map((card) => (
            <div key={card.label} className="ronyx-card">
              <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{card.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6 }}>{card.value}</div>
            </div>
          ))}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Materials Portfolio</h2>
          {loading ? (
            <div className="ronyx-row">Loading materials...</div>
          ) : rows.length === 0 ? (
            <div className="ronyx-row">No material records available yet.</div>
          ) : (
            rows.map((row) => (
              <div key={row.title} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>{row.subtitle}</div>
                </div>
                <div style={{ fontWeight: 600, color: "#1d4ed8" }}>{row.status}</div>
              </div>
            ))
          )}
          {statusMessage && <div style={{ marginTop: 10, color: "rgba(15,23,42,0.7)" }}>{statusMessage}</div>}
        </section>
      </div>
    </div>
  );
}
