"use client";
import { useEffect, useState, useCallback } from "react";

type BucketStat = { name: string; label: string; file_count: number; total_bytes: number; old_files?: number; large_files?: number; exists: boolean };
type TableStat  = { table: string; label: string; count: number };
type Warning    = { level: string; message: string };
type HealthData = {
  storage: { total_bytes: number; total_files: number; old_files_90d: number; large_files_5mb: number; limit_bytes: number; used_pct: number; buckets: BucketStat[] };
  database: { total_rows: number; est_size_bytes: number; limit_bytes: number; used_pct: number; tables: TableStat[] };
  cost: { est_monthly_usd: number; plan: string; overage_gb: number };
  warnings: Warning[];
  generated_at: string;
};

function fmt(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

function UsageBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 95 ? "#dc2626" : pct >= 85 ? "#ea580c" : pct >= 70 ? "#d97706" : "#16a34a";
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#475569", marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 10, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: Math.min(pct, 100) + "%", height: "100%", background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export default function StorageHealthPage() {
  const [data, setData]               = useState<HealthData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ronyx/admin/storage-health");
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
      setLastRefresh(new Date());
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px" };
  const dark: React.CSSProperties = { background: "#0f172a", borderRadius: 14, padding: "20px 24px" };
  const lbl:  React.CSSProperties = { fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 };

  const warnStyle = (level: string) => {
    const map: Record<string, { bg: string; color: string; border: string; icon: string }> = {
      block:    { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: "🛑" },
      critical: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", icon: "🔴" },
      warning:  { bg: "#fefce8", color: "#854d0e", border: "#fde68a", icon: "⚠️" },
      info:     { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd", icon: "ℹ️" },
    };
    return map[level] || map.info;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1140, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Ronyx · Admin</div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Storage Health</h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>Database rows, storage buckets, cost, and archive readiness</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastRefresh && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Updated: {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading} style={{ padding: "9px 18px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <a href="/ronyx/backup/archive-center" style={{ padding: "9px 18px", borderRadius: 9, background: "#7c3aed", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
            Archive Center →
          </a>
        </div>
      </div>

      {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", marginBottom: 20, fontWeight: 600 }}>{error}</div>}
      {loading && !data && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Checking storage and database…</div>}

      {data && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {data.warnings.length === 0
              ? <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", color: "#15803d", fontWeight: 700, fontSize: "0.82rem" }}>✓ All systems healthy — no storage warnings</div>
              : data.warnings.map((w, i) => { const s = warnStyle(w.level); return (
                  <div key={i} style={{ background: s.bg, border: "1px solid " + s.border, borderRadius: 10, padding: "10px 16px", color: s.color, fontWeight: 600, fontSize: "0.82rem", display: "flex", gap: 8, alignItems: "center" }}>
                    {s.icon} {w.message}
                  </div>
                ); })
            }
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Storage Used",  value: fmt(data.storage.total_bytes),            sub: "of " + fmt(data.storage.limit_bytes),             pct: data.storage.used_pct  },
              { label: "Total Files",   value: data.storage.total_files.toLocaleString(), sub: "across all buckets",                              pct: null                   },
              { label: "Database Rows", value: data.database.total_rows.toLocaleString(), sub: "~" + fmt(data.database.est_size_bytes) + " est.", pct: data.database.used_pct },
              { label: "Est. Monthly",  value: "$" + data.cost.est_monthly_usd.toFixed(2), sub: data.cost.plan,                                  pct: null                   },
            ].map(k => {
              const p = k.pct as number | null;
              return (
                <div key={k.label} style={{ ...card, borderColor: p !== null && p >= 85 ? "#fca5a5" : p !== null && p >= 70 ? "#fde68a" : "#e2e8f0" }}>
                  <div style={lbl}>{k.label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: p !== null && p >= 85 ? "#dc2626" : p !== null && p >= 70 ? "#d97706" : "#0f172a", lineHeight: 1.1 }}>{k.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>{k.sub}</div>
                  {p !== null && <div style={{ marginTop: 10 }}><UsageBar pct={p} label="" /></div>}
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Files Over 5 MB",  value: String(data.storage.large_files_5mb),                          bad: data.storage.large_files_5mb > 0 },
              { label: "Files Over 90 Days", value: String(data.storage.old_files_90d),                          bad: data.storage.old_files_90d > 0 },
              { label: "Storage Overage",  value: data.cost.overage_gb.toFixed(2) + " GB",                      bad: data.cost.overage_gb > 0 },
              { label: "Overage Cost",     value: "$" + Math.max(0, data.cost.est_monthly_usd - 25).toFixed(2), bad: data.cost.est_monthly_usd > 25 },
            ].map(k => (
              <div key={k.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
                <div style={lbl}>{k.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: k.bad ? "#dc2626" : "#15803d" }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 16 }}>Storage Buckets</div>
              {data.storage.buckets.map(b => (
                <div key={b.name} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{b.label}</div>
                      <code style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{b.name}</code>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{fmt(b.total_bytes || 0)}</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{(b.file_count || 0).toLocaleString()} files</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: "0.68rem" }}>
                    {!b.exists && <span style={{ background: "#f1f5f9", color: "#94a3b8", padding: "2px 8px", borderRadius: 8 }}>Empty / not found</span>}
                    {b.exists && (b.old_files || 0) > 0 && <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{b.old_files} over 90 days</span>}
                    {b.exists && (b.large_files || 0) > 0 && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{b.large_files} over 5 MB</span>}
                    {b.exists && !(b.old_files) && !(b.large_files) && <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>✓ Clean</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 16 }}>Database Tables</div>
              {data.database.tables.map(t => (
                <div key={t.table} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{t.label}</div>
                    <code style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{t.table}</code>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{t.count.toLocaleString()} <span style={{ fontWeight: 400, fontSize: "0.68rem", color: "#64748b" }}>rows</span></div>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <UsageBar pct={data.database.used_pct} label={"Est. DB: " + fmt(data.database.est_size_bytes) + " / " + fmt(data.database.limit_bytes)} />
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 4 }}>* Estimated at 8 KB/row. Actual size varies.</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div style={dark}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#4ade80", marginBottom: 14 }}>3-Tier Storage Plan</div>
              {[
                { tier: "Tier 1 — Hot",  sub: "Supabase Storage",          desc: "0–90 days. Fast Scan tickets, CCB docs, active payroll proof.", color: "#4ade80" },
                { tier: "Tier 2 — Warm", sub: "Compressed / organized",    desc: "90d–12mo. Closed payroll packets, matched billing.",            color: "#60a5fa" },
                { tier: "Tier 3 — Cold", sub: "Cloudflare R2 / Backblaze", desc: "1–7 years. Audit originals. DB metadata kept for search.",      color: "#a78bfa" },
              ].map(t => (
                <div key={t.tier} style={{ background: "#1e293b", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: 900, fontSize: "0.82rem", color: t.color }}>{t.tier}</span>
                    <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{t.sub}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.desc}</div>
                </div>
              ))}
            </div>

            <div style={dark}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#fde68a", marginBottom: 14 }}>Upload Safety Thresholds</div>
              {[
                { pct: "Under 70%", label: "Normal",   desc: "All uploads allowed",         bg: "#14532d", color: "#4ade80" },
                { pct: "70%+",      label: "Warning",  desc: "Monitor — plan ahead",        bg: "#713f12", color: "#fde68a" },
                { pct: "85%+",      label: "Critical", desc: "Archive old files urgently",  bg: "#7c2d12", color: "#fb923c" },
                { pct: "95%+",      label: "Block",    desc: "Large batch uploads blocked", bg: "#7f1d1d", color: "#f87171" },
              ].map(r => (
                <div key={r.pct} style={{ background: r.bg, borderRadius: 8, padding: "9px 12px", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 900, color: r.color, fontSize: "0.88rem", minWidth: 60 }}>{r.pct}</span>
                  <span style={{ fontWeight: 700, color: r.color, fontSize: "0.72rem" }}>{r.label}</span>
                  <span style={{ fontSize: "0.68rem", color: "#cbd5e1" }}>— {r.desc}</span>
                </div>
              ))}
              <div style={{ background: "#dc2626", borderRadius: 8, padding: "8px 12px", fontSize: "0.72rem", fontWeight: 700, color: "#fff", marginTop: 12 }}>
                🛑 If original file upload fails → STOP. Never OCR without saved proof.
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "right" }}>
            Generated: {new Date(data.generated_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
