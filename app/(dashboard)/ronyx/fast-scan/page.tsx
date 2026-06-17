"use client";

import { useEffect, useRef, useState } from "react";

const SCAN_TYPES = [
  { value: "trip_proof",    label: "Trip Proof",          icon: "📋", color: "#16a34a", bg: "#f0fdf4" },
  { value: "fuel",          label: "Fuel / Toll",         icon: "⛽", color: "#2563eb", bg: "#eff6ff" },
  { value: "receipt",       label: "Receipt / Expense",   icon: "🧾", color: "#7c3aed", bg: "#f5f3ff" },
  { value: "damage",        label: "Damage Report",       icon: "⚠️",  color: "#dc2626", bg: "#fef2f2" },
  { value: "incident",      label: "Incident Report",     icon: "🚨", color: "#ea580c", bg: "#fff7ed" },
  { value: "complaint",     label: "Customer Complaint",  icon: "💬", color: "#d97706", bg: "#fffbeb" },
  { value: "no_show",       label: "No-Show",             icon: "🚫", color: "#6b7280", bg: "#f9fafb" },
  { value: "missing_proof", label: "Missing Proof",       icon: "❓", color: "#0891b2", bg: "#ecfeff" },
  { value: "other",         label: "Other",               icon: "📌", color: "#64748b", bg: "#f8fafc" },
];

const PAYROLL_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create:    { label: "Create Pay",    color: "#16a34a" },
  hold:      { label: "Hold",          color: "#dc2626" },
  adjust:    { label: "Adjust",        color: "#d97706" },
  reimburse: { label: "Reimburse",     color: "#7c3aed" },
  release:   { label: "Release",       color: "#2563eb" },
  none:      { label: "No Impact",     color: "#94a3b8" },
};

type ScanResult = {
  scan: any;
  ticket: any;
  payroll_item: any | null;
  payroll_action: string;
  payroll_impact: boolean;
  message: string;
};

type UploadResult = {
  document_id: string | null;
  storage_path: string;
  bucket: string;
  signed_url: string | null;
  document?: any;
  next_step?: string;
  db_warning?: string;
  ocr_skipped?: boolean;
  ocr_error?: string;
  ocr_confidence?: number;
  extraction_confidence?: number;
  extracted?: {
    ticket_number?: string | null;
    truck_number?:  string | null;
    driver_name?:   string | null;
    ticket_date?:   string | null;
    customer?:      string | null;
    material?:      string | null;
    loads?:         number | null;
    total_hours?:   number | null;
    signature?:     boolean;
  };
  ticket_id?: string | null;
  ticket_number?: string | null;
  missing_fields?: string[];
  qr_url?: string | null;
};

type Scan = any;

