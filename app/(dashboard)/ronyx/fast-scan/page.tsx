"use client";

import { useEffect, useRef, useState } from "react";
import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/app/components/ronyx/ModuleUpgradeCard";
import PdfSplitModal, { pdfPageCount } from "@/app/components/ronyx/PdfSplitModal";

// ─── Proof-to-pay scan types only ─────────────────────────────────────────────

const SCAN_TYPES = [
  { value: "load_ticket",      label: "Scale / Load Ticket",    icon: "⚖", color: "#16a34a", bg: "#f0fdf4" },
  { value: "trip_proof",       label: "Trip Proof",             icon: "📋", color: "#2563eb", bg: "#eff6ff" },
  { value: "pit_ticket",       label: "Pit Ticket",             icon: "🪨", color: "#d97706", bg: "#fffbeb" },
  { value: "vendor_invoice",   label: "Vendor Invoice",         icon: "🧾", color: "#7c3aed", bg: "#f5f3ff" },
  { value: "customer_invoice", label: "Customer Invoice",       icon: "📄", color: "#0891b2", bg: "#ecfeff" },
  { value: "payout_sheet",     label: "Payout Sheet",           icon: "💵", color: "#15803d", bg: "#dcfce7" },
  { value: "payroll_support",  label: "Payroll Support Doc",    icon: "📊", color: "#1e40af", bg: "#dbeafe" },
  { value: "missing_proof",    label: "Missing Proof",          icon: "❓", color: "#dc2626", bg: "#fef2f2" },
];

const DEFAULT_ROUTING: Record<string, RoutingChoice> = {
  load_ticket: "both", trip_proof: "payroll", pit_ticket: "both",
  vendor_invoice: "billing", customer_invoice: "billing",
  payout_sheet: "payroll", payroll_support: "payroll", missing_proof: "needs_review",
};

type RoutingChoice = "both" | "payroll" | "billing" | "needs_review" | "duplicate" | "rejected";

