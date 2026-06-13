"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  assigned_truck_number: string | null;
  license_number: string | null;
  mvr_expiration: string | null;
  medical_card_expiration: string | null;
  license_expiration_date: string | null;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function expiryBadge(dateStr: string | null) {
  const days = daysUntil(dateStr);
  if (days === null) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (days < 0)
    return (
      <span style={{ color: "#dc2626", fontWeight: 700 }}>
        {dateStr} <span style={{ fontSize: "0.75rem" }}>EXPIRED</span>
      </span>
    );
  if (days <= 30)
    return (
      <span style={{ color: "#d97706", fontWeight: 700 }}>
        {dateStr} <span style={{ fontSize: "0.75rem" }}>({days}d)</span>
      </span>
    );
  return <span style={{ color: "#15803d" }}>{dateStr}</span>;
}

function statusChip(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    active:    { bg: "#dcfce7", text: "#15803d" },
    inactive:  { bg: "#f1f5f9", text: "#64748b" },
    suspended: { bg: "#fee2e2", text: "#dc2626" },
  };
  const s = map[status] ?? map.inactive;
  return (
    <span style={{ background: s.bg, color: s.text, padding: "2px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

const PAGE_SIZE = 25;

export default function DriversListPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [docsFilter, setDocsFilter] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/ronyx/drivers/list")
      .then((r) => r.json())
      .then((d) => setDrivers(d.drivers || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = drivers;

    if (statusFilter !== "all") {
      list = list.filter((d) => d.status === statusFilter);
    }

    if (docsFilter === "expiring") {
      list = list.filter((d) => {
        const days = [
          daysUntil(d.mvr_expiration),
          daysUntil(d.medical_card_expiration),
          daysUntil(d.license_expiration_date),
        ];
        return days.some((n) => n !== null && n <= 30);
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(q) ||
          d.phone?.includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.license_number?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [drivers, search, statusFilter, docsFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>Drivers</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
            {loading ? "Loading…" : `${filtered.length} driver${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/ronyx/drivers/new" style={addBtnStyle}>+ Add Driver</Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search name, phone, email, license…"
          style={{ flex: "1 1 260px", padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none" }}
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={docsFilter} onChange={(e) => { setDocsFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="all">All Docs</option>
          <option value="expiring">Expiring ≤ 30 days</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading drivers…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          {drivers.length === 0 ? (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👤</div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#475569", fontSize: "1rem" }}>No drivers yet</div>
              <Link href="/ronyx/drivers/new" style={{ color: "#1e40af", fontWeight: 600 }}>Add your first driver →</Link>
            </>
          ) : (
            <div>No drivers match the current filters. <button onClick={() => { setSearch(""); setStatusFilter("all"); setDocsFilter("all"); }} style={{ color: "#1e40af", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "inherit" }}>Clear filters</button></div>
          )}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={th}>Name</th>
                  <th style={th}>Status</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Truck</th>
                  <th style={th}>Active Load</th>
                  <th style={th}>MVR Expiry</th>
                  <th style={th}>Medical Card</th>
                  <th style={th}>CDL Expiry</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((driver, i) => (
                  <tr
                    key={driver.id}
                    style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                  >
                    <td style={td}>
                      <Link href={`/ronyx/drivers/${driver.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                        {driver.full_name || "—"}
                      </Link>
                      {driver.email && <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>{driver.email}</div>}
                    </td>
                    <td style={td}>{statusChip(driver.status || "active")}</td>
                    <td style={td}>{driver.phone || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}>
                      {driver.assigned_truck_number
                        ? <span style={{ fontWeight: 600, color: "#0f172a" }}>{driver.assigned_truck_number}</span>
                        : <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>Unassigned</span>}
                    </td>
                    <td style={td}><span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>None</span></td>
                    <td style={td}>{expiryBadge(driver.mvr_expiration)}</td>
                    <td style={td}>{expiryBadge(driver.medical_card_expiration)}</td>
                    <td style={td}>{expiryBadge(driver.license_expiration_date)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/ronyx/drivers/${driver.id}`} style={actionBtn}>View</Link>
                        <Link href={`/ronyx/drivers/${driver.id}?tab=documents`} style={{ ...actionBtn, color: "#475569" }}>Docs</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9", fontSize: "0.82rem", color: "#64748b" }}>
              <span>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ ...paginBtn, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)} style={{ ...paginBtn, background: i === page ? "#1e40af" : "#fff", color: i === page ? "#fff" : "#475569" }}>{i + 1}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ ...paginBtn, opacity: page === totalPages - 1 ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "11px 14px", verticalAlign: "middle" };
const addBtnStyle: React.CSSProperties = {
  background: "#1e40af",
  color: "#fff",
  padding: "9px 20px",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.85rem",
  textDecoration: "none",
  display: "inline-block",
};
const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: "0.85rem",
  background: "#fff",
  outline: "none",
};
const actionBtn: React.CSSProperties = {
  padding: "4px 10px",
  background: "#eff6ff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#1e40af",
  textDecoration: "none",
  cursor: "pointer",
  display: "inline-block",
};
const paginBtn: React.CSSProperties = {
  padding: "5px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 500,
};
