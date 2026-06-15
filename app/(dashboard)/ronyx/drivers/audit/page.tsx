"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  driver_created:             { label: "Driver Created",        color: "#15803d", bg: "#dcfce7" },
  driver_updated:             { label: "Driver Updated",        color: "#1d4ed8", bg: "#dbeafe" },
  driver_import_completed:    { label: "Import Completed",      color: "#7c3aed", bg: "#ede9fe" },
  compliance_alert_created:   { label: "Compliance Alert",      color: "#d97706", bg: "#fef3c7" },
  driver_backup_email_sent:   { label: "Email Sent",            color: "#0891b2", bg: "#cffafe" },
  driver_backup_email_queued: { label: "Email Queued",          color: "#64748b", bg: "#f1f5f9" },
  scan_batch_created:         { label: "Scan Batch",            color: "#475569", bg: "#f8fafc" },
  driver_document_uploaded:   { label: "Document Uploaded",     color: "#15803d", bg: "#dcfce7" },
  driver_suspended:           { label: "Driver Suspended",      color: "#dc2626", bg: "#fff1f2" },
  driver_activated:           { label: "Driver Activated",      color: "#15803d", bg: "#dcfce7" },
};

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABELS[action] ?? { label: action.replace(/_/g, " "), color: "#475569", bg: "#f1f5f9" };
  return (
    <span style={{ padding: "2px 9px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, color: cfg.color, background: cfg.bg, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

const DRIVER_ACTIONS = Object.keys(ACTION_LABELS).join(",");

export default function DriverAuditPage() {
  const [events, setEvents]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All Events");

  useEffect(() => {
    fetch("/api/ronyx/drivers/audit-log")
      .then(r => r.json())
      .then(data => setEvents(data.events || []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.description.toLowerCase().includes(q) || e.action.includes(q) || JSON.stringify(e.metadata || {}).toLowerCase().includes(q);
    const matchFilter = filter === "All Events" || e.action === filter;
    return matchSearch && matchFilter;
  });

  return (
    <main className="premium-page">
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Hero */}
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Fleet Command / Drivers / Audit Trail</p>
          <h1>Driver Audit Trail</h1>
          <p>Complete history of driver imports, compliance alerts, document uploads, and system events.</p>
        </div>
        <div className="premium-hero-actions">
          <Link href="/ronyx/drivers" className="premium-button ghost" style={{ textDecoration: "none" }}>
            ← Back to Drivers
          </Link>
          <Link href="/ronyx/drivers?tab=backup" className="premium-button dark" style={{ textDecoration: "none" }}>
            Backup Data
          </Link>
        </div>
      </section>

      {/* Drivers sub-nav breadcrumb */}
      <div style={{ display: "flex", gap: 8, padding: "0 0 20px", flexWrap: "wrap" }}>
        {[
          { label: "Command Center", href: "/ronyx/drivers" },
          { label: "Driver List",    href: "/ronyx/drivers?tab=roster" },
          { label: "Import Drivers", href: "/ronyx/drivers?tab=import" },
          { label: "Backup Data",    href: "/ronyx/drivers?tab=backup" },
          { label: "Audit Trail",    href: "/ronyx/drivers/audit" },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: "0.78rem",
              fontWeight: 600,
              textDecoration: "none",
              background: item.href === "/ronyx/drivers/audit" ? "#0f172a" : "#f1f5f9",
              color:      item.href === "/ronyx/drivers/audit" ? "#fff"     : "#475569",
              border:     item.href === "/ronyx/drivers/audit" ? "none"     : "1px solid #e2e8f0",
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events, descriptions, driver names…"
          style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.83rem", outline: "none", flex: 1, minWidth: 220 }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.83rem", outline: "none", background: "#fff" }}
        >
          <option>All Events</option>
          {Object.keys(ACTION_LABELS).map(k => (
            <option key={k} value={k}>{ACTION_LABELS[k].label}</option>
          ))}
        </select>
        <button
          onClick={() => { setSearch(""); setFilter("All Events"); }}
          style={{ padding: "8px 14px", borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="premium-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <p className="premium-eyebrow" style={{ margin: 0 }}>System Log</p>
            <h2 style={{ margin: "2px 0 0", fontSize: "0.95rem" }}>Driver Events</h2>
          </div>
          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94a3b8" }}>{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading audit trail…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            {events.length === 0
              ? "No driver events recorded yet. Import a driver list to begin."
              : "No events match your filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Timestamp", "Event", "Description", "Details"].map(h => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa", animation: "fadeInUp 0.15s ease" }}>
                    <td style={{ padding: "10px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: "0.77rem" }}>{fmtDateTime(e.created_at)}</td>
                    <td style={{ padding: "10px 16px" }}><ActionBadge action={e.action} /></td>
                    <td style={{ padding: "10px 16px", color: "#0f172a", maxWidth: 380 }}>{e.description}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(e.metadata).filter(([k]) => !["flag"].includes(k)).slice(0, 4).map(([k, v]) => (
                            <span key={k} style={{ padding: "2px 7px", borderRadius: 5, background: "#f1f5f9", color: "#475569", fontSize: "0.68rem", fontWeight: 600 }}>
                              {k.replace(/_/g," ")}: {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