const ROUTING_BTNS: { key: RoutingChoice; label: string; bg: string; color: string; border: string }[] = [
  { key: "both",       label: "Approve → Payroll + Billing",  bg: "#1e40af", color: "#fff",    border: "#1e40af" },
  { key: "payroll",    label: "Approve → Payroll Review",     bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  { key: "billing",    label: "Approve → Billing Review",     bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  { key: "needs_review",label: "Save to Needs Review",        bg: "#fffbeb", color: "#a16207", border: "#fde68a" },
  { key: "duplicate",  label: "Mark Duplicate",               bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
  { key: "rejected",   label: "Reject Scan",                  bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
];

// Ticket lifecycle chain
const TICKET_CHAIN = [
  "Received", "OCR Extracted", "Matched to Dispatch",
  "Payroll Review", "Billing Review", "Invoice Ready", "Paid / Settled", "Archived",
];

function scanStatusToChainStep(s: any): number {
  if (!s) return 0;
  const status = s.scan_status || "";
  const pay    = s.payroll_status || "";
  const bill   = s.billing_status || "";
  if (["paid","settled","archived"].some(x => pay.includes(x) || bill.includes(x))) return 7;
  if (bill === "invoiced" || bill === "ready") return 5;
  if (pay === "ready" || pay === "approved") return 4;
  if (status === "approved") return 3;
  if (status === "processed" || status === "completed") return 2;
  if (status === "processing" || status === "uploaded") return 1;
  return 0;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExtractedFields = {
  ticket_number?: string | null;  ticket_date?: string | null;
  invoice_number?: string | null; customer?: string | null;
  project_number?: string | null; pit_location?: string | null;
  pickup_site?: string | null;    dropoff_site?: string | null;
  truck_number?: string | null;   driver_name?: string | null;
  hauler?: string | null;         material?: string | null;
  loads?: number | null;          quantity_tons?: number | null;
  rate?: number | null;           gross_amount?: number | null;
  total_hours?: number | null;    signature?: boolean;
  image_quality?: string | null;
};

type FieldStatus = "matched" | "review" | "missing";

type UploadResult = {
  document_id: string | null;
  storage_path: string; bucket: string; signed_url: string | null;
  document?: any; next_step?: string; db_warning?: string;
  ocr_skipped?: boolean; ocr_error?: string;
  ocr_confidence?: number; extraction_confidence?: number;
  extracted?: ExtractedFields;
  ticket_id?: string | null; ticket_number?: string | null;
  missing_fields?: string[]; qr_url?: string | null;
};

type Scan = any;

type BatchState = {
  name: string; expected: number; scanned: number;
  matched: number; needs_review: number; missing: number;
  active: boolean;
};

const EMPTY_BATCH: BatchState = {
  name: "", expected: 0, scanned: 0, matched: 0, needs_review: 0, missing: 0, active: false,
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  label: { fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: 5, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  input: { width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none", background: "#f8fafc", boxSizing: "border-box" as const, fontFamily: "inherit" },
  card:  { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px", marginBottom: 14 },
};

function FieldStatusIcon({ status }: { status: FieldStatus }) {
  if (status === "matched") return <span style={{ color: "#16a34a", fontWeight: 800, fontSize: 13 }}>✓</span>;
  if (status === "review")  return <span style={{ color: "#d97706", fontWeight: 800, fontSize: 13 }}>⚠</span>;
  return                           <span style={{ color: "#dc2626", fontWeight: 800, fontSize: 13 }}>✕</span>;
}

function getFieldStatus(key: keyof ExtractedFields, val: any, confidence: number): FieldStatus {
  if (val == null || val === "") return "missing";
  if (key === "signature" && val === false) return "review";
  if (confidence < 75) return "review";
  if (key === "ticket_date" || key === "ticket_number" || key === "truck_number" || key === "driver_name")
    return confidence >= 85 ? "matched" : "review";
  return "matched";
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FastScanPage() {
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("fast-scan");

  const [lang,     setLang]     = useState<"en" | "es">("en");
  const [scanType, setScanType] = useState("load_ticket");

  // Upload state
  const [uploadFile,      setUploadFile]      = useState<File | null>(null);
  const [uploadTicketNum, setUploadTicketNum] = useState("");
  const [uploadTruck,     setUploadTruck]     = useState("");
  const [uploadDriver,    setUploadDriver]    = useState("");
  const [uploading,       setUploading]       = useState(false);
  const [ocrRunning,      setOcrRunning]      = useState(false);
  const [uploadResult,    setUploadResult]    = useState<UploadResult | null>(null);
  const [pdfSplit,        setPdfSplit]        = useState<File | null>(null); // multi-page PDF awaiting split
  const [splitQueue,      setSplitQueue]      = useState<File[]>([]);        // remaining split pages to scan
  const [uploadError,     setUploadError]     = useState("");
  const [dragOver,        setDragOver]        = useState(false);
  const [editedFields,    setEditedFields]    = useState<Partial<ExtractedFields>>({});
  const [noteText,        setNoteText]        = useState("");

  // Routing
  const [routingChoice, setRoutingChoice] = useState<RoutingChoice | null>(null);
  const [routing,       setRouting]       = useState(false);
  const [routingDone,   setRoutingDone]   = useState(false);

  // Batch
  const [batch,         setBatch]         = useState<BatchState>(EMPTY_BATCH);
  const [batchSetup,    setBatchSetup]    = useState(false);
  const [batchDraft,    setBatchDraft]    = useState({ name: "", expected: "" });

  // Scans list + modals
  const [recentScans,        setRecentScans]        = useState<Scan[]>([]);
  const [loadingScans,       setLoadingScans]        = useState(true);
  const [scanPreviewModal,   setScanPreviewModal]    = useState<{ url: string; filename: string; rotation: number } | null>(null);
  const [scanEmailModal,     setScanEmailModal]      = useState<{ scan: any; to: string; subject: string; message: string; sending: boolean } | null>(null);
  const [scanEditModal,      setScanEditModal]       = useState<{ scan: any; form: { ticket_number: string; truck_number: string; driver_name: string; amount: string }; saving: boolean } | null>(null);
  const [scanVoidConfirm,    setScanVoidConfirm]     = useState<{ id: string; filename: string } | null>(null);
  const [scanDeleteConfirm,  setScanDeleteConfirm]   = useState<{ id: string; filename: string } | null>(null);
  const [expandedScan,       setExpandedScan]        = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── i18n ──────────────────────────────────────────────────────────────────
  const T = lang === "en" ? {
    title: "Fast Scan™", sub: "Proof-to-Pay and Proof-to-Bill Intelligence",
    scanType: "Document Type", upload: "Upload Scan",
    drop: "Drop ticket scan or click to browse",
    types: "PDF · JPG · PNG · HEIC · TIFF",
    uploading: "Uploading…", ocr: "Reading ticket…",
    extracted: "Extracted Fields", exceptions: "Exceptions",
    routeHeader: "Route This Document",
    routeNote: "System pre-selects based on doc type — override as needed.",
    chain: "Ticket Chain", confirmRoute: "Confirm & Route →",
    uploadAnother: "Upload Another", recentScans: "Recent Scans",
    batchProgress: "Batch Progress", doThisFirst: "Do This First",
    missingQueue: "Missing Proof Queue",
    startBatch: "Start Scan Batch", closeBatch: "Close Batch",
    expected: "Expected", scanned: "Scanned", matched: "Matched",
    needsReview: "Needs Review", missing: "Missing",
    payrollHolds: "Payroll Holds", billingReady: "Billing Ready",
    addNote: "Add Note",
  } : {
    title: "Fast Scan™", sub: "Verificación de Pago y Facturación",
    scanType: "Tipo de Documento", upload: "Cargar Escaneo",
    drop: "Arrastra aquí o haz clic para buscar",
    types: "PDF · JPG · PNG · HEIC · TIFF",
    uploading: "Cargando…", ocr: "Leyendo ticket…",
    extracted: "Campos Extraídos", exceptions: "Excepciones",
    routeHeader: "Enviar Documento",
    routeNote: "El sistema selecciona según el tipo — puedes cambiarlo.",
    chain: "Cadena del Ticket", confirmRoute: "Confirmar y Enviar →",
    uploadAnother: "Cargar Otro", recentScans: "Escaneos Recientes",
    batchProgress: "Progreso del Lote", doThisFirst: "Haz Esto Primero",
    missingQueue: "Cola de Prueba Faltante",
    startBatch: "Iniciar Lote de Escaneo", closeBatch: "Cerrar Lote",
    expected: "Esperados", scanned: "Escaneados", matched: "Coincidentes",
    needsReview: "Necesita Revisión", missing: "Faltantes",
    payrollHolds: "Retenciones Nómina", billingReady: "Listo Facturación",
    addNote: "Agregar Nota",
  };

  // ── Computed KPIs from scan list ──────────────────────────────────────────
  const kpiScanned     = recentScans.length;
  const kpiMatched     = recentScans.filter(s => s.scan_status === "approved" || s.payroll_status === "ready" || s.billing_status === "ready").length;
  const kpiNeedsReview = recentScans.filter(s => s.scan_status === "needs_review").length;
  const kpiMissing     = recentScans.filter(s => s.scan_status === "needs_review" || (s.missing_fields?.length ?? 0) > 0).length;
  const kpiPayHolds    = recentScans.filter(s => s.payroll_status === "on_hold" || s.payroll_status === "hold").length;
  const kpiBillReady   = recentScans.filter(s => s.billing_status === "ready" || s.billing_status === "invoiced").length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setField(k: keyof ExtractedFields, v: string) {
    setEditedFields(prev => ({ ...prev, [k]: v }));
  }
  function mergedFields(): ExtractedFields {
    return { ...uploadResult?.extracted, ...editedFields };
  }

  function loadRecentScans() {
    fetch("/api/ronyx/fast-scan/upload")
      .then(r => r.json())
      .then(d => {
        if (d.documents?.length > 0) {
          setRecentScans(d.documents.map((doc: any) => ({ ...doc, _source: "pipeline" })));
        } else {
          return fetch("/api/ronyx/fast-scan").then(r => r.json()).then(d2 => setRecentScans(d2.scans || []));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingScans(false));
  }

  useEffect(() => { loadRecentScans(); }, []);

  useEffect(() => {
    if (uploadResult) {
      setRoutingChoice(DEFAULT_ROUTING[scanType] ?? "needs_review");
      setRoutingDone(false);
    }
  }, [uploadResult, scanType]);

  async function openScanPreview(s: any, print?: boolean) {
    if (!s.object_path) { alert("No file stored for this scan."); return; }
    try {
      const res  = await fetch(`/api/ronyx/fast-scan/${s.id}`);
      const data = await res.json();
      if (!data.signed_url) { alert("Could not load preview — file may have been deleted."); return; }
      if (print) {
        const win = window.open(data.signed_url, "_blank");
        if (win) win.addEventListener("load", () => { try { win.print(); } catch {} });
      } else {
        setScanPreviewModal({ url: data.signed_url, filename: s.original_filename || "Ticket Scan", rotation: 0 });
      }
    } catch { alert("Failed to load preview."); }
  }

  async function saveScanEdit() {
    if (!scanEditModal) return;
    setScanEditModal(m => m && { ...m, saving: true });
    try {
      const res  = await fetch(`/api/ronyx/fast-scan/${scanEditModal.scan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scanEditModal.form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRecentScans(prev => prev.map(s => s.id === scanEditModal.scan.id ? { ...s, ...scanEditModal.form } : s));
      setScanEditModal(null);
    } catch (e: any) { setScanEditModal(m => m && { ...m, saving: false }); alert(e.message); }
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
      const res = await fetch(`/api/ronyx/fast-scan/${scanVoidConfirm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scan_status: "voided" }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to void"); }
      setRecentScans(prev => prev.map(s => s.id === scanVoidConfirm.id ? { ...s, scan_status: "voided" } : s));
      setScanVoidConfirm(null);
    } catch (e: any) { alert(e.message); }
  }

  async function sendScanEmail() {
    if (!scanEmailModal) return;
    setScanEmailModal(m => m && { ...m, sending: true });
    try {
      const res  = await fetch("/api/ronyx/fast-scan/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: scanEmailModal.scan.id, to: scanEmailModal.to, subject: scanEmailModal.subject, message: scanEmailModal.message, filename: scanEmailModal.scan.original_filename }) });
      const data = await res.json();
      if (!res.ok && !data.queued) throw new Error(data.error || "Email failed");
      setScanEmailModal(null);
      alert(data.queued ? "SMTP not configured — email queued." : `Email sent to ${scanEmailModal.to}`);
    } catch (e: any) { setScanEmailModal(m => m && { ...m, sending: false }); alert(e.message); }
  }

  async function handleFileUpload() {
    if (!uploadFile) { setUploadError("Choose a file first."); return; }
    setUploadError(""); setUploading(true); setUploadResult(null);
    setEditedFields({}); setRoutingDone(false); setNoteText("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("scan_type", scanType);
      if (uploadTicketNum) form.append("ticket_number", uploadTicketNum);
      if (uploadTruck)     form.append("truck_number",  uploadTruck);
      if (uploadDriver)    form.append("driver_name",   uploadDriver);

      const res  = await fetch("/api/ronyx/fast-scan/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok && res.status !== 207) { setUploadError(data.error || "Upload failed."); setUploading(false); return; }

      setUploadFile(null); setUploadTicketNum(""); setUploadTruck(""); setUploadDriver("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);

      if (data.next_step === "ocr" && data.document_id) {
        setOcrRunning(true);
        setUploadResult({ ...data, document: { ...data.document, ocr_status: "processing" } });
        try {
          const ocrRes  = await fetch("/api/ronyx/fast-scan/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: data.document_id }) });
          const ocrData = await ocrRes.json();
          setUploadResult(ocrRes.ok || ocrRes.status === 201
            ? { ...data, ...ocrData, document: { ...data.document, ocr_status: "completed", scan_status: "processed" } }
            : { ...data, ocr_error: ocrData.error || "OCR failed", document: { ...data.document, ocr_status: "failed" } });
        } catch (err: any) {
          setUploadResult({ ...data, ocr_error: err.message || "OCR request failed", document: { ...data.document, ocr_status: "failed" } });
        } finally { setOcrRunning(false); }
      } else {
        setUploadResult(data);
      }

      // Update batch counters
      if (batch.active) {
        setBatch(b => ({ ...b, scanned: b.scanned + 1 }));
      }
      loadRecentScans();
    } catch (e: any) {
      setUploadError(e.message || "Upload failed — check your connection.");
      setUploading(false); setOcrRunning(false);
    }
  }

  async function submitRouting() {
    if (!uploadResult?.document_id || !routingChoice || routingDone) return;
    setRouting(true);
    try {
      const payrollStatus = { both: "ready", payroll: "ready", billing: "hold", needs_review: "on_hold", duplicate: "hold", rejected: "hold" }[routingChoice];
      const billingStatus = { both: "ready", payroll: "hold", billing: "ready", needs_review: "on_hold", duplicate: "hold", rejected: "hold" }[routingChoice];
      const scanStatus    = { both: "approved", payroll: "approved", billing: "approved", needs_review: "needs_review", duplicate: "voided", rejected: "voided" }[routingChoice];
      const f = mergedFields();
      await fetch(`/api/ronyx/fast-scan/${uploadResult.document_id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payroll_status: payrollStatus, billing_status: billingStatus, scan_status: scanStatus, notes: noteText || undefined, ...f }),
      });
      setRoutingDone(true);
      // Update batch matched/review counters
      if (batch.active) {
        if (routingChoice === "both" || routingChoice === "payroll" || routingChoice === "billing") {
          setBatch(b => ({ ...b, matched: b.matched + 1 }));
        } else if (routingChoice === "needs_review") {
          setBatch(b => ({ ...b, needs_review: b.needs_review + 1 }));
        }
      }
      loadRecentScans();
    } catch { alert("Routing save failed — check your connection."); }
    finally { setRouting(false); }
  }

  function resetUpload() {
    setUploadResult(null); setRoutingChoice(null);
    setRoutingDone(false); setEditedFields({}); setNoteText("");
    // If this upload came from a split PDF, auto-load the next page to scan.
    if (splitQueue.length) {
      setUploadFile(splitQueue[0]);
      setSplitQueue(q => q.slice(1));
    }
  }

  // Intercept file selection: a multi-page PDF opens the split-into-tickets modal.
  async function pickFile(f: File) {
    if (f.type === "application/pdf" && (await pdfPageCount(f)) > 1) setPdfSplit(f);
    else setUploadFile(f);
  }

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="fast-scan" />;

  // ── Field definitions for extraction display ─────────────────────────────
  const FIELD_ROWS: { key: keyof ExtractedFields; label: string; fmt?: (v: any) => string }[] = [
    { key: "ticket_number",  label: "Ticket #" },
    { key: "ticket_date",    label: "Ticket Date" },
    { key: "invoice_number", label: "Invoice #" },
    { key: "customer",       label: "Customer" },
    { key: "project_number", label: "Project / Job #" },
    { key: "pit_location",   label: "Pit / Load Location" },
    { key: "pickup_site",    label: "Pickup Site" },
    { key: "dropoff_site",   label: "Dropoff Site" },
    { key: "truck_number",   label: "Truck #" },
    { key: "driver_name",    label: "Driver" },
    { key: "hauler",         label: "Hauler / OO" },
    { key: "material",       label: "Material" },
    { key: "loads",          label: "Load Count" },
    { key: "quantity_tons",  label: "Quantity / Tons" },
    { key: "rate",           label: "Rate", fmt: v => `$${Number(v).toFixed(2)}` },
    { key: "gross_amount",   label: "Gross Amount", fmt: v => `$${Number(v).toFixed(2)}` },
    { key: "total_hours",    label: "Total Hours" },
    { key: "signature",      label: "Signature", fmt: v => v ? "✓ Present" : "✗ Missing" },
    { key: "image_quality",  label: "Image Quality" },
  ];

  const selectedType = SCAN_TYPES.find(t => t.value === scanType) ?? SCAN_TYPES[0];

  // Derive exceptions from merged fields
  const f = mergedFields();
  const exceptions: { type: "warn" | "error"; msg: string }[] = [];
  if (!f.signature) exceptions.push({ type: "warn", msg: "Signature not detected — may not be accepted for billing" });
  if (!f.ticket_date) exceptions.push({ type: "error", msg: "Ticket date missing — required for payroll reconciliation" });
  if (!f.truck_number) exceptions.push({ type: "error", msg: "Truck number not extracted — verify manually" });
  if (!f.driver_name) exceptions.push({ type: "warn", msg: "Driver not matched — verify before routing to payroll" });
  if (!f.quantity_tons && !f.loads) exceptions.push({ type: "warn", msg: "Quantity / tons not found — rate calculation may be incomplete" });
  if ((uploadResult?.ocr_confidence ?? 100) < 70) exceptions.push({ type: "warn", msg: `OCR confidence low (${uploadResult?.ocr_confidence}%) — consider requesting a better image` });

  const missingProofScans = recentScans.filter(s => s.scan_type === "missing_proof" || (s.missing_fields?.length ?? 0) > 0);
  const doThisFirstItems = [
    ...missingProofScans.slice(0, 3).map(s => ({ label: `Missing proof: ${s.original_filename || s.ticket_number || "Ticket"}`, color: "#dc2626" })),
    ...recentScans.filter(s => s.scan_status === "needs_review").slice(0, 3).map(s => ({ label: `Review needed: ${s.ticket_number || s.original_filename || "Scan"}`, color: "#d97706" })),
    ...recentScans.filter(s => s.payroll_status === "on_hold" || s.payroll_status === "hold").slice(0, 2).map(s => ({ label: `Payroll hold: Truck ${s.truck_number || "?"} · ${s.driver_name || "?"}`, color: "#7c3aed" })),
  ].slice(0, 8);

  return (
    <div style={{ padding: 0 }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "24px 28px 20px", borderRadius: 14, marginBottom: 16, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{T.title}</h1>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>{T.sub}</p>
            <div style={{ marginTop: 8, fontSize: "0.65rem", color: "#64748b" }}>
              Powered by <strong style={{ color: "#94a3b8" }}>MoveAround TMS</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* OCR status — real, not fake */}
            <div style={{ padding: "6px 12px", borderRadius: 9, background: ocrRunning ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.12)", border: `1px solid ${ocrRunning ? "rgba(251,191,36,0.4)" : "rgba(74,222,128,0.3)"}`, fontSize: "0.68rem", fontWeight: 800, color: ocrRunning ? "#fbbf24" : "#4ade80", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {uploading ? "⬆ Uploading" : ocrRunning ? "🔍 Reading Ticket" : routing ? "⟳ Routing" : uploadResult && !routingDone ? "⚠ Awaiting Review" : routingDone ? "✓ Routed" : "● Ready"}
            </div>
            {/* EN/ES */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["en", "es"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "none", fontWeight: 800, fontSize: "0.72rem", cursor: "pointer", background: lang === l ? "#fff" : "transparent", color: lang === l ? "#0f172a" : "#94a3b8" }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI bar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {[
            { label: T.expected,     value: batch.active ? batch.expected : "—",       color: "#94a3b8" },
            { label: T.scanned,      value: batch.active ? batch.scanned : kpiScanned,  color: "#60a5fa" },
            { label: T.matched,      value: batch.active ? batch.matched : kpiMatched,  color: "#4ade80" },
            { label: T.needsReview,  value: batch.active ? batch.needs_review : kpiNeedsReview, color: "#fbbf24" },
            { label: T.missing,      value: batch.active ? batch.missing : kpiMissing,  color: "#f87171" },
            { label: T.payrollHolds, value: kpiPayHolds,                                color: "#c084fc" },
            { label: T.billingReady, value: kpiBillReady,                               color: "#34d399" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: 2-column ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── LEFT: upload + extraction + routing ── */}
        <div>

          {/* Scan type chips */}
          <div style={S.card}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>{T.scanType}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
              {SCAN_TYPES.map(t => (
                <button key={t.value} onClick={() => setScanType(t.value)}
                  style={{ padding: "9px 4px", borderRadius: 9, border: scanType === t.value ? `2px solid ${t.color}` : "2px solid #e2e8f0", background: scanType === t.value ? t.bg : "#f8fafc", cursor: "pointer", textAlign: "center", transition: "all 0.1s" }}>
                  <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{t.icon}</div>
                  <div style={{ fontSize: "0.58rem", fontWeight: 700, color: scanType === t.value ? t.color : "#64748b", lineHeight: 1.2 }}>{t.label}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: "0.65rem", color: "#94a3b8" }}>
              Auto-route: <strong style={{ color: selectedType.color }}>
                {{ both: "Payroll + Billing", payroll: "Payroll Review", billing: "Billing Review", needs_review: "Needs Review", duplicate: "Mark Duplicate", rejected: "Reject" }[DEFAULT_ROUTING[scanType] ?? "needs_review"]}
              </strong>
            </div>
          </div>

          {/* Batch mode toggle */}
          {!batch.active && !batchSetup && (
            <div style={{ ...S.card, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                <strong style={{ color: "#0f172a" }}>Single scan</strong> — or start a batch for high-volume days
              </div>
              <button onClick={() => setBatchSetup(true)}
                style={{ padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer", color: "#475569", whiteSpace: "nowrap" }}>
                + {T.startBatch}
              </button>
            </div>
          )}

          {/* Batch setup */}
          {batchSetup && (
            <div style={{ ...S.card, border: "1px solid #bfdbfe" }}>
              <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "0.82rem", marginBottom: 12 }}>📦 {T.startBatch}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={S.label}>Batch Name</label>
                  <input style={S.input} value={batchDraft.name} onChange={e => setBatchDraft(b => ({ ...b, name: e.target.value }))} placeholder="e.g. Martin Marietta – June AM" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>{T.expected} Tickets</label>
                  <input style={S.input} type="number" value={batchDraft.expected} onChange={e => setBatchDraft(b => ({ ...b, expected: e.target.value }))} placeholder="e.g. 186" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setBatch({ name: batchDraft.name, expected: parseInt(batchDraft.expected) || 0, scanned: 0, matched: 0, needs_review: 0, missing: 0, active: true }); setBatchSetup(false); }}
                  style={{ flex: 1, padding: "8px 0", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
                  Start Batch →
                </button>
                <button onClick={() => setBatchSetup(false)}
                  style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active batch progress */}
          {batch.active && (
            <div style={{ ...S.card, background: "#0f172a", border: "1px solid #1e40af" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em" }}>{T.batchProgress}</div>
                  <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: "0.88rem" }}>{batch.name || "Active Batch"}</div>
                </div>
                <button onClick={() => setBatch(EMPTY_BATCH)}
                  style={{ padding: "4px 10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, color: "#94a3b8", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                  {T.closeBatch}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                {[
                  { label: T.expected,    value: batch.expected,    color: "#94a3b8" },
                  { label: T.scanned,     value: batch.scanned,     color: "#60a5fa" },
                  { label: T.matched,     value: batch.matched,     color: "#4ade80" },
                  { label: T.needsReview, value: batch.needs_review,color: "#fbbf24" },
                  { label: T.missing,     value: Math.max(0, batch.expected - batch.scanned), color: "#f87171" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 7, padding: "7px 5px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.52rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 1 }}>{label}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{value}</div>
                  </div>
                ))}
              </div>
              {batch.expected > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#4ade80", borderRadius: 4, width: `${Math.min(100, (batch.scanned / batch.expected) * 100)}%`, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#64748b", marginTop: 3, textAlign: "right" }}>
                    {Math.round((batch.scanned / batch.expected) * 100)}% complete
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upload card ── */}
          <div style={{ ...S.card, border: `2px solid ${uploadResult ? "#e2e8f0" : "#1e40af"}` }}>
            <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "0.82rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📡</span> {T.upload}
              <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "#94a3b8", background: "#f1f5f9", borderRadius: 5, padding: "2px 7px" }}>{T.types}</span>
            </div>

            {!uploadResult ? (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f2 = e.dataTransfer.files[0]; if (f2) pickFile(f2); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${dragOver ? "#1e40af" : uploadFile ? "#16a34a" : "#cbd5e1"}`, borderRadius: 10, background: dragOver ? "#eff6ff" : uploadFile ? "#f0fdf4" : "#f8fafc", padding: "18px 14px", textAlign: "center", cursor: "pointer", transition: "all 150ms", marginBottom: 12 }}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.bmp" style={{ display: "none" }}
                    onChange={e => { const f2 = e.target.files?.[0]; if (f2) pickFile(f2); }} />
                  {uploadFile ? (
                    <div>
                      <div style={{ fontSize: "1.3rem", marginBottom: 3 }}>✅</div>
                      <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.78rem" }}>{uploadFile.name}</div>
                      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 1 }}>{(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "1.6rem", marginBottom: 5 }}>📄</div>
                      <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>{T.drop}</div>
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 3 }}>Max 25 MB</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Ticket #", value: uploadTicketNum, set: setUploadTicketNum, ph: "e.g. 104582" },
                    { label: "Truck #",  value: uploadTruck,     set: setUploadTruck,     ph: "e.g. 8143"  },
                    { label: "Driver",   value: uploadDriver,    set: setUploadDriver,    ph: "J. Smith"    },
                  ].map(({ label, value, set, ph }) => (
                    <div key={label} style={{ flex: 1 }}>
                      <label style={S.label}>{label}</label>
                      <input style={S.input} value={value} onChange={e => set(e.target.value)} placeholder={ph} />
                    </div>
                  ))}
                </div>

                {uploadError && <div style={{ marginBottom: 10, padding: "7px 11px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.75rem" }}>{uploadError}</div>}

                {splitQueue.length > 0 && (
                  <div style={{ marginBottom: 10, padding: "7px 11px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1e40af", fontSize: "0.74rem", fontWeight: 600 }}>
                    📑 {splitQueue.length} more page{splitQueue.length > 1 ? "s" : ""} from your PDF queued — scan this one, then &ldquo;Scan Another&rdquo; loads the next.
                  </div>
                )}

                {pdfSplit && (
                  <PdfSplitModal
                    file={pdfSplit}
                    docOptions={[{ value: "Ticket", label: "Ticket" }]}
                    defaultType="Ticket"
                    title="Split into Tickets"
                    onCancel={() => setPdfSplit(null)}
                    onComplete={(pieces) => {
                      const files = pieces.map(p => p.file);
                      setUploadFile(files[0] || null);
                      setSplitQueue(files.slice(1));
                      setPdfSplit(null);
                    }}
                  />
                )}

                <button onClick={handleFileUpload} disabled={uploading || ocrRunning || !uploadFile}
                  style={{ width: "100%", padding: "9px 0", background: uploadFile ? "#1e40af" : "#94a3b8", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: "0.82rem", cursor: uploadFile ? "pointer" : "not-allowed", opacity: (uploading || ocrRunning) ? 0.75 : 1 }}>
                  {uploading ? T.uploading : ocrRunning ? `🔍 ${T.ocr}` : `📤 ${T.upload}`}
                </button>
                {ocrRunning && (
                  <div style={{ marginTop: 8, padding: "7px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.72rem", color: "#1e40af", fontWeight: 600, textAlign: "center" }}>
                    🤖 Claude is reading your ticket — 10–20 seconds
                  </div>
                )}
              </>
            ) : (
              // ── OCR result + review ──
              (() => {
                const hasOcr   = !!uploadResult.extracted;
                const hasError = !!(uploadResult.db_warning || uploadResult.ocr_error);
                const conf     = uploadResult.ocr_confidence ?? 0;

                return (
                  <div>
                    {/* Header row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, color: hasError ? "#b45309" : "#16a34a", fontSize: "0.85rem" }}>
                        {hasError ? "⚠ Partial Extract" : "✓ OCR Complete"}
                      </span>
                      {conf > 0 && (
                        <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 800, background: conf >= 80 ? "#dcfce7" : conf >= 65 ? "#fef9c3" : "#fef2f2", color: conf >= 80 ? "#16a34a" : conf >= 65 ? "#a16207" : "#dc2626" }}>
                          {conf}% confidence
                        </span>
                      )}
                      {uploadResult.ticket_id && (
                        <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 800, background: "#eff6ff", color: "#1e40af" }}>Ticket created</span>
                      )}
                    </div>

                    {hasError && (
                      <div style={{ padding: "6px 10px", background: "#fef3c7", borderRadius: 7, fontSize: "0.7rem", color: "#92400e", marginBottom: 10 }}>
                        {uploadResult.db_warning || uploadResult.ocr_error}
                      </div>
                    )}

                    {/* AccuriScale Check */}
                    <div style={{ padding: "10px 12px", background: "#0f172a", borderRadius: 9, border: "1px solid #334155", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#22d3ee", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 6 }}>⚖ AccuriScale Check</div>
                      {[
                        { st: "ok",   txt: "Ticket image received" },
                        { st: hasOcr ? "ok" : "hold", txt: hasOcr ? "OCR extracted" : "OCR pending" },
                        { st: f.driver_name ? "ok" : "warn",  txt: f.driver_name ? `Driver: ${f.driver_name}` : "Driver not matched — verify" },
                        { st: f.truck_number ? "ok" : "warn", txt: f.truck_number ? `Truck: #${f.truck_number}` : "Truck not matched — verify" },
                        { st: (f.quantity_tons != null || f.loads != null) ? "ok" : "warn", txt: f.quantity_tons != null ? `${f.quantity_tons} tons` : f.loads != null ? `${f.loads} loads` : "Quantity not found — verify" },
                        { st: uploadResult.ticket_id ? "ok" : "hold", txt: uploadResult.ticket_id ? "Billing ready" : "Billing hold — ticket not created" },
                      ].map(({ st, txt }, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: i < 5 ? 3 : 0 }}>
                          <span style={{ fontSize: "0.68rem", color: st === "ok" ? "#4ade80" : st === "warn" ? "#fbbf24" : "#f87171" }}>
                            {st === "ok" ? "✓" : st === "warn" ? "⚠" : "✕"}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: st === "ok" ? "#86efac" : st === "warn" ? "#fde68a" : "#fca5a5" }}>{txt}</span>
                        </div>
                      ))}
                    </div>

                    {/* Extracted fields — editable before routing */}
                    {hasOcr && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{T.extracted}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          {FIELD_ROWS.map(({ key, label, fmt }) => {
                            const raw = (f as any)[key];
                            const display = raw != null ? (fmt ? fmt(raw) : String(raw)) : null;
                            if (display == null && !(editedFields as any)[key]) return null;
                            const status = getFieldStatus(key, raw, conf);
                            return (
                              <div key={key} style={{ background: "#fff", borderRadius: 6, padding: "5px 8px", border: `1px solid ${status === "matched" ? "#bbf7d0" : status === "review" ? "#fde68a" : "#fecaca"}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                                  <FieldStatusIcon status={status} />
                                  <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{label}</span>
                                </div>
                                {routingDone ? (
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.75rem" }}>{display ?? "—"}</div>
                                ) : (
                                  <input value={(editedFields as any)[key] ?? (raw != null ? String(raw) : "")}
                                    onChange={e => setField(key, e.target.value)}
                                    placeholder="—"
                                    style={{ width: "100%", border: "none", background: "transparent", fontSize: "0.75rem", fontWeight: 600, color: "#0f172a", outline: "none", padding: 0, boxSizing: "border-box" as const }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Exception panel */}
                    {exceptions.length > 0 && !routingDone && (
                      <div style={{ marginBottom: 12, border: "1px solid #fde68a", borderRadius: 9, overflow: "hidden" }}>
                        <div style={{ background: "#fffbeb", padding: "7px 12px", fontSize: "0.65rem", fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.06em" }}>{T.exceptions} ({exceptions.length})</div>
                        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                          {exceptions.map((ex, i) => (
                            <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1, color: ex.type === "error" ? "#dc2626" : "#d97706" }}>{ex.type === "error" ? "✕" : "⚠"}</span>
                              <span style={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.4 }}>{ex.msg}</span>
                            </div>
                          ))}
                        </div>
                        {/* Exception action shortcuts */}
                        <div style={{ padding: "6px 12px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => { setNoteText("Exception noted — approved with manual review."); setRoutingChoice("needs_review"); }}
                            style={{ padding: "4px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700, color: "#a16207", cursor: "pointer" }}>
                            Approve with Note
                          </button>
                          <button onClick={() => setRoutingChoice("rejected")}
                            style={{ padding: "4px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>
                            Request Better Image
                          </button>
                          <button onClick={() => setRoutingChoice("needs_review")}
                            style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
                            Send to Review
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ticket chain */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{T.chain}</div>
                      <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
                        {TICKET_CHAIN.map((step, i) => {
                          const currentStep = scanStatusToChainStep(uploadResult.document);
                          const done = i <= currentStep;
                          const active = i === currentStep;
                          return (
                            <div key={step} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                              <div style={{ textAlign: "center", minWidth: 52 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? (active ? "#1e40af" : "#dcfce7") : "#f1f5f9", border: `2px solid ${done ? (active ? "#1e40af" : "#16a34a") : "#e2e8f0"}`, margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: done ? (active ? "#fff" : "#16a34a") : "#cbd5e1" }}>
                                  {done && !active ? "✓" : i + 1}
                                </div>
                                <div style={{ fontSize: "0.5rem", color: done ? (active ? "#1e40af" : "#16a34a") : "#94a3b8", fontWeight: done ? 700 : 500, lineHeight: 1.2, textAlign: "center" }}>{step}</div>
                              </div>
                              {i < TICKET_CHAIN.length - 1 && (
                                <div style={{ width: 12, height: 2, background: done ? "#16a34a" : "#e2e8f0", flexShrink: 0, marginTop: -10 }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Routing */}
                    {!routingDone ? (
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>{T.routeHeader}</div>
                        <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginBottom: 10 }}>{T.routeNote}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                          {ROUTING_BTNS.map(rb => (
                            <button key={rb.key} onClick={() => setRoutingChoice(rb.key)}
                              style={{ padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${routingChoice === rb.key ? rb.bg === "#fff" || rb.bg === "#f0fdf4" || rb.bg === "#eff6ff" || rb.bg === "#fffbeb" || rb.bg === "#faf5ff" || rb.bg === "#fef2f2" ? rb.border : rb.bg : "#e2e8f0"}`, background: routingChoice === rb.key ? rb.bg : "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, color: routingChoice === rb.key ? rb.color : "#64748b", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.1s" }}>
                              <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${routingChoice === rb.key ? rb.color : "#cbd5e1"}`, background: routingChoice === rb.key ? rb.color : "transparent", display: "inline-block", flexShrink: 0 }} />
                              {rb.label}
                            </button>
                          ))}
                        </div>
                        {/* Note */}
                        <div style={{ marginBottom: 10 }}>
                          <label style={S.label}>{T.addNote} (optional)</label>
                          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                            placeholder="Add context for payroll or billing staff…"
                            style={{ ...S.input, resize: "none" }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={submitRouting} disabled={routing || !routingChoice}
                            style={{ flex: 2, padding: "9px 0", background: routingChoice ? "#0f172a" : "#94a3b8", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: "0.82rem", cursor: routingChoice ? "pointer" : "not-allowed", opacity: routing ? 0.7 : 1 }}>
                            {routing ? "Saving…" : T.confirmRoute}
                          </button>
                          <button onClick={resetUpload}
                            style={{ flex: 1, padding: "9px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                            {T.uploadAnother}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "14px 0" }}>
                        <div style={{ fontSize: "2rem", marginBottom: 6 }}>✓</div>
                        <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#0f172a", marginBottom: 3 }}>
                          {{ both: "Routed to Payroll + Billing", payroll: "Routed to Payroll Review", billing: "Routed to Billing Review", needs_review: "Saved — Needs Review", duplicate: "Marked Duplicate", rejected: "Rejected" }[routingChoice ?? "needs_review"]}
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                          {uploadResult.signed_url && (
                            <button onClick={() => setScanPreviewModal({ url: uploadResult.signed_url!, filename: "Ticket", rotation: 0 })}
                              style={{ padding: "5px 12px", background: "#eff6ff", color: "#1e40af", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>
                              👁 Preview
                            </button>
                          )}
                          <button onClick={resetUpload}
                            style={{ padding: "5px 12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>
                            {T.uploadAnother}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* ── RIGHT: batch + scans + do this first ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Do This First */}
          {doThisFirstItems.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 12 }}>⚡ {T.doThisFirst}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doThisFirstItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9", alignItems: "center" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.75rem", color: "#475569", flex: 1 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Scans */}
          <div style={S.card}>
            <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{T.recentScans}</span>
              <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{recentScans.length} records</span>
            </div>
            {loadingScans ? (
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>Loading…</div>
            ) : recentScans.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 5 }}>📂</div>No scans yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {recentScans.slice(0, 30).map((s: any) => {
                  const isPipeline = s._source === "pipeline";
                  const isVoided   = s.scan_status === "voided";
                  const chainStep  = scanStatusToChainStep(s);
                  const typeInfo   = SCAN_TYPES.find(t => t.value === (s.document_kind || s.scan_type)) ?? SCAN_TYPES[0];
                  const isExpanded = expandedScan === s.id;

                  const statusColor = (st: string) =>
                    ["approved","paid","invoiced","ready"].some(x => (st||"").includes(x)) ? "#16a34a"
                    : ["on_hold","needs_review","hold"].some(x => (st||"").includes(x))    ? "#d97706"
                    : "#64748b";

                  return (
                    <div key={s.id} style={{ borderRadius: 9, border: `1px solid ${isVoided ? "#fecaca" : "#e2e8f0"}`, background: isVoided ? "#fff5f5" : "#fff", opacity: isVoided ? 0.75 : 1, overflow: "hidden" }}>
                      {/* Scan row */}
                      <div style={{ padding: "9px 12px", cursor: "pointer" }} onClick={() => setExpandedScan(isExpanded ? null : s.id)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{typeInfo.icon}</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isVoided ? "#dc2626" : "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isVoided ? "line-through" : undefined }}>
                            {s.original_filename || typeInfo.label}
                          </span>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: isVoided ? "#fef2f2" : "#f1f5f9", color: isVoided ? "#dc2626" : "#64748b", flexShrink: 0 }}>
                            {isVoided ? "VOIDED" : s.scan_status}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
                          {s.ticket_number && <span style={{ fontSize: "0.6rem", background: "#f1f5f9", color: "#475569", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>#{s.ticket_number}</span>}
                          {s.truck_number  && <span style={{ fontSize: "0.6rem", background: "#f1f5f9", color: "#475569", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>Truck {s.truck_number}</span>}
                          {s.driver_name   && <span style={{ fontSize: "0.6rem", background: "#f1f5f9", color: "#475569", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>{s.driver_name}</span>}
                        </div>
                        {isPipeline && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: "0.6rem", color: statusColor(s.payroll_status || ""), fontWeight: 600 }}>Payroll: {s.payroll_status || "—"}</span>
                            <span style={{ fontSize: "0.6rem", color: "#cbd5e1" }}>·</span>
                            <span style={{ fontSize: "0.6rem", color: statusColor(s.billing_status || ""), fontWeight: 600 }}>Billing: {s.billing_status || "—"}</span>
                            <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "#94a3b8" }}>
                              {new Date(s.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                        {/* Mini chain */}
                        {isPipeline && (
                          <div style={{ display: "flex", gap: 2, marginTop: 5 }}>
                            {TICKET_CHAIN.map((_, i) => (
                              <div key={i} style={{ height: 3, flex: 1, borderRadius: 3, background: i <= chainStep ? "#16a34a" : "#f1f5f9" }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded actions */}
                      {isExpanded && (
                        <div style={{ padding: "6px 12px 10px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {s.object_path && (<>
                            <button onClick={() => openScanPreview(s)}
                              style={{ padding: "3px 8px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>👁 Preview</button>
                            <button onClick={() => setScanEmailModal({ scan: s, to: "", subject: `Ticket Scan — ${s.ticket_number || s.original_filename || "Scan"}`, message: `Truck: ${s.truck_number || "N/A"}\nDriver: ${s.driver_name || "N/A"}\n\n— MoveAround TMS`, sending: false })}
                              style={{ padding: "3px 8px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>✉ Email</button>
                            <button onClick={() => openScanPreview(s, true)}
                              style={{ padding: "3px 8px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>🖨 Print</button>
                          </>)}
                          {!isVoided && (<>
                            <button onClick={() => setScanEditModal({ scan: s, form: { ticket_number: s.ticket_number || "", truck_number: s.truck_number || "", driver_name: s.driver_name || "", amount: s.amount?.toString() || "" }, saving: false })}
                              style={{ padding: "3px 8px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>✏ Edit</button>
                            <button onClick={() => setScanVoidConfirm({ id: s.id, filename: s.original_filename || "this scan" })}
                              style={{ padding: "3px 8px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>🚫 Void</button>
                          </>)}
                          <button onClick={() => setScanDeleteConfirm({ id: s.id, filename: s.original_filename || "this scan" })}
                            style={{ padding: "3px 8px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>🗑 Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legal */}
      <div style={{ marginTop: 24, padding: "12px 0", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "0.65rem", color: "#94a3b8" }}>
          <strong style={{ color: "#64748b" }}>Fast Scan™</strong> is a product of <strong style={{ color: "#64748b" }}>Igotta Technologies</strong> and part of the <strong style={{ color: "#64748b" }}>MoveAround TMS</strong> platform.
        </p>
      </div>

      {/* ── Preview Modal ── */}
      {scanPreviewModal && (() => {
        const isImage = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(scanPreviewModal.url) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(scanPreviewModal.filename);
        const rot = scanPreviewModal.rotation;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, width: "min(96vw,1200px)", height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#0f172a", borderRadius: "14px 14px 0 0", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scanPreviewModal.filename}</span>
                {isImage && (<>
                  <button onClick={() => setScanPreviewModal(m => m && { ...m, rotation: (m.rotation - 90 + 360) % 360 })}
                    style={{ padding: "5px 11px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>↺ Left</button>
                  <button onClick={() => setScanPreviewModal(m => m && { ...m, rotation: (m.rotation + 90) % 360 })}
                    style={{ padding: "5px 11px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>↻ Right</button>
                </>)}
                <button onClick={() => { const w = window.open(scanPreviewModal.url, "_blank"); if (w) w.addEventListener("load", () => { try { w.print(); } catch {} }); }}
                  style={{ padding: "5px 11px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>🖨 Print</button>
                <a href={scanPreviewModal.url} download={scanPreviewModal.filename}
                  style={{ padding: "5px 11px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", textDecoration: "none" }}>⬇ Download</a>
                <button onClick={() => setScanPreviewModal(null)}
                  style={{ padding: "5px 11px", background: "rgba(255,255,255,0.12)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>✕ Close</button>
              </div>
              <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", borderRadius: "0 0 14px 14px", padding: isImage ? 16 : 0 }}>
                {isImage
                  ? <img src={scanPreviewModal.url} alt="" style={{ maxWidth: rot % 180 === 0 ? "100%" : "90vh", maxHeight: rot % 180 === 0 ? "100%" : "90vw", objectFit: "contain", transform: `rotate(${rot}deg)`, transition: "transform 0.25s", borderRadius: 6 }} />
                  : <iframe src={scanPreviewModal.url} style={{ width: "100%", height: "100%", border: "none", borderRadius: "0 0 14px 14px" }} />}
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
            {(["to","subject"] as const).map(k => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k === "to" ? "To (email)" : "Subject"}</label>
                <input type={k === "to" ? "email" : "text"} value={(scanEmailModal as any)[k] || ""}
                  onChange={e => setScanEmailModal(m => m && ({ ...m, [k]: e.target.value }))}
                  style={{ ...S.input }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...S.label }}>Message</label>
              <textarea value={scanEmailModal.message} onChange={e => setScanEmailModal(m => m && ({ ...m, message: e.target.value }))}
                style={{ ...S.input, height: 80, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button disabled={scanEmailModal.sending || !scanEmailModal.to} onClick={sendScanEmail}
                style={{ flex: 1, padding: "10px 0", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: (!scanEmailModal.to || scanEmailModal.sending) ? 0.6 : 1 }}>
                {scanEmailModal.sending ? "Sending…" : "✉ Send Email"}
              </button>
              <button onClick={() => setScanEmailModal(null)}
                style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {scanEditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 18 }}>✏ Edit Scan Record</div>
            {(["ticket_number","truck_number","driver_name","amount"] as const).map(k => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ ...S.label }}>{{ ticket_number: "Ticket #", truck_number: "Truck #", driver_name: "Driver", amount: "Amount ($)" }[k]}</label>
                <input value={(scanEditModal.form as any)[k] || ""}
                  onChange={e => setScanEditModal(m => m && ({ ...m, form: { ...m.form, [k]: e.target.value } }))}
                  style={S.input} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button disabled={scanEditModal.saving} onClick={saveScanEdit}
                style={{ flex: 1, padding: "10px 0", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: scanEditModal.saving ? 0.6 : 1 }}>
                {scanEditModal.saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setScanEditModal(null)}
                style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Void Confirm ── */}
      {scanVoidConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>⚠</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>Void This Scan?</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 22, lineHeight: 1.5 }}><strong>{scanVoidConfirm.filename}</strong> will be marked voided and excluded from payroll and billing.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmVoid} style={{ flex: 1, padding: "11px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Yes, Void It</button>
              <button onClick={() => setScanVoidConfirm(null)} style={{ flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {scanDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>🗑</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>Delete This Scan?</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 22, lineHeight: 1.5 }}><strong>{scanDeleteConfirm.filename}</strong> will be permanently deleted.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "11px 0", background: "#be123c", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Yes, Delete It</button>
              <button onClick={() => setScanDeleteConfirm(null)} style={{ flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
