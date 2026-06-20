"use client";

import { useEffect, useRef, useState } from "react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/components/ronyx/ModuleUpgradeCard";
import BrandLogo from "@/components/ronyx/BrandLogo";

const SCAN_TYPES = [
  { value: "ticket",        label: "Ticket",              icon: "🎫", color: "#d97706", bg: "#fffbeb" },
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
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("fast-scan");
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
  const [scanPreviewModal, setScanPreviewModal] = useState<{ url: string; filename: string; rotation: number } | null>(null);
  const [scanEmailModal, setScanEmailModal] = useState<{ scan: any; to: string; subject: string; message: string; sending: boolean } | null>(null);
  const [scanEditModal, setScanEditModal] = useState<{ scan: any; form: { ticket_number: string; truck_number: string; driver_name: string; amount: string }; saving: boolean } | null>(null);
  const [scanVoidConfirm, setScanVoidConfirm] = useState<{ id: string; filename: string } | null>(null);
  const [scanDeleteConfirm, setScanDeleteConfirm] = useState<{ id: string; filename: string } | null>(null);

  // File upload state
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploadTicketNum, setUploadTicketNum] = useState("");
  const [uploadTruck, setUploadTruck]       = useState("");
  const [uploadDriver, setUploadDriver]     = useState("");
  const [uploading, setUploading]           = useState(false);
  const [ocrRunning, setOcrRunning]         = useState(false);
  const [uploadResult, setUploadResult]     = useState<UploadResult | null>(null);
  const [uploadError, setUploadError]       = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function openScanPreview(s: any, print?: boolean) {
    if (!s.object_path) { alert("No file stored for this scan."); return; }
    try {
      const res = await fetch(`/api/ronyx/fast-scan/${s.id}`);
      const data = await res.json();
      if (!data.signed_url) { alert("Could not load preview — file may have been deleted."); return; }
      if (print) {
        const win = window.open(data.signed_url, "_blank");
        if (win) win.addEventListener("load", () => { try { win.print(); } catch {} });
      } else {
        setScanPreviewModal({ url: data.signed_url, filename: s.original_filename || "Ticket Scan", rotation: 0 });
      }
    } catch { alert("Failed to load preview. Check your connection."); }
  }

  async function saveScanEdit() {
    if (!scanEditModal) return;
    setScanEditModal(m => m && { ...m, saving: true });
    try {
      const res = await fetch(`/api/ronyx/fast-scan/${scanEditModal.scan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanEditModal.form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRecentScans(prev => prev.map(s => s.id === scanEditModal.scan.id ? { ...s, ...scanEditModal.form } : s));
      setScanEditModal(null);
    } catch (e: any) {
      setScanEditModal(m => m && { ...m, saving: false });
      alert(e.message);
    }
  }

  async function confirmDelete() {
    if (!scanDeleteConfirm) return;
    try {
      const res = await fetch(`/api/ronyx/fast-scan/${scanDeleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete"); }
      setRecentScans(prev => prev.filter(s => s.id !== scanDeleteConfirm.id));
      setScanDeleteConfirm(null);
    } catch (e: any) { alert(e.message); }
  }

  async function confirmVoid() {
    if (!scanVoidConfirm) return;
    try {
      const res = await fetch(`/api/ronyx/fast-scan/${scanVoidConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_status: "voided" }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to void"); }
      setRecentScans(prev => prev.map(s => s.id === scanVoidConfirm.id ? { ...s, scan_status: "voided" } : s));
      setScanVoidConfirm(null);
    } catch (e: any) { alert(e.message); }
  }

  async function sendScanEmail() {
    if (!scanEmailModal) return;
    setScanEmailModal(m => m && { ...m, sending: true });
    try {
      const res = await fetch("/api/ronyx/fast-scan/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: scanEmailModal.scan.id,
          to: scanEmailModal.to,
          subject: scanEmailModal.subject,
          message: scanEmailModal.message,
          filename: scanEmailModal.scan.original_filename,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.queued) throw new Error(data.error || "Email failed");
      setScanEmailModal(null);
      alert(data.queued ? "SMTP not configured — email queued." : `Email sent to ${scanEmailModal.to}`);
    } catch (e: any) {
      setScanEmailModal(m => m && { ...m, sending: false });
      alert(e.message);
    }
  }

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

      // Upload done — reset form immediately so staff can queue the next scan
      setUploadFile(null);
      setUploadTicketNum(""); setUploadTruck(""); setUploadDriver("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);

      // If OCR is available, run it as a separate request so the upload never times out
      if (data.next_step === "ocr" && data.document_id) {
        setOcrRunning(true);
        setUploadResult({ ...data, document: { ...data.document, ocr_status: "processing" } });
        try {
          const ocrRes = await fetch("/api/ronyx/fast-scan/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: data.document_id }),
          });
          const ocrData = await ocrRes.json();
          if (ocrRes.ok || ocrRes.status === 201) {
            setUploadResult({ ...data, ...ocrData, document: { ...data.document, ocr_status: "completed", scan_status: "processed" } });
          } else {
            setUploadResult({ ...data, ocr_error: ocrData.error || "OCR failed", document: { ...data.document, ocr_status: "failed" } });
          }
        } catch (ocrErr: any) {
          setUploadResult({ ...data, ocr_error: ocrErr.message || "OCR request failed", document: { ...data.document, ocr_status: "failed" } });
        } finally {
          setOcrRunning(false);
        }
      } else {
        setUploadResult(data);
      }

      loadRecentScans();
    } catch (e: any) {
      setUploadError(e.message || "Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      setOcrRunning(false);
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

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="fast-scan" />;

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
          {/* Certified Scanner badge + logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
            <div style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>📡</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Live</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px" }}>
              <BrandLogo
                asset="fastScanCertifiedScanner"
                maxHeight={28}
                maxWidth={140}
                style={{ opacity: 0.92 }}
                fallbackStyle={{ color: "#94a3b8", fontSize: "0.65rem" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
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

            <button onClick={handleFileUpload} disabled={uploading || ocrRunning || !uploadFile}
              style={{ ...S.btn, background: uploadFile ? "#1e40af" : "#94a3b8", color: "#fff", opacity: (uploading || ocrRunning) ? 0.7 : 1, width: "100%" }}>
              {uploading ? "Uploading…" : ocrRunning ? "🔍 Running OCR…" : "📤 Upload Ticket Scan"}
            </button>
            {ocrRunning && (
              <div style={{ marginTop: 10, padding: "8px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", color: "#1e40af", fontWeight: 600, textAlign: "center" }}>
                🤖 Claude is reading your ticket… this takes 10–20 seconds
              </div>
            )}

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

                  {/* AccuriScale Check — verification panel shown after OCR */}
                  <div style={{ marginTop: 12, marginBottom: 12, padding: "12px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#22d3ee", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⚖️</span> AccuriScale Check
                    </div>
                    {[
                      { status: "ok",      label: "Ticket image received" },
                      { status: hasOcr ? "ok" : "hold", label: hasOcr ? "OCR completed" : "OCR pending" },
                      { status: uploadResult.extracted?.driver_name ? "ok" : "warn", label: uploadResult.extracted?.driver_name ? `Driver matched — ${uploadResult.extracted.driver_name}` : "Driver not matched — verify manually" },
                      { status: uploadResult.extracted?.truck_number ? "ok" : "warn", label: uploadResult.extracted?.truck_number ? `Truck matched — #${uploadResult.extracted.truck_number}` : "Truck not matched — verify manually" },
                      { status: "warn",    label: "Tons variance: pending dispatch match" },
                      { status: (uploadResult.missing_fields?.length ?? 0) > 0 ? "hold" : "ok", label: (uploadResult.missing_fields?.length ?? 0) > 0 ? `Payroll hold — missing: ${uploadResult.missing_fields!.join(", ")}` : "Payroll ready" },
                      { status: uploadResult.ticket_id ? "ok" : "hold", label: uploadResult.ticket_id ? "Billing ready" : "Billing hold — ticket not created" },
                    ].map(({ status, label }, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < 6 ? 5 : 0 }}>
                        <span style={{ fontSize: "0.75rem", marginTop: 1, flexShrink: 0, color: status === "warn" ? "#fbbf24" : status === "ok" ? "#4ade80" : "#f87171" }}>
                          {status === "warn" ? "⚠" : status === "ok" ? "✓" : "✕"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: status === "warn" ? "#fde68a" : status === "ok" ? "#86efac" : "#fca5a5", lineHeight: 1.4 }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {uploadResult.signed_url && (
                      <button
                        onClick={() => setScanPreviewModal({ url: uploadResult.signed_url!, filename: uploadFile?.name || "Ticket Scan", rotation: 0 })}
                        style={{ padding: "5px 14px", background: "#eff6ff", color: "#1e40af", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                        👁 Preview &amp; Rotate
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
                  const isVoided = s.scan_status === "voided";
                  return (
                    <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${isVoided ? "#fecaca" : "#dbeafe"}`, background: isVoided ? "#fff5f5" : "#f8fafc", opacity: isVoided ? 0.75 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "1rem" }}>📄</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isVoided ? "#dc2626" : "#1e40af", textDecoration: isVoided ? "line-through" : undefined }}>
                          {s.original_filename || s.document_kind || "Ticket"}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                          background: isVoided ? "#fef2f2" : "#eff6ff",
                          color:      isVoided ? "#dc2626" : "#1e40af" }}>
                          {isVoided ? "🚫 VOIDED" : s.scan_status}
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
                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                        {s.object_path && (<>
                          <button onClick={() => openScanPreview(s)}
                            style={{ padding: "3px 9px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                            👁 Preview
                          </button>
                          <button onClick={() => setScanEmailModal({ scan: s, to: "", subject: `Ticket Scan — ${s.ticket_number || s.original_filename || "Scan"}`, message: `Please find the attached ticket scan.\n\nTruck: ${s.truck_number || "N/A"}\nDriver: ${s.driver_name || "N/A"}\n\n— MoveAround TMS`, sending: false })}
                            style={{ padding: "3px 9px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                            ✉ Email
                          </button>
                          <button onClick={() => openScanPreview(s, true)}
                            style={{ padding: "3px 9px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                            🖨 Print
                          </button>
                        </>)}
                        {!isVoided && (
                          <button onClick={() => setScanEditModal({ scan: s, form: { ticket_number: s.ticket_number || "", truck_number: s.truck_number || "", driver_name: s.driver_name || "", amount: s.amount?.toString() || "" }, saving: false })}
                            style={{ padding: "3px 9px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                            ✏ Edit
                          </button>
                        )}
                        {!isVoided && (
                          <button onClick={() => setScanVoidConfirm({ id: s.id, filename: s.original_filename || "this scan" })}
                            style={{ padding: "3px 9px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                            🚫 Void
                          </button>
                        )}
                        <button onClick={() => setScanDeleteConfirm({ id: s.id, filename: s.original_filename || "this scan" })}
                          style={{ padding: "3px 9px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                          🗑 Delete
                        </button>
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
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 6 }}>
                      {s.detected_vehicle && <span>Truck {s.detected_vehicle} · </span>}
                      {new Date(s.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => setScanDeleteConfirm({ id: s.id, filename: t.label })}
                        style={{ padding: "3px 9px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, fontSize: "0.63rem", fontWeight: 700, cursor: "pointer" }}>
                        🗑 Delete
                      </button>
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

      {/* ── In-system Preview Modal ── */}
      {scanPreviewModal && (() => {
        const isImage = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(scanPreviewModal.url) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(scanPreviewModal.filename);
        const rot = scanPreviewModal.rotation;
        const rotateLeft  = () => setScanPreviewModal(m => m && { ...m, rotation: (m.rotation - 90 + 360) % 360 });
        const rotateRight = () => setScanPreviewModal(m => m && { ...m, rotation: (m.rotation + 90) % 360 });
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.80)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, width: "min(96vw, 1200px)", height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #e2e8f0", flexShrink: 0, background: "#0f172a", borderRadius: "14px 14px 0 0" }}>
                <span style={{ fontSize: "1rem" }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scanPreviewModal.filename}</span>
                {isImage && (
                  <>
                    <button onClick={rotateLeft} title="Rotate left"
                      style={{ padding: "5px 12px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                      ↺ Rotate Left
                    </button>
                    <button onClick={rotateRight} title="Rotate right"
                      style={{ padding: "5px 12px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                      ↻ Rotate Right
                    </button>
                  </>
                )}
                <button onClick={() => { const w = window.open(scanPreviewModal.url, "_blank"); if (w) w.addEventListener("load", () => { try { w.print(); } catch {} }); }}
                  style={{ padding: "5px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  🖨 Print
                </button>
                <a href={scanPreviewModal.url} download={scanPreviewModal.filename}
                  style={{ padding: "5px 12px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", textDecoration: "none" }}>
                  ⬇ Download
                </a>
                <button onClick={() => setScanPreviewModal(null)}
                  style={{ padding: "5px 12px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  ✕ Close
                </button>
              </div>
              {/* Content */}
              <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", borderRadius: "0 0 14px 14px", padding: isImage ? 16 : 0 }}>
                {isImage ? (
                  <img
                    src={scanPreviewModal.url}
                    alt={scanPreviewModal.filename}
                    style={{
                      maxWidth: rot % 180 === 0 ? "100%" : "90vh",
                      maxHeight: rot % 180 === 0 ? "100%" : "90vw",
                      objectFit: "contain",
                      transform: `rotate(${rot}deg)`,
                      transition: "transform 0.25s ease",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <iframe src={scanPreviewModal.url} style={{ flex: 1, border: "none", width: "100%", height: "100%", borderRadius: "0 0 14px 14px" }} />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Email Modal ── */}
      {scanEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 18 }}>✉ Email Ticket Scan</div>
            {([
              { label: "To (email)", key: "to",      type: "email"  },
              { label: "Subject",    key: "subject",  type: "text"   },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                <input type={f.type} value={(scanEmailModal as any)[f.key] || ""}
                  onChange={e => setScanEmailModal(m => m && ({ ...m, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.88rem", outline: "none", background: "#f8fafc", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
              <textarea value={scanEmailModal.message} onChange={e => setScanEmailModal(m => m && ({ ...m, message: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.88rem", resize: "vertical", height: 90, outline: "none", background: "#f8fafc", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button disabled={scanEmailModal.sending || !scanEmailModal.to} onClick={sendScanEmail}
                style={{ flex: 1, padding: "10px 0", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: (!scanEmailModal.to || scanEmailModal.sending) ? 0.6 : 1 }}>
                {scanEmailModal.sending ? "Sending…" : "✉ Send Email"}
              </button>
              <button onClick={() => setScanEmailModal(null)}
                style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Scan Modal ── */}
      {scanEditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 18 }}>✏ Edit Scan Record</div>
            {([
              { label: "Ticket #",   key: "ticket_number" },
              { label: "Truck #",    key: "truck_number"  },
              { label: "Driver",     key: "driver_name"   },
              { label: "Amount ($)", key: "amount"        },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                <input value={(scanEditModal.form as any)[f.key] || ""}
                  onChange={e => setScanEditModal(m => m && ({ ...m, form: { ...m.form, [f.key]: e.target.value } }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.88rem", outline: "none", background: "#f8fafc", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button disabled={scanEditModal.saving} onClick={saveScanEdit}
                style={{ flex: 1, padding: "10px 0", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: scanEditModal.saving ? 0.6 : 1 }}>
                {scanEditModal.saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setScanEditModal(null)}
                style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Void Confirmation Modal ── */}
      {scanVoidConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>Void This Scan?</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 22, lineHeight: 1.5 }}>
              <strong>{scanVoidConfirm.filename}</strong> will be marked as voided and excluded from payroll and billing. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmVoid}
                style={{ flex: 1, padding: "11px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                Yes, Void It
              </button>
              <button onClick={() => setScanVoidConfirm(null)}
                style={{ flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {scanDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>🗑</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>Delete This Scan?</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 22, lineHeight: 1.5 }}>
              <strong>{scanDeleteConfirm.filename}</strong> will be permanently deleted and cannot be recovered.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmDelete}
                style={{ flex: 1, padding: "11px 0", background: "#be123c", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                Yes, Delete It
              </button>
              <button onClick={() => setScanDeleteConfirm(null)}
                style={{ flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
