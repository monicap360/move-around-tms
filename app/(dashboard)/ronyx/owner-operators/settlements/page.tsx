"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SettlementStatus = "Pending" | "Approved" | "Processing" | "Paid" | "Hold";
type TicketStatus     = "Verified" | "Needs Review" | "Missing" | "Duplicate";

type SettlementRow = {
  jobId:              string;
  ooId:               string;
  companyName:        string;
  driverName:         string;
  truckNumber:        string;
  loadDate:           string;
  projectName:        string;
  projectNumber:      string;
  origin:             string;
  destination:        string;
  material:           string;
  tons:               number;
  grossRevenue:       number;
  ooRate:             number;
  margin:             number;
  ticketStatus:       TicketStatus;
  settlementStatus:   SettlementStatus;
};

const STATUS_STYLE: Record<SettlementStatus, { bg: string; color: string }> = {
  Pending:    { bg: "#fef3c7", color: "#b45309" },
  Approved:   { bg: "#f0fdf4", color: "#15803d" },
  Processing: { bg: "#eff6ff", color: "#1d4ed8" },
  Paid:       { bg: "#f0fdf4", color: "#15803d" },
  Hold:       { bg: "#fee2e2", color: "#dc2626" },
};

const TICKET_STYLE: Record<TicketStatus, { bg: string; color: string }> = {
  Verified:      { bg: "#f0fdf4", color: "#15803d" },
  "Needs Review":{ bg: "#fff7ed", color: "#ea580c" },
  Missing:       { bg: "#fee2e2", color: "#dc2626" },
  Duplicate:     { bg: "#ede9fe", color: "#7c3aed" },
};

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OOSettlementsPage() {
  const [rows,    setRows]    = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [ooFilter,  setOoFilter]  = useState("All Companies");
  const [statusFilter, setStatusFilter] = useState<"All" | SettlementStatus>("All");
  const [ticketFilter, setTicketFilter] = useState<"All" | TicketStatus>("All");
  const [saving,  setSaving]  = useState<string | null>(null);
  const [toast,   setToast]   = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then(({ companies }) => {
        const flat: SettlementRow[] = (companies || []).flatMap((oo: any) =>
          (oo.jobs || []).map((j: any) => ({
            jobId:            j.id,
            ooId:             oo.id,
            companyName:      oo.company_name,
            driverName:       j.driver_name   || "—",
            truckNumber:      j.truck_number  || "—",
            loadDate:         j.load_date     || "",
            projectName:      j.project_name  || "—",
            projectNumber:    j.project_number || "",
            origin:           j.origin        || "—",
            destination:      j.destination   || "—",
            material:         j.material      || "—",
            tons:             Number(j.tons   || 0),
            grossRevenue:     Number(j.gross_revenue || 0),
            ooRate:           Number(j.oo_rate       || 0),
            margin:           Number(j.margin        || 0),
            ticketStatus:     (j.ticket_status     || "Verified") as TicketStatus,
            settlementStatus: (j.settlement_status || "Pending")  as SettlementStatus,
          }))
        );
        // Sort newest load date first
        flat.sort((a, b) => b.loadDate.localeCompare(a.loadDate));
        setRows(flat);
      })
      .catch(() => flash("Could not load settlements."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(row: SettlementRow, newStatus: SettlementStatus) {
    setSaving(row.jobId);
    try {
      await fetch(`/api/ronyx/owner-operators/${row.ooId}/jobs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: row.jobId, settlement_status: newStatus }),
      });
      setRows(prev => prev.map(r => r.jobId === row.jobId ? { ...r, settlementStatus: newStatus } : r));
      flash(`${row.companyName} — ${row.projectName}: set to ${newStatus}`);
    } catch {
      flash("Failed to update settlement status.");
    } finally {
      setSaving(null);
    }
  }

  const companies = useMemo(() => ["All Companies", ...Array.from(new Set(rows.map(r => r.companyName))).sort()], [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (ooFilter !== "All Companies" && r.companyName !== ooFilter) return false;
    if (statusFilter !== "All" && r.settlementStatus !== statusFilter) return false;
    if (ticketFilter !== "All" && r.ticketStatus !== ticketFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.companyName.toLowerCase().includes(q) &&
          !r.driverName.toLowerCase().includes(q) &&
          !r.truckNumber.toLowerCase().includes(q) &&
          !r.projectName.toLowerCase().includes(q) &&
          !r.projectNumber.toLowerCase().includes(q) &&
          !r.material.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, ooFilter, statusFilter, ticketFilter, search]);

  const totals = useMemo(() => ({
    revenue:   filtered.reduce((s, r) => s + r.grossRevenue, 0),
    ooPay:     filtered.reduce((s, r) => s + r.ooRate,       0),
    margin:    filtered.reduce((s, r) => s + r.margin,       0),
    pending:   filtered.filter(r => r.settlementStatus === "Pending").length,
    approved:  filtered.filter(r => r.settlementStatus === "Approved").length,
    hold:      filtered.filter(r => r.settlementStatus === "Hold").length,
    paid:      filtered.filter(r => r.settlementStatus === "Paid").length,
    pendingPay:filtered.filter(r => r.settlementStatus === "Pending").reduce((s, r) => s + r.ooRate, 0),
  }), [filtered]);

  return (
    <div style={{ maxWidth: 1200, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 14, padding: "22px 28px", marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>OO Settlements</h1>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>All owner operator loads — one page</p>
          </div>
          <Link href="/ronyx/owner-operators" style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>
            ← Owner Operators
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Gross Revenue",   value: fmt$(totals.revenue),   color: "#1e40af", bg: "#eff6ff" },
          { label: "OO Pay Due",      value: fmt$(totals.ooPay),     color: "#7c3aed", bg: "#f5f3ff" },
          { label: "Margin",          value: fmt$(totals.margin),    color: "#15803d", bg: "#f0fdf4" },
          { label: "Pending",         value: String(totals.pending), color: "#b45309", bg: "#fef3c7", sub: fmt$(totals.pendingPay) + " owed" },
          { label: "Approved",        value: String(totals.approved),color: "#15803d", bg: "#f0fdf4" },
          { label: "On Hold",         value: String(totals.hold),    color: "#dc2626", bg: "#fee2e2" },
          { label: "Paid",            value: String(totals.paid),    color: "#0891b2", bg: "#ecfeff" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${c.color}22` }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: c.color, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: "0.68rem", color: c.color, marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company, driver, truck, project, material…"
          style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", background: "#f8fafc" }}
        />
        <select value={ooFilter} onChange={e => setOoFilter(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff", cursor: "pointer" }}>
          {companies.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff", cursor: "pointer" }}>
          {(["All","Pending","Approved","Processing","Paid","Hold"] as const).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={ticketFilter} onChange={e => setTicketFilter(e.target.value as any)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff", cursor: "pointer" }}>
          {(["All","Verified","Needs Review","Missing","Duplicate"] as const).map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || ooFilter !== "All Companies" || statusFilter !== "All" || ticketFilter !== "All") && (
          <button onClick={() => { setSearch(""); setOoFilter("All Companies"); setStatusFilter("All"); setTicketFilter("All"); }}
            style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#475569", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
            Clear ✕
          </button>
        )}
        <div style={{ marginLeft: "auto", padding: "9px 0", fontSize: "0.78rem", color: "#64748b", fontWeight: 600, alignSelf: "center" }}>
          {filtered.length} of {rows.length} loads
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading settlements…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
          {rows.length === 0 ? "No settlement records yet." : "No loads match your filters."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Date","OO Company","Driver","Truck","Project","Material","Tons","Gross Rev","OO Pay","Margin","Ticket","Settlement",""].map(h => (
                    <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const ss = STATUS_STYLE[row.settlementStatus] || STATUS_STYLE.Pending;
                  const ts = TICKET_STYLE[row.ticketStatus]     || TICKET_STYLE.Verified;
                  return (
                    <tr key={row.jobId} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap" as const }}>{fmtDate(row.loadDate)}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>
                        <Link href={`/ronyx/owner-operators`} style={{ color: "#1e40af", textDecoration: "none" }}>{row.companyName}</Link>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#475569" }}>{row.driverName}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#475569" }}>{row.truckNumber}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#475569", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        <span title={row.projectName}>{row.projectName}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#475569" }}>{row.material}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>{row.tons ? row.tons.toFixed(2) : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.78rem", fontWeight: 600, color: "#1e40af" }}>{row.grossRevenue ? fmt$(row.grossRevenue) : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>{row.ooRate ? fmt$(row.ooRate) : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: row.margin >= 0 ? "#15803d" : "#dc2626" }}>{fmt$(row.margin)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ ...ts, padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700 }}>{row.ticketStatus}</span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select
                          value={row.settlementStatus}
                          disabled={saving === row.jobId}
                          onChange={e => updateStatus(row, e.target.value as SettlementStatus)}
                          style={{ ...ss, padding: "3px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700, border: "none", cursor: "pointer", outline: "none" }}>
                          {(["Pending","Approved","Processing","Paid","Hold"] as SettlementStatus[]).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {saving === row.jobId && <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Saving…</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr style={{ background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                  <td colSpan={6} style={{ padding: "10px 10px", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                    {filtered.length} loads
                  </td>
                  <td style={{ padding: "10px 10px", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                    {filtered.reduce((s, r) => s + r.tons, 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 10px", fontSize: "0.78rem", fontWeight: 800, color: "#1e40af" }}>{fmt$(totals.revenue)}</td>
                  <td style={{ padding: "10px 10px", fontSize: "0.78rem", fontWeight: 800, color: "#7c3aed" }}>{fmt$(totals.ooPay)}</td>
                  <td style={{ padding: "10px 10px", fontSize: "0.78rem", fontWeight: 800, color: "#15803d" }}>{fmt$(totals.margin)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
