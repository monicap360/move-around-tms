"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx";

// ── Types ─────────────────────────────────────────────────────────────────────
type TicketStatus = "Scanned" | "Needs Review" | "Matched" | "Approved" | "Sent to Payroll" | "Sent to Billing" | "Paid" | "Archived";
type TicketRisk = "Low" | "Medium" | "High" | "Critical";
type ProofStatus = "Complete" | "Missing Driver Signature" | "Missing Customer Signature" | "Missing Required Documents";
type CrossCheckStatus = "Matched" | "Conflict" | "No Match" | "Duplicate";
type TicketTab = "fastscan" | "all" | "needs_review" | "invoice_match" | "excel_reconcile" | "pit_master" | "payroll_review" | "billing_ready" | "audit_trail" | "owner_dashboard";
type ErrorSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
type DriverRequestType = "none" | "ticket" | "photo" | "signature" | "scale_ticket";

type TicketRecord = {
  id: string; ticketNo: string; driver: string; truck: string; load: string;
  customer: string; vendor: string; pitName: string; plant: string; jobsite: string;
  project: string; poNumber: string; material: string;
  tons: number; grossWeight: number; tareWeight: number; rate: number; total: number;
  billingAmount: number; payrollAmount: number;
  billingStatus: string; payrollStatus: string;
  invoiceNumber: string | null; invoiceMatched: boolean;
  ticketDate: string; ticketSource: string; scanConfidence: number;
  status: TicketStatus; risk: TicketRisk; ticketHealthScore: number;
  proofStatus: ProofStatus; crossCheckStatus: CrossCheckStatus;
  payrollReady: boolean; billingReady: boolean; exceptionCount: number;
  weightVariancePct: number; driverVerified: boolean; truckVerified: boolean;
  duplicateRisk: boolean; duplicateMatch?: string; missingFields: number;
  lastUpdated: string; voided: boolean; voidedAt: string | null;
  voidedBy: string | null; voidReason: string | null;
};

type PitRecord = {
  id: string; vendorName: string; pitName: string; locationType: string;
  city: string; state: string; aliases: string; ocrKeywords: string;
  defaultMaterial: string; active: boolean; requiresPO: boolean; requiresTicketMatch: boolean;
};

