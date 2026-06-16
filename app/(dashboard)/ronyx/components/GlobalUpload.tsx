"use client";

import { useCallback, useRef, useState } from "react";

export type UploadResult = {
  ok:           boolean;
  upload_id:    string | null;
  path:         string | null;
  bucket:       string | null;
  url:          string | null;
  module:       string;
  file_name:    string;
  file_type:    string;
  storage_ok:   boolean;
  db_tracked:   boolean;
  routing_hint: string;
  error?:       string;
};

type Props = {
  // Called immediately after the file is stored — before any parsing/routing
  onUploaded?: (result: UploadResult, file: File) => void;
  // Optional: restrict to specific module (overrides auto-detect)
  module?: string;
  // Optional: link to a specific OO
  ooId?: string;
  // UI options
  compact?: boolean;
  label?:   string;
  accept?:  string;
};

const ROUTING_LABELS: Record<string, { label: string; icon: string; color: string; href: string }> = {
  "dispatch-import":    { label: "Dispatch Guard Import",     icon: "📋", color: "#2563eb", href: "/ronyx/dispatch/daily-import" },
  "payout-import":      { label: "Payout Import",             icon: "💰", color: "#16a34a", href: "/ronyx/import" },
  "oo-w9":              { label: "OO W-9 Document",           icon: "📋", color: "#6366f1", href: "/ronyx/owner-operators" },
  "oo-compliance-doc":  { label: "OO Compliance Document",    icon: "🛡️", color: "#dc2626", href: "/ronyx/owner-operators" },
  "oo-contract":        { label: "OO Subhauler Contract",     icon: "📜", color: "#7c3aed", href: "/ronyx/owner-operators" },
  "ticket-scan":        { label: "Ticket / Fast Scan",        icon: "⚡", color: "#d97706", href: "/ronyx/tickets?tab=fastscan" },
  "driver-doc":         { label: "Driver Document",           icon: "👤", color: "#0891b2", href: "/ronyx/drivers" },
  "general":            { label: "General File",              icon: "📄", color: "#64748b", href: "/ronyx/backup" },
};

export default function GlobalUpload({ onUploaded, module: moduleProp, ooId, compact, label, accept }: Props) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,   setResult]     = useState<UploadResult | null>(null);
  const [error,    setError]      = useState<string | null>(null);

  const doUpload = useCallback(async (file: File) => {
    setUploading(true);
    setResult(null);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    if (moduleProp) fd.append("module", moduleProp);
    if (ooId)       fd.append("oo_id",  ooId);

    try {
      const res  = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
      const data = await res.json() as UploadResult;
      data.file_name = file.name; // ensure it's set
      setResult(data);
      if (data.ok) {
        onUploaded?.(data, file);
      } else {
        setError(data.error || "Upload failed — storage may not be configured.");
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [moduleProp, ooId, onUploaded]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) doUpload(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    e.target.value = "";
  }

  const routing = result ? (ROUTING_LABELS[result.routing_hint] || ROUTING_LABELS["general"]) : null;

  if (compact) {
    return (
      <label style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:8, background:"#0f172a", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", userSelect:"none" }}>
        <span>{uploading ? "Uploading…" : (label || "📤 Upload File")}</span>
        <input type="file" accept={accept || "*"} style={{ display:"none" }} onChange={onFileChange} disabled={uploading} />
      </label>
    );
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          border:       `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`,
          borderRadius: 12,
          padding:      "28px 20px",
          textAlign:    "center",
          background:   dragging ? "#eff6ff" : "#f8fafc",
          cursor:       uploading ? "default" : "pointer",
          transition:   "all 150ms",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          {uploading ? "⏳" : dragging ? "📂" : "📤"}
        </div>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>
          {uploading ? "Storing file…" : label || "Drop any file or click to upload"}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          CSV, PDF, Excel, Word, images — all types supported
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={accept || "*"}
          style={{ display: "none" }}
          onChange={onFileChange}
          disabled={uploading}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
          ❌ {error}
          <div style={{ fontWeight: 400, marginTop: 4, fontSize: 12 }}>
            Make sure the <strong>ronyx-imports</strong> storage bucket exists in Supabase → Storage → New Bucket.
          </div>
        </div>
      )}

      {/* Success result */}
      {result?.ok && routing && (
        <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, color: "#166534", fontSize: 14, marginBottom: 3 }}>
                🔒 {result.file_name} preserved
              </div>
              <div style={{ fontSize: 12, color: "#4ade80" }}>
                Stored in <strong>{result.bucket}</strong> · {result.db_tracked ? "Tracked in Backup Center" : "Storage only"}
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: routing.color + "18", color: routing.color, padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                  {routing.icon} {routing.label}
                </span>
              </div>
            </div>
            <a href={routing.href} style={{ padding: "8px 16px", borderRadius: 8, background: "#166534", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              Go to {routing.label.split(" ")[0]} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
