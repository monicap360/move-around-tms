"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────
type OriginalUpload = {
  id:               string;
  module:           string;
  source_file_name: string;
  storage_bucket:   string;
  storage_path:     string;
  file_type:        string;
  file_size_bytes:  number;
  related_import_id?: string;
  related_table?:     string;
  uploaded_at:      string;
  is_original:      boolean;
  notes?:           string;
};

type DispatchImport = {
  id:               string;
  import_name:      string;
  source_file_name: string;
  schedule_date:    string;
  total_rows:       number;
  blocked_count:    number;
  needs_docs_count: number;
  completed_count:  number;
  created_at:       string;
};

type PayoutBatch = {
  id:               string;
  import_name:      string;
  source_file_name: string;
  project_name:     string;
  week_start:       string;
  week_end:         string;
  total_rows:       number;
  jobs_created:     number;
  grand_total:      number;
  created_at:       string;
};

// ─── Helpers ──────────────────────────────────────────────
const MODULE_COLOR: Record<string, string> = {
  dispatch:    "#2563eb",
  payout:      "#16a34a",
  fastscan:    "#d97706",
  payroll:     "#15803d",
  drivers:     "#0891b2",
  compliance:  "#dc2626",
  billing:     "#1d4ed8",
  contracts:   "#7c3aed",
  general:     "#64748b",
};

const MODULE_ICON: Record<string, string> = {
  dispatch: "📋", payout: "💰", fastscan: "⚡", payroll: "💵",
  drivers: "👤", compliance: "🛡️", billing: "🧾", contracts: "📜", general: "📄",
};

function fmtBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 };
const badge = (color: string): React.CSSProperties => ({
  display: "inline-block", padding: "3px 9px", borderRadius: 6,
  fontSize: 10, fontWeight: 800, textTransform: "uppercase",
  background: color + "18", color,
});

// ─── Export helpers ───────────────────────────────────────
function exportJSON(data: object[], name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.json`; a.click();
}

function exportCSV(rows: Record<string, any>[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines   = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))];
  const blob    = new Blob([lines.join("\n")], { type: "text/csv" });
  const a       = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.csv`; a.click();
}