type ReconcileRow = {
  id: string;
  ticketNo: string;
  date: string;
  driver: string;
  truck: string;
  material: string;
  field: string;
  errorType: string;
  excelValue: string;
  scannedValue: string;
  invoiceValue: string;
  suggestedValue: string;
  confidence: number;
  status: "pending" | "corrected" | "kept" | "flagged" | "overridden";
  correctionSource: string;
  correctionNote: string;
  correctedValue: string;
  correctedBy: string;
  correctedAt: string;
  // Financial intelligence fields
  error_severity: ErrorSeverity;
  dollar_impact: number;
  underbilled_amount: number;
  overbilled_amount: number;
  payroll_overpay_risk: number;
  vendor_overcharge_risk: number;
  missing_revenue_risk: number;
  assigned_to_department: string;
  assigned_to_user: string;
  approval_required: boolean;
  approval_status: ApprovalStatus;
  approved_by: string;
  approved_at: string;
  original_value: string;
  driver_request: DriverRequestType;
  driver_request_sent_at: string;
  driver_request_response: string;
  billing_blocked: boolean;
  billing_block_reason: string;
  payroll_blocked: boolean;
  payroll_block_reason: string;
  dispatcher_confirmed: boolean;
  is_duplicate: boolean;
  dispute_packet_ready: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, TicketStatus> = {
  scanned: "Scanned", needs_review: "Needs Review", matched: "Matched",
  approved: "Approved", sent_to_payroll: "Sent to Payroll", sent_to_billing: "Sent to Billing",
  paid: "Paid", archived: "Archived", rejected: "Needs Review", invoiced: "Sent to Billing",
  voided: "Archived", in_review: "Needs Review",
};

const TICKET_TABS: { id: TicketTab; label: string; icon: string }[] = [
  { id: "fastscan",       label: "Fast Scan",             icon: "⚡" },
  { id: "all",            label: "All Tickets",            icon: "📋" },
  { id: "needs_review",   label: "Needs Review",           icon: "⚠️" },
  { id: "invoice_match",  label: "Invoice Match",          icon: "🔍" },
  { id: "excel_reconcile",label: "Reconciliation Center",  icon: "🔍" },
  { id: "pit_master",     label: "Pit / Vendor Master",    icon: "📍" },
  { id: "payroll_review", label: "Payroll Review",         icon: "💵" },
  { id: "billing_ready",  label: "Billing Ready",          icon: "🧾" },
  { id: "audit_trail",    label: "Audit Trail",            icon: "📜" },
  { id: "owner_dashboard",label: "Owner Dashboard",        icon: "📊" },
];

const SCAN_TYPES = [
  { value: "ronyx_field_ticket", label: "Ronyx Field Ticket", icon: "📋", color: "#1d4ed8" },
  { value: "trip_proof",    label: "Trip Proof",    icon: "📄", color: "#16a34a" },
  { value: "dump_ticket",   label: "Dump Ticket",   icon: "🪨", color: "#d97706" },
  { value: "scale_ticket",  label: "Scale Ticket",  icon: "⚖️", color: "#0891b2" },
  { value: "fuel",          label: "Fuel / Toll",   icon: "⛽", color: "#2563eb" },
  { value: "receipt",       label: "Receipt",       icon: "🧾", color: "#7c3aed" },
  { value: "damage",        label: "Damage",        icon: "⚠️",  color: "#dc2626" },
  { value: "no_show",       label: "No-Show",       icon: "🚫", color: "#6b7280" },
  { value: "other",         label: "Other",         icon: "📌", color: "#64748b" },
];

// Column aliases for Excel import — maps varied header names to edge-function field names
const IMPORT_MAP: Record<string, string[]> = {
  ticket_number:     ["ticket #","ticket#","ticket number","ticket no","tkt#","tkt no","load #","load number","load no","ticket"],
  ticket_date:       ["date","ticket date","load date","trip date","delivery date","work date","service date"],
  truck_number:      ["truck","truck #","truck#","unit","unit #","vehicle","equip #","truck number","truck no","equipment","equipment #"],
  driver_name:       ["driver","driver name","operator","hauler","driver no","driver_name"],
  customer_name:     ["customer","client","bill to","account","billed to","customer name","sold to"],
  project_name:      ["project","job","project #","job #","job name","project name","job no","project no","work order","work order #"],
  po_number:         ["po","po#","po number","purchase order","po no","p.o.","p.o. number","po num"],
  pit_location_name: ["pit","yard","quarry","origin","from","source","pit/yard","plant","pickup","quarry name","pit name","facility","location"],
  material_name:     ["material","product","commodity","material type","mat","mat type","description","item","stone type","material name"],
  tons:              ["tons","net tons","net wt","qty","quantity","loads","weight","net weight","net ton","net","tonnage"],
  rate:              ["rate","rate/ton","$/ton","unit price","bill rate","customer rate","rate per ton","price","price/ton","rate per unit"],
  amount:            ["amount","total","total amount","gross","billing","extended","extended price","total price","charge"],
  invoice_number:    ["invoice","invoice #","invoice number","inv #","inv no","inv","statement #","statement no","bill #"],
};

// ── Ronyx Field Ticket OCR ───────────────────────────────────────────────────
type RonyxFields = {
  ticket_number: string; truck_number: string; ticket_date: string;
  truck_type: string; shift_type: string; loads: string; material: string;
  company_name_of_truck: string; customer: string; location: string;
  driver_printed_name: string; authorized_person: string;
  signature_present: boolean; start_time: string; end_time: string;
  total_hours: string; copy_color: string;
  ocr_confidence: number; extraction_confidence: number;
  exception_flags: string[]; missing_fields: string[];
};

const RONYX_EMPTY: RonyxFields = {
  ticket_number: "", truck_number: "", ticket_date: "", truck_type: "",
  shift_type: "", loads: "", material: "", company_name_of_truck: "",
  customer: "", location: "", driver_printed_name: "", authorized_person: "",
  signature_present: false, start_time: "", end_time: "", total_hours: "",
  copy_color: "", ocr_confidence: 0, extraction_confidence: 0,
  exception_flags: [], missing_fields: [],
};

function parseRonyxTicket(rawText: string, ocrConf: number): RonyxFields {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  function grab(labels: string[]): string {
    for (const lbl of labels) {
      const lu = lbl.toUpperCase();
      for (let i = 0; i < lines.length; i++) {
        const lineUp = lines[i].toUpperCase();
        if (!lineUp.includes(lu)) continue;
        const afterIdx = lineUp.indexOf(lu) + lu.length;
        const rest = lines[i].slice(afterIdx).replace(/^[\s:#]+/, "").trim();
        if (rest.length > 1) return rest;
        if (i + 1 < lines.length && lines[i + 1].length > 1) return lines[i + 1];
      }
    }
    return "";
  }

  function checkbox(opts: string[]): string {
    const up = rawText.toUpperCase();
    for (const opt of opts) {
      const idx = up.indexOf(opt.toUpperCase());
      if (idx === -1) continue;
      const before = up.slice(Math.max(0, idx - 8), idx);
      if (/[✓✗X☑]|\[X\]/.test(before) || /\bX\b/.test(before)) return opt;
    }
    return "";
  }

  const ticket_number       = grab(["TICKET #", "TICKET#", "TICKET NUMBER", "TICKET NO"]);
  const truck_number        = grab(["TRUCK #", "TRUCK#", "TRUCK NUMBER", "TRUCK NO"]);
  const ticket_date         = grab(["DATE"]);
  const truck_type          = checkbox(["DUMP TRUCK", "TRAILER TRUCK", "OTHER"]);
  const shift_type          = checkbox(["DAY SHIFT", "NIGHT SHIFT"]);
  const loads               = grab(["LOADS"]);
  const material            = grab(["MATERIAL"]);
  const company_name_of_truck = grab(["COMPANY NAME OF TRUCK", "COMPANY NAME"]);
  const customer            = grab(["CUSTOMER"]);
  const location            = grab(["LOCATION"]);
  const driver_printed_name = grab(["DRIVER PRINTED NAME", "DRIVER PRINT", "DRIVER NAME"]);
  const authorized_person   = grab(["AUTHORIZED PERSON", "AUTHORIZED BY"]);
  const start_time          = grab(["START TIME", "START"]);
  const end_time            = grab(["END TIME", "END"]);
  const total_hours         = grab(["TOTAL HRS", "TOTAL HOURS", "TOTAL HR"]);

  // Signature — look for non-label content near SIGNATURE label
  let signature_present = false;
  const sigIdx = lines.findIndex(l => l.toUpperCase().includes("SIGNATURE"));
  if (sigIdx !== -1) {
    const rest = lines[sigIdx].replace(/SIGNATURE|AUTHORIZED\s*PERSON/gi, "").trim();
    signature_present = rest.length > 2 || (sigIdx + 1 < lines.length && lines[sigIdx + 1].length > 2);
  }

  // Copy color
  let copy_color = "";
  const up = rawText.toUpperCase();
  if (up.includes("YELLOW") || up.includes("CUSTOMER COPY")) copy_color = "YELLOW";
  else if (up.includes("PINK") || up.includes("TRUCKER")) copy_color = "PINK";
  else if (up.includes("WHITE") || up.includes("RONYX LOGISTICS")) copy_color = "WHITE";

  const keyFields = [ticket_number, truck_number, ticket_date, customer, location,
    driver_printed_name, authorized_person, start_time, end_time, total_hours];
  const extraction_confidence = Math.round((keyFields.filter(Boolean).length / keyFields.length) * 100);

  return {
    ticket_number, truck_number, ticket_date, truck_type, shift_type, loads, material,
    company_name_of_truck, customer, location, driver_printed_name, authorized_person,
    signature_present, start_time, end_time, total_hours, copy_color,
    ocr_confidence: Math.round(ocrConf * 10) / 10,
    extraction_confidence,
    exception_flags: [], missing_fields: [],
  };
}

const STAT_BADGE: Record<string, { bg: string; color: string }> = {
  MATCHED:            { bg: "#f0fdf4", color: "#16a34a" },
  READY_FOR_BILLING:  { bg: "#eff6ff", color: "#1d4ed8" },
  READY_FOR_PAYROLL:  { bg: "#f0fdf4", color: "#15803d" },
  NEEDS_REVIEW:       { bg: "#fff7ed", color: "#ea580c" },
  MISSING_INVOICE:    { bg: "#fef3c7", color: "#d97706" },
  MISSING_TICKET:     { bg: "#fef3c7", color: "#d97706" },
  MISSING_PIT:        { bg: "#fef3c7", color: "#d97706" },
  PIT_MISMATCH:       { bg: "#fee2e2", color: "#dc2626" },
  RATE_MISMATCH:      { bg: "#fee2e2", color: "#dc2626" },
  TONNAGE_MISMATCH:   { bg: "#fee2e2", color: "#dc2626" },
  PO_MISMATCH:        { bg: "#fee2e2", color: "#dc2626" },
  DUPLICATE_TICKET:   { bg: "#ede9fe", color: "#7c3aed" },
  PAYROLL_HOLD:       { bg: "#fef3c7", color: "#b45309" },
  BILLING_HOLD:       { bg: "#fef3c7", color: "#b45309" },
  APPROVED:           { bg: "#f0fdf4", color: "#15803d" },
};

const DEFAULT_PITS: PitRecord[] = [
  { id: "1", vendorName: "Martin Marietta", pitName: "South Post Oak Yard", locationType: "Yard",
    city: "Houston", state: "TX", aliases: "South Post Oak, SPO, Gasmer",
    ocrKeywords: "SOUTH POST OAK, GASMER, MARTIN MARIETTA, SPO",
    defaultMaterial: "Limestone Base", active: true, requiresPO: true, requiresTicketMatch: true },
  { id: "2", vendorName: "Martin Marietta", pitName: "Garwood Sand & Gravel", locationType: "Sand / Gravel",
    city: "Garwood", state: "TX", aliases: "Garwood, Garwood Pit, Garwood Sand",
    ocrKeywords: "GARWOOD, SAND, GRAVEL, MARTIN MARIETTA",
    defaultMaterial: "Sand", active: true, requiresPO: true, requiresTicketMatch: true },
  { id: "3", vendorName: "Martin Marietta", pitName: "Beckmann Quarry", locationType: "Quarry",
    city: "San Antonio", state: "TX", aliases: "Beckmann, Beckmann Pit",
    ocrKeywords: "BECKMANN, QUARRY, MARTIN MARIETTA, LIMESTONE",
    defaultMaterial: "Crushed Limestone", active: true, requiresPO: false, requiresTicketMatch: true },
  { id: "4", vendorName: "Martin Marietta", pitName: "Hunter Rail Yard", locationType: "Rail Yard",
    city: "Houston", state: "TX", aliases: "Hunter, Hunter Yard",
    ocrKeywords: "HUNTER, RAIL, MARTIN MARIETTA",
    defaultMaterial: "Limestone", active: true, requiresPO: true, requiresTicketMatch: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function money(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function mapApiTicket(t: any, all: any[]): TicketRecord {
  const duplicateMatch = all.find((x) => x.ticket_number === t.ticket_number && x.id !== t.id);
  const isDuplicate = Boolean(duplicateMatch);
  const confidence = t.ocr_confidence != null ? Math.round(t.ocr_confidence * 100) : 85;
  const hasDriver = Boolean(t.driver_name);
  const hasTruck = Boolean(t.truck_number || t.unit_number);
  const dispatchMatch = t.dispatch_match !== false;
  const weightVariancePct = Number(t.weight_variance_pct ?? t.weight_variance ?? t.variance_pct ?? 0);
  const weightVerified = Math.abs(weightVariancePct) <= 2;
  const missing = (t.driver_name ? 0 : 1) + (t.truck_number ? 0 : 1) + (t.tons || t.quantity ? 0 : 1) + (t.ticket_number ? 0 : 1);
  const driverSignature = t.driver_signature || t.has_driver_signature || t.driver_signed || false;
  const customerSignature = t.customer_signature || t.has_customer_signature || t.customer_signed || false;
  const documentsComplete = t.documents_complete !== false && t.proof_status !== "missing";
  const proofStatus: ProofStatus = (t.proof_status as ProofStatus) ||
    (!driverSignature && !customerSignature ? "Missing Required Documents"
    : !driverSignature ? "Missing Driver Signature"
    : !customerSignature ? "Missing Customer Signature"
    : documentsComplete ? "Complete" : "Missing Required Documents");
  const risk: TicketRisk = isDuplicate || missing >= 3 ? "Critical" : missing >= 2 || confidence < 50 ? "High" : missing === 1 || confidence < 75 ? "Medium" : "Low";
  const rawStatus = (t.status || "scanned").toLowerCase().replace(/ /g, "_");
  const status: TicketStatus = STATUS_MAP[rawStatus] || "Scanned";
  const tons = parseFloat(t.tons || t.quantity || 0);
  const rate = parseFloat(t.pay_rate || t.rate || 0);
  const billRate = parseFloat(t.bill_rate || t.rate || 0);
  const billingAmount = tons * billRate;
  const payrollAmount = tons * rate;
  const payrollReady = t.payroll_hold === false && (status === "Approved" || status === "Sent to Payroll" || !!t.payroll_matched);
  const billingReady = t.billing_hold === false && (status === "Approved" || status === "Sent to Billing" || !!t.billing_matched);
  const scoreFactors = [hasDriver, hasTruck, dispatchMatch, weightVerified, driverSignature, customerSignature, !isDuplicate, payrollReady];
  const ticketHealthScore = Math.round((scoreFactors.filter(Boolean).length / scoreFactors.length) * 100);
  const exceptionCount = [!hasDriver, !hasTruck, !dispatchMatch, !weightVerified, !driverSignature, !customerSignature, isDuplicate, !payrollReady, !billingReady].filter(Boolean).length;
  const crossCheckRaw = (t.crosscheck_status || t.cross_check || t.match_status || "").toString().toLowerCase();
  const crossCheckStatus: CrossCheckStatus = crossCheckRaw === "matched" ? "Matched" : crossCheckRaw === "conflict" ? "Conflict" : crossCheckRaw === "duplicate" ? "Duplicate" : "No Match";

  return {
    id: t.id || `TCK-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    ticketNo: t.ticket_number || "Pending",
    driver: t.driver_name || "Unknown Driver",
    truck: t.truck_number || t.unit_number || "Unknown Truck",
    load: t.load_number || t.load_id || "Unmatched",
    customer: t.customer_name || t.client_name || "—",
    vendor: t.vendor_name || t.vendor || "—",
    pitName: t.pit_location_name || t.plant || t.origin || "—",
    plant: t.plant || t.origin || "—",
    jobsite: t.jobsite || t.destination || t.delivery_location || "—",
    project: t.project_name || t.job_name || "—",
    poNumber: t.po_number || "—",
    material: t.material || t.material_type || "—",
    tons, rate, grossWeight: parseFloat(t.gross_weight || 0), tareWeight: parseFloat(t.tare_weight || 0),
    total: t.total_amount || (tons * billRate) || 0,
    billingAmount, payrollAmount,
    billingStatus: billingReady ? "READY_FOR_BILLING" : isDuplicate ? "DUPLICATE_TICKET" : missing > 0 ? "NEEDS_REVIEW" : "BILLING_HOLD",
    payrollStatus: payrollReady ? "READY_FOR_PAYROLL" : isDuplicate ? "DUPLICATE_TICKET" : missing > 0 ? "NEEDS_REVIEW" : "PAYROLL_HOLD",
    invoiceNumber: t.invoice_number || null, invoiceMatched: Boolean(t.invoice_matched),
    ticketDate: t.ticket_date ? new Date(t.ticket_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    ticketSource: t.ticket_source || t.scan_source || t.source || "FastScan",
    scanConfidence: confidence, status, risk, ticketHealthScore, proofStatus, crossCheckStatus,
    payrollReady, billingReady, exceptionCount, weightVariancePct,
    driverVerified: t.driver_verified !== false, truckVerified: t.truck_verified !== false,
    duplicateRisk: isDuplicate, duplicateMatch: duplicateMatch?.ticket_number, missingFields: missing,
    lastUpdated: t.updated_at ? new Date(t.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—",
    voided: Boolean(t.voided),
    voidedAt: t.voided_at ? new Date(t.voided_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : null,
    voidedBy: t.voided_by || null, voidReason: t.void_reason || null,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SBadge({ code }: { code: string }) {
  const s = STAT_BADGE[code] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, fontWeight: 800, fontSize: "0.65rem", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {code.replace(/_/g, " ")}
    </span>
  );
}

function HealthBadge({ score }: { score: number }) {
  const bg = score >= 90 ? "#047857" : score >= 70 ? "#f59e0b" : score >= 50 ? "#ea580c" : "#dc2626";
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, background: bg, color: "#fff", fontWeight: 700, fontSize: "0.7rem" }}>{score}% Health</span>;
}

function ConfBar({ score }: { score: number }) {
  const c = score >= 90 ? "#16a34a" : score >= 70 ? "#f59e0b" : "#dc2626";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", marginBottom: 3 }}>
        <span>Scan Confidence</span><strong style={{ color: c }}>{score}%</strong>
      </div>
      <div style={{ height: 4, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [activeTab, setActiveTab] = useState<TicketTab>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Fast Scan state
  const [scanType, setScanType] = useState("trip_proof");
  const [scanDriver, setScanDriver] = useState("");
  const [scanTruck, setScanTruck] = useState("");
  const [scanJob, setScanJob] = useState("");
  const [scanVendor, setScanVendor] = useState("");
  const [scanPit, setScanPit] = useState("");
  const [scanTicketNo, setScanTicketNo] = useState("");
  const [scanDate, setScanDate] = useState("");
  const [scanMaterial, setScanMaterial] = useState("");
  const [scanGross, setScanGross] = useState("");
  const [scanTare, setScanTare] = useState("");
  const [scanNets, setScanNets] = useState("");
  const [scanRate, setScanRate] = useState("");
  const [scanPO, setScanPO] = useState("");
  const [scanAmount, setScanAmount] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  // Ronyx Field Ticket OCR state
  const ronyxFileRef = useRef<HTMLInputElement>(null);
  const [ronyxStep, setRonyxStep] = useState<"upload" | "review" | "done">("upload");
  const [ronyxOcrRunning, setRonyxOcrRunning] = useState(false);
  const [ronyxOcrProgress, setRonyxOcrProgress] = useState(0);
  const [ronyxImagePreview, setRonyxImagePreview] = useState("");
  const [ronyxRawText, setRonyxRawText] = useState("");
  const [ronyxScanSource, setRonyxScanSource] = useState("file_upload");
  const [ronyxFields, setRonyxFields] = useState<RonyxFields>(RONYX_EMPTY);
  const [ronyxSubmitting, setRonyxSubmitting] = useState(false);
  const [ronyxResult, setRonyxResult] = useState<{ ticket_id?: string; missing_fields?: string[]; exception_flags?: string[]; qr_token?: string; qr_url?: string; message?: string; error?: string } | null>(null);
  // Scan batch state
  const [batchActive, setBatchActive]           = useState(false);
  const [batchId, setBatchId]                   = useState<string | null>(null);
  const [batchName, setBatchName]               = useState("");
  const [batchScannerUsed, setBatchScannerUsed] = useState("ricoh_fi8170");
  const [batchStartedAt, setBatchStartedAt]     = useState<string | null>(null);
  const [batchPageCount, setBatchPageCount]     = useState(0);
  const [batchTicketCount, setBatchTicketCount] = useState(0);
  const [batchOcrCount, setBatchOcrCount]       = useState(0);
  const [batchExceptionCount, setBatchExceptionCount] = useState(0);
  const [batchDuplicateCount, setBatchDuplicateCount] = useState(0);
  const [batchPayrollHolds, setBatchPayrollHolds]     = useState(0);
  const [batchBillingHolds, setBatchBillingHolds]     = useState(0);
  // Scan quality flags for current Ronyx ticket
  const [ronyxQualityFlags, setRonyxQualityFlags] = useState<string[]>([]);
  // QR Code state
  const [qrOpen, setQrOpen]         = useState(false);
  const [qrTicketId, setQrTicketId] = useState("");
  const [qrTicketNo, setQrTicketNo] = useState("");
  const [qrToken, setQrToken]       = useState("");
  const [qrUrl, setQrUrl]           = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrScanCount, setQrScanCount]   = useState(0);
  // Pit master state
  const [pits, setPits] = useState<PitRecord[]>(DEFAULT_PITS);
  const [pitEditId, setPitEditId] = useState<string | null>(null);
  const [pitFormOpen, setPitFormOpen] = useState(false);
  const [pitForm, setPitForm] = useState<Partial<PitRecord>>({});
  // Excel reconcile state
  const [reconRows, setReconRows] = useState<ReconcileRow[]>([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [reconProcessed, setReconProcessed] = useState(false);

  // Excel import state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importOrigHeaders, setImportOrigHeaders] = useState<string[]>([]);
  const [importNormHeaders, setImportNormHeaders] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importUploadType, setImportUploadType] = useState("vendor_excel");
  const [importRunning, setImportRunning] = useState(false);
  const [importDoneCount, setImportDoneCount] = useState(0);
  const [importResult, setImportResult] = useState<{ created?: number; failed?: number; total?: number; errors?: string[]; error?: string } | null>(null);

  // Invoice upload state
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); }, []);

  const loadTickets = useCallback(async () => {
    try {
      const r = await fetch("/api/ronyx/tickets");
      const data = await r.json();
      if (Array.isArray(data.tickets)) setTickets(data.tickets.map((t: any, _: number, all: any[]) => mapApiTicket(t, all)));
    } catch { /* keep empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: string) => {
    const opt = STATUS_MAP[newStatus] || ("Needs Review" as TicketStatus);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: opt } : t)));
    try {
      await fetch(`/api/ronyx/tickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      showToast(`Ticket → ${opt}`);
    } catch { showToast("Update failed — retry"); loadTickets(); }
  }, [loadTickets, showToast]);

  const deleteTicket = useCallback(async (ticketId: string, reason: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ronyx/tickets/${ticketId}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleted_by: "manager", reason }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(`Delete failed: ${d.error || res.statusText}`); return; }
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, voided: true, voidedAt: new Date().toLocaleString(), voidedBy: "manager", voidReason: reason } : t));
      setDeleteConfirmId(null); setDeleteReason("");
      showToast("Ticket deleted and logged in audit trail.");
    } catch { showToast("Delete failed — check connection."); } finally { setDeleting(false); }
  }, [showToast]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    showToast(`Uploading ${files.length} file(s)…`);
    try {
      const createRes = await fetch("/api/ronyx/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "scanned", source: "FastScan" }) });
      const createData = await createRes.json();
      if (!createRes.ok) { showToast(`Failed: ${createData.error || createRes.statusText}`); return; }
      const ticketId = createData.ticket?.id || createData.id;
      if (!ticketId) { showToast("Ticket created — reloading…"); loadTickets(); return; }
      if (createData.ticket) { const opt = mapApiTicket(createData.ticket, [createData.ticket]); setTickets((prev) => [opt, ...prev]); }
      let err = "";
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append("file", file); form.append("ticket_id", ticketId);
        const upRes = await fetch("/api/ronyx/tickets/upload", { method: "POST", body: form });
        if (!upRes.ok) { const d = await upRes.json().catch(() => ({})); err = d.error || upRes.statusText; }
      }
      showToast(err ? `Saved — file upload failed: ${err}` : "Uploaded — processing OCR…");
      setTimeout(loadTickets, 1500);
    } catch (e: any) { showToast(`Upload failed: ${e?.message || "check connection"}`); }
  }, [loadTickets, showToast]);

  const startBatch = useCallback(async () => {
    try {
      const name = batchName || `Batch ${new Date().toLocaleDateString("en-US")}`;
      const res = await fetch("/api/ronyx/scan-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_name: name, scanner_used: batchScannerUsed }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(`Batch start failed: ${d.error}`); return; }
      setBatchId(d.batch.id);
      setBatchStartedAt(d.batch.started_at);
      setBatchActive(true);
      setBatchPageCount(0); setBatchTicketCount(0); setBatchOcrCount(0);
      setBatchExceptionCount(0); setBatchDuplicateCount(0); setBatchPayrollHolds(0); setBatchBillingHolds(0);
      showToast(`Scan batch started: ${name}`);
    } catch { showToast("Could not start batch — check connection."); }
  }, [batchName, batchScannerUsed, showToast]);

  const endBatch = useCallback(async () => {
    if (!batchId) { setBatchActive(false); return; }
    try {
      await fetch("/api/ronyx/scan-batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: batchId, status: "completed", ended_at: new Date().toISOString(),
          ticket_count: batchTicketCount, ocr_complete_count: batchOcrCount,
          exceptions_count: batchExceptionCount, duplicate_count: batchDuplicateCount,
          payroll_holds: batchPayrollHolds, billing_holds: batchBillingHolds, page_count: batchPageCount,
        }),
      });
      showToast(`Batch closed — ${batchTicketCount} tickets processed.`);
    } catch { /* non-fatal */ }
    setBatchActive(false); setBatchId(null); setBatchName("");
  }, [batchId, batchTicketCount, batchOcrCount, batchExceptionCount, batchDuplicateCount, batchPayrollHolds, batchBillingHolds, batchPageCount, showToast]);

  // Column name aliases so xlsx files with varied headers still work
  const COL_ALIASES: Record<string, string[]> = {
    ticket_number: ["ticket #","ticket#","ticket number","ticket no","tkt#","tkt no"],
    date:          ["date","ticket date","load date","trip date"],
    driver:        ["driver","driver name","driver_name","operator"],
    truck:         ["truck","truck #","truck#","unit","unit #","vehicle"],
    material:      ["material","material type","product","commodity"],
    tons:          ["tons","net tons","net wt","qty","quantity","loads","weight"],
    rate:          ["rate","rate/ton","$/ton","unit price","pay rate"],
    amount:        ["amount","total","total amount","gross","billing"],
    pit:           ["pit","yard","quarry","location","pit/yard","origin"],
    customer:      ["customer","client","bill to","account"],
    job:           ["job","project","job #","project #","po","po#","po number"],
  };

  const normalizeHeader = useCallback((h: string): string => {
    const lower = h.trim().toLowerCase();
    for (const [key, aliases] of Object.entries(COL_ALIASES)) {
      if (aliases.some(a => lower.includes(a))) return key;
    }
    return lower.replace(/[^a-z0-9]/g, "_");
  }, []);

  const processExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (raw.length < 2) { showToast("Sheet appears empty — check the file and try again."); return; }

        // Map header row
        const headerRow = (raw[0] as any[]).map((h: any) => normalizeHeader(String(h)));
        const col = (name: string) => headerRow.indexOf(name);

        const rows: ReconcileRow[] = [];

        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as any[];
          if (row.every(c => c === "" || c == null)) continue; // skip blank rows

          const excelTicketNo = String(row[col("ticket_number")] ?? "").trim();
          const excelTons     = parseFloat(String(row[col("tons")]   ?? "0").replace(/[^0-9.]/g, "")) || 0;
          const excelRate     = parseFloat(String(row[col("rate")]   ?? "0").replace(/[^0-9.]/g, "")) || 0;
          const excelPit      = String(row[col("pit")]      ?? "").trim();
          const excelDriver   = String(row[col("driver")]   ?? "").trim();
          const excelTruck    = String(row[col("truck")]    ?? "").trim();
          const excelMaterial = String(row[col("material")] ?? "").trim();
          const excelDate     = String(row[col("date")]     ?? "").trim();

          // Try to match against a scanned ticket
          const liveTickets = tickets.filter(t => !t.voided);
          const matched = liveTickets.find(t =>
            (excelTicketNo && t.ticketNo === excelTicketNo) ||
            (excelDriver && excelTruck && t.driver.toLowerCase().includes(excelDriver.toLowerCase()) && t.truck === excelTruck)
          );

          const baseRate = matched?.rate || excelRate || 18;
          const financialDefaults = {
            error_severity: "Medium" as ErrorSeverity,
            dollar_impact: 0, underbilled_amount: 0, overbilled_amount: 0,
            payroll_overpay_risk: 0, vendor_overcharge_risk: 0, missing_revenue_risk: 0,
            assigned_to_department: "Operations", assigned_to_user: "",
            approval_required: false, approval_status: "not_required" as ApprovalStatus,
            approved_by: "", approved_at: "", original_value: "",
            driver_request: "none" as DriverRequestType, driver_request_sent_at: "", driver_request_response: "",
            billing_blocked: false, billing_block_reason: "",
            payroll_blocked: false, payroll_block_reason: "",
            dispatcher_confirmed: false, is_duplicate: false, dispute_packet_ready: false,
          };

          const rowBase = {
            ticketNo: excelTicketNo || matched?.ticketNo || `Row ${i}`,
            date: excelDate || matched?.ticketDate || "—",
            driver: excelDriver || matched?.driver || "—",
            truck: excelTruck || matched?.truck || "—",
            material: excelMaterial || matched?.material || "—",
            status: "pending" as const,
            correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "",
            ...financialDefaults,
          };

          if (matched) {
            // Tonnage mismatch
            if (excelTons > 0 && Math.abs(excelTons - matched.tons) > 0.05) {
              const diff = matched.tons - excelTons; // positive = we have more than Excel shows
              const impact = Math.abs(diff) * baseRate;
              const severity: ErrorSeverity = impact > 500 ? "Critical" : impact > 100 ? "High" : impact > 25 ? "Medium" : "Low";
              const underbilled = diff > 0 ? impact : 0;  // scan > excel = we could bill more
              const overbilled  = diff < 0 ? impact : 0;  // excel > scan = vendor overcharged
              rows.push({ ...rowBase, id: `${i}-tons`, field: "Net Tons", errorType: "TONNAGE_MISMATCH",
                excelValue: excelTons.toFixed(2), scannedValue: matched.tons.toFixed(2),
                invoiceValue: matched.tons.toFixed(2), suggestedValue: matched.tons.toFixed(2),
                confidence: Math.round(90 - Math.abs(excelTons - matched.tons) * 5),
                error_severity: severity, dollar_impact: impact,
                underbilled_amount: underbilled, overbilled_amount: overbilled,
                vendor_overcharge_risk: overbilled,
                missing_revenue_risk: underbilled,
                approval_required: impact > 100, approval_status: impact > 100 ? "pending" : "not_required",
                billing_blocked: impact > 50, billing_block_reason: impact > 50 ? `Tonnage variance $${impact.toFixed(2)} requires resolution` : "",
                payroll_blocked: impact > 100, payroll_block_reason: impact > 100 ? `Tonnage discrepancy affects OO pay by ~$${(impact * 0.9).toFixed(2)}` : "",
                original_value: excelTons.toFixed(2),
              });
            }
            // Rate mismatch
            if (excelRate > 0 && Math.abs(excelRate - matched.rate) > 0.01) {
              const diff = excelRate - matched.rate; // positive = excel charged more than scan rate
              const impact = Math.abs(diff) * (matched.tons || excelTons || 20);
              const severity: ErrorSeverity = impact > 500 ? "Critical" : impact > 200 ? "High" : impact > 50 ? "Medium" : "Low";
              const overcharge = diff > 0 ? impact : 0;
              const underbilled = diff < 0 ? impact : 0;
              rows.push({ ...rowBase, id: `${i}-rate`, field: "Rate ($/ton)", errorType: "RATE_MISMATCH",
                excelValue: `$${excelRate.toFixed(2)}`, scannedValue: `$${matched.rate.toFixed(2)}`,
                invoiceValue: `$${matched.rate.toFixed(2)}`, suggestedValue: `$${matched.rate.toFixed(2)}`,
                confidence: 88,
                error_severity: severity, dollar_impact: impact,
                underbilled_amount: underbilled, overbilled_amount: overcharge,
                vendor_overcharge_risk: overcharge,
                missing_revenue_risk: underbilled,
                approval_required: impact > 200, approval_status: impact > 200 ? "pending" : "not_required",
                assigned_to_department: impact > 500 ? "Owner" : "Operations Manager",
                billing_blocked: true, billing_block_reason: `Rate variance $${impact.toFixed(2)} must be resolved before billing`,
                original_value: `$${excelRate.toFixed(2)}`,
              });
            }
            // Pit mismatch
            if (excelPit && matched.pitName !== "—" && !matched.pitName.toLowerCase().includes(excelPit.toLowerCase()) && !excelPit.toLowerCase().includes(matched.pitName.toLowerCase())) {
              rows.push({ ...rowBase, id: `${i}-pit`, field: "Pit / Yard", errorType: "PIT_MISMATCH",
                excelValue: excelPit, scannedValue: matched.pitName,
                invoiceValue: matched.pitName, suggestedValue: matched.pitName,
                confidence: 75,
                error_severity: "Medium", dollar_impact: 0,
                billing_blocked: true, billing_block_reason: "Pit/vendor mismatch — verify correct pit for rate table",
                original_value: excelPit,
              });
            }
          } else if (excelTicketNo) {
            // No matching scanned ticket — missing load = unrecoverable revenue
            const estTons = 20; const estRate = baseRate;
            const impact = estTons * estRate;
            rows.push({ ...rowBase, id: `${i}-missing`, field: "Ticket Match", errorType: "MISSING_TICKET",
              excelValue: excelTicketNo, scannedValue: "Not found in Fast Scan",
              invoiceValue: "—", suggestedValue: "Scan ticket or enter manually",
              confidence: 0,
              error_severity: "Critical", dollar_impact: impact,
              missing_revenue_risk: impact,
              approval_required: true, approval_status: "pending",
              assigned_to_department: "Operations",
              billing_blocked: true, billing_block_reason: "No scanned ticket proof — cannot bill without documentation",
              payroll_blocked: true, payroll_block_reason: "Cannot confirm load completion without ticket",
              driver_request: "ticket",
            });
          }
        }

        setExcelFileName(file.name);
        setReconRows(rows.length > 0 ? rows : []);
        setReconProcessed(true);
        showToast(`${file.name} parsed — ${raw.length - 1} rows, ${rows.length} mismatches found`);
      } catch (err: any) {
        showToast(`Failed to parse file: ${err?.message || "check format"}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [tickets, normalizeHeader, showToast]);

  const applyCorrection = useCallback((rowId: string, source: "scan" | "invoice" | "suggested" | "keep" | "flag", customValue?: string) => {
    setReconRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const val = source === "scan" ? r.scannedValue : source === "invoice" ? r.invoiceValue : source === "suggested" ? r.suggestedValue : source === "keep" ? r.excelValue : customValue || r.suggestedValue;
      const srcLabel = source === "scan" ? "Fast Scan" : source === "invoice" ? "Pit Invoice" : source === "keep" ? "Excel (kept)" : source === "flag" ? "Flagged for Review" : "Suggested / Admin Override";
      return {
        ...r, status: source === "keep" ? "kept" : source === "flag" ? "flagged" : source === "scan" || source === "invoice" ? "corrected" : "overridden",
        correctionSource: srcLabel, correctedValue: val,
        correctionNote: `Updated by Ronyx reconciliation. Original value: ${r.excelValue}. Source used: ${srcLabel}.`,
        correctedBy: "dispatcher", correctedAt: new Date().toLocaleString(),
      };
    }));
  }, []);

  const downloadCorrectedExcel = useCallback(() => {
    const resolved = reconRows.filter(r => r.status !== "pending");
    const pending  = reconRows.filter(r => r.status === "pending" || r.status === "flagged");
    const headers  = ["Ticket #","Date","Driver","Truck","Material","Field","Error Type","Original Excel Value","Corrected Value","Correction Source","Correction Note","Updated By","Updated At","Reconciliation Status"];
    const dataRows = reconRows.map(r => [
      r.ticketNo, r.date, r.driver, r.truck, r.material, r.field, r.errorType,
      r.excelValue,
      (r.status === "pending" || r.status === "flagged") ? r.suggestedValue : r.correctedValue,
      r.correctionSource || "Pending", r.correctionNote || "",
      r.correctedBy || "", r.correctedAt || "", r.status.toUpperCase(),
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Column widths
    ws["!cols"] = [10,12,18,10,16,14,18,20,20,18,40,14,20,18].map(w => ({ wch: w }));

    // Color corrected cells green, flagged yellow, errors red, overrides blue
    dataRows.forEach((row, ri) => {
      const status = reconRows[ri]?.status;
      const statusCell = XLSX.utils.encode_cell({ r: ri + 1, c: 13 });
      const corrCell   = XLSX.utils.encode_cell({ r: ri + 1, c: 8  });
      const fill =
        status === "corrected"  ? { fgColor: { rgb: "C6EFCE" } } :
        status === "overridden" ? { fgColor: { rgb: "BDD7EE" } } :
        status === "flagged"    ? { fgColor: { rgb: "FFEB9C" } } :
        status === "kept"       ? { fgColor: { rgb: "D9D9D9" } } :
                                  { fgColor: { rgb: "FFC7CE" } };
      if (ws[statusCell]) ws[statusCell].s = { fill };
      if (ws[corrCell])   ws[corrCell].s   = { fill };
    });

    XLSX.utils.book_append_sheet(wb, ws, "Corrected Reconciliation");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Ronyx_Corrected_Reconciliation_${date}.xlsx`);
    showToast(`Downloaded .xlsx — ${resolved.length} corrections, ${pending.length} unresolved`);
  }, [reconRows, showToast]);

  const runRonyxOcr = useCallback(async (file: File) => {
    setRonyxOcrRunning(true);
    setRonyxOcrProgress(0);
    setRonyxImagePreview(URL.createObjectURL(file));
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setRonyxOcrProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setRonyxRawText(data.text);
      const parsed = parseRonyxTicket(data.text, data.confidence);
      setRonyxFields(parsed);
      setRonyxStep("review");
    } catch (e: unknown) {
      showToast("OCR failed — you can fill fields manually below");
      setRonyxFields({ ...RONYX_EMPTY });
      setRonyxStep("review");
    } finally {
      setRonyxOcrRunning(false);
    }
  }, [showToast]);

  const submitRonyxTicket = useCallback(async () => {
    setRonyxSubmitting(true);
    try {
      // Auto-add quality flags based on OCR confidence
      const autoFlags = [...ronyxQualityFlags];
      if (ronyxFields.ocr_confidence < 60 && !autoFlags.includes("LOW_OCR_CONFIDENCE")) autoFlags.push("LOW_OCR_CONFIDENCE");
      if (!ronyxFields.ticket_number && !autoFlags.includes("MISSING_TICKET_NUMBER")) autoFlags.push("MISSING_TICKET_NUMBER");
      if (!ronyxFields.signature_present && !autoFlags.includes("MISSING_SIGNATURE")) autoFlags.push("MISSING_SIGNATURE");

      const res = await fetch("/api/ronyx/fast-scan/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ronyxFields,
          raw_ocr_text:       ronyxRawText,
          scan_source:        ronyxScanSource,
          scan_batch_id:      batchId || null,
          scan_quality_flags: autoFlags.length > 0 ? autoFlags : null,
        }),
      });
      const result = await res.json();
      setRonyxResult(result);
      setRonyxStep("done");
      if (!result.error) {
        showToast("Ronyx ticket routed to Reconciliation Command Center");
        // Update batch counters
        if (batchId) {
          const newTicketCount = batchTicketCount + 1;
          const newOcrCount    = batchOcrCount + 1;
          const newExc         = batchExceptionCount + (result.exception_flags?.length > 0 ? 1 : 0);
          const newPH          = batchPayrollHolds + 1;
          const newBH          = batchBillingHolds + 1;
          setBatchTicketCount(newTicketCount);
          setBatchOcrCount(newOcrCount);
          setBatchExceptionCount(newExc);
          setBatchPayrollHolds(newPH);
          setBatchBillingHolds(newBH);
          // Persist to DB
          fetch("/api/ronyx/scan-batches", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batch_id: batchId, ticket_count: newTicketCount, ocr_complete_count: newOcrCount, exceptions_count: newExc, payroll_holds: newPH, billing_holds: newBH }),
          }).catch(() => null);
        }
        setRonyxQualityFlags([]);
        await loadTickets();
      } else {
        showToast("Submit failed: " + result.error);
      }
    } catch {
      showToast("Submit failed — check connection");
    } finally {
      setRonyxSubmitting(false);
    }
  }, [ronyxFields, ronyxRawText, ronyxScanSource, ronyxQualityFlags, batchId, batchTicketCount, batchOcrCount, batchExceptionCount, batchPayrollHolds, batchBillingHolds, showToast, loadTickets]);

  const generateQr = useCallback(async (ticketId: string, ticketNo: string, existingToken?: string, existingUrl?: string, scanCount?: number) => {
    if (existingToken && existingUrl) {
      setQrTicketId(ticketId); setQrTicketNo(ticketNo);
      setQrToken(existingToken); setQrUrl(existingUrl);
      setQrScanCount(scanCount ?? 0); setQrOpen(true);
      return;
    }
    setQrGenerating(true);
    try {
      const res  = await fetch(`/api/ronyx/tickets/${ticketId}/qr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ created_by: "office" }) });
      const data = await res.json();
      if (data.error) { showToast("QR generation failed: " + data.error); return; }
      setQrTicketId(ticketId); setQrTicketNo(ticketNo);
      setQrToken(data.qr_token); setQrUrl(data.qr_url);
      setQrScanCount(0); setQrOpen(true);
      await loadTickets();
    } catch { showToast("QR generation failed"); }
    finally   { setQrGenerating(false); }
  }, [showToast, loadTickets]);

  const submitScan = useCallback(async () => {
    if (!scanDriver.trim() && !scanTruck.trim() && !scanTicketNo.trim()) { showToast("Enter ticket #, driver, or truck."); return; }
    setScanSubmitting(true);
    try {
      const res = await fetch("/api/ronyx/fast-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: `manual://fastscan/${Date.now()}`, file_type: "manual", scan_type: scanType,
          driver_name: scanDriver || null, detected_vehicle: scanTruck || null,
          job_number: scanJob || null, vendor_name: scanVendor || null, pit_location_name: scanPit || null,
          ticket_number: scanTicketNo || null, ticket_date: scanDate || null, material: scanMaterial || null,
          gross_weight: scanGross ? parseFloat(scanGross) : null, tare_weight: scanTare ? parseFloat(scanTare) : null,
          net_tons: scanNets ? parseFloat(scanNets) : null, po_number: scanPO || null,
          detected_amount: scanAmount ? parseFloat(scanAmount) : null, extracted_text: scanNotes || null,
          confidence_score: 1, uploaded_by: "dispatcher",
        }),
      });
      const data = await res.json();
      setScanResult(data);
      if (res.ok) {
        showToast(`✓ Ticket created — ${data.payroll_impact ? `Payroll: ${data.payroll_action}` : "No payroll impact"}`);
        [setScanDriver, setScanTruck, setScanJob, setScanVendor, setScanPit, setScanTicketNo, setScanDate, setScanMaterial, setScanGross, setScanTare, setScanNets, setScanRate, setScanPO, setScanAmount, setScanNotes].forEach(fn => fn(""));
        setTimeout(() => { loadTickets(); setActiveTab("all"); }, 1500);
      } else { showToast(`Scan failed: ${data.error}`); }
    } catch (e: any) { showToast(e.message); } finally { setScanSubmitting(false); }
  }, [scanType, scanDriver, scanTruck, scanJob, scanVendor, scanPit, scanTicketNo, scanDate, scanMaterial, scanGross, scanTare, scanNets, scanRate, scanPO, scanAmount, scanNotes, loadTickets, showToast]);

  // Parse Excel file and open import modal — captures ALL columns
  const processImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
        if (raw.length < 2) { showToast("File appears empty — no rows to import."); return; }

        const origHeaders = (raw[0] as string[]).map(h => String(h || "").trim()).filter(Boolean);
        const normHeaders = origHeaders.map(h => {
          const lower = h.toLowerCase();
          for (const [key, aliases] of Object.entries(IMPORT_MAP)) {
            if (aliases.some(a => lower.includes(a))) return key;
          }
          // keep original header as the key (space→underscore) so no data is lost
          return lower.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
        });

        const rows: Array<Record<string, string>> = raw.slice(1)
          .map(row => {
            const obj: Record<string, string> = {};
            (row as unknown[]).forEach((cell, i) => {
              const key = normHeaders[i];
              if (key) obj[key] = String(cell ?? "").trim();
            });
            return obj;
          })
          .filter(row => Object.values(row).some(v => v !== ""));

        setImportOrigHeaders(origHeaders);
        setImportNormHeaders(normHeaders);
        setImportRows(rows);
        setImportFileName(file.name);
        setImportResult(null);
        setImportDoneCount(0);
        setImportOpen(true);
        showToast(`${file.name} parsed — ${rows.length} rows, ${origHeaders.length} columns detected`);
      } catch (err: any) {
        showToast(`Failed to parse file: ${err?.message || "check format"}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [showToast]);

  // Batch import rows directly into aggregate_tickets
  const runImport = useCallback(async () => {
    if (importRows.length === 0 || importRunning) return;
    setImportRunning(true);
    setImportDoneCount(0);
    setImportResult(null);

    try {
      // Send all rows in one call; API handles chunking
      const res = await fetch("/api/ronyx/tickets/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: importRows }),
      });

      const result = await res.json();
      setImportDoneCount(importRows.length);
      setImportResult(result);

      if (res.ok) {
        showToast(`Import complete — ${result.created} of ${result.total} tickets added to TMS`);
        setTimeout(loadTickets, 1000);
      } else {
        showToast(`Import failed: ${result.error}`);
      }
    } catch (e: any) {
      setImportResult({ error: e.message });
      showToast(`Import error: ${e.message}`);
    } finally {
      setImportRunning(false);
    }
  }, [importRows, importRunning, showToast, loadTickets]);

  // Derived
  const activeTickets = useMemo(() => tickets.filter(t => !t.voided), [tickets]);
  const deletedTickets = useMemo(() => tickets.filter(t => t.voided), [tickets]);
  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase();
    return activeTickets.filter(t =>
      (t.ticketNo.toLowerCase().includes(q) || t.driver.toLowerCase().includes(q) || t.truck.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q) || t.pitName.toLowerCase().includes(q) || t.project.toLowerCase().includes(q)) &&
      (statusFilter === "All Statuses" || t.status === statusFilter)
    );
  }, [search, statusFilter, activeTickets]);

  const needsReviewTickets = useMemo(() => activeTickets.filter(t => t.exceptionCount > 0 || t.crossCheckStatus !== "Matched" || t.duplicateRisk), [activeTickets]);
  const payrollHoldTickets = useMemo(() => activeTickets.filter(t => !t.payrollReady), [activeTickets]);
  const payrollReadyTickets = useMemo(() => activeTickets.filter(t => t.payrollReady), [activeTickets]);
  const billingHoldTickets = useMemo(() => activeTickets.filter(t => !t.billingReady), [activeTickets]);
  const billingReadyTickets = useMemo(() => activeTickets.filter(t => t.billingReady), [activeTickets]);
  const totalBillingReady = useMemo(() => billingReadyTickets.reduce((s, t) => s + t.billingAmount, 0), [billingReadyTickets]);
  const totalPayrollReady = useMemo(() => payrollReadyTickets.reduce((s, t) => s + t.payrollAmount, 0), [payrollReadyTickets]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="tickets-page">
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1e293b", color: "#fff", padding: "14px 20px", borderRadius: 12, fontWeight: 600, fontSize: "0.85rem", zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", maxWidth: 380, lineHeight: 1.5, pointerEvents: "none" }}>
          {toast}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.heic" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      <input ref={batchInputRef} type="file" multiple accept="image/*,.pdf,.heic" style={{ display: "none" }} onChange={e => { handleFiles(e.target.files); setActiveTab("all"); }} />
      <input ref={invoiceFileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={() => showToast("Invoice uploaded — processing OCR…")} />
      <input ref={excelFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) processExcelFile(f); e.target.value = ""; }} />
      <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = ""; }} />
      <input ref={ronyxFileRef} type="file" accept="image/*,.pdf,.heic" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { setRonyxScanSource("file_upload"); runRonyxOcr(f); } e.target.value = ""; }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section style={{ background: "#0f172a", borderRadius: 16, padding: "28px 32px", marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>MoveAround TMS</p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>Ticket Command Center</h1>
          <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "0.83rem" }}>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>Fast Scan™</span> · Powered by Ronyx &nbsp;·&nbsp; Scan · Match · Reconcile · Pay · Bill
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setActiveTab("fastscan")} style={{ padding: "11px 18px", borderRadius: 10, background: "#4ade80", color: "#052e16", border: "none", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
            ⚡ Fast Scan Ticket
          </button>
          <button onClick={() => batchInputRef.current?.click()} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
            ⬆ Upload Tickets
          </button>
          <button onClick={() => setActiveTab("invoice_match")} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
            🧾 Upload Pit Invoice
          </button>
          <button onClick={() => importFileRef.current?.click()} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
            📊 Upload Excel
          </button>
          <button onClick={() => setActiveTab("excel_reconcile")} style={{ padding: "11px 20px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>
            🔍 Ticket Reconciliation Command Center
          </button>
        </div>
      </section>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Scanned Today", value: activeTickets.length, sub: "total tickets", color: "#0f172a", bg: "#f8fafc", border: "#e2e8f0" },
          { label: "Needs Review", value: needsReviewTickets.length, sub: "exceptions", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
          { label: "Ready for Billing", value: billingReadyTickets.length, sub: money(totalBillingReady), color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Ready for Payroll", value: payrollReadyTickets.length, sub: money(totalPayrollReady), color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Invoice Mismatches", value: activeTickets.filter(t => !t.invoiceMatched).length, sub: "unmatched", color: "#d97706", bg: "#fefce8", border: "#fde68a" },
          { label: "Missing Tickets", value: activeTickets.filter(t => t.missingFields > 0).length, sub: "incomplete", color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </section>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 24, overflowX: "auto" }}>
        {TICKET_TABS.map(tab => {
          const badge = tab.id === "needs_review" ? needsReviewTickets.length
            : tab.id === "payroll_review" ? payrollHoldTickets.length
            : tab.id === "billing_ready" ? billingReadyTickets.length
            : 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap",
              color: activeTab === tab.id ? "#1e40af" : "#64748b",
              borderBottom: activeTab === tab.id ? "2px solid #1e40af" : "2px solid transparent",
              marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
              {badge > 0 && <span style={{ background: tab.id === "billing_ready" ? "#1d4ed8" : tab.id === "needs_review" ? "#dc2626" : "#d97706", color: "#fff", borderRadius: 99, fontSize: "0.6rem", fontWeight: 800, padding: "1px 6px" }}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: FAST SCAN
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fastscan" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Batch Controls ── */}
            <div style={{ background: batchActive ? "#0f172a" : "#fff", borderRadius: 14, border: batchActive ? "2px solid #4ade80" : "1px solid #e2e8f0", padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: batchActive ? 16 : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: batchActive ? "#4ade80" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                    {batchActive ? "● BATCH IN PROGRESS" : "Scan Batch Controls"}
                  </div>
                  {!batchActive && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                      Start a batch to group tickets from one scanning session. Every ticket in the batch shares a scan_batch_id.
                    </div>
                  )}
                </div>
                {batchActive ? (
                  <button onClick={endBatch} style={{ padding: "8px 18px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>
                    ■ End Batch
                  </button>
                ) : (
                  <button onClick={startBatch} style={{ padding: "8px 18px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>
                    ▶ Start Batch
                  </button>
                )}
              </div>

              {/* Batch setup fields (only when not yet active) */}
              {!batchActive && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Batch Name</label>
                    <input value={batchName} onChange={e => setBatchName(e.target.value)}
                      placeholder={`Batch ${new Date().toLocaleDateString("en-US")}`}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Scanner Used</label>
                    <select value={batchScannerUsed} onChange={e => setBatchScannerUsed(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}>
                      <option value="ricoh_fi8170">Ricoh fi-8170 (Production)</option>
                      <option value="scansnap_ix2500">ScanSnap iX2500 (Front Office)</option>
                      <option value="scansnap_ix1600">ScanSnap iX1600 (Backup)</option>
                      <option value="canon_drg2110">Canon DR-G2110 (Enterprise)</option>
                      <option value="camera">Camera / Phone</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Batch live counters */}
              {batchActive && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {[
                    { label: "Pages", value: batchPageCount, color: "#e2e8f0" },
                    { label: "Tickets", value: batchTicketCount, color: "#4ade80" },
                    { label: "OCR Done", value: batchOcrCount, color: "#60a5fa" },
                    { label: "Exceptions", value: batchExceptionCount, color: "#fb923c" },
                    { label: "Duplicates", value: batchDuplicateCount, color: "#f472b6" },
                    { label: "Payroll Holds", value: batchPayrollHolds, color: "#fde68a" },
                    { label: "Billing Holds", value: batchBillingHolds, color: "#fde68a" },
                  ].map(c => (
                    <div key={c.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                      <div style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 600, marginTop: 3 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload zone */}
            <div style={{ background: "#fff", borderRadius: 14, border: "2px dashed #cbd5e1", padding: 32, textAlign: "center" }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📄</div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>Drop Ticket Here to Fast Scan</h3>
              <p style={{ margin: "0 0 4px", color: "#4ade80", fontWeight: 700, fontSize: "0.72rem" }}>Fast Scan™ · Powered by Ronyx</p>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.8rem" }}>
                JPG · PNG · PDF · HEIC · Batch upload · Multi-page packets · Pit Invoices · Driver Documents · Contracts
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                {[
                  { label: "🖨 Ricoh fi-8170", onClick: () => batchInputRef.current?.click() },
                  { label: "📷 Camera / Phone", onClick: () => fileInputRef.current?.click() },
                  { label: "🖼 Upload Image", onClick: () => fileInputRef.current?.click() },
                  { label: "📄 Upload PDF", onClick: () => fileInputRef.current?.click() },
                  { label: "📦 Batch Upload", onClick: () => batchInputRef.current?.click() },
                ].map(b => (
                  <button key={b.label} onClick={b.onClick} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e40af", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    {b.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { label: "📋 Ronyx Field Ticket", color: "#1d4ed8" },
                  { label: "🧾 Pit Invoice", color: "#d97706" },
                  { label: "🪪 Driver Document", color: "#7c3aed" },
                  { label: "📝 Contract", color: "#0891b2" },
                  { label: "🧾 Receipt", color: "#16a34a" },
                ].map(d => (
                  <span key={d.label} style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: d.color + "15", color: d.color, border: `1px solid ${d.color}40` }}>
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Scan type */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>Scan Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                {SCAN_TYPES.map(t => (
                  <button key={t.value} onClick={() => setScanType(t.value)} style={{
                    padding: "10px 6px", borderRadius: 9, textAlign: "center",
                    border: `2px solid ${scanType === t.value ? t.color : "#e2e8f0"}`,
                    background: scanType === t.value ? t.color + "15" : "#f8fafc", cursor: "pointer"
                  }}>
                    <div style={{ fontSize: "1.3rem" }}>{t.icon}</div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: scanType === t.value ? t.color : "#64748b", marginTop: 3 }}>{t.label}</div>
                  </button>
                ))}
              </div>

              {/* ── Ronyx Field Ticket vs. Generic OCR ── */}
              {scanType === "ronyx_field_ticket" ? (
                <div>
                  {/* ── STEP: upload ── */}
                  {ronyxStep === "upload" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", fontSize: "0.78rem", color: "#1e40af", fontWeight: 600 }}>
                        📋 Ronyx Field Ticket — OCR template active. Upload the physical ticket image or scan.
                      </div>
                      {ronyxOcrRunning ? (
                        <div style={{ padding: "20px 0", textAlign: "center" }}>
                          <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 10 }}>Extracting fields from ticket…</div>
                          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", margin: "0 auto", maxWidth: 300 }}>
                            <div style={{ width: `${ronyxOcrProgress}%`, height: "100%", background: "#1d4ed8", borderRadius: 99, transition: "width 200ms" }} />
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 8 }}>{ronyxOcrProgress}% — Tesseract OCR reading ticket</div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { label: "🖨 Ricoh fi-8170", src: "ricoh_fi8170", primary: true },
                            { label: "📷 Camera / Phone", src: "camera", primary: false },
                            { label: "🖨 ScanSnap Backup", src: "scansnap_ix2500", primary: false },
                            { label: "🖼 Upload Image / PDF", src: "file_upload", primary: false },
                          ].map(b => (
                            <button key={b.src} onClick={() => { setRonyxScanSource(b.src); ronyxFileRef.current?.click(); }}
                              style={{ flex: 1, minWidth: 130, padding: "12px 10px", borderRadius: 10,
                                border: `2px solid ${b.primary ? "#1d4ed8" : "#bfdbfe"}`,
                                background: b.primary ? "#1d4ed8" : "#eff6ff",
                                color: b.primary ? "#fff" : "#1e40af",
                                fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", textAlign: "center" }}>
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                        <button onClick={() => { setRonyxFields(RONYX_EMPTY); setRonyxStep("review"); }}
                          style={{ fontSize: "0.75rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                          Skip OCR — fill fields manually
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP: review ── */}
                  {ronyxStep === "review" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Confidence banner */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f8fafc", borderRadius: 9, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                        {ronyxImagePreview && <img src={ronyxImagePreview} alt="ticket" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0f172a" }}>Extraction Review</div>
                          <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 2 }}>
                            OCR conf: <strong>{ronyxFields.ocr_confidence}%</strong> &nbsp;·&nbsp;
                            Field extraction: <strong style={{ color: ronyxFields.extraction_confidence >= 70 ? "#16a34a" : "#dc2626" }}>{ronyxFields.extraction_confidence}%</strong>
                          </div>
                        </div>
                        <button onClick={() => { setRonyxStep("upload"); setRonyxImagePreview(""); }}
                          style={{ fontSize: "0.7rem", color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>Re-scan</button>
                      </div>

                      {/* Exception flags */}
                      {ronyxFields.exception_flags.length > 0 && (
                        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 9, padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#dc2626", marginBottom: 6 }}>Missing / Exception Flags</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {ronyxFields.exception_flags.map(f => (
                              <span key={f} style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fee2e2", color: "#dc2626" }}>{f}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scan quality flags */}
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#92400e", marginBottom: 8 }}>Scan Quality — Check All That Apply</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {[
                            ["LOW_OCR_CONFIDENCE", "Low OCR confidence"],
                            ["BLURRY_SCAN", "Blurry scan"],
                            ["MISSING_SIGNATURE", "Missing signature"],
                            ["MISSING_TICKET_NUMBER", "Missing ticket number"],
                            ["DUPLICATE_TICKET", "Duplicate ticket"],
                            ["UNREADABLE_TICKET", "Unreadable ticket"],
                            ["MANUAL_REVIEW_REQUIRED", "Manual review required"],
                          ].map(([flag, label]) => {
                            const autoSet = (flag === "LOW_OCR_CONFIDENCE" && ronyxFields.ocr_confidence < 60)
                              || (flag === "MISSING_TICKET_NUMBER" && !ronyxFields.ticket_number)
                              || (flag === "MISSING_SIGNATURE" && !ronyxFields.signature_present);
                            const isChecked = ronyxQualityFlags.includes(flag) || autoSet;
                            return (
                              <label key={flag} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.75rem", color: "#78350f", fontWeight: autoSet ? 700 : 500 }}>
                                <input type="checkbox" checked={isChecked}
                                  onChange={e => setRonyxQualityFlags(prev =>
                                    e.target.checked ? [...new Set([...prev, flag])] : prev.filter(f => f !== flag)
                                  )}
                                  style={{ width: 14, height: 14 }} />
                                {label}{autoSet ? " ⚠" : ""}
                              </label>
                            );
                          })}
                        </div>
                        {batchId && (
                          <div style={{ marginTop: 8, fontSize: "0.65rem", color: "#92400e", fontWeight: 600 }}>
                            Batch: {batchName || "In Progress"} · Scanner: {batchScannerUsed.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>

                      {/* Editable fields grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {([
                          ["Ticket #",             "ticket_number",        "e.g. 123456"],
                          ["Truck #",              "truck_number",         "e.g. 104"],
                          ["Date",                 "ticket_date",          "MM/DD/YYYY"],
                          ["Truck Type",           "truck_type",           "DUMP TRUCK / TRAILER / OTHER"],
                          ["Shift",                "shift_type",           "DAY SHIFT / NIGHT SHIFT"],
                          ["Loads",                "loads",                "e.g. 1"],
                          ["Material",             "material",             "e.g. Limestone Base"],
                          ["Company Name of Truck","company_name_of_truck","e.g. Ronyx Logistics LLC"],
                          ["Customer",             "customer",             "e.g. TxDOT"],
                          ["Location",             "location",             "e.g. I-45 Project"],
                          ["Driver Printed Name",  "driver_printed_name",  "Full name"],
                          ["Authorized Person",    "authorized_person",    "Supervisor name"],
                          ["Start Time",           "start_time",           "e.g. 7:00 AM"],
                          ["End Time",             "end_time",             "e.g. 4:30 PM"],
                          ["Total Hours",          "total_hours",          "e.g. 9.5"],
                          ["Copy Color",           "copy_color",           "WHITE / YELLOW / PINK"],
                        ] as [string, keyof RonyxFields, string][]).map(([lbl, key, ph]) => {
                          const val = ronyxFields[key];
                          const isEmpty = typeof val === "boolean" ? false : !val || val === "";
                          return (
                            <div key={key}>
                              <label style={{ fontSize: "0.63rem", fontWeight: 700, color: isEmpty ? "#dc2626" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                                {lbl}{isEmpty ? " ⚠" : ""}
                              </label>
                              <input
                                value={typeof val === "boolean" ? "" : (val as string)}
                                onChange={e => setRonyxFields(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={ph}
                                style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${isEmpty ? "#fca5a5" : "#e2e8f0"}`, fontSize: "0.8rem", outline: "none", background: isEmpty ? "#fff1f2" : "#f8fafc", boxSizing: "border-box" }} />
                            </div>
                          );
                        })}
                      </div>

                      {/* Signature checkbox */}
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>
                        <input type="checkbox" checked={ronyxFields.signature_present}
                          onChange={e => setRonyxFields(prev => ({ ...prev, signature_present: e.target.checked }))}
                          style={{ width: 16, height: 16 }} />
                        Authorized signature is present on the physical ticket
                      </label>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                        <button onClick={submitRonyxTicket} disabled={ronyxSubmitting}
                          style={{ padding: "10px 22px", borderRadius: 9, background: ronyxSubmitting ? "#93c5fd" : "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.85rem", cursor: ronyxSubmitting ? "not-allowed" : "pointer" }}>
                          {ronyxSubmitting ? "Submitting…" : "🔍 Send to Reconciliation"}
                        </button>
                        <button onClick={() => { setRonyxStep("upload"); setRonyxImagePreview(""); }}
                          style={{ padding: "10px 14px", borderRadius: 9, background: "#f1f5f9", border: "none", fontWeight: 600, color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
                          Attach Original Scan
                        </button>
                        <button onClick={() => { setRonyxFields(prev => ({ ...prev, exception_flags: prev.missing_fields.map(f => "MISSING_" + f.toUpperCase()) })); }}
                          style={{ padding: "10px 14px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", fontWeight: 600, color: "#ea580c", fontSize: "0.82rem", cursor: "pointer" }}>
                          Mark Missing Info
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP: done ── */}
                  {ronyxStep === "done" && ronyxResult && (
                    <div style={{ padding: "16px 18px", borderRadius: 12, background: ronyxResult.error ? "#fff1f2" : "#f0fdf4", border: `1px solid ${ronyxResult.error ? "#fca5a5" : "#86efac"}` }}>
                      {ronyxResult.error ? (
                        <div style={{ color: "#dc2626", fontWeight: 800 }}>Error: {ronyxResult.error}</div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 900, color: "#16a34a", fontSize: "0.95rem", marginBottom: 4 }}>✓ Ticket routed to Reconciliation</div>
                          <div style={{ fontSize: "0.78rem", color: "#166534" }}>{ronyxResult.message}</div>
                          {ronyxResult.missing_fields && ronyxResult.missing_fields.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: "0.72rem", color: "#d97706" }}>
                              Holds active until resolved: {ronyxResult.missing_fields.join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button onClick={() => { setRonyxStep("upload"); setRonyxFields(RONYX_EMPTY); setRonyxResult(null); setRonyxImagePreview(""); }}
                          style={{ padding: "8px 16px", borderRadius: 8, background: "#f1f5f9", border: "none", fontWeight: 600, color: "#475569", fontSize: "0.8rem", cursor: "pointer" }}>
                          Scan Another Ticket
                        </button>
                        {ronyxResult && !ronyxResult.error && ronyxResult.ticket_id && ronyxResult.qr_url && (
                          <button onClick={() => generateQr(ronyxResult!.ticket_id!, ronyxResult!.ticket_id!.slice(-6).toUpperCase(), ronyxResult!.qr_token, ronyxResult!.qr_url, 0)}
                            style={{ padding: "8px 16px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                            📱 View QR Code
                          </button>
                        )}
                        <button onClick={() => setActiveTab("excel_reconcile")}
                          style={{ padding: "8px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                          Go to Reconciliation →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Generic OCR / Manual Fields ── */
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>OCR / Manual Fields</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      ["Ticket Number", scanTicketNo, setScanTicketNo, "e.g. 123456"],
                      ["Ticket Date", scanDate, setScanDate, "MM/DD/YYYY"],
                      ["Vendor / Company", scanVendor, setScanVendor, "e.g. Martin Marietta"],
                      ["Pit / Yard / Quarry", scanPit, setScanPit, "e.g. South Post Oak"],
                      ["Driver Name", scanDriver, setScanDriver, "e.g. Jose Martinez"],
                      ["Truck / Unit #", scanTruck, setScanTruck, "e.g. 104"],
                      ["Project / Job", scanJob, setScanJob, "e.g. I-45 Base Job"],
                      ["PO Number", scanPO, setScanPO, "e.g. PO-2024-001"],
                      ["Material", scanMaterial, setScanMaterial, "e.g. Limestone Base"],
                      ["Gross Weight", scanGross, setScanGross, "e.g. 68000"],
                      ["Tare Weight", scanTare, setScanTare, "e.g. 34000"],
                      ["Net Tons", scanNets, setScanNets, "e.g. 17.00"],
                      ["Rate ($/ton)", scanRate, setScanRate, "e.g. 18.50"],
                      ["Total Amount", scanAmount, setScanAmount, "e.g. 314.50"],
                    ] as [string, string, (v: string) => void, string][]).map(([label, val, set, ph]) => (
                      <div key={label}>
                        <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{label}</label>
                        <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                          style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.83rem", outline: "none", background: "#f8fafc", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Extracted Text / Notes</label>
                    <textarea value={scanNotes} onChange={e => setScanNotes(e.target.value)} placeholder="Paste OCR text or any additional notes…" style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.83rem", outline: "none", background: "#f8fafc", height: 72, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    <button disabled={scanSubmitting} onClick={submitScan} style={{ padding: "11px 26px", borderRadius: 9, background: "#1e40af", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.88rem", cursor: scanSubmitting ? "not-allowed" : "pointer", opacity: scanSubmitting ? 0.7 : 1 }}>
                      {scanSubmitting ? "Submitting…" : "⚡ Submit Scan"}
                    </button>
                    <button onClick={() => setActiveTab("all")} style={{ padding: "11px 18px", borderRadius: 9, background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                  {scanResult && (
                    <div style={{ marginTop: 14, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: "0.82rem" }}>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>✓ Scan Submitted</div>
                      <div style={{ color: "#166534", marginTop: 3 }}>{scanResult.message}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#0f172a", borderRadius: 14, padding: 22, color: "#e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#4ade80", marginBottom: 2 }}>Fast Scan™</div>
              <div style={{ fontSize: "0.62rem", color: "#64748b", marginBottom: 14 }}>Scan · Match · Reconcile · Pay · Bill</div>
              {[
                ["Ticket Number", "Unique — duplicate detection"],
                ["Vendor / Pit", "Matched to pit master"],
                ["Driver", "Matched to dispatch / CDL"],
                ["Truck", "Fleet match + inspection"],
                ["Customer / Project", "Linked to job order"],
                ["PO Number", "Against job PO"],
                ["Material", "Type + job spec"],
                ["Gross / Tare / Net", "Weight vs. truck capacity"],
                ["Rate", "vs. contract rate"],
                ["Signature / Proof", "Driver + customer"],
                ["Invoice Status", "Pending / Matched / Missing"],
                ["Payroll Status", "Ready / Hold / Review"],
                ["Billing Status", "Ready / Hold / Review"],
                ["Batch ID", "Groups tickets by scan session"],
                ["Scan Quality", "OCR confidence + blurry flag"],
                ["Duplicate Check", "Flags repeat ticket numbers"],
              ].map(([f, d]) => (
                <div key={f} style={{ display: "flex", gap: 10, marginBottom: 9 }}>
                  <span style={{ color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#f1f5f9" }}>{f}</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 1 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Document types accepted */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a", marginBottom: 10 }}>Document Types</div>
              {[
                ["📋", "Ronyx Field Ticket", "#1d4ed8"],
                ["🧾", "Pit Invoice", "#d97706"],
                ["🪪", "Driver Document", "#7c3aed"],
                ["📝", "Contract", "#0891b2"],
                ["🧾", "Receipt", "#16a34a"],
                ["📦", "Multi-page Packet", "#475569"],
              ].map(([icon, label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#0f172a", marginBottom: 10 }}>Routes ticket to</div>
              {[["💵", "READY_FOR_PAYROLL", "#f0fdf4", "#15803d"], ["🧾", "READY_FOR_BILLING", "#eff6ff", "#1d4ed8"], ["⚠️", "NEEDS_REVIEW", "#fff7ed", "#ea580c"], ["⛔", "PAYROLL_HOLD", "#fef3c7", "#b45309"]].map(([icon, label, bg, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, background: bg, color, padding: "2px 9px", borderRadius: 99, letterSpacing: "0.04em" }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Recommended hardware */}
            <div style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a", marginBottom: 10 }}>Recommended Hardware</div>
              {[
                { label: "Ricoh fi-8170", role: "Production (70 ppm)", color: "#16a34a", badge: "PRIMARY" },
                { label: "ScanSnap iX2500", role: "Front Office / Backup", color: "#d97706", badge: "BACKUP" },
                { label: "Canon DR-G2110", role: "High-volume enterprise", color: "#7c3aed", badge: "OPTIONAL" },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "1px 7px", borderRadius: 99, background: s.color + "15", color: s.color }}>{s.badge}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 2, paddingLeft: 2 }}>{s.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ALL TICKETS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "all" && (
        <div>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket #, driver, truck, vendor, pit, project…"
              style={{ flex: 1, minWidth: 260, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.83rem", outline: "none" }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.83rem" }}>
              <option>All Statuses</option>
              {["Scanned","Needs Review","Matched","Approved","Sent to Payroll","Sent to Billing","Paid","Archived"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={loadTickets} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: "0.83rem", cursor: "pointer" }}>↻ Refresh</button>
          </div>

          {/* Table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>All Tickets</span>
              <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>{filteredTickets.length} records</span>
            </div>
            {loading ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>Loading tickets…</div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
                {activeTickets.length === 0 ? "No tickets yet — upload your first ticket above." : "No tickets match filters."}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Ticket #","Date","Vendor","Pit","Driver","Truck","Project","Material","Tons","Invoice","Billing","Payroll","Action"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "9px 12px", fontWeight: 800, color: "#0f172a" }}>{t.ticketNo}</td>
                        <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{t.ticketDate}</td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>{t.vendor}</td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>{t.pitName}</td>
                        <td style={{ padding: "9px 12px", color: "#0f172a", fontWeight: 600 }}>{t.driver}</td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>{t.truck}</td>
                        <td style={{ padding: "9px 12px", color: "#475569", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{t.project}</td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>{t.material}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>{t.tons.toFixed(2)}</td>
                        <td style={{ padding: "9px 12px" }}><SBadge code={t.invoiceMatched ? "MATCHED" : "MISSING_INVOICE"} /></td>
                        <td style={{ padding: "9px 12px" }}><SBadge code={t.billingStatus} /></td>
                        <td style={{ padding: "9px 12px" }}><SBadge code={t.payrollStatus} /></td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", alignItems: "center" }}>
                            <button onClick={() => updateTicketStatus(t.id, "approved")} style={{ padding: "4px 10px", borderRadius: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer", whiteSpace: "nowrap" }}>Approve</button>
                            <button
                              onClick={() => generateQr(t.id, t.ticketNo, (t as any).qr_token, (t as any).qr_url, (t as any).qr_scan_count)}
                              title={`Fast Scan™ QR${(t as any).qr_token ? " (exists)" : ""}`}
                              style={{ padding: "4px 8px", borderRadius: 6, background: (t as any).qr_token ? "#eff6ff" : "#f8fafc", border: `1px solid ${(t as any).qr_token ? "#bfdbfe" : "#e2e8f0"}`, color: (t as any).qr_token ? "#1d4ed8" : "#64748b", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>
                              {qrGenerating && qrTicketId === t.id ? "…" : "QR"}
                            </button>
                            <button onClick={() => { setDeleteConfirmId(t.id); setDeleteReason(""); }} style={{ padding: "4px 8px", borderRadius: 6, background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ticket cards for detailed view */}
          {filteredTickets.length > 0 && filteredTickets.length <= 20 && (
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredTickets.map(ticket => (
                <article key={ticket.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {ticket.duplicateRisk && (
                    <div style={{ background: "#7c3aed", color: "#fff", padding: "6px 18px", fontSize: "0.72rem", fontWeight: 800 }}>
                      ⚠ POSSIBLE DUPLICATE — Similar to #{ticket.duplicateMatch}
                    </div>
                  )}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>Ticket #{ticket.ticketNo}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{ticket.vendor} — {ticket.pitName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 1 }}>Date: {ticket.ticketDate} · Truck: {ticket.truck} · Driver: {ticket.driver}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <HealthBadge score={ticket.ticketHealthScore} />
                      <SBadge code={ticket.billingStatus} />
                      <SBadge code={ticket.payrollStatus} />
                    </div>
                  </div>
                  <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                    {[
                      ["Project", ticket.project],
                      ["Material", ticket.material],
                      ["Net Tons", ticket.tons.toFixed(2)],
                      ["Rate", `$${ticket.rate.toFixed(2)}/ton`],
                      ["Billing Amt", money(ticket.billingAmount)],
                      ["Payroll Amt", money(ticket.payrollAmount)],
                      ["Invoice #", ticket.invoiceNumber || "—"],
                      ["PO #", ticket.poNumber],
                      ["Proof", ticket.proofStatus === "Complete" ? "✅ Complete" : "⚠ " + ticket.proofStatus],
                      ["Confidence", `${ticket.scanConfidence}%`],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem", marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <ConfBar score={ticket.scanConfidence} />
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "View Scan",     action: () => showToast("View scan — attach file support coming soon") },
                      { label: "Edit Fields",   action: () => showToast("Edit fields — open full edit form") },
                      { label: "Match Invoice", action: () => setActiveTab("invoice_match") },
                      { label: "Send to Billing",  action: () => updateTicketStatus(ticket.id, "sent_to_billing") },
                      { label: "Send to Payroll",  action: () => updateTicketStatus(ticket.id, "sent_to_payroll") },
                      { label: "Flag Issue",    action: () => updateTicketStatus(ticket.id, "needs_review") },
                      { label: "Approve",       action: () => updateTicketStatus(ticket.id, "approved"), primary: true },
                    ].map(b => (
                      <button key={b.label} onClick={b.action} style={{
                        padding: "7px 14px", borderRadius: 8,
                        background: (b as any).primary ? "#1e40af" : "#f8fafc",
                        color: (b as any).primary ? "#fff" : "#475569",
                        border: (b as any).primary ? "none" : "1px solid #e2e8f0",
                        fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                      }}>{b.label}</button>
                    ))}
                    <button onClick={() => { setDeleteConfirmId(ticket.id); setDeleteReason(""); }} style={{ padding: "7px 14px", borderRadius: 8, background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", marginLeft: "auto" }}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: NEEDS REVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "needs_review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.3rem" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: "#c2410c" }}>{needsReviewTickets.length} tickets need attention</div>
              <div style={{ fontSize: "0.78rem", color: "#9a3412" }}>Resolve all exceptions before sending to payroll or billing</div>
            </div>
            <button onClick={loadTickets} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, background: "#c2410c", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Run Check</button>
          </div>
          {needsReviewTickets.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600 }}>No exceptions — all tickets look clean</div>
            </div>
          ) : (
            needsReviewTickets.map(ticket => (
              <div key={ticket.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>Ticket #{ticket.ticketNo}</div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{ticket.driver} · {ticket.truck} · {ticket.ticketDate}</div>
                  </div>
                  <HealthBadge score={ticket.ticketHealthScore} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {ticket.duplicateRisk && <SBadge code="DUPLICATE_TICKET" />}
                  {ticket.crossCheckStatus !== "Matched" && ticket.crossCheckStatus !== "No Match" && <SBadge code={ticket.crossCheckStatus === "Conflict" ? "RATE_MISMATCH" : "NEEDS_REVIEW"} />}
                  {!ticket.payrollReady && <SBadge code="PAYROLL_HOLD" />}
                  {!ticket.billingReady && <SBadge code="BILLING_HOLD" />}
                  {ticket.proofStatus !== "Complete" && <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fef3c7", color: "#d97706" }}>{ticket.proofStatus}</span>}
                  {!ticket.invoiceMatched && <SBadge code="MISSING_INVOICE" />}
                  {ticket.pitName === "—" && <SBadge code="MISSING_PIT" />}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updateTicketStatus(ticket.id, "matched")} style={{ padding: "7px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Confirm Match</button>
                  <button onClick={() => updateTicketStatus(ticket.id, "approved")} style={{ padding: "7px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Override & Approve</button>
                  {ticket.duplicateRisk && <button onClick={() => updateTicketStatus(ticket.id, "rejected")} style={{ padding: "7px 14px", borderRadius: 8, background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Lock Duplicate</button>}
                  <button onClick={() => { setDeleteConfirmId(ticket.id); setDeleteReason(""); }} style={{ padding: "7px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", marginLeft: "auto" }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: INVOICE MATCH
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "invoice_match" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Upload panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>📤 Invoice Upload &amp; Reconcile</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Upload Vendor Invoice", icon: "📄", sub: "Martin Marietta, pit vendors, suppliers" },
                  { label: "Upload Martin Marietta Invoice", icon: "🪨", sub: "MM pit / quarry invoice PDF" },
                  { label: "Upload Customer Invoice", icon: "🧾", sub: "Customer-facing billing invoice" },
                  { label: "Match Invoice to Tickets", icon: "🔍", sub: "Cross-reference ticket numbers in invoice" },
                ].map(b => (
                  <button key={b.label} onClick={() => invoiceFileRef.current?.click()} style={{ padding: "14px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "1.5rem" }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.83rem", color: "#0f172a" }}>{b.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{b.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 14, padding: 22, color: "#e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#fff", marginBottom: 12 }}>Invoice OCR Extracts</div>
              {[["Invoice Number","INV-2024-001042"],["Invoice Date","06/14/2026"],["Vendor","Martin Marietta"],["Customer Account","MOVEARO-001"],["PO Number","PO-2024-445"],["Ticket Numbers","Listed in invoice body"],["Pit / Yard","South Post Oak"],["Material","Limestone Base"],["Tons","247.50"],["Unit Price","$18.50/ton"],["Freight","$0.00"],["Fuel Surcharge","$124.00"],["Tax","$0.00"],["Invoice Total","$4,702.75"]].map(([f, ex]) => (
                <div key={f} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#94a3b8" }}>{f}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{ex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Match status panel */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>Invoice Match Status</div>
            <div style={{ padding: 20 }}>
              {activeTickets.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No tickets to match. Scan tickets first.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Ticket #","Date","Tons","Invoice #","Status"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTickets.slice(0, 20).map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{t.ticketNo}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{t.ticketDate}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{t.invoiceNumber || "—"}</td>
                        <td style={{ padding: "8px 12px" }}><SBadge code={t.invoiceMatched ? "MATCHED" : "MISSING_INVOICE"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: EXCEL RECONCILE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "excel_reconcile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Tickets → TMS</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff" }}>🔍 Ticket Reconciliation Command Center</div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>Match pit invoices, Fast Scan tickets, and Excel sheets before payroll or billing.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "#4ade80", fontWeight: 700, marginBottom: 2 }}>STEP 1</div>
                Tickets Scanned
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "#60a5fa", fontWeight: 700, marginBottom: 2 }}>STEP 2</div>
                Reconcile Here
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "#fbbf24", fontWeight: 700, marginBottom: 2 }}>STEP 3</div>
                Approve for Billing
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "#c084fc", fontWeight: 700, marginBottom: 2 }}>STEP 4</div>
                Approve for Payroll
              </div>
            </div>
          </div>
          {/* ── Ronyx Ticket Review Card ── */}
          {(() => {
            const ronyxPending = tickets.filter(t => (t as any).document_type === "ronyx_field_ticket" || t.ticketSource === "fast_scan_ocr");
            const ronyxHolds   = ronyxPending.filter(t => t.status !== "Approved");
            if (ronyxHolds.length === 0) return null;
            return (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>OCR Scan Queue</div>
                    <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#0f172a" }}>📋 Ronyx Field Ticket Review</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{ronyxHolds.length} ticket{ronyxHolds.length !== 1 ? "s" : ""} scanned and waiting for reconciliation approval</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setActiveTab("fastscan")}
                      style={{ padding: "8px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                      Scan Another
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ronyxHolds.slice(0, 5).map(t => {
                    const ef: string[] = (t as any).exception_flags || [];
                    const mf: string[] = (t as any).missing_fields  || [];
                    const sigOk = (t as any).signature_present === true;
                    const payrollOk = Boolean(t.driver) && Boolean(t.truck) && Boolean(t.ticketDate) && sigOk && ef.length === 0;
                    const billingOk = Boolean(t.customer) && sigOk && ef.length === 0;
                    return (
                      <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>#{t.ticketNo || "—"}</span>
                            <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{t.ticketDate}</span>
                            <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Truck {t.truck || "—"}</span>
                            <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{t.driver || "No driver"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            {!sigOk && <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "#fee2e2", color: "#dc2626" }}>MISSING_SIGNATURE</span>}
                            {ef.slice(0, 3).map(f => <span key={f} style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "#fee2e2", color: "#dc2626" }}>{f}</span>)}
                          </div>
                          <div style={{ display: "flex", gap: 10, fontSize: "0.68rem", color: "#94a3b8" }}>
                            <span>OCR conf: <strong>{t.scanConfidence}%</strong></span>
                            {mf.length > 0 && <span style={{ color: "#d97706" }}>{mf.length} missing field{mf.length !== 1 ? "s" : ""}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: payrollOk ? "#f0fdf4" : "#fff7ed", color: payrollOk ? "#16a34a" : "#d97706" }}>
                            {payrollOk ? "✓ Payroll OK" : "⛔ Payroll Hold"}
                          </span>
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: billingOk ? "#eff6ff" : "#fff7ed", color: billingOk ? "#1d4ed8" : "#d97706" }}>
                            {billingOk ? "✓ Billing OK" : "⛔ Billing Hold"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {ronyxHolds.length > 5 && (
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", padding: "6px 0" }}>+ {ronyxHolds.length - 5} more tickets</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Upload bar */}
          {!reconProcessed ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 14, border: "2px dashed #cbd5e1", padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📊</div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>Upload Ronyx Excel Sheet</div>
                  <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0 0 16px" }}>System will compare against Fast Scan tickets and pit invoices — mismatches shown for correction</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { label: "Upload Vendor Excel",  sub: "Martin Marietta sheet" },
                      { label: "Upload Customer Sheet", sub: "Customer load data" },
                      { label: "Upload Payroll Sheet",  sub: "Driver pay records" },
                      { label: "Upload Dispatch Sheet", sub: "Match dispatch to tickets" },
                    ].map(b => (
                      <button key={b.label} onClick={() => { const inp = excelFileRef.current; if (inp) { inp.onchange = () => { const f = inp.files?.[0]; if (f) processExcelFile(f); }; inp.click(); } }}
                        style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e40af", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                        {b.label}<div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>{b.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => {
                  // Demo mode: generate sample mismatches from scanned tickets
                  const demoFinancial = (impact: number, type: "TONNAGE_MISMATCH"|"RATE_MISMATCH"|"MISSING_TICKET"|"PIT_MISMATCH") => {
                    const sev: ErrorSeverity = impact > 500 ? "Critical" : impact > 100 ? "High" : impact > 25 ? "Medium" : "Low";
                    return { error_severity: sev, dollar_impact: impact, underbilled_amount: 0, overbilled_amount: type === "RATE_MISMATCH" ? impact : 0, payroll_overpay_risk: type === "TONNAGE_MISMATCH" ? impact * 0.9 : 0, vendor_overcharge_risk: impact, missing_revenue_risk: type === "MISSING_TICKET" ? impact : 0, assigned_to_department: impact > 200 ? "Ops Manager" : "Operations", assigned_to_user: "", approval_required: impact > 100, approval_status: (impact > 100 ? "pending" : "not_required") as ApprovalStatus, approved_by: "", approved_at: "", original_value: "", driver_request: (type === "MISSING_TICKET" ? "ticket" : "none") as DriverRequestType, driver_request_sent_at: "", driver_request_response: "", billing_blocked: type !== "PIT_MISMATCH" || impact > 0, billing_block_reason: type === "MISSING_TICKET" ? "No scanned ticket — cannot bill" : `${type.replace(/_/g," ")} must be resolved`, payroll_blocked: impact > 100, payroll_block_reason: impact > 100 ? `Discrepancy affects OO pay` : "", dispatcher_confirmed: false, is_duplicate: false, dispute_packet_ready: false };
                  };
                  const demoRows: ReconcileRow[] = activeTickets.slice(0, 8).flatMap((t, i) => {
                    const out: ReconcileRow[] = [];
                    const base = { ticketNo: t.ticketNo, date: t.ticketDate, driver: t.driver, truck: t.truck, material: t.material, status: "pending" as const, correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "" };
                    if (i % 3 === 0 && t.tons > 0) { const impact = Math.abs(t.tons * 0.03) * (t.rate || 18); out.push({ ...base, ...demoFinancial(impact, "TONNAGE_MISMATCH"), id: `demo-${i}-tons`, field: "Net Tons", errorType: "TONNAGE_MISMATCH", excelValue: (t.tons * 0.97).toFixed(2), scannedValue: t.tons.toFixed(2), invoiceValue: t.tons.toFixed(2), suggestedValue: t.tons.toFixed(2), confidence: 95 }); }
                    if (i % 4 === 1 && t.rate > 0) { const impact = 0.75 * (t.tons || 20); out.push({ ...base, ...demoFinancial(impact, "RATE_MISMATCH"), id: `demo-${i}-rate`, field: "Rate ($/ton)", errorType: "RATE_MISMATCH", excelValue: `$${(t.rate - 0.75).toFixed(2)}`, scannedValue: `$${t.rate.toFixed(2)}`, invoiceValue: `$${t.rate.toFixed(2)}`, suggestedValue: `$${t.rate.toFixed(2)}`, confidence: 89 }); }
                    return out;
                  });
                  const fd1 = demoFinancial(13.92, "TONNAGE_MISMATCH"); const fd2 = demoFinancial(15.00, "RATE_MISMATCH"); const fd3 = demoFinancial(0, "PIT_MISMATCH"); const fd4 = demoFinancial(370.00, "MISSING_TICKET"); const fd5 = demoFinancial(44.10, "TONNAGE_MISMATCH"); const fd6 = demoFinancial(740.00, "RATE_MISMATCH");
                  const fallback: ReconcileRow[] = [
                    { id: "demo-1", ticketNo: "123456", date: "Jun 14, 2026", driver: "Jose Martinez", truck: "104", material: "Limestone Base", field: "Net Tons", errorType: "TONNAGE_MISMATCH", excelValue: "23.80", scannedValue: "24.56", invoiceValue: "24.56", suggestedValue: "24.56", confidence: 97, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd1 },
                    { id: "demo-2", ticketNo: "123457", date: "Jun 14, 2026", driver: "Carlos Ruiz", truck: "107", material: "Limestone Base", field: "Rate ($/ton)", errorType: "RATE_MISMATCH", excelValue: "$17.75", scannedValue: "$18.50", invoiceValue: "$18.50", suggestedValue: "$18.50", confidence: 91, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd2 },
                    { id: "demo-3", ticketNo: "123458", date: "Jun 14, 2026", driver: "Miguel Torres", truck: "112", material: "Sand", field: "Pit / Yard", errorType: "PIT_MISMATCH", excelValue: "Garwood", scannedValue: "Garwood Sand", invoiceValue: "Garwood Sand & Gravel", suggestedValue: "Garwood Sand & Gravel", confidence: 82, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd3 },
                    { id: "demo-4", ticketNo: "123459", date: "Jun 14, 2026", driver: "David Hernandez", truck: "119", material: "Crushed Concrete", field: "Ticket Match", errorType: "MISSING_TICKET", excelValue: "123459", scannedValue: "Not found in Fast Scan", invoiceValue: "—", suggestedValue: "Scan ticket or enter manually", confidence: 0, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd4 },
                    { id: "demo-5", ticketNo: "123460", date: "Jun 14, 2026", driver: "Juan Garcia", truck: "105", material: "Limestone Base", field: "Net Tons", errorType: "TONNAGE_MISMATCH", excelValue: "21.50", scannedValue: "23.95", invoiceValue: "23.95", suggestedValue: "23.95", confidence: 96, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd5 },
                    { id: "demo-6", ticketNo: "123461", date: "Jun 14, 2026", driver: "Roberto Santos", truck: "108", material: "Flex Base", field: "Rate ($/ton)", errorType: "RATE_MISMATCH", excelValue: "$21.00", scannedValue: "$24.70", invoiceValue: "$24.70", suggestedValue: "$24.70", confidence: 93, status: "pending", correctionSource: "", correctionNote: "", correctedValue: "", correctedBy: "", correctedAt: "", ...fd6 },
                  ];
                  setReconRows(demoRows.length > 0 ? demoRows : fallback);
                  setExcelFileName("Demo_Ronyx_Weekly_Tickets.xlsx");
                  setReconProcessed(true);
                  showToast(`Demo loaded — ${demoRows.length || 3} sample mismatches`);
                }} style={{ padding: "12px 0", borderRadius: 10, background: "#0f172a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer" }}>
                  Demo: Simulate Cross-Check Without Uploading →
                </button>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 22 }}>
                <div style={{ fontWeight: 700, fontSize: "0.83rem", color: "#0f172a", marginBottom: 12 }}>Correction Color Legend</div>
                {[
                  ["#16a34a", "#f0fdf4", "Green", "Corrected / updated value"],
                  ["#d97706", "#fefce8", "Yellow", "Needs review"],
                  ["#dc2626", "#fff1f2", "Red", "Mismatch / error"],
                  ["#2563eb", "#eff6ff", "Blue", "Manual override"],
                  ["#6b7280", "#f9fafb", "Gray", "Duplicate / ignored row"],
                ].map(([color, bg, label, desc]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 18, borderRadius: 4, background: bg, border: `2px solid ${color}`, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "0.78rem", color }}>{label}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}> — {desc}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, fontSize: "0.73rem", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  Original uploaded Excel is never overwritten. A corrected copy is created as:<br />
                  <strong style={{ color: "#0f172a" }}>Ronyx_Corrected_Reconciliation_[date].csv</strong>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>📊</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{excelFileName}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Original file preserved — corrected copy is generated on download</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                  {[
                    { label: `${reconRows.filter(r => r.status === "pending").length} Pending`, bg: "#fee2e2", color: "#dc2626" },
                    { label: `${reconRows.filter(r => r.status === "corrected" || r.status === "overridden").length} Corrected`, bg: "#f0fdf4", color: "#16a34a" },
                    { label: `${reconRows.filter(r => r.status === "flagged").length} Flagged`, bg: "#fefce8", color: "#d97706" },
                    { label: `${reconRows.filter(r => r.status === "kept").length} Kept`, bg: "#f8fafc", color: "#64748b" },
                  ].map(s => (
                    <span key={s.label} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={downloadCorrectedExcel} style={{ padding: "8px 16px", borderRadius: 9, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                    ⬇ Download Corrected Excel
                  </button>
                  <button onClick={() => { showToast("Approved corrections applied to Ronyx — tickets queued for billing/payroll."); }} style={{ padding: "8px 16px", borderRadius: 9, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                    Apply Corrections to Ronyx
                  </button>
                  <button onClick={() => { setReconRows([]); setReconProcessed(false); setExcelFileName(""); }} style={{ padding: "8px 14px", borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                    Upload New File
                  </button>
                </div>
              </div>

              {/* Workflow note */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 18px", fontSize: "0.8rem", color: "#1e40af", display: "flex", alignItems: "center", gap: 10 }}>
                <span>ℹ️</span>
                <span><strong>Workflow:</strong> Upload Ronyx Excel → System compares to Fast Scan + pit invoices → Approve corrections → Green cells = corrected → Download corrected file → Approved rows unlock Billing &amp; Payroll</span>
              </div>

              {/* Financial impact summary bar */}
              {reconRows.length > 0 && (() => {
                const totalImpact = reconRows.reduce((s, r) => s + r.dollar_impact, 0);
                const critCount   = reconRows.filter(r => r.error_severity === "Critical").length;
                const pendBill    = reconRows.filter(r => r.billing_blocked && r.status === "pending").length;
                const pendPayroll = reconRows.filter(r => r.payroll_blocked && r.status === "pending").length;
                const vendRisk    = reconRows.reduce((s, r) => s + r.vendor_overcharge_risk, 0);
                const payRisk     = reconRows.reduce((s, r) => s + r.payroll_overpay_risk, 0);
                const missRev     = reconRows.reduce((s, r) => s + r.missing_revenue_risk, 0);
                return (
                  <div style={{ background: "#0f172a", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Financial Impact — What These Errors Cost</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
                      {[
                        { label: "Total $ at Risk", val: `$${totalImpact.toFixed(2)}`, color: "#f87171" },
                        { label: "Critical Errors", val: critCount.toString(), color: "#f87171" },
                        { label: "Vendor Overcharge Risk", val: `$${vendRisk.toFixed(2)}`, color: "#fb923c" },
                        { label: "Missing Revenue Risk", val: `$${missRev.toFixed(2)}`, color: "#fbbf24" },
                        { label: "Payroll Overpay Risk", val: `$${payRisk.toFixed(2)}`, color: "#facc15" },
                        { label: "Billing Blocked", val: `${pendBill} tickets`, color: "#fb923c" },
                      ].map(k => (
                        <div key={k.label}>
                          <div style={{ fontSize: "0.62rem", color: "#64748b", marginBottom: 3 }}>{k.label}</div>
                          <div style={{ fontWeight: 800, fontSize: "1rem", color: k.color }}>{k.val}</div>
                        </div>
                      ))}
                    </div>
                    {pendBill > 0 && <div style={{ marginTop: 12, padding: "8px 14px", background: "#dc26261a", borderRadius: 8, fontSize: "0.75rem", color: "#f87171", fontWeight: 600 }}>⛔ {pendBill} billing items and {pendPayroll} payroll items are blocked until errors below are resolved.</div>}
                  </div>
                );
              })()}

              {/* Correction table */}
              {reconRows.length === 0 ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "40px 0", textAlign: "center", color: "#16a34a" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700 }}>No mismatches found — all rows match Fast Scan and pit invoices</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reconRows.map(row => {
                    const statusColor = row.status === "corrected" || row.status === "overridden" ? { bg: "#f0fdf4", border: "#bbf7d0", accent: "#16a34a" }
                      : row.status === "flagged" ? { bg: "#fefce8", border: "#fde68a", accent: "#d97706" }
                      : row.status === "kept" ? { bg: "#f9fafb", border: "#e5e7eb", accent: "#6b7280" }
                      : { bg: "#fff1f2", border: "#fecdd3", accent: "#dc2626" };
                    const sevColor = row.error_severity === "Critical" ? "#dc2626" : row.error_severity === "High" ? "#ea580c" : row.error_severity === "Medium" ? "#d97706" : "#6b7280";
                    const sevBg    = row.error_severity === "Critical" ? "#fee2e2" : row.error_severity === "High" ? "#ffedd5" : row.error_severity === "Medium" ? "#fefce8" : "#f9fafb";
                    const needsApproval = row.approval_required && row.approval_status === "pending" && row.status === "pending";

                    return (
                      <div key={row.id} style={{ background: statusColor.bg, border: `1px solid ${statusColor.border}`, borderRadius: 12, overflow: "hidden" }}>
                        {/* Row header — dollar impact FIRST */}
                        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${statusColor.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>Ticket #{row.ticketNo}</span>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{row.date} · {row.driver} · Truck {row.truck} · {row.material}</span>
                          </div>
                          <SBadge code={row.errorType} />
                          <span style={{ padding: "2px 10px", borderRadius: 99, background: sevBg, color: sevColor, fontWeight: 800, fontSize: "0.72rem", border: `1px solid ${sevColor}33` }}>
                            {row.error_severity}
                          </span>
                          {row.billing_blocked && row.status === "pending" && (
                            <span style={{ padding: "2px 9px", borderRadius: 99, background: "#fff1f2", color: "#dc2626", fontWeight: 700, fontSize: "0.68rem", border: "1px solid #fecdd3" }}>⛔ Billing Blocked</span>
                          )}
                          {row.payroll_blocked && row.status === "pending" && (
                            <span style={{ padding: "2px 9px", borderRadius: 99, background: "#fff7ed", color: "#ea580c", fontWeight: 700, fontSize: "0.68rem", border: "1px solid #fed7aa" }}>⛔ Payroll Blocked</span>
                          )}
                          {/* Dollar impact — top right, dominant */}
                          {row.dollar_impact > 0 && (
                            <div style={{ marginLeft: "auto", textAlign: "right" }}>
                              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>$ at Risk</div>
                              <div style={{ fontWeight: 900, fontSize: "1.25rem", color: row.dollar_impact > 200 ? "#dc2626" : row.dollar_impact > 50 ? "#ea580c" : "#d97706", lineHeight: 1 }}>
                                ${row.dollar_impact.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ padding: "14px 18px" }}>
                          {/* Block reason banners */}
                          {(row.billing_block_reason || row.payroll_block_reason) && row.status === "pending" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                              {row.billing_block_reason && (
                                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 7, padding: "7px 12px", fontSize: "0.72rem", color: "#dc2626", fontWeight: 600 }}>
                                  ⛔ Billing: {row.billing_block_reason}
                                </div>
                              )}
                              {row.payroll_block_reason && (
                                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, padding: "7px 12px", fontSize: "0.72rem", color: "#ea580c", fontWeight: 600 }}>
                                  ⛔ Payroll: {row.payroll_block_reason}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Risk breakdown if any */}
                          {(row.vendor_overcharge_risk > 0 || row.missing_revenue_risk > 0 || row.payroll_overpay_risk > 0) && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                              {row.vendor_overcharge_risk > 0 && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#ffedd5", color: "#ea580c", fontSize: "0.7rem", fontWeight: 700 }}>Vendor Overcharge: ${row.vendor_overcharge_risk.toFixed(2)}</span>}
                              {row.missing_revenue_risk > 0 && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#fefce8", color: "#ca8a04", fontSize: "0.7rem", fontWeight: 700 }}>Missing Revenue: ${row.missing_revenue_risk.toFixed(2)}</span>}
                              {row.payroll_overpay_risk > 0 && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#fff7ed", color: "#c2410c", fontSize: "0.7rem", fontWeight: 700 }}>Payroll Overpay Risk: ${row.payroll_overpay_risk.toFixed(2)}</span>}
                              {row.underbilled_amount > 0 && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: "0.7rem", fontWeight: 700 }}>Underbilled: ${row.underbilled_amount.toFixed(2)}</span>}
                            </div>
                          )}

                          {/* Approval required banner */}
                          {needsApproval && (
                            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: "0.72rem", color: "#1d4ed8", fontWeight: 700 }}>
                                🔐 Approval Required — {row.dollar_impact > 500 ? "Owner / Ops Manager" : "Operations Manager"} must approve this correction (impact: ${row.dollar_impact.toFixed(2)})
                              </span>
                              <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, approval_status: "approved", approved_by: "manager@ronyx.com", approved_at: new Date().toLocaleString() } : r))}
                                style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 7, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                                ✓ Approve
                              </button>
                              <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, approval_status: "rejected" } : r))}
                                style={{ padding: "4px 12px", borderRadius: 7, background: "#fee2e2", color: "#dc2626", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                                ✗ Reject
                              </button>
                            </div>
                          )}
                          {row.approval_status === "approved" && (
                            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 12px", marginBottom: 12, fontSize: "0.72rem", color: "#15803d", fontWeight: 600 }}>
                              ✅ Approved by {row.approved_by} · {row.approved_at}
                            </div>
                          )}

                          {/* Comparison grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
                            {[
                              { label: "Original Excel Value", value: row.excelValue, color: "#dc2626", bg: "#fff1f2" },
                              { label: "Fast Scan (Scanned)", value: row.scannedValue, color: "#1d4ed8", bg: "#eff6ff" },
                              { label: "Pit Invoice Value", value: row.invoiceValue, color: "#7c3aed", bg: "#f5f3ff" },
                              { label: row.status !== "pending" ? `✅ ${row.status === "kept" ? "Kept" : "Corrected"} Value` : "Suggested Correction", value: row.status !== "pending" ? (row.correctedValue || row.suggestedValue) : row.suggestedValue, color: "#15803d", bg: "#f0fdf4" },
                            ].map(col => (
                              <div key={col.label} style={{ background: col.bg, borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: "0.63rem", fontWeight: 700, color: col.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{col.label}</div>
                                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{col.value || "—"}</div>
                              </div>
                            ))}
                          </div>

                          {/* Correction note if resolved */}
                          {row.status !== "pending" && (
                            <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.73rem", color: "#475569" }}>
                              <strong>Cell Note:</strong> {row.correctionNote} Updated by: {row.correctedBy}. At: {row.correctedAt}.
                            </div>
                          )}

                          {/* Dispatcher confirmed */}
                          {!row.dispatcher_confirmed && row.status === "pending" && (
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Dispatcher cross-check:</span>
                              <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, dispatcher_confirmed: true } : r))}
                                style={{ padding: "3px 12px", borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, fontSize: "0.7rem", cursor: "pointer" }}>
                                ✓ Confirm truck/driver/date/project match
                              </button>
                              {row.dispatcher_confirmed && <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 700 }}>✅ Confirmed</span>}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => applyCorrection(row.id, "suggested")} disabled={row.status !== "pending" || (needsApproval && row.approval_status === "pending")}
                              style={{ padding: "7px 14px", borderRadius: 8, background: row.status !== "pending" || (needsApproval && row.approval_status === "pending") ? "#f1f5f9" : "#16a34a", color: row.status !== "pending" || (needsApproval && row.approval_status === "pending") ? "#94a3b8" : "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: row.status !== "pending" || (needsApproval && row.approval_status === "pending") ? "not-allowed" : "pointer" }}>
                              ✅ Update Excel Value
                            </button>
                            <button onClick={() => applyCorrection(row.id, "scan")} disabled={row.status !== "pending"}
                              style={{ padding: "7px 14px", borderRadius: 8, background: row.status !== "pending" ? "#f1f5f9" : "#eff6ff", color: row.status !== "pending" ? "#94a3b8" : "#1d4ed8", border: `1px solid ${row.status !== "pending" ? "#e2e8f0" : "#bfdbfe"}`, fontWeight: 700, fontSize: "0.75rem", cursor: row.status !== "pending" ? "not-allowed" : "pointer" }}>
                              Use Scanned Ticket
                            </button>
                            <button onClick={() => applyCorrection(row.id, "invoice")} disabled={row.status !== "pending"}
                              style={{ padding: "7px 14px", borderRadius: 8, background: row.status !== "pending" ? "#f1f5f9" : "#f5f3ff", color: row.status !== "pending" ? "#94a3b8" : "#7c3aed", border: `1px solid ${row.status !== "pending" ? "#e2e8f0" : "#ddd6fe"}`, fontWeight: 700, fontSize: "0.75rem", cursor: row.status !== "pending" ? "not-allowed" : "pointer" }}>
                              Use Pit Invoice
                            </button>
                            <button onClick={() => applyCorrection(row.id, "keep")} disabled={row.status !== "pending"}
                              style={{ padding: "7px 14px", borderRadius: 8, background: "#f8fafc", color: row.status !== "pending" ? "#94a3b8" : "#475569", border: "1px solid #e2e8f0", fontWeight: 600, fontSize: "0.75rem", cursor: row.status !== "pending" ? "not-allowed" : "pointer" }}>
                              Keep Excel Value
                            </button>
                            <button onClick={() => applyCorrection(row.id, "flag")} disabled={row.status !== "pending"}
                              style={{ padding: "7px 14px", borderRadius: 8, background: row.status !== "pending" ? "#f1f5f9" : "#fefce8", color: row.status !== "pending" ? "#94a3b8" : "#d97706", border: `1px solid ${row.status !== "pending" ? "#e2e8f0" : "#fde68a"}`, fontWeight: 700, fontSize: "0.75rem", cursor: row.status !== "pending" ? "not-allowed" : "pointer" }}>
                              🚩 Flag for Review
                            </button>
                            {/* Driver request actions */}
                            {row.status === "pending" && (
                              <>
                                {row.errorType === "MISSING_TICKET" && (
                                  <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, driver_request: "ticket", driver_request_sent_at: new Date().toLocaleString() } : r))}
                                    style={{ padding: "7px 14px", borderRadius: 8, background: row.driver_request_sent_at ? "#f0fdf4" : "#0f172a", color: row.driver_request_sent_at ? "#16a34a" : "#fff", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                                    {row.driver_request_sent_at ? "✅ Ticket Requested" : "📩 Request Ticket From Driver"}
                                  </button>
                                )}
                                {(row.errorType === "TONNAGE_MISMATCH" || row.errorType === "RATE_MISMATCH") && (
                                  <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, driver_request: "scale_ticket", driver_request_sent_at: new Date().toLocaleString() } : r))}
                                    style={{ padding: "7px 14px", borderRadius: 8, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 600, fontSize: "0.72rem", cursor: "pointer" }}>
                                    {row.driver_request_sent_at ? "✅ Sent" : "⚖️ Request Scale Ticket"}
                                  </button>
                                )}
                                {/* Vendor dispute packet */}
                                {row.vendor_overcharge_risk > 0 && (
                                  <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, dispute_packet_ready: true } : r))}
                                    style={{ padding: "7px 14px", borderRadius: 8, background: row.dispute_packet_ready ? "#f0fdf4" : "#fff7ed", color: row.dispute_packet_ready ? "#16a34a" : "#ea580c", border: `1px solid ${row.dispute_packet_ready ? "#bbf7d0" : "#fed7aa"}`, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                                    {row.dispute_packet_ready ? "✅ Dispute Packet Ready" : "📋 Generate Vendor Dispute Packet"}
                                  </button>
                                )}
                              </>
                            )}
                            {row.status !== "pending" && (
                              <button onClick={() => setReconRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "pending", correctedValue: "", correctionSource: "", correctionNote: "", correctedBy: "", correctedAt: "", approval_status: r.approval_required ? "pending" : "not_required" } : r))}
                                style={{ padding: "7px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", marginLeft: "auto" }}>
                                Undo
                              </button>
                            )}
                          </div>

                          {/* Dispute packet preview */}
                          {row.dispute_packet_ready && (
                            <div style={{ marginTop: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 9, padding: "12px 16px" }}>
                              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#ea580c", marginBottom: 8 }}>📋 Vendor Dispute Packet — Ready to Send</div>
                              <div style={{ fontSize: "0.72rem", color: "#78350f", lineHeight: 1.7 }}>
                                <strong>Ticket:</strong> #{row.ticketNo} · <strong>Date:</strong> {row.date} · <strong>Driver:</strong> {row.driver} · <strong>Truck:</strong> {row.truck}<br />
                                <strong>Field in Dispute:</strong> {row.field} · <strong>Error Type:</strong> {row.errorType}<br />
                                <strong>Vendor Charged:</strong> {row.excelValue} · <strong>Our Scan Shows:</strong> {row.scannedValue} · <strong>Pit Invoice:</strong> {row.invoiceValue}<br />
                                <strong>Dollar Overcharge:</strong> <span style={{ color: "#dc2626", fontWeight: 800 }}>${row.vendor_overcharge_risk.toFixed(2)}</span>
                              </div>
                              <button onClick={() => showToast(`Dispute packet for ticket #${row.ticketNo} downloaded.`)}
                                style={{ marginTop: 10, padding: "6px 16px", borderRadius: 7, background: "#ea580c", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                                ⬇ Download Packet (PDF + Excel)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom action bar */}
              <div style={{ background: "#0f172a", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>{reconRows.filter(r => r.status === "corrected" || r.status === "overridden" || r.status === "kept").length}</span> of {reconRows.length} rows resolved
                  <span style={{ marginLeft: 16, color: "#fbbf24", fontWeight: 700 }}>{reconRows.filter(r => r.status === "pending").length}</span> still pending
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { reconRows.filter(r => r.status === "pending").forEach(r => applyCorrection(r.id, "suggested")); showToast("All pending rows accepted suggested corrections."); }}
                    style={{ padding: "9px 18px", borderRadius: 9, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    Accept All Suggestions
                  </button>
                  <button onClick={downloadCorrectedExcel} style={{ padding: "9px 18px", borderRadius: 9, background: "#fff", color: "#0f172a", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    ⬇ Download Corrected Excel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: PIT / VENDOR MASTER
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pit_master" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>Pit / Vendor Master</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Martin Marietta pits, yards, rail yards, quarries, sand plants — used for OCR matching and cross-check</div>
            </div>
            <button onClick={() => { setPitForm({ active: true, requiresPO: true, requiresTicketMatch: true, state: "TX" }); setPitEditId(null); setPitFormOpen(true); }} style={{ padding: "9px 18px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
              + Add Location
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Vendor","Pit / Location Name","Type","City","State","Default Material","OCR Keywords","PO Req","Status","Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pits.map((pit, i) => (
                  <tr key={pit.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>{pit.vendorName}</td>
                    <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600 }}>{pit.pitName}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569" }}>{pit.locationType}</span></td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{pit.city}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{pit.state}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{pit.defaultMaterial}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.72rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{pit.ocrKeywords}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{pit.requiresPO ? "✅" : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: pit.active ? "#f0fdf4" : "#f1f5f9", color: pit.active ? "#16a34a" : "#94a3b8" }}>
                        {pit.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", display: "flex", gap: 6 }}>
                      <button onClick={() => { setPitForm(pit); setPitEditId(pit.id); setPitFormOpen(true); }} style={{ padding: "4px 10px", borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => setPits(prev => prev.map(p => p.id === pit.id ? { ...p, active: !p.active } : p))} style={{ padding: "4px 10px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.7rem", cursor: "pointer" }}>
                        {pit.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: PAYROLL REVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "payroll_review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[["Payroll Holds", payrollHoldTickets.length, "#dc2626", "#fff1f2", "#fecdd3"], ["Ready for Payroll", payrollReadyTickets.length, "#15803d", "#f0fdf4", "#bbf7d0"], ["Total Payroll Value", null, "#1d4ed8", "#eff6ff", "#bfdbfe"]].map(([l, v, c, bg, border]) => (
              <div key={String(l)} style={{ background: String(bg), border: `1px solid ${String(border)}`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: String(c), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{v !== null ? v : money(totalPayrollReady)}</div>
              </div>
            ))}
          </div>
          {payrollHoldTickets.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#dc2626" }}>Payroll Holds ({payrollHoldTickets.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    {["Ticket #","Driver","Truck","Tons","Pay Rate","Payroll Amt","Status","Action"].map(h => <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {payrollHoldTickets.map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 800 }}>{t.ticketNo}</td>
                        <td style={{ padding: "8px 12px" }}>{t.driver}</td>
                        <td style={{ padding: "8px 12px" }}>{t.truck}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.rate.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{money(t.payrollAmount)}</td>
                        <td style={{ padding: "8px 12px" }}><SBadge code={t.payrollStatus} /></td>
                        <td style={{ padding: "8px 12px" }}>
                          <button onClick={() => updateTicketStatus(t.id, "approved")} style={{ padding: "5px 12px", borderRadius: 7, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Release</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {payrollReadyTickets.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "#15803d" }}>Ready for Payroll ({payrollReadyTickets.length}) — {money(totalPayrollReady)}</span>
                <button onClick={() => payrollReadyTickets.forEach(t => updateTicketStatus(t.id, "sent_to_payroll"))} style={{ padding: "7px 16px", borderRadius: 8, background: "#15803d", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Send All to Payroll
                </button>
              </div>
              <div style={{ padding: "10px 20px", fontSize: "0.78rem", color: "#64748b" }}>
                {payrollReadyTickets.slice(0, 6).map(t => `#${t.ticketNo} ${t.driver}`).join(" · ")}{payrollReadyTickets.length > 6 && ` + ${payrollReadyTickets.length - 6} more`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: BILLING READY
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "billing_ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[["Billing Holds", billingHoldTickets.length, "#dc2626", "#fff1f2", "#fecdd3"], ["Ready for Billing", billingReadyTickets.length, "#1d4ed8", "#eff6ff", "#bfdbfe"], ["Total Billing Value", null, "#15803d", "#f0fdf4", "#bbf7d0"]].map(([l, v, c, bg, border]) => (
              <div key={String(l)} style={{ background: String(bg), border: `1px solid ${String(border)}`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: String(c), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>{v !== null ? v : money(totalBillingReady)}</div>
              </div>
            ))}
          </div>
          {billingHoldTickets.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#dc2626" }}>Billing Holds ({billingHoldTickets.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    {["Ticket #","Customer","Project","Tons","Bill Rate","Billing Amt","Status","Action"].map(h => <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {billingHoldTickets.map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 800 }}>{t.ticketNo}</td>
                        <td style={{ padding: "8px 12px" }}>{t.customer}</td>
                        <td style={{ padding: "8px 12px" }}>{t.project}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.rate.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{money(t.billingAmount)}</td>
                        <td style={{ padding: "8px 12px" }}><SBadge code={t.billingStatus} /></td>
                        <td style={{ padding: "8px 12px" }}>
                          <button onClick={() => updateTicketStatus(t.id, "sent_to_billing")} style={{ padding: "5px 12px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Release</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {billingReadyTickets.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "#1d4ed8" }}>Ready for Billing ({billingReadyTickets.length}) — {money(totalBillingReady)}</span>
                <button onClick={() => billingReadyTickets.forEach(t => updateTicketStatus(t.id, "sent_to_billing"))} style={{ padding: "7px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Send All to Billing
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    {["Ticket #","Date","Customer","Vendor / Pit","Driver","Material","Tons","Bill Rate","Billing Amt","Payroll Amt","Invoice","Action"].map(h => <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem", whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {billingReadyTickets.map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 800 }}>{t.ticketNo}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{t.ticketDate}</td>
                        <td style={{ padding: "8px 12px" }}>{t.customer}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{t.pitName}</td>
                        <td style={{ padding: "8px 12px" }}>{t.driver}</td>
                        <td style={{ padding: "8px 12px" }}>{t.material}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.rate.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#1d4ed8" }}>{money(t.billingAmount)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#15803d" }}>{money(t.payrollAmount)}</td>
                        <td style={{ padding: "8px 12px" }}><SBadge code={t.invoiceMatched ? "MATCHED" : "MISSING_INVOICE"} /></td>
                        <td style={{ padding: "8px 12px" }}>
                          <button onClick={() => updateTicketStatus(t.id, "sent_to_billing")} style={{ padding: "5px 12px", borderRadius: 7, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Send</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: AUDIT TRAIL
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "audit_trail" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Deleted tickets sub-section */}
          {deletedTickets.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>🗑️ Deleted Tickets Log</span>
                <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>{deletedTickets.length} records</span>
                <span style={{ marginLeft: "auto", fontSize: "0.73rem", color: "#94a3b8" }}>Manager &amp; Owner only — permanent record</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Ticket #","Driver","Truck","Date","Deleted By","Deleted At","Reason"].map(h => <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.68rem" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {deletedTickets.map((t, i) => (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700 }}>{t.ticketNo}</td>
                      <td style={{ padding: "9px 12px" }}>{t.driver}</td>
                      <td style={{ padding: "9px 12px" }}>{t.truck}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>{t.ticketDate}</td>
                      <td style={{ padding: "9px 12px" }}><span style={{ fontWeight: 600, color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem" }}>{t.voidedBy || "Unknown"}</span></td>
                      <td style={{ padding: "9px 12px", color: "#64748b", fontSize: "0.73rem" }}>{t.voidedAt || "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#475569", maxWidth: 240 }}>{t.voidReason || <span style={{ color: "#94a3b8" }}>No reason given</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Activity log */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>Activity Log</div>
            <div style={{ padding: 20 }}>
              {activeTickets.length === 0 ? (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No activity yet.</div>
              ) : (
                activeTickets.slice(0, 30).map((t, i) => (
                  <div key={t.id} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: i < 29 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.status === "Approved" ? "#16a34a" : t.status === "Needs Review" ? "#dc2626" : "#94a3b8", flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0f172a" }}>Ticket #{t.ticketNo} — <span style={{ color: "#64748b", fontWeight: 400 }}>{t.status}</span></div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{t.driver} · {t.truck} · {t.ticketDate} · Updated {t.lastUpdated}</div>
                    </div>
                    <SBadge code={t.billingStatus} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: OWNER DASHBOARD
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "owner_dashboard" && (() => {
        const totalScanned   = activeTickets.length;
        const totalMatched   = activeTickets.filter(t => t.crossCheckStatus === "Matched").length;
        const totalReview    = needsReviewTickets.length;
        const totalBilling   = totalBillingReady;
        const totalPayroll   = totalPayrollReady;
        const billingCount   = billingReadyTickets.length;
        const payrollCount   = payrollReadyTickets.length;
        const totalGross     = activeTickets.reduce((s, t) => s + t.billingAmount, 0);
        const totalPayD      = activeTickets.reduce((s, t) => s + t.payrollAmount, 0);
        const grossMargin    = totalGross > 0 ? ((totalGross - totalPayD) / totalGross) * 100 : 0;
        // Reconcile financials
        const totalRisk      = reconRows.reduce((s, r) => s + r.dollar_impact, 0);
        const vendorRisk     = reconRows.reduce((s, r) => s + r.vendor_overcharge_risk, 0);
        const payRisk        = reconRows.reduce((s, r) => s + r.payroll_overpay_risk, 0);
        const missRev        = reconRows.reduce((s, r) => s + r.missing_revenue_risk, 0);
        const dupRisk        = reconRows.filter(r => r.is_duplicate).reduce((s, r) => s + r.dollar_impact, 0);
        const underbilled    = reconRows.reduce((s, r) => s + r.underbilled_amount, 0);
        const critErrors     = reconRows.filter(r => r.error_severity === "Critical").length;
        const highErrors     = reconRows.filter(r => r.error_severity === "High").length;
        const resolvedErrors = reconRows.filter(r => r.status !== "pending").length;
        const pendingErrors  = reconRows.filter(r => r.status === "pending").length;
        const billingBlocked = reconRows.filter(r => r.billing_blocked && r.status === "pending").length;
        const payrollBlocked = reconRows.filter(r => r.payroll_blocked && r.status === "pending").length;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Owner header */}
            <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 26px", display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>Owner / Operations Summary</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 3 }}>Real-time financial intelligence — what these tickets are worth, what errors cost, and what's blocked</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: "0.62rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Gross Margin</div>
                <div style={{ fontWeight: 900, fontSize: "1.8rem", color: grossMargin > 30 ? "#4ade80" : grossMargin > 15 ? "#fbbf24" : "#f87171" }}>{grossMargin.toFixed(1)}%</div>
              </div>
            </div>

            {/* Ticket volume KPIs */}
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Ticket Volume</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Scanned", val: totalScanned, color: "#0f172a", sub: "This period" },
                  { label: "Matched & Clean", val: totalMatched, color: "#15803d", sub: "No action needed" },
                  { label: "Needs Review", val: totalReview, color: "#dc2626", sub: "Staff action required" },
                  { label: "Reconcile Errors", val: reconRows.length, color: reconRows.length > 0 ? "#ea580c" : "#15803d", sub: `${pendingErrors} pending` },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontWeight: 900, fontSize: "1.9rem", color: k.color }}>{k.val}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Financial Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Billing Amount", val: money(totalGross), color: "#1d4ed8", sub: `${billingCount} tickets ready` },
                  { label: "Payroll Amount", val: money(totalPayD), color: "#15803d", sub: `${payrollCount} ready to pay` },
                  { label: "Net Revenue", val: money(totalGross - totalPayD), color: "#0f172a", sub: `${grossMargin.toFixed(1)}% margin` },
                  { label: "Underbilled (OO)", val: money(underbilled), color: underbilled > 0 ? "#15803d" : "#94a3b8", sub: underbilled > 0 ? "Could add to invoice" : "None detected" },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontWeight: 900, fontSize: "1.5rem", color: k.color }}>{k.val}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error risk summary — THE STRONGEST FEATURE */}
            <div style={{ background: "#fff", border: "2px solid #fee2e2", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#fff1f2", padding: "14px 22px", borderBottom: "1px solid #fecdd3", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 900, fontSize: "1rem", color: "#dc2626" }}>⚠️ Error Cost Analysis</span>
                <span style={{ fontSize: "0.73rem", color: "#b91c1c" }}>Every error below is blocking billing, payroll, or vendor payment</span>
                {totalRisk > 0 && <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: "1.25rem", color: "#dc2626" }}>${totalRisk.toFixed(2)} total at risk</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
                {[
                  { label: "Vendor Overcharge Risk", val: money(vendorRisk), color: "#ea580c", bg: "#fff7ed", desc: "Vendor billed more than ticket shows", icon: "🏭", action: "Generate dispute packets" },
                  { label: "Missing Revenue Risk", val: money(missRev), color: "#ca8a04", bg: "#fefce8", desc: "Loads dispatched but no ticket scanned", icon: "❓", action: "Request tickets from drivers" },
                  { label: "Payroll Overpay Risk", val: money(payRisk), color: "#c2410c", bg: "#fff7ed", desc: "OO may be paid for incorrect tonnage/rate", icon: "💸", action: "Hold payroll until resolved" },
                ].map((k, idx) => (
                  <div key={k.label} style={{ padding: "20px 22px", background: k.bg, borderRight: idx < 2 ? "1px solid #fecdd3" : "none" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{k.icon}</div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontWeight: 900, fontSize: "1.8rem", color: k.color, marginBottom: 6 }}>{k.val}</div>
                    <div style={{ fontSize: "0.7rem", color: "#78350f", marginBottom: 10 }}>{k.desc}</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: k.color }}>→ {k.action}</div>
                  </div>
                ))}
              </div>
              {dupRisk > 0 && (
                <div style={{ padding: "14px 22px", borderTop: "1px solid #fecdd3", background: "#fdf4ff", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#7c3aed" }}>⚠️ Duplicate Payment Risk:</span>
                  <span style={{ fontWeight: 900, fontSize: "1rem", color: "#7c3aed" }}>{money(dupRisk)}</span>
                  <span style={{ fontSize: "0.72rem", color: "#6b21a8" }}>— Possible double payment on {reconRows.filter(r => r.is_duplicate).length} ticket(s). Review before releasing payroll.</span>
                </div>
              )}
            </div>

            {/* Gates — what's blocked right now */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Billing gate */}
              <div style={{ background: "#fff", border: `2px solid ${billingBlocked > 0 ? "#fecdd3" : "#bbf7d0"}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${billingBlocked > 0 ? "#fecdd3" : "#bbf7d0"}`, background: billingBlocked > 0 ? "#fff1f2" : "#f0fdf4", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: billingBlocked > 0 ? "#dc2626" : "#15803d" }}>🧾 Billing Gate</span>
                  <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.78rem", color: billingBlocked > 0 ? "#dc2626" : "#15803d" }}>
                    {billingBlocked > 0 ? `${billingBlocked} blocked` : "All clear"}
                  </span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.9 }}>
                    {billingCount > 0 ? <span style={{ color: "#15803d", fontWeight: 700 }}>✅ {billingCount} tickets ready for billing ({money(totalBilling)})<br /></span> : null}
                    {billingBlocked > 0 ? <span style={{ color: "#dc2626", fontWeight: 700 }}>⛔ {billingBlocked} tickets blocked — resolve errors above first<br /></span> : null}
                    {critErrors > 0 ? <span style={{ color: "#ea580c" }}>⚠️ {critErrors} critical error{critErrors > 1 ? "s" : ""} require owner/ops manager approval<br /></span> : null}
                  </div>
                  <button onClick={() => setActiveTab("billing_ready")}
                    style={{ marginTop: 10, padding: "7px 16px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                    View Billing Queue →
                  </button>
                </div>
              </div>

              {/* Payroll gate */}
              <div style={{ background: "#fff", border: `2px solid ${payrollBlocked > 0 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${payrollBlocked > 0 ? "#fed7aa" : "#bbf7d0"}`, background: payrollBlocked > 0 ? "#fff7ed" : "#f0fdf4", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: payrollBlocked > 0 ? "#ea580c" : "#15803d" }}>💵 Payroll Gate</span>
                  <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.78rem", color: payrollBlocked > 0 ? "#ea580c" : "#15803d" }}>
                    {payrollBlocked > 0 ? `${payrollBlocked} blocked` : "All clear"}
                  </span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.9 }}>
                    {payrollCount > 0 ? <span style={{ color: "#15803d", fontWeight: 700 }}>✅ {payrollCount} tickets ready for payroll ({money(totalPayroll)})<br /></span> : null}
                    {payrollBlocked > 0 ? <span style={{ color: "#ea580c", fontWeight: 700 }}>⛔ {payrollBlocked} OO pay items blocked — ton/rate errors unresolved<br /></span> : null}
                    {payRisk > 0 ? <span style={{ color: "#c2410c" }}>⚠️ {money(payRisk)} overpay risk — do not release until reconciled<br /></span> : null}
                  </div>
                  <button onClick={() => setActiveTab("payroll_review")}
                    style={{ marginTop: 10, padding: "7px 16px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                    View Payroll Queue →
                  </button>
                </div>
              </div>
            </div>

            {/* Reconcile error breakdown table */}
            {reconRows.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "13px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>Error Breakdown — All Reconciliation Issues</span>
                  <span style={{ padding: "2px 9px", borderRadius: 99, background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: "0.7rem" }}>{critErrors} Critical</span>
                  <span style={{ padding: "2px 9px", borderRadius: 99, background: "#ffedd5", color: "#ea580c", fontWeight: 700, fontSize: "0.7rem" }}>{highErrors} High</span>
                  <button onClick={() => setActiveTab("excel_reconcile")} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 7, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                    Resolve All →
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.77rem" }}>
                    <thead><tr style={{ background: "#f8fafc" }}>
                      {["Ticket #","Driver","Field","Error","Severity","$ Impact","Billing","Payroll","Status"].map(h => <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.67rem", whiteSpace: "nowrap" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...reconRows].sort((a, b) => b.dollar_impact - a.dollar_impact).slice(0, 15).map((r, i) => {
                        const sevC = r.error_severity === "Critical" ? "#dc2626" : r.error_severity === "High" ? "#ea580c" : "#d97706";
                        const sevB = r.error_severity === "Critical" ? "#fee2e2" : r.error_severity === "High" ? "#ffedd5" : "#fefce8";
                        return (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 800 }}>{r.ticketNo}</td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{r.driver}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.field}</td>
                            <td style={{ padding: "8px 12px" }}><SBadge code={r.errorType} /></td>
                            <td style={{ padding: "8px 12px" }}><span style={{ padding: "2px 8px", borderRadius: 99, background: sevB, color: sevC, fontWeight: 700, fontSize: "0.68rem" }}>{r.error_severity}</span></td>
                            <td style={{ padding: "8px 12px", fontWeight: 800, color: r.dollar_impact > 100 ? "#dc2626" : "#ea580c" }}>${r.dollar_impact.toFixed(2)}</td>
                            <td style={{ padding: "8px 12px" }}>{r.billing_blocked ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.7rem" }}>⛔ Blocked</span> : <span style={{ color: "#15803d", fontSize: "0.7rem" }}>✅ OK</span>}</td>
                            <td style={{ padding: "8px 12px" }}>{r.payroll_blocked ? <span style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.7rem" }}>⛔ Blocked</span> : <span style={{ color: "#15803d", fontSize: "0.7rem" }}>✅ OK</span>}</td>
                            <td style={{ padding: "8px 12px" }}><span style={{ padding: "2px 8px", borderRadius: 99, background: r.status === "pending" ? "#fee2e2" : "#f0fdf4", color: r.status === "pending" ? "#dc2626" : "#15803d", fontWeight: 700, fontSize: "0.68rem", textTransform: "capitalize" }}>{r.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {reconRows.length > 15 && (
                    <div style={{ padding: "10px 20px", fontSize: "0.72rem", color: "#94a3b8", borderTop: "1px solid #f1f5f9" }}>
                      Showing top 15 by dollar impact. <button onClick={() => setActiveTab("excel_reconcile")} style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: "0.72rem" }}>View all {reconRows.length} →</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setActiveTab("excel_reconcile")} style={{ padding: "10px 20px", borderRadius: 9, background: "#dc2626", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
                ⚡ Resolve Reconciliation Errors
              </button>
              <button onClick={() => setActiveTab("billing_ready")} style={{ padding: "10px 20px", borderRadius: 9, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
                🧾 Send to Billing
              </button>
              <button onClick={() => setActiveTab("payroll_review")} style={{ padding: "10px 20px", borderRadius: 9, background: "#15803d", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
                💵 Release Payroll
              </button>
              <button onClick={() => setReconcileOpen(true)} style={{ padding: "10px 20px", borderRadius: 9, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
                🔄 Run Full Reconcile
              </button>
              <button onClick={downloadCorrectedExcel} style={{ padding: "10px 20px", borderRadius: 9, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer" }}>
                ⬇ Export Error Report
              </button>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Reconcile All */}
      {reconcileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 36, width: 560, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#0f172a" }}>Reconcile All</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Cross-checking tickets, invoices, Excel, dispatch, payroll, billing, and pit master</div>
              </div>
              <button onClick={() => setReconcileOpen(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                ["Tickets Scanned", activeTickets.length, "#0f172a"],
                ["Matched", activeTickets.filter(t => t.crossCheckStatus === "Matched").length, "#16a34a"],
                ["Needs Review", needsReviewTickets.length, "#ea580c"],
                ["Missing Invoices", activeTickets.filter(t => !t.invoiceMatched).length, "#d97706"],
                ["Duplicate Tickets", activeTickets.filter(t => t.duplicateRisk).length, "#7c3aed"],
                ["Missing Proof", activeTickets.filter(t => t.proofStatus !== "Complete").length, "#dc2626"],
                ["Ready for Billing", billingReadyTickets.length, "#1d4ed8"],
                ["Ready for Payroll", payrollReadyTickets.length, "#15803d"],
              ].map(([label, value, color]) => (
                <div key={String(label)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: String(color), textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: "#15803d", fontSize: "0.88rem", marginBottom: 8 }}>Financial Summary</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", marginBottom: 6 }}>
                <span style={{ color: "#166534" }}>Ready for Billing</span>
                <strong style={{ color: "#15803d" }}>{money(totalBillingReady)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem" }}>
                <span style={{ color: "#166534" }}>Ready for Payroll</span>
                <strong style={{ color: "#15803d" }}>{money(totalPayrollReady)}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setReconcileOpen(false)} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Close</button>
              <button onClick={() => { setReconcileOpen(false); loadTickets(); showToast("Reconcile complete — results updated."); }} style={{ padding: "10px 22px", borderRadius: 9, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                Run Full Reconcile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      {manualOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>Manual Ticket Entry</span>
              <button onClick={() => setManualOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Ticket Number","ticket_number"],["Date","ticket_date"],["Driver Name","driver_name"],
                ["Truck Number","truck_number"],["Vendor","vendor_name"],["Pit / Yard","pit_location_name"],
                ["Customer","customer_name"],["Project / Job","project_name"],["PO Number","po_number"],
                ["Material","material"],["Gross Weight","gross_weight"],["Tare Weight","tare_weight"],
                ["Net Tons","quantity"],["Pay Rate","pay_rate"],["Bill Rate","bill_rate"],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{label}</label>
                  <input id={`manual-${field}`} type={field === "ticket_date" ? "date" : field.includes("rate") || field === "quantity" || field.includes("weight") ? "number" : "text"}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.83rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setManualOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={async () => {
                const fields = ["ticket_number","ticket_date","driver_name","truck_number","vendor_name","pit_location_name","customer_name","project_name","po_number","material","gross_weight","tare_weight","quantity","pay_rate","bill_rate"];
                const body: Record<string, any> = { status: "scanned", source: "ManualEntry" };
                fields.forEach(f => { const el = document.getElementById(`manual-${f}`) as HTMLInputElement; if (el?.value) body[f] = el.value; });
                const res = await fetch("/api/ronyx/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                const data = await res.json();
                if (res.ok) { showToast(`✓ Ticket ${data.ticket?.ticket_number || ""} created`); setManualOpen(false); setTimeout(loadTickets, 500); }
                else showToast(`Failed: ${data.error}`);
              }} style={{ padding: "9px 22px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pit Form */}
      {pitFormOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>{pitEditId ? "Edit Location" : "Add Pit / Location"}</span>
              <button onClick={() => setPitFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {([
                ["Vendor Name", "vendorName", "e.g. Martin Marietta"],
                ["Pit / Location Name", "pitName", "e.g. South Post Oak Yard"],
                ["Location Type", "locationType", "Yard, Quarry, Rail Yard, Sand Plant…"],
                ["City", "city", "e.g. Houston"],
                ["State", "state", "e.g. TX"],
                ["Default Material", "defaultMaterial", "e.g. Limestone Base"],
                ["Aliases", "aliases", "Short names, comma-separated"],
                ["OCR Keywords", "ocrKeywords", "ALLCAPS keywords from ticket scans"],
              ] as [string, keyof PitRecord, string][]).map(([label, field, ph]) => (
                <div key={field}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={String(pitForm[field] || "")} onChange={e => setPitForm(prev => ({ ...prev, [field]: e.target.value }))} placeholder={ph}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.83rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
              {(["active", "requiresPO", "requiresTicketMatch"] as (keyof PitRecord)[]).map(field => (
                <label key={field} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(pitForm[field])} onChange={e => setPitForm(prev => ({ ...prev, [field]: e.target.checked }))} />
                  {field === "active" ? "Active" : field === "requiresPO" ? "Requires PO" : "Requires Ticket Match"}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setPitFormOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (pitEditId) {
                  setPits(prev => prev.map(p => p.id === pitEditId ? { ...p, ...pitForm } as PitRecord : p));
                } else {
                  setPits(prev => [...prev, { ...pitForm, id: Date.now().toString() } as PitRecord]);
                }
                setPitFormOpen(false); setPitForm({}); setPitEditId(null);
                showToast(pitEditId ? "Location updated." : "Location added to pit master.");
              }} style={{ padding: "9px 22px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                {pitEditId ? "Save Changes" : "Add Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: FAST SCAN™ QR CODE
      ═══════════════════════════════════════════════════════════════════════ */}
      {qrOpen && qrUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, padding: "28px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Fast Scan™ QR</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a" }}>Ticket #{qrTicketNo || qrTicketId.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 3 }}>
                  Scanned {qrScanCount} time{qrScanCount !== 1 ? "s" : ""} · Secure token active
                </div>
              </div>
              <button onClick={() => setQrOpen(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#64748b", fontWeight: 700 }}>✕</button>
            </div>

            {/* QR Code */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, background: "#fff", border: "2px solid #e2e8f0", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <QRCode value={qrUrl} size={200} fgColor="#0f172a" bgColor="#ffffff" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.1em", marginBottom: 4 }}>FAST SCAN™ QR · Ronyx Logistics LLC</div>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Scan for live ticket status</div>
              </div>
            </div>

            {/* Role links */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: "0.72rem" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Share by role</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { label: "📋 Office Staff", r: "office" },
                  { label: "🚛 Driver",       r: "driver" },
                  { label: "✍️ Customer Signer", r: "customer" },
                ].map(({ label, r }) => {
                  const roleUrl = `${qrUrl}&r=${r}`;
                  return (
                    <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#64748b", minWidth: 130 }}>{label}</span>
                      <button onClick={() => { navigator.clipboard?.writeText(roleUrl); showToast(`${label} link copied!`); }}
                        style={{ padding: "3px 10px", borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.68rem", cursor: "pointer" }}>
                        Copy Link
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Print / action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => {
                const w = window.open("", "_blank")!;
                w.document.write(`<!DOCTYPE html><html><head><title>Ronyx Ticket #${qrTicketNo} — QR Label</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;display:flex;flex-direction:column;align-items:center}h2{margin:0 0 4px;font-size:1rem}p{margin:2px 0;font-size:0.75rem;color:#64748b}img{margin-top:16px;width:200px;height:200px}@media print{button{display:none}}</style></head><body><h2>Ticket #${qrTicketNo}</h2><p>Fast Scan™ QR — Scan for live ticket status</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" /><p style="margin-top:12px;font-size:0.65rem;color:#94a3b8">Ronyx Logistics LLC</p><button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Print QR Label</button></body></html>`);
                w.document.close();
              }} style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                🖨 Print QR Label
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(qrUrl); showToast("QR link copied!"); }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                📋 Copy Link
              </button>
              <button onClick={() => generateQr(qrTicketId, qrTicketNo, undefined, undefined, 0)}
                style={{ padding: "10px 14px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                ↺ Regen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (() => {
        const t = tickets.find(x => x.id === deleteConfirmId);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: "1.5rem" }}>🗑️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>Delete Ticket?</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Ticket #{t?.ticketNo} · {t?.driver} · {t?.truck}</div>
                </div>
              </div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: "0.82rem", color: "#c2410c" }}>
                Logged in audit trail — visible to managers and owners. Cannot be used for payroll or billing.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Reason (required)</label>
                <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate ticket, entered in error, test scan…"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", height: 80, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setDeleteConfirmId(null); setDeleteReason(""); }} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button disabled={!deleteReason.trim() || deleting} onClick={() => deleteTicket(deleteConfirmId, deleteReason)}
                  style={{ padding: "9px 22px", borderRadius: 8, background: deleteReason.trim() ? "#dc2626" : "#e2e8f0", color: deleteReason.trim() ? "#fff" : "#94a3b8", border: "none", fontWeight: 700, cursor: deleteReason.trim() && !deleting ? "pointer" : "not-allowed" }}>
                  {deleting ? "Deleting…" : "Delete Ticket"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: EXCEL IMPORT
      ═══════════════════════════════════════════════════════════════════════ */}
      {importOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column" }}>

            {/* ── sticky header ── */}
            <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Excel Import → TMS</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Import Tickets from Excel</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 3 }}>
                  {importFileName} &nbsp;·&nbsp; <strong style={{ color: "#0f172a" }}>{importRows.length} rows</strong> &nbsp;·&nbsp; {importOrigHeaders.length} columns detected
                </div>
              </div>
              <button onClick={() => { setImportOpen(false); setImportResult(null); }} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, color: "#64748b", flexShrink: 0 }}>✕ Close</button>
            </div>

            <div style={{ padding: "20px 32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* ── ALL detected columns ── */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  All {importOrigHeaders.length} columns detected in your file
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
                  {importOrigHeaders.map((orig, i) => {
                    const norm = importNormHeaders[i] || orig;
                    const isMapped = Object.keys(IMPORT_MAP).includes(norm);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 7, background: isMapped ? "#f0fdf4" : "#fff", border: `1px solid ${isMapped ? "#86efac" : "#e2e8f0"}` }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isMapped ? "#16a34a" : "#94a3b8" }}>
                          {isMapped ? "✓" : "·"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orig}</span>
                        {isMapped && norm !== orig.toLowerCase() && (
                          <span style={{ fontSize: "0.62rem", color: "#86efac", marginLeft: "auto", flexShrink: 0 }}>→ {norm}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 10 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>Green ✓</span> = mapped to a TMS field &nbsp;·&nbsp; All other columns are stored in ticket notes so no data is lost
                </div>
              </div>

              {/* ── Row preview ── */}
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0f172a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Preview — first 5 rows
                </div>
                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" }}>#</th>
                        {importOrigHeaders.slice(0, 12).map(h => (
                          <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", maxWidth: 120 }}>{h}</th>
                        ))}
                        {importOrigHeaders.length > 12 && <th style={{ padding: "7px 10px", color: "#94a3b8", fontWeight: 500 }}>+{importOrigHeaders.length - 12} more</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{i + 1}</td>
                          {importNormHeaders.slice(0, 12).map((norm, j) => (
                            <td key={j} style={{ padding: "6px 10px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[norm] || "—"}</td>
                          ))}
                          {importOrigHeaders.length > 12 && <td style={{ padding: "6px 10px", color: "#94a3b8" }}>…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 5 && (
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 5, textAlign: "center" }}>+ {importRows.length - 5} more rows</div>
                )}
              </div>

              {/* ── Progress ── */}
              {importRunning && (
                <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>
                    <span>Importing to TMS…</span>
                    <span>{importDoneCount} / {importRows.length}</span>
                  </div>
                  <div style={{ height: 8, background: "#ede9fe", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${importRows.length > 0 ? Math.round((importDoneCount / importRows.length) * 100) : 0}%`, background: "#7c3aed", borderRadius: 99, transition: "width 300ms" }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 6 }}>Creating aggregate_tickets records…</div>
                </div>
              )}

              {/* ── Result ── */}
              {importResult && (
                <div style={{ padding: "16px 20px", borderRadius: 12, background: importResult.error ? "#fff1f2" : "#f0fdf4", border: `1px solid ${importResult.error ? "#fecdd3" : "#86efac"}` }}>
                  {importResult.error ? (
                    <div>
                      <div style={{ color: "#dc2626", fontWeight: 800, fontSize: "0.88rem", marginBottom: 4 }}>Import failed</div>
                      <div style={{ color: "#dc2626", fontSize: "0.8rem" }}>{importResult.error}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: "#16a34a", fontWeight: 900, fontSize: "1rem", marginBottom: 6 }}>
                        ✓ {importResult.created} ticket{importResult.created !== 1 ? "s" : ""} added to TMS
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#166534" }}>
                        {importResult.total} rows processed &nbsp;·&nbsp; {importResult.created} created &nbsp;·&nbsp; {importResult.failed ?? 0} failed
                      </div>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: "0.72rem", color: "#dc2626" }}>
                          {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Actions ── */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => { setImportOpen(false); setImportResult(null); }}
                  style={{ padding: "10px 20px", borderRadius: 10, background: "#f1f5f9", border: "none", fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
                  {importResult && !importResult.error ? "Close" : "Cancel"}
                </button>
                {!importResult && !importRunning && (
                  <button onClick={runImport}
                    style={{ padding: "11px 28px", borderRadius: 10, background: "#7c3aed", color: "#fff", border: "none", fontWeight: 900, fontSize: "0.9rem", cursor: "pointer" }}>
                    ⬆ Import {importRows.length} Tickets into TMS
                  </button>
                )}
                {importResult && !importResult.error && (
                  <>
                    <button onClick={() => { setImportOpen(false); setImportResult(null); importFileRef.current?.click(); }}
                      style={{ padding: "10px 18px", borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                      Import Another File
                    </button>
                    <button onClick={() => { setImportOpen(false); setImportResult(null); setActiveTab("all"); }}
                      style={{ padding: "10px 24px", borderRadius: 10, background: "#16a34a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer" }}>
                      View Imported Tickets →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
