"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TrackingRecord = {
  driverName: string;
  truckNumber: string;
  status: string;
  speed: number;
  direction: string;
  timestamp: string;
};

type ModuleRow = {
  title: string;
  subtitle: string;
  status: string;
};

const PROVIDERS = [
  { label: "Samsara", value: "samsara" },
  { label: "Motive (KeepTruckin)", value: "motive" },
  { label: "Geotab", value: "geotab" },
];

export default function RonyxTrackingPage() {
  const [provider, setProvider] = useState("samsara");
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [moduleRows, setModuleRows] = useState<ModuleRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch(`/api/tracking/locations?provider=${provider}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Tracking provider not available.");
      }
      const data = await res.json();
      setRecords(
        (data.records || []).map((row: any) => ({
          driverName: row.driverName || "Unknown Driver",
          truckNumber: row.truckNumber || "Truck",
          status: row.status || "on_schedule",
          speed: Number(row.speed || 0),
          direction: row.direction || "N",
          timestamp: row.timestamp || new Date().toISOString(),
        })),
      );
    } catch (err) {
      console.error("Tracking provider error", err);
      setRecords([]);
      setStatusMessage("Live tracking is unavailable. Showing last known status.");
      try {
        const fallback = await fetch("/api/ronyx/modules?section=tracking", { cache: "no-store" });
        const fallbackData = await fallback.json();
        setModuleRows(fallbackData.rows || []);
      } catch (fallbackErr) {
        console.error("Tracking fallback error", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  const summary = useMemo(() => {
    const active = records.length;
    const idle = records.filter((row) => row.speed <= 1).length;
    const alerts = records.filter((row) => row.status === "critical" || row.status === "delayed").length;
    return { active, idle, alerts };
  }, [records]);

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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Live Tracking Hub</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Real-time load visibility across Samsara, Motive, and Geotab feeds.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select className="ronyx-action" value={provider} onChange={(event) => setProvider(event.target.value)}>
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button className="ronyx-action" onClick={loadTracking}>
              Refresh
            </button>
            <Link className="ronyx-action" href="/ronyx/dispatch">
              Dispatch View
            </Link>
            <Link className="ronyx-action" href="/ronyx/loads">
              Load Board
            </Link>
          </div>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Active Units", value: summary.active },
            { label: "Idle Alerts", value: summary.idle },
            { label: "Critical Alerts", value: summary.alerts },
            { label: "Provider", value: PROVIDERS.find((item) => item.value === provider)?.label || provider },
          ].map((card) => (
            <div key={card.label} className="ronyx-card">
              <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{card.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6 }}>{card.value}</div>
            </div>
          ))}
        </section>

        {statusMessage && (
          <div className="ronyx-card" style={{ marginBottom: 20 }}>
            <strong>{statusMessage}</strong>
          </div>
        )}

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Live Fleet Status</h2>
          {loading ? (
            <div className="ronyx-row">Loading tracking data...</div>
          ) : records.length > 0 ? (
            records.map((record) => (
              <div key={`${record.driverName}-${record.truckNumber}`} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{record.driverName}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
                    {record.truckNumber} • {record.speed} mph • {record.direction}
                  </div>
                </div>
                <div style={{ textTransform: "capitalize", fontWeight: 600, color: "#1d4ed8" }}>{record.status}</div>
              </div>
            ))
          ) : (
            moduleRows.map((row) => (
              <div key={row.title} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>{row.subtitle}</div>
                </div>
                <div style={{ fontWeight: 600, color: "#1d4ed8" }}>{row.status}</div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
