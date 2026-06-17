"use client";
import { useEffect, useState, useCallback } from "react";

type ArchiveRecord = {
  id: string;
  file_name: string;
  entity_type: string;
  entity_id: string | null;
  archive_tier: "hot" | "warm" | "cold";
  archive_provider: string | null;
  file_size_bytes: number | null;
  archived_at: string | null;
  restore_status: string;
  original_path: string | null;
  created_at: string;
};

type UploadRecord = {
  id: string;
  file_name: string;
  upload_source: string;
  entity_type: string;
  file_size: number | null;
  upload_status: string;
  created_at: string;
};

type Tab = "originals" | "archive";

function fmt(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const TIER_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  hot:  { bg: "#fef3c7", color: "#92400e", label: "Hot (Active)"  },
  warm: { bg: "#eff6ff", color: "#1e40af", label: "Warm (90d+)"   },
  cold: { bg: "#f0fdf4", color: "#15803d", label: "Cold Archive"  },
};

export default function ArchiveCenterPage() {
  const [tab, setTab]               = useState<Tab>("originals");
  const [uploads, setUploads]       = useState<UploadRecord[]>([]);
  const [archives, setArchives]     = useState<ArchiveRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [filter, setFilter]         = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [uRes, aRes] = await Promise.all([
        fetch("/api/ronyx/backup/originals"),
        fetch("/api/ronyx/backup/archives"),
      ]);
      if (uRes.ok) setUploads(await uRes.json().then(d => d.uploads || []));
      if (aRes.ok) setArchives(await aRes.json().then(d => d.archives || []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredUploads = uploads.filter(u =>
    !filter || u.file_name.toLowerCase().includes(filter.toLowerCase()) ||
    u.entity_type?.toLowerCase().includes(filter.toLowerCase()) ||
    u.upload_source?.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredArchives = archives.filter(a =>
    (tierFilter === "all" || a.archive_tier === tierFilter) &&
    (!filter || a.file_name.toLowerCase().includes(filter.toLowerCase()) ||
     a.entity_type?.toLowerCase().includes(filter.toLowerCase()))
  );

  const totalHot  = archives.filter(a => a.archive_tier === "hot").length;
  const totalWarm = archives.filter(a => a.archive_tier === "warm").length;
  const totalCold = archives.filter(a => a.archive_tier === "cold").length;

  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" };
  const th: React.CSSProperties   = { padding: "8px 12px", fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };
  const td: React.CSSProperties   = { padding: "9px 12px", fontSize: "0.78rem", borderBottom: "1px solid #f8fafc", verticalAlign: "middle" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Ronyx · Backup Vault</div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Archive Center</h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>All original uploads and archived files — 3-tier storage tracking</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/ronyx/admin/storage-health" style={{ padding: "9px 18px", borderRadius: 9, background: "#f1f5f9", color: "#334155", textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
            Storage Health
          </a>
          <button onClick={load} disabled={loading} style={{ padding: "9px 18px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", marginBottom: 20, fontWeight: 600 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Original Uploads", value: uploads.length.toLocaleString(), sub: "all time",          color: "#0f172a" },
          { label: "Hot (Active)",     value: totalHot.toLocaleString(),        sub: "0–90 days",        color: "#92400e" },
          { label: "Warm",             value: totalWarm.toLocaleString(),       sub: "90d–12 months",    color: "#1e40af" },
          { label: "Cold Archive",     value: totalCold.toLocaleString(),       sub: "1–7 years (R2/B2)", color: "#15803d" },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f172a", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80" }}>3-Tier Rule:</div>
        {[
          { tier: "Tier 1 Hot",  sub: "Supabase · 0–90d",          color: "#fde68a" },
          { tier: "Tier 2 Warm", sub: "Compressed/organized · 90d–12mo", color: "#93c5fd" },
          { tier: "Tier 3 Cold", sub: "R2 / Backblaze B2 · 1–7 yrs",    color: "#a5b4fc" },
        ].map(t => (
          <div key={t.tier} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.72rem" }}>
            <span style={{ fontWeight: 700, color: t.color }}>{t.tier}</span>
            <span style={{ color: "#64748b" }}>— {t.sub}</span>
          </div>
        ))}
        <div style={{ fontSize: "0.68rem", color: "#ef4444", fontWeight: 700, marginLeft: "auto" }}>
          🛑 DB = metadata only. Files always in Storage.
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {[
          { id: "originals" as Tab, label: "Original Uploads", count: uploads.length },
          { id: "archive"   as Tab, label: "Archive Records",  count: archives.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "0.82rem",
            color: tab === t.id ? "#7c3aed" : "#64748b",
            borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t.label} <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "1px 7px", fontSize: "0.7rem", marginLeft: 4 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search file name, type…"
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem" }}
        />
        {tab === "archive" && (
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff" }}>
            <option value="all">All Tiers</option>
            <option value="hot">Hot (Active)</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold Archive</option>
          </select>
        )}
      </div>

      {tab === "originals" && (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>File Name</th>
                <th style={th}>Source</th>
                <th style={th}>Entity</th>
                <th style={th}>Size</th>
                <th style={th}>Status</th>
                <th style={th}>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>Loading…</td></tr>
              )}
              {!loading && filteredUploads.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>No original uploads found</td></tr>
              )}
              {filteredUploads.map(u => (
                <tr key={u.id} style={{ background: "#fff" }}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{u.file_name}</span></td>
                  <td style={td}><code style={{ fontSize: "0.7rem", color: "#475569" }}>{u.upload_source || "—"}</code></td>
                  <td style={td}>{u.entity_type || "—"}</td>
                  <td style={td}>{fmt(u.file_size)}</td>
                  <td style={td}>
                    <span style={{ background: u.upload_status === "uploaded" ? "#f0fdf4" : "#fef9c3", color: u.upload_status === "uploaded" ? "#15803d" : "#854d0e", borderRadius: 6, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>
                      {u.upload_status}
                    </span>
                  </td>
                  <td style={{ ...td, color: "#64748b" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "archive" && (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>File Name</th>
                <th style={th}>Entity</th>
                <th style={th}>Tier</th>
                <th style={th}>Provider</th>
                <th style={th}>Size</th>
                <th style={th}>Archived</th>
                <th style={th}>Restore</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>Loading…</td></tr>
              )}
              {!loading && filteredArchives.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>No archive records yet</div>
                    <div style={{ fontSize: "0.72rem" }}>Files older than 90 days will appear here when moved to warm or cold storage.</div>
                  </td>
                </tr>
              )}
              {filteredArchives.map(a => {
                const tier = TIER_COLORS[a.archive_tier] || TIER_COLORS.hot;
                return (
                  <tr key={a.id} style={{ background: "#fff" }}>
                    <td style={td}><span style={{ fontWeight: 600 }}>{a.file_name}</span></td>
                    <td style={td}>{a.entity_type || "—"}</td>
                    <td style={td}>
                      <span style={{ background: tier.bg, color: tier.color, borderRadius: 6, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>{tier.label}</span>
                    </td>
                    <td style={{ ...td, color: "#64748b" }}>{a.archive_provider || "supabase"}</td>
                    <td style={td}>{fmt(a.file_size_bytes)}</td>
                    <td style={{ ...td, color: "#64748b" }}>{a.archived_at ? new Date(a.archived_at).toLocaleDateString() : "—"}</td>
                    <td style={td}>
                      {a.restore_status === "not_needed"
                        ? <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>—</span>
                        : <span style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 6, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>{a.restore_status}</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 32, background: "#0f172a", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: "0.88rem", marginBottom: 14 }}>Archive Policy</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { tier: "Tier 1 — Hot", age: "0–90 days", where: "Supabase Storage", action: "All Fast Scan originals, active payroll proof", color: "#fde68a" },
            { tier: "Tier 2 — Warm", age: "90d–12 months", where: "Supabase (compressed)", action: "Closed payroll packets, matched invoices. Access within minutes.", color: "#93c5fd" },
            { tier: "Tier 3 — Cold", age: "1–7 years", where: "Cloudflare R2 / Backblaze B2", action: "Legal/audit originals. DB metadata kept for search. Restore on request.", color: "#a5b4fc" },
          ].map(t => (
            <div key={t.tier} style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontWeight: 900, color: t.color, fontSize: "0.82rem", marginBottom: 4 }}>{t.tier}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: 6 }}>{t.age} · {t.where}</div>
              <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>{t.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
