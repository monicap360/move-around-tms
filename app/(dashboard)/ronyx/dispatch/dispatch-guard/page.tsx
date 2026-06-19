"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GuardStat = {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  border: string;
};

type DispatchRow = {
  id: string;
  driver_name?: string;
  truck_number?: string;
  job_name?: string;
  customer_name?: string;
  dispatch_date?: string;
  rmis_classification?: string;
  rmis_severity?: string;
  match_status?: string;
  payroll_status?: string;
  notes?: string;
};

const SEVERITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  clear:    { color: "#15803d", bg: "#dcfce7", label: "Clear" },
  low:      { color: "#b45309", bg: "#fef9c3", label: "Low" },
  warning:  { color: "#ea580c", bg: "#ffedd5", label: "Warning" },
  critical: { color: "#dc2626", bg: "#fee2e2", label: "Critical Block" },
};

export default function DispatchGuardPage() {
  const [rows, setRows]       = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/ronyx/dispatch-import/match")
      .then(r => r.json())
      .then(d => { setRows(d.rows ?? d.matches ?? d.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    const matchFilter =
      filter === "all" ? true :
      filter === "blocks" ? r.rmis_severity === "critical" :
      filter === "warnings" ? r.rmis_severity === "warning" :
      filter === "clear" ? r.rmis_severity === "clear" :
      filter === "unmatched" ? r.match_status === "unmatched" : true;
    const matchSearch = !search || [r.driver_name, r.truck_number, r.job_name, r.customer_name]
      .some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const stats: GuardStat[] = [
    { label: "Total Dispatched",  value: rows.length,                                              color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" },
    { label: "Dispatch Blocks",   value: rows.filter(r => r.rmis_severity === "critical").length,  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
    { label: "Warnings",          value: rows.filter(r => r.rmis_severity === "warning").length,   color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
    { label: "Clear",             value: rows.filter(r => r.rmis_severity === "clear").length,     color: "#15803d", bg: "#dcfce7", border: "#86efac" },
    { label: "Unmatched",         value: rows.filter(r => r.match_status === "unmatched").length,  color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
    { label: "Payroll Holds",     value: rows.filter(r => r.payroll_status === "held").length,     color: "#b45309", bg: "#fef9c3", border: "#fde68a" },
  ];

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.5rem" }}>🛡️</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                Dispatch Guard™
              </h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              RMIS compliance monitor · Dispatch-to-ticket match · Payroll validation
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/ronyx/dispatch/daily-import"
              style={{ background: "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              📥 Run Dispatch Guard
            </Link>
            <Link href="/ronyx/dispatch/board"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
              📋 Dispatch Board
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: s.color, fontWeight: 700, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Import CTA if no data */}
        {!loading && rows.length === 0 && (
          <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "48px 32px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No dispatch data loaded</div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 20 }}>
              Import your daily dispatch CSV to run Dispatch Guard™ compliance checks,<br />
              ticket matching, and payroll validation.
            </div>
            <Link href="/ronyx/dispatch/daily-import"
              style={{ background: "#7c3aed", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              📥 Import Dispatch File
            </Link>
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search driver, truck, job..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 220 }}
              />
              {["all","blocks","warnings","clear","unmatched"].map(f => (
                <button key={f}
                  onClick={() => setFilter(f)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filter === f ? "#7c3aed" : "#e2e8f0"}`,
                    background: filter === f ? "#7c3aed" : "#fff", color: filter === f ? "#fff" : "#475569",
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", textTransform: "capitalize" }}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginLeft: "auto" }}>{filtered.length} of {rows.length} rows</span>
            </div>

            {/* Table */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Driver","Truck","Job / Customer","Date","RMIS Status","Match","Payroll"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const sev = SEVERITY_STYLE[r.rmis_severity ?? "clear"] ?? SEVERITY_STYLE.clear;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{r.driver_name || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{r.truck_number || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>
                          <div>{r.job_name || "—"}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{r.customer_name}</div>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{r.dispatch_date || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: sev.bg, color: sev.color, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem" }}>
                            {sev.label}
                          </span>
                          {r.notes && <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 3 }}>{r.notes}</div>}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            background: r.match_status === "matched" ? "#dcfce7" : r.match_status === "unmatched" ? "#fee2e2" : "#f1f5f9",
                            color:      r.match_status === "matched" ? "#15803d" : r.match_status === "unmatched" ? "#dc2626" : "#64748b",
                            padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem"
                          }}>
                            {r.match_status ?? "Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            background: r.payroll_status === "approved" ? "#dcfce7" : r.payroll_status === "held" ? "#fee2e2" : "#f1f5f9",
                            color:      r.payroll_status === "approved" ? "#15803d" : r.payroll_status === "held" ? "#dc2626" : "#64748b",
                            padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem"
                          }}>
                            {r.payroll_status ?? "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && !loading && (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No rows match your filter.</div>
              )}
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading dispatch data...</div>
        )}

        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 24 }}>
          {[
            { label: "Import Dispatch File",    href: "/ronyx/dispatch/daily-import",    icon: "📥" },
            { label: "View Dispatch Board",     href: "/ronyx/dispatch/board",           icon: "📋" },
            { label: "Ticket Reconciliation",   href: "/ronyx/tickets?tab=reconciliation", icon: "🔍" },
            { label: "Payroll Review",          href: "/ronyx/payroll",                  icon: "💵" },
            { label: "RMIS Monitor",            href: "/ronyx/compliance/rmis-monitor",  icon: "📡" },
            { label: "Compliance Center",       href: "/ronyx/compliance",               icon: "🛡️" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1e293b",
                fontWeight: 600, fontSize: "0.82rem", transition: "border-color 0.15s" }}>
              <span style={{ fontSize: "1.1rem" }}>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
