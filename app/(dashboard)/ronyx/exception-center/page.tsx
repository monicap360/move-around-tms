"use client";

import { useEffect, useMemo, useState } from "react";

type ExceptionSeverity = "Critical" | "High" | "Medium" | "Low";
type ExceptionStatus   = "Open" | "Investigating" | "Resolved" | "Waived";
type ExceptionCategory =
  | "Weight Variance"
  | "Rate Conflict"
  | "Duplicate Ticket"
  | "Missing Invoice"
  | "Missing Excel"
  | "Missing System"
  | "Date Mismatch"
  | "Truck Mismatch"
  | "Driver Mismatch"
  | "Material Mismatch"
  | "Amount Conflict"
  | "No Match"
  | "Proof Missing"
  | "Payroll Hold"
  | "CDL Expired"
  | "Other";

type TmsException = {
  id: string;
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  ticketNo: string;
  driver: string;
  truck: string;
  date: string;
  description: string;
  variance?: string;
  amount?: number;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
};

const SEV_COLORS: Record<ExceptionSeverity, { bg: string; color: string; dot: string }> = {
  Critical: { bg: "#fdf2f8", color: "#9d174d",  dot: "#e11d48" },
  High:     { bg: "#fee2e2", color: "#dc2626",  dot: "#dc2626" },
  Medium:   { bg: "#fef3c7", color: "#d97706",  dot: "#f59e0b" },
  Low:      { bg: "#f0fdf4", color: "#16a34a",  dot: "#22c55e" },
};

const STATUS_COLORS: Record<ExceptionStatus, { bg: string; color: string }> = {
  Open:          { bg: "#fee2e2", color: "#dc2626" },
  Investigating: { bg: "#fef3c7", color: "#d97706" },
  Resolved:      { bg: "#dcfce7", color: "#16a34a" },
  Waived:        { bg: "#f1f5f9", color: "#64748b" },
};

const CAT_ICONS: Record<ExceptionCategory, string> = {
  "Weight Variance":   "⚖️",
  "Rate Conflict":     "💲",
  "Duplicate Ticket":  "📋",
  "Missing Invoice":   "📄",
  "Missing Excel":     "📊",
  "Missing System":    "💻",
  "Date Mismatch":     "📅",
  "Truck Mismatch":    "🚛",
  "Driver Mismatch":   "👤",
  "Material Mismatch": "🪨",
  "Amount Conflict":   "💰",
  "No Match":          "❌",
  "Proof Missing":     "📎",
  "Payroll Hold":      "⏸",
  "CDL Expired":       "🪪",
  "Other":             "⚠️",
};