const S = {
  page:   { padding: 0 },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "28px 32px 24px",
    borderRadius: 14,
    marginBottom: 24,
    color: "#fff",
  },
  hTitle:  { fontSize: "1.5rem", fontWeight: 800, margin: 0 },
  hSub:    { fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 },
  card:    { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 },
  row:     { display: "flex", gap: 16, flexWrap: "wrap" as const },
  label:   { fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  input:   { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none", background: "#f8fafc" },
  btn:     { padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer" },
};

export default function FastScanPage() {
  const [scanType, setScanType]     = useState("trip_proof");
  const [driverName, setDriverName] = useState("");
  const [truckNum, setTruckNum]     = useState("");
  const [jobNum, setJobNum]         = useState("");
  const [amount, setAmount]         = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<ScanResult | null>(null);
  const [error, setError]           = useState("");
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);

  // File upload state
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploadTicketNum, setUploadTicketNum] = useState("");
  const [uploadTruck, setUploadTruck]       = useState("");
  const [uploadDriver, setUploadDriver]     = useState("");
  const [uploading, setUploading]           = useState(false);
  const [uploadResult, setUploadResult]     = useState<UploadResult | null>(null);
  const [uploadError, setUploadError]       = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function loadRecentScans() {
    // Try new pipeline table first, fall back to old table
    fetch("/api/ronyx/fast-scan/upload")
      .then(r => r.json())
      .then(d => {
        if (d.documents && d.documents.length > 0) {
          setRecentScans(d.documents.map((doc: any) => ({ ...doc, _source: "pipeline" })));
        } else {
          return fetch("/api/ronyx/fast-scan").then(r => r.json()).then(d2 => setRecentScans(d2.scans || []));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingScans(false));
  }

  useEffect(() => { loadRecentScans(); }, []);

  async function handleFileUpload() {
    if (!uploadFile) { setUploadError("Choose a file first."); return; }
    setUploadError("");
    setUploading(true);
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("scan_type", "ticket");
      if (uploadTicketNum) form.append("ticket_number", uploadTicketNum);
      if (uploadTruck)     form.append("truck_number",  uploadTruck);
      if (uploadDriver)    form.append("driver_name",   uploadDriver);

      const res = await fetch("/api/ronyx/fast-scan/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok && res.status !== 207) { setUploadError(data.error || "Upload failed."); return; }
      setUploadResult(data);
      setUploadFile(null);
      setUploadTicketNum(""); setUploadTruck(""); setUploadDriver("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadRecentScans();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }

  const selectedType = SCAN_TYPES.find(t => t.value === scanType)!;

  async function submit() {
    if (!driverName.trim() && !truckNum.trim()) {
      setError("Enter at least a driver name or truck number.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/ronyx/fast-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: `fastScan://manual/${Date.now()}`,
          file_type: "manual",
          scan_type: scanType,
          driver_name: driverName || null,
          detected_vehicle: truckNum || null,
          job_number: jobNum || null,
          detected_amount: amount ? parseFloat(amount) : null,
          extracted_text: notes || null,
          confidence_score: 1,
          uploaded_by: "dispatcher",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Submission failed."); return; }
      setResult(data);
      // refresh scans
      fetch("/api/ronyx/fast-scan").then(r => r.json()).then(d => setRecentScans(d.scans || []));
      // reset form
      setDriverName(""); setTruckNum(""); setJobNum(""); setAmount(""); setNotes("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        {/* Brand stack */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            {/* Product name */}
            <h1 style={{ ...S.hTitle, fontSize: "1.8rem", letterSpacing: "-0.02em" }}>
              Fast Scan™
            </h1>
            {/* Module tagline */}
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.02em" }}>
              Ticket OCR &nbsp;•&nbsp; Invoice Match &nbsp;•&nbsp; Payroll Verification
            </p>
            {/* Powered-by line */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Powered by
              </span>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                MoveAround TMS
              </span>
              <span style={{ fontSize: "0.62rem", color: "#64748b", fontWeight: 600 }}>
                &nbsp;·&nbsp; by Igotta Technologies
              </span>
            </div>
          </div>
          {/* Badge */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>📡</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Live</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* Left: form */}
        <div>

          {/* ── Upload Ticket Scan ───────────────────────────────── */}
          <div style={{ ...S.card, border: "2px solid #1e40af" }}>
            <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "0.85rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.1rem" }}>📡</span> Upload Ticket Scan
              <span style={{ marginLeft: "auto", fontSize: "0.65rem", fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "2px 8px" }}>PDF · JPG · PNG · HEIC · TIFF</span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setUploadFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#1e40af" : uploadFile ? "#16a34a" : "#cbd5e1"}`,
                borderRadius: 10, background: dragOver ? "#eff6ff" : uploadFile ? "#f0fdf4" : "#f8fafc",
                padding: "20px 16px", textAlign: "center", cursor: "pointer",
                transition: "all 150ms", marginBottom: 14,
              }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.bmp" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
              {uploadFile ? (
                <div>
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.82rem" }}>{uploadFile.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📄</div>
                  <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.82rem" }}>Drop ticket scan here or click to browse</div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>Max 25 MB</div>
                </div>
              )}
            </div>

            {/* Optional metadata */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                { label: "Ticket #", value: uploadTicketNum, set: setUploadTicketNum, placeholder: "e.g. 104582" },
                { label: "Truck #",  value: uploadTruck,     set: setUploadTruck,     placeholder: "e.g. 8143"  },
                { label: "Driver",   value: uploadDriver,    set: setUploadDriver,    placeholder: "e.g. J. Smith" },
              ].map(f => (
                <div key={f.label} style={{ flex: 1, minWidth: 120 }}>
                  <label style={S.label}>{f.label}</label>
                  <input style={S.input} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
                </div>
              ))}
            </div>

            {uploadError && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.78rem" }}>
                {uploadError}
              </div>
            )}

            <button onClick={handleFileUpload} disabled={uploading || !uploadFile}
              style={{ ...S.btn, background: uploadFile ? "#1e40af" : "#94a3b8", color: "#fff", opacity: uploading ? 0.7 : 1, width: "100%" }}>
              {uploading ? "Uploading…" : "📤 Upload Ticket Scan"}
            </button>

            {/* Upload result */}
            {uploadResult && (() => {
              const hasOcr    = !!uploadResult.extracted;
              const hasTicket = !!uploadResult.ticket_id;
              const hasError  = !!uploadResult.db_warning || !!uploadResult.ocr_error;
              const borderColor = hasError ? "#fde68a" : hasTicket ? "#bbf7d0" : "#bfdbfe";
              const bgColor     = hasError ? "#fffbeb"  : hasTicket ? "#f0fdf4"  : "#eff6ff";
              const headerColor = hasError ? "#b45309"  : hasTicket ? "#16a34a"  : "#1e40af";
              const headerText  = uploadResult.db_warning
                ? "⚠ Uploaded (DB record failed)"
                : uploadResult.ocr_error
                ? "⚠ Uploaded — OCR Failed"
                : uploadResult.ocr_skipped
                ? "✓ Uploaded — OCR Skipped"
                : hasTicket
                ? "✓ Ticket Created from Scan"
                : "✓ Scan Uploaded";

              return (
                <div style={{ marginTop: 14, background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 800, color: headerColor, fontSize: "0.85rem", marginBottom: 10 }}>{headerText}</div>

                  {(uploadResult.db_warning || uploadResult.ocr_error) && (
                    <div style={{ fontSize: "0.72rem", color: "#92400e", marginBottom: 10, padding: "6px 10px", background: "#fef3c7", borderRadius: 6 }}>
                      {uploadResult.db_warning || uploadResult.ocr_error}
                    </div>
                  )}

                  {/* Status grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: hasOcr ? 12 : 0 }}>
                    {[
                      ["Doc ID",     uploadResult.document_id ? `…${uploadResult.document_id.slice(-8)}` : "—"],
                      ["OCR Status", uploadResult.document?.ocr_status || (uploadResult.ocr_skipped ? "skipped" : "pending")],
                      ["Ticket #",   uploadResult.ticket_number || "—"],
                      ["Confidence", hasOcr ? `${uploadResult.ocr_confidence}%` : "—"],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ background: "#fff", borderRadius: 6, padding: "6px 10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 1 }}>{k}</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem" }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  {/* OCR extracted fields */}
                  {hasOcr && uploadResult.extracted && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Extracted Fields</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                        {[
                          ["Truck #",   uploadResult.extracted.truck_number],
                          ["Driver",    uploadResult.extracted.driver_name],
                          ["Date",      uploadResult.extracted.ticket_date],
                          ["Customer",  uploadResult.extracted.customer],
                          ["Material",  uploadResult.extracted.material],
                          ["Loads",     uploadResult.extracted.loads?.toString()],
                          ["Hours",     uploadResult.extracted.total_hours?.toString()],
                          ["Signature", uploadResult.extracted.signature ? "✓ Yes" : "✗ Missing"],
                        ].map(([k, v]) => v != null ? (
                          <div key={String(k)} style={{ background: "#fff", borderRadius: 5, padding: "5px 8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{k}</div>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.75rem", marginTop: 1 }}>{String(v)}</div>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}

                  {/* Missing fields warning */}
                  {(uploadResult.missing_fields?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: 10, padding: "7px 10px", background: "#fef3c7", borderRadius: 6, fontSize: "0.7rem", color: "#92400e" }}>
                      <strong>Missing:</strong> {uploadResult.missing_fields!.join(", ")} — routed to Reconciliation
                    </div>
                  )}

                  {uploadResult.next_step && (
                    <div style={{ marginBottom: 10, fontSize: "0.72rem", color: "#1e40af", fontWeight: 600 }}>
                      {uploadResult.next_step}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {uploadResult.signed_url && (
                      <button onClick={() => window.open(uploadResult.signed_url!, "_blank")}
                        style={{ padding: "5px 14px", background: "#eff6ff", color: "#1e40af", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                        👁 Preview File
                      </button>
                    )}
                    {uploadResult.qr_url && (
                      <button onClick={() => window.open(uploadResult.qr_url!, "_blank")}
                        style={{ padding: "5px 14px", background: "#f0fdf4", color: "#16a34a", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                        📱 QR Code
                      </button>
                    )}
                    <button onClick={() => setUploadResult(null)}
                      style={{ padding: "5px 14px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                      Upload Another
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Scan type grid */}
          <div style={S.card}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>Scan Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {SCAN_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setScanType(t.value)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 10,
                    border: scanType === t.value ? `2px solid ${t.color}` : "2px solid #e2e8f0",
                    background: scanType === t.value ? t.bg : "#f8fafc",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    transition: "all 120ms",
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: scanType === t.value ? t.color : "#64748b", lineHeight: 1.2 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div style={S.card} ref={formRef}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.07em" }}>Details</div>
            <div style={S.row}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={S.label}>Driver Name</label>
                <input style={S.input} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Truck / Unit #</label>
                <input style={S.input} value={truckNum} onChange={e => setTruckNum(e.target.value)} placeholder="e.g. 142" />
              </div>
            </div>
            <div style={{ ...S.row, marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Job / Project #</label>
                <input style={S.input} value={jobNum} onChange={e => setJobNum(e.target.value)} placeholder="e.g. MM-4421" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Amount ($)</label>
                <input style={S.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 245.00" type="number" step="0.01" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Notes / Extracted Text</label>
              <textarea
                style={{ ...S.input, height: 80, resize: "vertical", fontFamily: "inherit" }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste extracted text or add notes here…"
              />
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.82rem" }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={submit}
                disabled={submitting}
                style={{ ...S.btn, background: selectedType.color, color: "#fff", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Submitting…" : `Submit ${selectedType.icon} ${selectedType.label}`}
              </button>
            </div>
          </div>

          {/* Result card */}
          {result && (
            <div style={{ ...S.card, border: "2px solid #16a34a", background: "#f0fdf4" }}>
              <div style={{ fontWeight: 700, color: "#16a34a", marginBottom: 10 }}>✓ Scan Submitted</div>
              <div style={{ fontSize: "0.82rem", color: "#166534", marginBottom: 12 }}>{result.message}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  ["Scan ID", result.scan?.id?.slice(-8)],
                  ["Ticket ID", result.ticket?.id?.slice(-8)],
                  ["Payroll Action", (() => {
                    const a = PAYROLL_ACTION_LABELS[result.payroll_action] || { label: result.payroll_action, color: "#64748b" };
                    return <span style={{ fontWeight: 700, color: a.color }}>{a.label}</span>;
                  })()],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setResult(null)} style={{ marginTop: 12, ...S.btn, background: "#fff", border: "1px solid #e2e8f0", color: "#475569" }}>
                New Scan
              </button>
            </div>
          )}
        </div>

        {/* Right: recent scans */}
        <div style={S.card}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Recent Scans</span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{recentScans.length} records</span>
          </div>
          {loadingScans ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>Loading…</div>
          ) : recentScans.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📂</div>
              No scans yet — upload a ticket scan above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentScans.slice(0, 20).map((s: any) => {
                // New pipeline records (_source === "pipeline") vs legacy fast_scan_uploads
                const isPipeline = s._source === "pipeline";
                if (isPipeline) {
                  const statusColor = (st: string) =>
                    st === "approved" || st === "paid" || st === "invoiced" ? "#16a34a"
                    : st === "on_hold" || st === "needs_review" ? "#d97706"
                    : st === "ready" ? "#2563eb"
                    : "#64748b";
                  return (
                    <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #dbeafe", background: "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "1rem" }}>📄</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e40af" }}>
                          {s.original_filename || s.document_kind || "Ticket"}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#eff6ff", color: "#1e40af" }}>
                          {s.scan_status}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {s.ticket_number && <span style={{ fontSize: "0.65rem", background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px", fontWeight: 600 }}>#{s.ticket_number}</span>}
                        {s.truck_number  && <span style={{ fontSize: "0.65rem", background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px", fontWeight: 600 }}>Truck {s.truck_number}</span>}
                        {s.driver_name   && <span style={{ fontSize: "0.65rem", background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px", fontWeight: 600 }}>{s.driver_name}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: "0.65rem", color: statusColor(s.payroll_status), fontWeight: 600 }}>Payroll: {s.payroll_status}</span>
                        <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>·</span>
                        <span style={{ fontSize: "0.65rem", color: statusColor(s.billing_status), fontWeight: 600 }}>Billing: {s.billing_status}</span>
                        <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#94a3b8" }}>
                          {new Date(s.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                }
                // Legacy format
                const t = SCAN_TYPES.find(x => x.value === s.scan_type) || SCAN_TYPES[SCAN_TYPES.length - 1];
                return (
                  <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #f1f5f9", background: "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: t.color }}>{t.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.67rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                        background: s.upload_status === "linked" ? "#dcfce7" : "#fef3c7",
                        color:      s.upload_status === "linked" ? "#16a34a" : "#92400e" }}>
                        {s.upload_status}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {s.detected_vehicle && <span>Truck {s.detected_vehicle} · </span>}
                      {new Date(s.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legal footer */}
      <div style={{ marginTop: 32, padding: "14px 0", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "0.68rem", color: "#94a3b8", lineHeight: 1.7 }}>
          <strong style={{ color: "#64748b" }}>Fast Scan™</strong> is a product of{" "}
          <strong style={{ color: "#64748b" }}>Igotta Technologies</strong> and part of the{" "}
          <strong style={{ color: "#64748b" }}>MoveAround TMS</strong> platform.
        </p>
      </div>
    </div>
  );
}
