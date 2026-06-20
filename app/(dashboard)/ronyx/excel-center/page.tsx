"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type StoredFile = {
  id:             string;
  file_name:      string;
  storage_path:   string;
  file_size_bytes: number | null;
  data_type:      string;
  description:    string | null;
  created_at:     string;
};

type ExportCard = {
  type:     string;
  label:    string;
  icon:     string;
  desc:     string;
  color:    string;
  hasRange: boolean;
};

const EXPORTS: ExportCard[] = [
  { type: "tickets",         label: "Tickets",         icon: "🎫", desc: "All tickets with driver, truck, material, load/dump site, quantity, amount, and status", color: "#1d4ed8", hasRange: true  },
  { type: "drivers",         label: "Drivers",         icon: "👤", desc: "Full driver roster — CDL info, status, hire dates, contact details", color: "#059669",  hasRange: false },
  { type: "trucks",          label: "Fleet / Trucks",  icon: "🚛", desc: "All trucks with VIN, plates, type, payload capacity, and status", color: "#7c3aed",  hasRange: false },
  { type: "owner-operators", label: "Owner Operators", icon: "🤝", desc: "All OO companies with contact info, MC/DOT numbers, EIN, and status", color: "#b45309", hasRange: false },
  { type: "payroll",         label: "Payroll",         icon: "💰", desc: "Driver pay records — loads, tons, gross/net pay, deductions, payment method", color: "#0369a1", hasRange: true  },
  { type: "customers",       label: "Customers",       icon: "🏢", desc: "Customer company list with contact info and billing addresses", color: "#be185d",  hasRange: false },
];

const DATA_TYPE_OPTIONS = [
  { value: "tickets",         label: "Tickets"         },
  { value: "drivers",         label: "Drivers"         },
  { value: "trucks",          label: "Fleet / Trucks"  },
  { value: "owner_operators", label: "Owner Operators" },
  { value: "payroll",         label: "Payroll"         },
  { value: "customers",       label: "Customers"       },
  { value: "dispatch",        label: "Dispatch / Loads"},
  { value: "custom",          label: "Other / Custom"  },
];

function fmtBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024)       return `${b} B`;
  if (b < 1024*1024)  return `${(b/1024).toFixed(1)} KB`;
  return `${(b/(1024*1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Chicago",
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ExcelCenterPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dateRange, setDateRange]     = useState<Record<string, { from: string; to: string }>>({});
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadType, setUploadType]   = useState("custom");
  const [uploadDesc, setUploadDesc]   = useState("");
  const [toast, setToast]             = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const loadFiles = useCallback(() => {
    setFilesLoading(true);
    fetch("/api/ronyx/excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) })
      .then(r => r.json())
      .then(d => setStoredFiles(d.files || []))
      .catch(() => {})
      .finally(() => setFilesLoading(false));
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function download(card: ExportCard) {
    setDownloading(card.type);
    try {
      const r = dateRange[card.type] || { from: "", to: "" };
      const params = new URLSearchParams({ type: card.type });
      if (r.from) params.set("from", r.from);
      if (r.to)   params.set("to",   r.to);

      const res = await fetch(`/api/ronyx/excel?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`❌ ${err.error || "Download failed"}`);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${card.type}_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`✅ ${card.label} Excel downloaded — data is current as of right now`);
    } catch {
      showToast("❌ Download failed — check your connection");
    } finally {
      setDownloading(null);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("data_type", uploadType);
      form.append("description", uploadDesc);
      const res = await fetch("/api/ronyx/excel/upload", { method: "POST", body: form });
      const d   = await res.json();
      if (d.file) {
        showToast(`✅ "${file.name}" saved to your Excel library`);
        setUploadDesc("");
        loadFiles();
      } else {
        showToast(`❌ ${d.error || "Upload failed"}`);
      }
    } catch {
      showToast("❌ Upload failed — check your connection");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteFile(file: StoredFile) {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return;
    setDeleting(file.id);
    try {
      const res = await fetch("/api/ronyx/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: file.id }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`🗑️ "${file.file_name}" deleted`);
        setStoredFiles(prev => prev.filter(f => f.id !== file.id));
      } else {
        showToast(`❌ ${d.error || "Delete failed"}`);
      }
    } catch {
      showToast("❌ Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const inpS: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0",
    fontSize: "0.82rem", background: "#f8fafc", color: "#0f172a",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "Inter, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: "#0f172a", color: "#fff", padding: "12px 20px",
          borderRadius: 10, fontSize: "0.88rem", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: 380,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: "1.6rem" }}>📊</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
              Excel Sync Center™
            </h1>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#64748b", marginTop: 2 }}>
              Every export reflects <strong>live data right now</strong> — download anytime to get a current Excel sheet.
              You can also upload and store your own Excel files here for safekeeping.
            </p>
          </div>
        </div>
      </div>

      {/* Live Exports Section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: "1.1rem" }}>⚡</span>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
            Live Excel Exports
          </h2>
          <span style={{
            background: "#dcfce7", color: "#166534", fontSize: "0.7rem",
            fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          }}>
            Always Current
          </span>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "0.81rem", color: "#64748b" }}>
          Click any card to download a formatted Excel file generated from your live system data at this exact moment.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
          {EXPORTS.map(card => {
            const r    = dateRange[card.type] || { from: "", to: "" };
            const busy = downloading === card.type;
            return (
              <div key={card.type} style={{
                background: "#fff", border: "1.5px solid #e2e8f0",
                borderRadius: 14, padding: "18px 20px",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: card.color + "15",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{card.label}</div>
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                </div>

                {card.hasRange && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", marginBottom: 3 }}>FROM (optional)</div>
                      <input
                        type="date"
                        value={r.from}
                        onChange={e => setDateRange(prev => ({ ...prev, [card.type]: { ...r, from: e.target.value } }))}
                        style={inpS}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", marginBottom: 3 }}>TO (optional)</div>
                      <input
                        type="date"
                        value={r.to}
                        onChange={e => setDateRange(prev => ({ ...prev, [card.type]: { ...r, to: e.target.value } }))}
                        style={inpS}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => download(card)}
                  disabled={busy}
                  style={{
                    padding: "9px 0", borderRadius: 9, border: "none",
                    background: busy ? "#94a3b8" : card.color,
                    color: "#fff", fontWeight: 700, fontSize: "0.84rem",
                    cursor: busy ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    transition: "opacity 150ms",
                  }}
                >
                  {busy ? (
                    <>⏳ Generating…</>
                  ) : (
                    <>📥 Download Current Excel</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload & Store Section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: "1.1rem" }}>📁</span>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
            Your Stored Excel Files
          </h2>
          <span style={{
            background: "#f0f9ff", color: "#0369a1", fontSize: "0.7rem",
            fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          }}>
            Secure Storage
          </span>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "0.81rem", color: "#64748b" }}>
          Upload any Excel file (.xlsx, .xls) or CSV to keep it stored here — templates, historical sheets, or files from other sources.
        </p>

        {/* Upload box */}
        <div style={{
          background: "#f8fafc", border: "2px dashed #cbd5e1",
          borderRadius: 14, padding: "24px 24px 20px",
          marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>WHAT TYPE OF DATA?</div>
              <select value={uploadType} onChange={e => setUploadType(e.target.value)} style={inpS}>
                {DATA_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>DESCRIPTION (optional)</div>
              <input
                type="text"
                value={uploadDesc}
                onChange={e => setUploadDesc(e.target.value)}
                placeholder="e.g. Q1 2024 payroll backup"
                style={inpS}
              />
            </div>
            <div>
              <input
                type="file"
                ref={fileRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={upload}
                disabled={uploading}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: uploading ? "#94a3b8" : "#0f172a",
                  color: "#fff", fontWeight: 700, fontSize: "0.84rem",
                  cursor: uploading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", height: 36,
                }}
              >
                {uploading ? "Uploading…" : "📎 Upload File"}
              </button>
            </div>
          </div>
          <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 10 }}>
            Accepted: .xlsx, .xls, .csv — Max 25 MB — Files are stored privately, only visible to your account
          </div>
        </div>

        {/* Stored files table */}
        {filesLoading ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Loading your files…
          </div>
        ) : storedFiles.length === 0 ? (
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 12, padding: "40px 0", textAlign: "center", color: "#94a3b8",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No files stored yet</div>
            <div style={{ fontSize: "0.8rem" }}>Upload a file above to keep it safe here.</div>
          </div>
        ) : (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["File Name", "Type", "Size", "Description", "Uploaded", ""].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontWeight: 700, color: "#374151", fontSize: "0.75rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storedFiles.map((file, i) => (
                  <tr key={file.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600 }}>
                      <span style={{ marginRight: 6 }}>
                        {file.file_name.endsWith(".csv") ? "📄" : "📊"}
                      </span>
                      {file.file_name}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        background: "#f0f9ff", color: "#0369a1",
                        fontSize: "0.72rem", fontWeight: 700,
                        padding: "2px 8px", borderRadius: 99,
                      }}>
                        {DATA_TYPE_OPTIONS.find(o => o.value === file.data_type)?.label ?? file.data_type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>
                      {fmtBytes(file.file_size_bytes)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", maxWidth: 200 }}>
                      {file.description || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {fmtDate(file.created_at)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => deleteFile(file)}
                        disabled={deleting === file.id}
                        style={{
                          padding: "5px 12px", borderRadius: 7,
                          border: "1px solid #fecaca", background: "#fff",
                          color: "#dc2626", fontSize: "0.78rem",
                          fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {deleting === file.id ? "…" : "🗑️ Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div style={{
        background: "#eff6ff", border: "1px solid #bfdbfe",
        borderRadius: 12, padding: "16px 20px",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e40af", marginBottom: 4 }}>
            How auto-sync works
          </div>
          <div style={{ fontSize: "0.8rem", color: "#1d4ed8", lineHeight: 1.6 }}>
            Every time you click <strong>Download Current Excel</strong>, the file is generated fresh from your live database — drivers, trucks, tickets, payroll, and all other data exactly as it stands right now.
            No need to manually update spreadsheets. Your data in MoveAround TMS <strong>is</strong> the source of truth, and Excel is always just one click away.
          </div>
        </div>
      </div>
    </div>
  );
}
