"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Load = {
  id: string;
  load_number?: string;
  job_name?: string;
  customer_name?: string;
  driver_name?: string;
  truck_number?: string;
  origin?: string;
  destination?: string;
  material?: string;
  status?: string;
  dispatch_date?: string;
  delivery_date?: string;
  total_tons?: number;
  billing_amount?: number;
  pay_amount?: number;
  notes?: string;
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  scheduled:   { color: "#1d4ed8", bg: "#dbeafe" },
  in_transit:  { color: "#0891b2", bg: "#cffafe" },
  delivered:   { color: "#15803d", bg: "#dcfce7" },
  cancelled:   { color: "#64748b", bg: "#f1f5f9" },
  hold:        { color: "#dc2626", bg: "#fee2e2" },
};

export default function LoadsPage() {
  const [loads, setLoads]     = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("all");

  useEffect(() => {
    fetch("/api/ronyx/loads")
      .then(r => r.json())
      .then(d => setLoads(d.loads ?? d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = loads.filter(l => {
    const matchStatus = status === "all" || l.status === status;
    const matchSearch = !search || [l.load_number, l.job_name, l.customer_name, l.driver_name, l.truck_number]
      .some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const totalTons     = loads.reduce((a, l) => a + (l.total_tons ?? 0), 0);
  const totalBilling  = loads.reduce((a, l) => a + (l.billing_amount ?? 0), 0);
  const inTransit     = loads.filter(l => l.status === "in_transit").length;
  const delivered     = loads.filter(l => l.status === "delivered").length;

  const fmt$ = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.4rem" }}>📍</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                Load Tracker
              </h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              Active and completed loads · Driver and truck assignments · Delivery status
            </p>
          </div>
          <Link href="/ronyx/dispatch/board"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "10px 20px", borderRadius: 8,
              fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
            📋 Dispatch Board
          </Link>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Loads",   value: loads.length,                color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" },
            { label: "In Transit",    value: inTransit,                   color: "#0891b2", bg: "#cffafe", border: "#67e8f9" },
            { label: "Delivered",     value: delivered,                   color: "#15803d", bg: "#dcfce7", border: "#86efac" },
            { label: "Total Tons",    value: totalTons.toFixed(1),        color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
            { label: "Total Billing", value: fmt$(totalBilling),          color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: s.color, fontWeight: 700, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search load, driver, job, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 260 }}
          />
          {["all","scheduled","in_transit","delivered","hold","cancelled"].map(s => (
            <button key={s}
              onClick={() => setStatus(s)}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${status === s ? "#0d9488" : "#e2e8f0"}`,
                background: status === s ? "#0d9488" : "#fff", color: status === s ? "#fff" : "#475569",
                fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
              {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} loads</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading loads...</div>}

        {!loading && loads.length === 0 && (
          <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📍</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No loads found</div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 20 }}>
              Loads are created from dispatched jobs and ticket scans.
            </div>
            <Link href="/ronyx/dispatch/board"
              style={{ background: "#0d9488", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
              Go to Dispatch Board
            </Link>
          </div>
        )}

        {!loading && loads.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Load #","Job / Customer","Driver","Truck","Date","Status","Tons","Billing",""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.72rem", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => {
                  const sty = STATUS_STYLE[l.status ?? ""] ?? { color: "#64748b", bg: "#f1f5f9" };
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>
                        {l.load_number || l.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{l.job_name || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{l.customer_name}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{l.driver_name || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{l.truck_number || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{l.dispatch_date || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: sty.bg, color: sty.color, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem" }}>
                          {(l.status || "unknown").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#1e293b", fontWeight: 600 }}>
                        {l.total_tons != null ? `${l.total_tons.toFixed(2)} T` : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#15803d", fontWeight: 700 }}>
                        {l.billing_amount != null ? fmt$(l.billing_amount) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/ronyx/dispatch/loads/${l.id}`}
                          style={{ color: "#0891b2", fontWeight: 700, fontSize: "0.75rem", textDecoration: "none" }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No loads match your filter.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
