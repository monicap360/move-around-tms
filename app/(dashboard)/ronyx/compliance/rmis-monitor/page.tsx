"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RmisRow = {
  id: string;
  carrier_name?: string;
  driver_name?: string;
  truck_number?: string;
  rmis_note?: string;
  rmis_classification?: string;
  rmis_severity?: string;
  dispatch_date?: string;
  action_required?: string;
  status?: string;
};

const SEV: Record<string, { color: string; bg: string; label: string }> = {
  clear:    { color: "#15803d", bg: "#dcfce7", label: "Clear" },
  low:      { color: "#b45309", bg: "#fef9c3", label: "Low" },
  warning:  { color: "#ea580c", bg: "#ffedd5", label: "Warning" },
  critical: { color: "#dc2626", bg: "#fee2e2", label: "Dispatch Block" },
};

export default function RmisMonitorPage() {
  const [rows, setRows]         = useState<RmisRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sevFilter, setSev]     = useState("all");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    fetch("/api/ronyx/dispatch-import/match?rmis=true")
      .then(r => r.json())
      .then(d => setRows(d.rows ?? d.matches ?? d.rmis_rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    const matchSev  = sevFilter === "all" || r.rmis_severity === sevFilter;
    const matchSrch = !search || [r.carrier_name, r.driver_name, r.truck_number, r.rmis_note]
      .some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    return matchSev && matchSrch;
  });

  const counts = {
    clear:    rows.filter(r => r.rmis_severity === "clear").length,
    low:      rows.filter(r => r.rmis_severity === "low").length,
    warning:  rows.filter(r => r.rmis_severity === "warning").length,
    critical: rows.filter(r => r.rmis_severity === "critical").length,
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #1d4ed8 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.4rem" }}>📡</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>RMIS Monitor</h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              Real-time RMIS compliance notes · Classification · Dispatch hold detection
            </p>
          </div>
          <Link href="/ronyx/dispatch/daily-import"
            style={{ background: "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
            📥 Run Dispatch Guard
          </Link>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {(Object.entries(counts) as [string, number][]).map(([k, v]) => {
            const s = SEV[k];
            return (
              <div key={k} style={{ background: s.bg, border: `1.5px solid ${s.color}22`, borderRadius: 10, padding: "14px 18px", cursor: "pointer" }}
                onClick={() => setSev(sevFilter === k ? "all" : k)}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color }}>{v}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search carrier, driver, truck, note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 280 }}
          />
          {["all","critical","warning","low","clear"].map(f => (
            <button key={f} onClick={() => setSev(f)}
              style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                border: `1px solid ${sevFilter === f ? "#7c3aed" : "#e2e8f0"}`,
                background: sevFilter === f ? "#7c3aed" : "#fff",
                color: sevFilter === f ? "#fff" : "#475569" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} of {rows.length} records</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading RMIS data...</div>}

        {!loading && rows.length === 0 && (
          <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No RMIS data yet</div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 20 }}>
              Import a dispatch CSV with RMIS compliance notes to see classifications here.
            </div>
            <Link href="/ronyx/dispatch/daily-import"
              style={{ background: "#7c3aed", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
              Import Dispatch File
            </Link>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Carrier / Driver","Truck","RMIS Note","Severity","Action Required","Date"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.72rem", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const sev = SEV[r.rmis_severity ?? "clear"] ?? SEV.clear;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{r.carrier_name || r.driver_name || "—"}</div>
                        {r.driver_name && r.carrier_name && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{r.driver_name}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{r.truck_number || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#475569", maxWidth: 280 }}>
                        <div style={{ fontSize: "0.78rem" }}>{r.rmis_note || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: sev.bg, color: sev.color, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem" }}>
                          {sev.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.78rem", color: r.rmis_severity === "critical" ? "#dc2626" : "#475569" }}>
                        {r.action_required || (r.rmis_severity === "critical" ? "Block from dispatch" : r.rmis_severity === "warning" ? "Review before dispatch" : "No action needed")}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{r.dispatch_date || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
