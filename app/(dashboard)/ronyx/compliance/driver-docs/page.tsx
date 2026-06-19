"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DocSummary = {
  driver_id: string;
  driver_name: string;
  status?: string;
  cdl_status?: string;
  cdl_expiration?: string;
  medical_card_status?: string;
  medical_card_expiration?: string;
  mvr_status?: string;
  drug_test_status?: string;
  background_check_status?: string;
  employment_agreement?: string;
  w9_status?: string;
  overall_status?: string;
  dispatch_eligible?: boolean;
};

const DOC_CHECKS = [
  { key: "cdl_status",               label: "CDL",                exp: "cdl_expiration" },
  { key: "medical_card_status",       label: "Medical Card",       exp: "medical_card_expiration" },
  { key: "mvr_status",               label: "MVR",                exp: null },
  { key: "drug_test_status",         label: "Drug Test",          exp: null },
  { key: "background_check_status",  label: "Background Check",   exp: null },
  { key: "w9_status",                label: "W-9",                exp: null },
];

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  clear:        { color: "#15803d", bg: "#dcfce7" },
  ok:           { color: "#15803d", bg: "#dcfce7" },
  current:      { color: "#15803d", bg: "#dcfce7" },
  warning:      { color: "#b45309", bg: "#fef9c3" },
  expiring:     { color: "#b45309", bg: "#fef9c3" },
  expired:      { color: "#dc2626", bg: "#fee2e2" },
  missing:      { color: "#dc2626", bg: "#fee2e2" },
  needs_review: { color: "#ea580c", bg: "#ffedd5" },
  passed:       { color: "#15803d", bg: "#dcfce7" },
  complete:     { color: "#15803d", bg: "#dcfce7" },
};

function badge(val?: string) {
  const key = (val || "missing").toLowerCase().replace(/\s+/g, "_");
  const sty = STATUS_COLOR[key] ?? { color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{ background: sty.bg, color: sty.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
      {val || "Missing"}
    </span>
  );
}

export default function DriverDocsPage() {
  const [drivers, setDrivers] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/ronyx/drivers/profiles")
      .then(r => r.json())
      .then(d => setDrivers(d.drivers ?? d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = drivers.filter(d => {
    const matchFilter =
      filter === "all" ? true :
      filter === "issues" ? (d.overall_status !== "clear" && d.overall_status !== "ok") :
      filter === "missing" ? DOC_CHECKS.some(c => !d[c.key as keyof DocSummary] || d[c.key as keyof DocSummary] === "missing") :
      filter === "blocked" ? d.dispatch_eligible === false : true;
    const matchSearch = !search || (d.driver_name || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const withIssues = drivers.filter(d => d.overall_status !== "clear" && d.overall_status !== "ok" && d.overall_status !== "current").length;
  const blocked    = drivers.filter(d => d.dispatch_eligible === false).length;
  const allClear   = drivers.length - withIssues;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      <div style={{ background: "linear-gradient(135deg, #0891b2 0%, #1d4ed8 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.4rem" }}>📄</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>Driver Documents</h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              CDL · Medical Card · MVR · Drug Test · Background Check · W-9 · Employment Agreement
            </p>
          </div>
          <Link href="/ronyx/compliance/audit-ready"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "10px 20px", borderRadius: 8,
              fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
            🛡️ Be Audit Ready™
          </Link>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Drivers",  value: drivers.length, color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" },
            { label: "All Clear",      value: allClear,        color: "#15803d", bg: "#dcfce7", border: "#86efac" },
            { label: "With Issues",    value: withIssues,      color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
            { label: "Blocked",        value: blocked,         color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search driver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 220 }}
          />
          {["all","issues","missing","blocked"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                border: `1px solid ${filter === f ? "#0891b2" : "#e2e8f0"}`,
                background: filter === f ? "#0891b2" : "#fff",
                color: filter === f ? "#fff" : "#475569" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} drivers</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading drivers...</div>}

        {!loading && drivers.length === 0 && (
          <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No drivers yet</div>
            <Link href="/ronyx/drivers?tab=import"
              style={{ background: "#0891b2", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
              Import Drivers
            </Link>
          </div>
        )}

        {!loading && drivers.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.7rem", textTransform: "uppercase" }}>Driver</th>
                  {DOC_CHECKS.map(c => (
                    <th key={c.key} style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.7rem", textTransform: "uppercase" }}>{c.label}</th>
                  ))}
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.7rem", textTransform: "uppercase" }}>Dispatch</th>
                  <th style={{ padding: "10px 14px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.driver_id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{d.driver_name}</td>
                    {DOC_CHECKS.map(c => (
                      <td key={c.key} style={{ padding: "10px 10px", textAlign: "center" }}>
                        {badge(d[c.key as keyof DocSummary] as string)}
                        {c.exp && d[c.exp as keyof DocSummary] && (
                          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 2 }}>
                            {d[c.exp as keyof DocSummary] as string}
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <span style={{
                        background: d.dispatch_eligible !== false ? "#dcfce7" : "#fee2e2",
                        color:      d.dispatch_eligible !== false ? "#15803d" : "#dc2626",
                        padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.68rem"
                      }}>
                        {d.dispatch_eligible !== false ? "Eligible" : "Blocked"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <Link href={`/ronyx/drivers/${d.driver_id}`}
                        style={{ color: "#0891b2", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none" }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