// ─── Page ────────────────────────────────────────────────
export default function BackupPage() {
  const [loading,   setLoading]   = useState(true);
  const [uploads,   setUploads]   = useState<OriginalUpload[]>([]);
  const [dispatch,  setDispatch]  = useState<DispatchImport[]>([]);
  const [payout,    setPayout]    = useState<PayoutBatch[]>([]);
  const [tab,       setTab]       = useState<"files" | "dispatch" | "payout" | "guide">("files");
  const [modFilter, setModFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/ronyx/backup")
      .then((r) => r.json())
      .then((d) => {
        setUploads(d.original_uploads  || []);
        setDispatch(d.dispatch_imports || []);
        setPayout(d.payout_batches    || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const [snapshots, setSnapshots] = useState<{ name: string; sizeKB: number; created_at?: string; url: string | null }[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [snapMsg,   setSnapMsg]   = useState("");

  function loadSnapshots() {
    fetch("/api/ronyx/backup/snapshot").then((r) => r.json()).then((d) => setSnapshots(d.backups || [])).catch(() => {});
  }
  useEffect(() => { loadSnapshots(); }, []);

  async function runBackup() {
    setBackingUp(true); setSnapMsg("");
    const r = await fetch("/api/ronyx/backup/snapshot", { method: "POST" }).then((x) => x.json()).catch(() => null);
    if (r?.ok) {
      const total = Object.values(r.counts || {}).reduce((a: any, b: any) => (a as number) + (b as number), 0);
      setSnapMsg(`✓ Backup saved to Supabase — ${total} records (${r.sizeKB}KB)`);
      loadSnapshots();
    } else setSnapMsg(`Backup failed: ${r?.error || "unknown"}`);
    setBackingUp(false);
  }

  const modules     = [...new Set(uploads.map((u) => u.module))].sort();
  const filtered    = modFilter === "all" ? uploads : uploads.filter((u) => u.module === modFilter);
  const totalSize   = uploads.reduce((s, u) => s + (u.file_size_bytes || 0), 0);
  const totalPayout = payout.reduce((s, b) => s + (b.grand_total || 0), 0);

  return (
    <div className="ronyx-shell">
      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • System</p>
          <h1>Backup Center</h1>
          <p className="ronyx-muted">All original uploaded files are stored as read-only source evidence. Staff corrections only update parsed records — the original file is always preserved and downloadable.</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={() => exportCSV(uploads as any, "original_uploads_export")} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", color:"#0f172a", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Export Upload Log CSV
          </button>
          <button onClick={() => exportJSON(uploads, "original_uploads_export")} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", color:"#0f172a", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Export Upload Log JSON
          </button>
          <button onClick={runBackup} disabled={backingUp} style={{ padding:"9px 18px", borderRadius:8, border:"none", background: backingUp ? "#93c5fd" : "#1d4ed8", color:"#fff", fontWeight:800, fontSize:13, cursor: backingUp ? "default" : "pointer" }}>
            {backingUp ? "Backing up…" : "💾 Backup to Supabase"}
          </button>
        </div>
      </header>

      {/* Database snapshots → Supabase Storage */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:18, marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.95rem" }}>💾 Database Snapshots (Supabase Storage)</div>
            <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>Point-in-time Excel of drivers, owner-operators &amp; carriers — stored in the private <code>ronyx-backups</code> bucket, downloadable below.</div>
          </div>
          {snapMsg && <div style={{ fontSize:12, fontWeight:700, color: snapMsg.startsWith("✓") ? "#15803d" : "#b91c1c" }}>{snapMsg}</div>}
        </div>
        {snapshots.length === 0 ? (
          <div style={{ color:"#94a3b8", fontSize:13, marginTop:12 }}>No snapshots yet — click <strong>Backup to Supabase</strong> above to create one.</div>
        ) : (
          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:4 }}>
            {snapshots.slice(0, 10).map((s) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderTop:"1px solid #f1f5f9", fontSize:13 }}>
                <span style={{ flex:1, color:"#334155", fontWeight:600 }}>{s.name}</span>
                <span style={{ color:"#94a3b8" }}>{s.sizeKB}KB</span>
                {s.url && <a href={s.url} style={{ padding:"4px 12px", borderRadius:6, background:"#1d4ed8", color:"#fff", fontWeight:700, fontSize:11, textDecoration:"none" }}>Download</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12, marginBottom:24 }}>
        {[
          { label:"Original Files",    value: uploads.length,             color:"#2563eb" },
          { label:"Storage Used",      value: fmtBytes(totalSize),        color:"#0d9488" },
          { label:"Dispatch Imports",  value: dispatch.length,            color:"#7c3aed" },
          { label:"Payout Batches",    value: payout.length,              color:"#16a34a" },
          { label:"Total Payout $",    value: `$${totalPayout.toLocaleString(undefined,{minimumFractionDigits:0})}`, color:"#15803d" },
          { label:"Modules Tracked",   value: modules.length,             color:"#64748b" },
        ].map((s) => (
          <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { key:"files",    label:"🔒 Original Files" },
          { key:"dispatch", label:"📋 Dispatch Imports" },
          { key:"payout",   label:"💰 Payout Imports" },
          { key:"guide",    label:"📖 Upload Rules" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e2e8f0", fontWeight:700, fontSize:13, cursor:"pointer", background: tab === t.key ? "#0f172a" : "#fff", color: tab === t.key ? "#fff" : "#475569" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color:"#94a3b8", fontSize:13, padding:"40px 0", textAlign:"center" }}>Loading backup data…</div>}

      {/* ── Original Files tab ── */}
      {!loading && tab === "files" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button onClick={() => setModFilter("all")} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid #e2e8f0", background: modFilter==="all" ? "#0f172a" : "#fff", color: modFilter==="all" ? "#fff" : "#64748b", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              All ({uploads.length})
            </button>
            {modules.map((m) => (
              <button key={m} onClick={() => setModFilter(m)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid #e2e8f0", background: modFilter===m ? MODULE_COLOR[m]||"#64748b" : "#fff", color: modFilter===m ? "#fff" : "#64748b", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {MODULE_ICON[m] || "📄"} {m} ({uploads.filter((u) => u.module===m).length})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:"48px 24px", color:"#94a3b8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
              <div style={{ fontWeight:700, fontSize:"1rem", color:"#475569", marginBottom:8 }}>No original files stored yet</div>
              <div style={{ fontSize:13 }}>Original files appear here when you upload CSVs, PDFs, or documents via Smart Import, Dispatch Import, or any upload page.</div>
            </div>
          ) : (
            <div style={{ ...card, padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    {["Module","File Name","Type","Size","Uploaded","Linked To","Actions"].map((h) => (
                      <th key={h} style={{ padding:"10px 12px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={badge(MODULE_COLOR[u.module] || "#64748b")}>
                          {MODULE_ICON[u.module] || "📄"} {u.module}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:600, color:"#0f172a", maxWidth:260 }}>
                        <div style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.source_file_name}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{u.storage_path}</div>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#64748b", fontSize:11, textTransform:"uppercase", fontWeight:700 }}>{u.file_type || "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#475569" }}>{fmtBytes(u.file_size_bytes)}</td>
                      <td style={{ padding:"9px 12px", color:"#64748b", whiteSpace:"nowrap" }}>{fmtDate(u.uploaded_at)}</td>
                      <td style={{ padding:"9px 12px", color:"#475569", fontSize:11 }}>
                        {u.related_table ? (
                          <span style={{ background:"#f1f5f9", borderRadius:5, padding:"2px 7px" }}>
                            {u.related_table.replace(/_/g," ")}
                          </span>
                        ) : <span style={{ color:"#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding:"9px 12px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          {u.storage_path && u.storage_bucket !== "unavailable" && (
                            <a href={`/api/ronyx/backup/download?path=${encodeURIComponent(u.storage_path)}&bucket=${encodeURIComponent(u.storage_bucket)}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ padding:"5px 10px", borderRadius:6, background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", fontSize:11, fontWeight:700, textDecoration:"none" }}>
                              Download Original
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Dispatch Imports tab ── */}
      {!loading && tab === "dispatch" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:12 }}>
            <button onClick={() => exportCSV(dispatch as any, "dispatch_imports_export")} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", color:"#0f172a", fontWeight:700, fontSize:12, cursor:"pointer" }}>Export CSV</button>
            <button onClick={() => exportJSON(dispatch, "dispatch_imports_export")} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", color:"#0f172a", fontWeight:700, fontSize:12, cursor:"pointer" }}>Export JSON</button>
          </div>
          {dispatch.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:"48px", color:"#94a3b8" }}>No dispatch imports yet. Upload a schedule at <strong>Dispatch → Daily Dispatch Import</strong>.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {dispatch.map((d) => (
                <div key={d.id} style={{ ...card, marginBottom:0, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:"0.95rem", color:"#0f172a" }}>{d.import_name}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
                      📋 {d.total_rows} jobs &nbsp;·&nbsp;
                      {d.blocked_count > 0 && <span style={{ color:"#dc2626", fontWeight:700 }}>🚨 {d.blocked_count} blocked &nbsp;·&nbsp;</span>}
                      {d.needs_docs_count > 0 && <span style={{ color:"#ea580c" }}>⚠ {d.needs_docs_count} needs docs &nbsp;·&nbsp;</span>}
                      ✅ {d.completed_count} completed &nbsp;·&nbsp;
                      {fmtDate(d.created_at)}
                    </div>
                    {d.source_file_name && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>📄 {d.source_file_name}</div>}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <a href={`/ronyx/dispatch/daily-import`} style={{ padding:"7px 14px", borderRadius:7, background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", fontSize:12, fontWeight:700, textDecoration:"none" }}>View Import →</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payout Imports tab ── */}
      {!loading && tab === "payout" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:12 }}>
            <button onClick={() => exportCSV(payout as any, "payout_batches_export")} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", color:"#0f172a", fontWeight:700, fontSize:12, cursor:"pointer" }}>Export CSV</button>
          </div>
          {payout.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:"48px", color:"#94a3b8" }}>No payout imports yet. Upload a payout sheet at <strong>Smart Import</strong>.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {payout.map((b) => (
                <div key={b.id} style={{ ...card, marginBottom:0, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:"0.95rem", color:"#0f172a" }}>{b.import_name}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
                      📦 {b.total_rows} rows &nbsp;·&nbsp; ✅ {b.jobs_created} jobs imported &nbsp;·&nbsp;
                      💰 <strong>${Number(b.grand_total || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</strong> &nbsp;·&nbsp;
                      {b.week_start && `${b.week_start} – ${b.week_end}`} &nbsp;·&nbsp;
                      {fmtDate(b.created_at)}
                    </div>
                    {b.source_file_name && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>📄 {b.source_file_name}</div>}
                  </div>
                  <a href="/ronyx/import" style={{ padding:"7px 14px", borderRadius:7, background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#16a34a", fontSize:12, fontWeight:700, textDecoration:"none" }}>View Payout →</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Upload Rules guide ── */}
      {tab === "guide" && (
        <div style={{ ...card }}>
          <h2 style={{ margin:"0 0 16px", fontSize:"1rem", color:"#0f172a" }}>Upload Safety Rules</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[
              { step:"1", text:"Staff uploads CSV, Excel, PDF, or image file." },
              { step:"2", text:"System saves original file to Supabase Storage immediately — before any parsing." },
              { step:"3", text:"System creates a record in original_uploads with the file name, size, module, and upload timestamp." },
              { step:"4", text:"System parses rows and inserts them into import tables. Every row stores raw_row JSON." },
              { step:"5", text:"Staff corrections only update parsed database rows. The original file is never changed." },
              { step:"6", text:"Even if an import batch is deleted, the original file record in original_uploads is preserved." },
              { step:"7", text:"Staff can always download the original file from Backup Center." },
              { step:"8", text:"Duplicate rows are detected by truck number + date + OO ID — re-importing the same file skips duplicates." },
              { step:"9", text:"When applying W-9 or contract data to an OO, only empty fields are filled in — existing data is never overwritten." },
            ].map((r) => (
              <div key={r.step} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"10px 14px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:"#0f172a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{r.step}</div>
                <div style={{ fontSize:13, color:"#0f172a", paddingTop:3 }}>{r.text}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:20, padding:"14px 16px", background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#92400e", marginBottom:4 }}>Supabase Storage Bucket Required</div>
            <div style={{ fontSize:12, color:"#78350f" }}>
              Create a public storage bucket called <strong>ronyx-original-uploads</strong> in the Supabase dashboard under Storage. Set it to public or create signed URL policies for download access.
              Folder structure: <code>dispatch/</code> &nbsp;|&nbsp; <code>payout/</code> &nbsp;|&nbsp; <code>fastscan/</code> &nbsp;|&nbsp; <code>compliance/</code> &nbsp;|&nbsp; <code>contracts/</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
