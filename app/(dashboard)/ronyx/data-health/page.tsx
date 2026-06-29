"use client";

// Data Health — spot gaps as you load data. Scans drivers, owner-operators, trucks,
// and customers for missing names/licenses and expired/missing docs.

import { useEffect, useState } from "react";

type Issue = { type: string; label: string; severity: "block" | "warn"; count: number; sample: { id: string; name: string }[] };
type Entity = { key: string; label: string; total: number; issues: Issue[]; error?: boolean };

const FIX_LINK: Record<string, { href: string; label: string }> = {
  drivers:         { href: "/ronyx/hr-compliance",   label: "Fix in HR & Compliance" },
  owner_operators: { href: "/ronyx/owner-operators",  label: "Fix in Owner-Operators" },
  trucks:          { href: "/ronyx/fleet",            label: "Fix in Fleet" },
  customers:       { href: "/ronyx/implementation",   label: "Add in Setup & Import" },
};
const ICON: Record<string, string> = { drivers: "👷", owner_operators: "🚚", trucks: "🛻", customers: "🏢" };

export default function DataHealthPage() {
  const [data, setData] = useState<{ entities: Entity[]; totalIssues: number; totalBlocks: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string>("");

  async function load() {
    setLoading(true);
    const d = await fetch("/api/ronyx/data-health").then(r => r.json()).catch(() => null);
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>🩺 Data Health</div>
          <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>Gaps to fix as you load data — missing names/licenses and expired or missing documents.</div>
        </div>
        <button onClick={load} style={ghost}>↻ Refresh</button>
      </div>

      {/* summary */}
      {data && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
          <Stat label="Total gaps" value={data.totalIssues} tone={data.totalIssues ? "#b45309" : "#16a34a"} />
          <Stat label="Hard blocks" value={data.totalBlocks} tone={data.totalBlocks ? "#b91c1c" : "#16a34a"} />
          <Stat label="Records scanned" value={data.entities.reduce((n, e) => n + e.total, 0)} tone="#334155" />
        </div>
      )}

      {loading && <div style={card}>Scanning records…</div>}

      {!loading && data && data.totalIssues === 0 && (
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", borderColor: "#86efac" }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <div style={{ fontWeight: 700, color: "#15803d" }}>All clean — no missing names, licenses, or expired documents found.</div>
        </div>
      )}

      {!loading && data && data.entities.map((e) => {
        const blocks = e.issues.filter(i => i.severity === "block").reduce((n, i) => n + i.count, 0);
        const warns = e.issues.filter(i => i.severity === "warn").reduce((n, i) => n + i.count, 0);
        const fix = FIX_LINK[e.key];
        return (
          <div key={e.key} style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{ICON[e.key] || "📋"}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{e.label}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{e.total} records</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {blocks > 0 && <Pill tone="#b91c1c" bg="#fee2e2">{blocks} blocking</Pill>}
                {warns > 0 && <Pill tone="#b45309" bg="#fef3c7">{warns} to review</Pill>}
                {e.issues.length === 0 && !e.error && <Pill tone="#15803d" bg="#dcfce7">clean ✓</Pill>}
                {e.error && <Pill tone="#64748b" bg="#f1f5f9">not available</Pill>}
              </div>
            </div>

            {e.total === 0 && !e.error && (
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10 }}>No {e.label.toLowerCase()} loaded yet.</div>
            )}

            {e.issues.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                {e.issues.map((i) => {
                  const id = `${e.key}:${i.type}`;
                  const isOpen = open === id;
                  return (
                    <div key={i.type} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <button onClick={() => setOpen(isOpen ? "" : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: i.severity === "block" ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "#334155", fontSize: 13.5, flex: 1 }}>{i.label}</span>
                        <span style={{ fontWeight: 800, color: i.severity === "block" ? "#b91c1c" : "#b45309", fontSize: 13 }}>{i.count}</span>
                        <span style={{ color: "#94a3b8", fontSize: 11, width: 14 }}>{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: "2px 0 12px 19px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {i.sample.map(s => (
                            <span key={s.id} style={{ fontSize: 12, padding: "3px 9px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, color: "#475569" }}>{s.name}</span>
                          ))}
                          {i.count > i.sample.length && <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>+{i.count - i.sample.length} more</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {e.issues.length > 0 && fix && (
              <a href={fix.href} style={{ display: "inline-block", marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 12.5, textDecoration: "none" }}>{fix.label} →</a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", minWidth: 130 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}
function Pill({ children, tone, bg }: { children: React.ReactNode; tone: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color: tone, background: bg, padding: "3px 10px", borderRadius: 999 }}>{children}</span>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 };
const ghost: React.CSSProperties = { padding: "9px 15px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" };