// Generate demo exceptions from real ticket data (or demo if none)
function buildExceptions(tickets: any[]): TmsException[] {
  const exceptions: TmsException[] = [];
  const cats: ExceptionCategory[] = [
    "Weight Variance", "Rate Conflict", "Duplicate Ticket", "Missing Invoice",
    "Date Mismatch", "No Match", "Proof Missing", "Payroll Hold",
  ];
  const sevs: ExceptionSeverity[] = ["Critical", "High", "Medium", "Low"];

  tickets.slice(0, 40).forEach((t: any, i: number) => {
    if (Math.random() < 0.35 || t.exceptionCount > 0) {
      const cat = cats[i % cats.length];
      const sev = sevs[i % 4];
      exceptions.push({
        id: `exc-${t.id || i}`,
        category: cat,
        severity: sev,
        status: i % 5 === 0 ? "Resolved" : i % 7 === 0 ? "Investigating" : "Open",
        ticketNo: t.ticketNo || t.ticket_number || `TKT-${1000 + i}`,
        driver: t.driver || t.driver_name || "Unknown Driver",
        truck: t.truck || t.truck_number || "—",
        date: t.ticketDate || t.date || new Date().toISOString().slice(0, 10),
        description: buildDescription(cat, t),
        variance: cat === "Weight Variance" ? `${(Math.random() * 8 + 1).toFixed(1)}%` : undefined,
        amount: t.total || Math.round(Math.random() * 5000 + 500),
        createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
      });
    }
  });

  // Pad with demo if no tickets
  if (exceptions.length === 0) {
    const demo: TmsException[] = [
      { id: "exc-1", category: "Weight Variance",  severity: "High",     status: "Open",          ticketNo: "TKT-4421", driver: "Marcus Williams", truck: "142", date: "2026-06-12", description: "Invoice shows 22.4T, system records 19.8T — variance 11.7%", variance: "11.7%", amount: 3360, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: "exc-2", category: "Rate Conflict",    severity: "High",     status: "Investigating", ticketNo: "TKT-4398", driver: "James Carter",   truck: "108", date: "2026-06-11", description: "Invoice rate $14.50/T does not match contract rate $12.75/T", amount: 4350, createdAt: new Date(Date.now() - 14400000).toISOString() },
      { id: "exc-3", category: "Duplicate Ticket", severity: "Critical", status: "Open",          ticketNo: "TKT-4380", driver: "Bobby Dixon",    truck: "211", date: "2026-06-10", description: "Ticket number 4380 appears twice — possible double billing", amount: 2790, createdAt: new Date(Date.now() - 21600000).toISOString() },
      { id: "exc-4", category: "Missing Invoice",  severity: "Medium",   status: "Open",          ticketNo: "TKT-4375", driver: "Tony Perez",     truck: "99",  date: "2026-06-10", description: "Ticket in system but no matching invoice from pit", amount: 1860, createdAt: new Date(Date.now() - 28800000).toISOString() },
      { id: "exc-5", category: "Proof Missing",    severity: "Medium",   status: "Open",          ticketNo: "TKT-4361", driver: "Robert King",    truck: "57",  date: "2026-06-09", description: "Driver signature missing from delivery ticket", createdAt: new Date(Date.now() - 36000000).toISOString() },
      { id: "exc-6", category: "Payroll Hold",     severity: "High",     status: "Investigating", ticketNo: "TKT-4350", driver: "Lisa Monroe",    truck: "184", date: "2026-06-09", description: "Payroll held pending damage report review", createdAt: new Date(Date.now() - 43200000).toISOString() },
      { id: "exc-7", category: "No Match",         severity: "Low",      status: "Resolved",      ticketNo: "TKT-4320", driver: "Sam Johnson",    truck: "73",  date: "2026-06-08", description: "Ticket resolved — matched after manual review", createdAt: new Date(Date.now() - 86400000).toISOString(), resolvedAt: new Date(Date.now() - 43200000).toISOString() },
      { id: "exc-8", category: "CDL Expired",      severity: "Critical", status: "Open",          ticketNo: "—",        driver: "Derek Walsh",    truck: "45",  date: "2026-06-07", description: "CDL expired 2026-06-01 — driver must not operate until renewed", createdAt: new Date(Date.now() - 172800000).toISOString() },
    ];
    return demo;
  }

  return exceptions;
}

function buildDescription(cat: ExceptionCategory, t: any): string {
  switch (cat) {
    case "Weight Variance":   return `Invoice/system ton mismatch on ticket ${t.ticketNo || "—"}`;
    case "Rate Conflict":     return `Rate discrepancy detected — verify contract rate`;
    case "Duplicate Ticket":  return `Ticket number appears in multiple records`;
    case "Missing Invoice":   return `No invoice found for this system ticket`;
    case "Date Mismatch":     return `Date on invoice does not match system record`;
    case "No Match":          return `Ticket could not be matched to any source`;
    case "Proof Missing":     return `Driver or customer signature missing`;
    case "Payroll Hold":      return `Payroll held pending manual review`;
    default:                  return `Exception flagged for review`;
  }
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color }}>{text}</span>;
}

