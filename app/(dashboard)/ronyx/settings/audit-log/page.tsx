"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditLog = {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  changed_by: string | null; change_details: any; created_at: string;
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  create:   { bg: "#dcfce7", color: "#166534" },
  update:   { bg: "#dbeafe", color: "#1e40af" },
  delete:   { bg: "#fee2e2", color: "#dc2626" },
  override: { bg: "#fef9c3", color: "#92400e" },
  login:    { bg: "#f0f9ff", color: "#0369a1" },
  export:   { bg: "#f5f3ff", color: "#6d28d9" },
};

function getColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : { bg: "#f1f5f9", color: "#475569" };
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [limit, setLimit]     = useState(50);

  function load(lim: number) {
    setLoading(true);
    fetch(`/api/ronyx/settings/audit?limit=${lim}`).then(r => r.json()).then(d => setLogs(d.logs ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(50); }, []);

  const displayed = filter
    ? logs.filter(l =>
        l.action?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity_type?.toLowerCase().includes(filter.toLowerCase()) ||
        l.changed_by?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Audit Log</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Audit Log</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
            Full history of admin changes, overrides, exports, and user actions.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by action, type, or user…"
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, width: 240 }} />
          <button onClick={() => { setLimit(l => l + 50); load(limit + 50); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Load More
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No audit events yet</div>
          <div style={{ fontSize: 13 }}>Audit events are recorded when staff change settings, approve overrides, or export data.</div>
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <colgroup>
              <col style={{ width: 160 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 140 }} />
              <col />
            </colgroup>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Timestamp","Action","Entity Type","Changed By","Details"].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((log, i) => {
                const { bg, color } = getColor(log.action);
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#64748b", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 5, padding: "2px 8px", whiteSpace: "nowrap" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", color: "#475569", fontSize: 11 }}>{log.entity_type || "—"}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a", fontSize: 11 }}>{log.changed_by || "System"}</td>
                    <td style={{ padding: "9px 12px", color: "#64748b", fontSize: 11, maxWidth: 320 }}>
                      {log.change_details
                        ? typeof log.change_details === "string"
                          ? log.change_details
                          : JSON.stringify(log.change_details).slice(0, 120)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
        Showing {displayed.length} of {logs.length} loaded events · <button onClick={() => { const n = limit + 50; setLimit(n); load(n); }} style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Load 50 more</button>
      </div>
    </div>
  );
}