export default function ExceptionCenterPage() {
  const [allExceptions, setAllExceptions] = useState<TmsException[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filterSev, setFilterSev]         = useState<ExceptionSeverity | "">("");
  const [filterStatus, setFilterStatus]   = useState<ExceptionStatus | "">("");
  const [filterCat, setFilterCat]         = useState<ExceptionCategory | "">("");
  const [search, setSearch]               = useState("");
  const [selected, setSelected]           = useState<TmsException | null>(null);
  const [statuses, setStatuses]           = useState<Record<string, ExceptionStatus>>({});
  const [flash, setFlash]                 = useState("");

  useEffect(() => {
    fetch("/api/ronyx/tickets?limit=200")
      .then(r => r.json())
      .then(d => {
        const tickets = d.tickets || d.data || [];
        setAllExceptions(buildExceptions(tickets));
      })
      .catch(() => setAllExceptions(buildExceptions([])))
      .finally(() => setLoading(false));
  }, []);

  function setExcStatus(id: string, status: ExceptionStatus) {
    setStatuses(prev => ({ ...prev, [id]: status }));
    const exc = allExceptions.find(e => e.id === id);
    setFlash(`${status}: Exception for ticket ${exc?.ticketNo || id}`);
    setTimeout(() => setFlash(""), 3000);
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  const exceptions = useMemo(() => {
    return allExceptions.map(e => ({ ...e, status: statuses[e.id] || e.status }));
  }, [allExceptions, statuses]);

  const filtered = useMemo(() => {
    let list = exceptions;
    if (filterSev)    list = list.filter(e => e.severity === filterSev);
    if (filterStatus) list = list.filter(e => e.status === filterStatus);
    if (filterCat)    list = list.filter(e => e.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.ticketNo.toLowerCase().includes(q) ||
        e.driver.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [exceptions, filterSev, filterStatus, filterCat, search]);

  const summary = useMemo(() => {
    const open   = exceptions.filter(e => e.status === "Open").length;
    const inv    = exceptions.filter(e => e.status === "Investigating").length;
    const crit   = exceptions.filter(e => e.severity === "Critical" && e.status !== "Resolved").length;
    const res    = exceptions.filter(e => e.status === "Resolved").length;
    const catMap = new Map<string, number>();
    exceptions.forEach(e => { if (e.status !== "Resolved") catMap.set(e.category, (catMap.get(e.category) || 0) + 1); });
    const topCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { open, inv, crit, res, topCats };
  }, [exceptions]);

  const categories = useMemo(() => Array.from(new Set(exceptions.map(e => e.category))), [exceptions]);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "28px 32px 24px", borderRadius: 14, marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Exception Center</h1>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
              Weight variances, rate conflicts, missing tickets, payroll holds &amp; compliance flags
            </p>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              ["Open",          summary.open, "#f87171"],
              ["Investigating", summary.inv,  "#fbbf24"],
              ["Critical",      summary.crit, "#e11d48"],
              ["Resolved",      summary.res,  "#4ade80"],
            ].map(([l, v, c]) => (
              <div key={String(l)} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: String(c) }}>{v}</div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 600, fontSize: "0.85rem" }}>
          {flash}
        </div>
      )}

      {/* Top category chips */}
      {summary.topCats.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {summary.topCats.map(([cat, count]) => (
            <button key={cat} onClick={() => setFilterCat(cat === filterCat ? "" : cat as ExceptionCategory)}
              style={{ padding: "6px 14px", borderRadius: 99, border: "1px solid #e2e8f0", background: filterCat === cat ? "#fee2e2" : "#fff", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: filterCat === cat ? "#dc2626" : "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{CAT_ICONS[cat as ExceptionCategory]}</span>
              <span>{cat}</span>
              <span style={{ fontWeight: 800, color: "#dc2626" }}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value as ExceptionSeverity | "")}
          style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none" }}>
          <option value="">All Severities</option>
          {(["Critical","High","Medium","Low"] as ExceptionSeverity[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ExceptionStatus | "")}
          style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none" }}>
          <option value="">All Statuses</option>
          {(["Open","Investigating","Resolved","Waived"] as ExceptionStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value as ExceptionCategory | "")}
          style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none", maxWidth: 180 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket #, driver, category…"
          style={{ flex: 1, maxWidth: 260, padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", outline: "none" }} />
        {(filterSev || filterStatus || filterCat || search) && (
          <button onClick={() => { setFilterSev(""); setFilterStatus(""); setFilterCat(""); setSearch(""); }}
            style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "#f1f5f9", color: "#475569", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} exceptions</span>
      </div>

      {/* Exception list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading exceptions…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, color: "#16a34a" }}>No exceptions match this filter</div>
          </div>
        ) : (
          filtered.map(exc => {
            const sevC = SEV_COLORS[exc.severity];
            const stC  = STATUS_COLORS[exc.status];
            const isResolved = exc.status === "Resolved" || exc.status === "Waived";
            return (
              <div key={exc.id} style={{
                background: "#fff", borderRadius: 12, border: `1px solid ${isResolved ? "#e2e8f0" : sevC.color + "44"}`,
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
                opacity: isResolved ? 0.65 : 1, cursor: "pointer", transition: "box-shadow 120ms",
              }} onClick={() => setSelected(exc)}>
                {/* Severity dot */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: sevC.dot, flexShrink: 0 }} />

                {/* Icon + category */}
                <div style={{ fontSize: "1.4rem", flexShrink: 0 }}>{CAT_ICONS[exc.category]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", marginBottom: 2 }}>
                    {exc.category}
                    <span style={{ marginLeft: 10, fontWeight: 400, fontSize: "0.78rem", color: "#64748b" }}>Ticket #{exc.ticketNo}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exc.description}</div>
                </div>

                {/* Metadata */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  {exc.variance && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 99 }}>{exc.variance}</span>
                  )}
                  <Badge text={exc.severity} bg={sevC.bg} color={sevC.color} />
                  <Badge text={exc.status} {...stC} />
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: 4 }}>{exc.driver}</span>
                </div>

                {/* Quick actions */}
                {!isResolved && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setExcStatus(exc.id, "Investigating")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #fde68a", background: "#fffbeb", color: "#d97706", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>Investigate</button>
                    <button onClick={() => setExcStatus(exc.id, "Resolved")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>Resolve</button>
                    <button onClick={() => setExcStatus(exc.id, "Waived")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>Waive</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail drawer */}
      {selected && (() => {
        const exc = { ...selected, status: statuses[selected.id] || selected.status };
        const sevC = SEV_COLORS[exc.severity];
        const stC  = STATUS_COLORS[exc.status];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={() => setSelected(null)} />
            <div style={{ position: "relative", width: 440, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: sevC.bg }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "1.5rem" }}>{CAT_ICONS[exc.category]}</span>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94a3b8" }}>✕</button>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{exc.category}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <Badge text={exc.severity} bg={sevC.bg} color={sevC.color} />
                  <Badge text={exc.status} {...stC} />
                </div>
              </div>
              <div style={{ padding: 24, flex: 1 }}>
                <p style={{ fontSize: "0.85rem", color: "#475569", marginTop: 0, lineHeight: 1.6 }}>{exc.description}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                  {[
                    ["Ticket #",   exc.ticketNo],
                    ["Driver",     exc.driver],
                    ["Truck",      exc.truck],
                    ["Date",       exc.date],
                    ["Variance",   exc.variance || "—"],
                    ["Amount",     exc.amount ? `$${exc.amount.toLocaleString()}` : "—"],
                    ["Created",    new Date(exc.createdAt).toLocaleString()],
                    exc.resolvedAt ? ["Resolved", new Date(exc.resolvedAt).toLocaleString()] : null,
                  ].filter(Boolean).map(row => {
                    const [k, v] = row as [string, string];
                    return (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#64748b", fontWeight: 600 }}>{k}</span>
                        <span style={{ color: "#0f172a", fontWeight: 700 }}>{v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {exc.status !== "Resolved" && exc.status !== "Waived" && (
                <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <button onClick={() => setExcStatus(exc.id, "Investigating")} style={{ padding: "10px 0", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#d97706", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Investigate</button>
                    <button onClick={() => { setExcStatus(exc.id, "Resolved"); setSelected(null); }} style={{ padding: "10px 0", borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Resolve</button>
                    <button onClick={() => { setExcStatus(exc.id, "Waived"); setSelected(null); }} style={{ padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Waive</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
