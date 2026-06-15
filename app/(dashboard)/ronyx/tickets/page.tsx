"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TicketStatus =
  | "Scanned"
  | "Needs Review"
  | "Matched"
  | "Approved"
  | "Sent to Payroll"
  | "Sent to Billing"
  | "Paid"
  | "Archived";

type TicketRisk = "Low" | "Medium" | "High" | "Critical";

type ProofStatus =
  | "Complete"
  | "Missing Driver Signature"
  | "Missing Customer Signature"
  | "Missing Required Documents";

type CrossCheckStatus = "Matched" | "Conflict" | "No Match" | "Duplicate";

type TicketRecord = {
  id: string;
  ticketNo: string;
  driver: string;
  truck: string;
  load: string;
  customer: string;
  plant: string;
  jobsite: string;
  material: string;
  tons: number;
  rate: number;
  total: number;
  ticketDate: string;
  ticketSource: string;
  scanConfidence: number;
  status: TicketStatus;
  risk: TicketRisk;
  ticketHealthScore: number;
  proofStatus: ProofStatus;
  crossCheckStatus: CrossCheckStatus;
  payrollReady: boolean;
  billingReady: boolean;
  exceptionCount: number;
  weightVariancePct: number;
  driverVerified: boolean;
  truckVerified: boolean;
  duplicateRisk: boolean;
  duplicateMatch?: string;
  missingFields: number;
  lastUpdated: string;
};

const STATUS_MAP: Record<string, TicketStatus> = {
  scanned: "Scanned",
  needs_review: "Needs Review",
  matched: "Matched",
  approved: "Approved",
  sent_to_payroll: "Sent to Payroll",
  sent_to_billing: "Sent to Billing",
  paid: "Paid",
  archived: "Archived",
  rejected: "Needs Review",
  invoiced: "Sent to Billing",
};

function mapApiTicket(t: any, all: any[]): TicketRecord {
  const duplicateMatch = all.find(
    (x) => x.ticket_number === t.ticket_number && x.id !== t.id
  );
  const isDuplicate = Boolean(duplicateMatch);

  const confidence = t.ocr_confidence != null ? Math.round(t.ocr_confidence * 100) : 85;
  const hasDriver = Boolean(t.driver_name);
  const hasTruck = Boolean(t.truck_number || t.unit_number);
  const dispatchMatch = t.dispatch_match !== false;
  const weightVariancePct =
    t.weight_variance_pct != null
      ? Number(t.weight_variance_pct)
      : t.weight_variance != null
      ? Number(t.weight_variance)
      : t.variance_pct != null
      ? Number(t.variance_pct)
      : 0;
  const weightVerified = Math.abs(weightVariancePct) <= 2;

  const missing =
    (t.driver_name ? 0 : 1) +
    (t.truck_number ? 0 : 1) +
    (t.tons || t.quantity ? 0 : 1) +
    (t.ticket_number ? 0 : 1);

  const driverSignature =
    t.driver_signature || t.has_driver_signature || t.driver_signed || false;
  const customerSignature =
    t.customer_signature || t.has_customer_signature || t.customer_signed || false;
  const documentsComplete =
    t.documents_complete !== false && t.proof_status !== "missing";

  const proofStatus: ProofStatus = (t.proof_status as ProofStatus) ||
    (!driverSignature && !customerSignature
      ? "Missing Required Documents"
      : !driverSignature
      ? "Missing Driver Signature"
      : !customerSignature
      ? "Missing Customer Signature"
      : documentsComplete
      ? "Complete"
      : "Missing Required Documents");

  const risk: TicketRisk =
    isDuplicate || missing >= 3
      ? "Critical"
      : missing >= 2 || confidence < 50
      ? "High"
      : missing === 1 || confidence < 75
      ? "Medium"
      : "Low";

  const rawStatus = (t.status || "scanned").toLowerCase().replace(/ /g, "_");
  const status: TicketStatus = STATUS_MAP[rawStatus] || "Scanned";

  const payrollReady =
    t.payroll_hold === false && (status === "Approved" || status === "Sent to Payroll" || !!t.payroll_matched);
  const billingReady =
    t.billing_hold === false && (status === "Approved" || status === "Sent to Billing" || !!t.billing_matched);

  const scoreFactors = [
    hasDriver,
    hasTruck,
    dispatchMatch,
    weightVerified,
    driverSignature,
    customerSignature,
    !isDuplicate,
    payrollReady,
  ];
  const ticketHealthScore = Math.round(
    (scoreFactors.filter(Boolean).length / scoreFactors.length) * 100,
  );

  const exceptionCount = [
    !hasDriver,
    !hasTruck,
    !dispatchMatch,
    !weightVerified,
    !driverSignature,
    !customerSignature,
    isDuplicate,
    !payrollReady,
    !billingReady,
  ].filter(Boolean).length;

  const crossCheckStatus =
    (t.crosscheck_status || t.cross_check || t.match_status || "No Match")
      .toString()
      .toLowerCase() === "matched"
      ? "Matched"
      : (t.crosscheck_status || t.cross_check || t.match_status || "No Match")
          .toString()
          .toLowerCase() === "conflict"
      ? "Conflict"
      : (t.crosscheck_status || t.cross_check || t.match_status || "No Match")
          .toString()
          .toLowerCase() === "duplicate"
      ? "Duplicate"
      : "No Match";

  const tons = parseFloat(t.tons || t.quantity || 0);
  const rate = parseFloat(t.rate || 0);

  return {
    id: t.id || `TCK-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    ticketNo: t.ticket_number || "Pending",
    driver: t.driver_name || "Unknown Driver",
    truck: t.truck_number || t.unit_number || "Unknown Truck",
    load: t.load_number || t.load_id || "Unmatched",
    customer: t.customer_name || t.client_name || "—",
    plant: t.plant || t.origin || "—",
    jobsite: t.jobsite || t.destination || t.delivery_location || "—",
    material: t.material || t.material_type || "—",
    tons,
    rate,
    total: t.total_amount || (tons * rate) || 0,
    ticketDate: t.ticket_date
      ? new Date(t.ticket_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    ticketSource: t.ticket_source || t.scan_source || t.source || "FastScan",
    scanConfidence: confidence,
    status,
    risk,
    ticketHealthScore,
    proofStatus,
    crossCheckStatus,
    payrollReady,
    billingReady,
    exceptionCount,
    weightVariancePct,
    driverVerified: t.driver_verified !== false,
    truckVerified: t.truck_verified !== false,
    duplicateRisk: isDuplicate,
    duplicateMatch: duplicateMatch?.ticket_number,
    missingFields: missing,
    lastUpdated: t.updated_at
      ? new Date(t.updated_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "—",
  };
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function TicketBadge({ value }: { value: TicketStatus | TicketRisk }) {
  const className =
    value === "Approved" || value === "Matched" || value === "Paid" || value === "Low"
      ? "ticket-badge green"
      : value === "Sent to Payroll" || value === "Sent to Billing"
      ? "ticket-badge blue"
      : value === "Scanned" || value === "Medium"
      ? "ticket-badge amber"
      : value === "Needs Review" || value === "High"
      ? "ticket-badge orange"
      : "ticket-badge red";

  return <span className={className}>{value}</span>;
}

function ConfidenceBar({ score }: { score: number }) {
  const className = score >= 90 ? "good" : score >= 70 ? "warn" : "bad";

  return (
    <div className="ticket-confidence">
      <div className="ticket-confidence-top">
        <span>Fast Scan Confidence</span>
        <strong>{score}%</strong>
      </div>
      <div className="ticket-confidence-track">
        <div className={`ticket-confidence-fill ${className}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TicketHealthBadge({ score }: { score: number }) {
  const backgroundColor = score >= 90 ? "#047857" : score >= 70 ? "#f59e0b" : score >= 50 ? "#ea580c" : "#dc2626";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor,
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {score}% Health
    </span>
  );
}

function ProofBadge({ status }: { status: ProofStatus }) {
  const label =
    status === "Complete"
      ? "🟢 Complete"
      : status === "Missing Driver Signature"
      ? "🟡 Missing Driver Signature"
      : status === "Missing Customer Signature"
      ? "🟡 Missing Customer Signature"
      : "🔴 Missing Required Documents";
  const backgroundColor =
    status === "Complete"
      ? "#047857"
      : status === "Missing Driver Signature" || status === "Missing Customer Signature"
      ? "#f59e0b"
      : "#dc2626";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor,
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor: "#1f2937",
        color: "#e5e7eb",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {source}
    </span>
  );
}

function WeightVarianceChip({ percent }: { percent: number }) {
  const direction = percent >= 0 ? "+" : "";
  const backgroundColor =
    Math.abs(percent) >= 5 ? "#b91c1c" : Math.abs(percent) >= 2 ? "#d97706" : "#047857";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor,
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {direction}{percent.toFixed(1)}%
    </span>
  );
}

const auditAlerts = [
  { title: "Duplicate Ticket Detected", detail: "Ticket appears more than once. Lock before payroll/billing.", level: "critical" },
  { title: "Low Fast Scan Confidence", detail: "One or more tickets scanned below 50% confidence and need manual review.", level: "danger" },
  { title: "Payroll Match Missing", detail: "Some tickets are not matched to payroll yet.", level: "warning" },
];

type TicketTab = "all" | "fastscan" | "exceptions" | "invoice_match" | "payroll_review" | "audit_trail";

const TICKET_TABS: { id: TicketTab; label: string; icon: string }[] = [
  { id: "all",            label: "All Tickets",    icon: "📋" },
  { id: "fastscan",       label: "Fast Scan",      icon: "⚡" },
  { id: "exceptions",     label: "Exceptions",     icon: "⚠️" },
  { id: "invoice_match",  label: "Invoice Match",  icon: "🔍" },
  { id: "payroll_review", label: "Payroll Review", icon: "💵" },
  { id: "audit_trail",    label: "Audit Trail",    icon: "📜" },
];

// Scan types for inline fast scan
const SCAN_TYPES_INLINE = [
  { value: "trip_proof",    label: "Trip Proof",    icon: "📋", color: "#16a34a" },
  { value: "fuel",          label: "Fuel / Toll",   icon: "⛽", color: "#2563eb" },
  { value: "receipt",       label: "Receipt",       icon: "🧾", color: "#7c3aed" },
  { value: "damage",        label: "Damage",        icon: "⚠️",  color: "#dc2626" },
  { value: "incident",      label: "Incident",      icon: "🚨", color: "#ea580c" },
  { value: "no_show",       label: "No-Show",       icon: "🚫", color: "#6b7280" },
  { value: "missing_proof", label: "Missing Proof", icon: "❓", color: "#0891b2" },
  { value: "other",         label: "Other",         icon: "📌", color: "#64748b" },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [riskFilter, setRiskFilter] = useState("All Risks");
  const [activeTab, setActiveTab] = useState<TicketTab>("all");
  const [manualOpen, setManualOpen] = useState(false);
  // Fast Scan inline state
  const [scanType, setScanType] = useState("trip_proof");
  const [scanDriver, setScanDriver] = useState("");
  const [scanTruck, setScanTruck] = useState("");
  const [scanJob, setScanJob] = useState("");
  const [scanAmount, setScanAmount] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const r = await fetch("/api/ronyx/tickets");
      const data = await r.json();
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets.map((t: any, _: number, all: any[]) => mapApiTicket(t, all)));
      }
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: string) => {
    const optimisticStatus = STATUS_MAP[newStatus] || ("Needs Review" as TicketStatus);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: optimisticStatus } : t))
    );
    try {
      await fetch(`/api/ronyx/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Ticket updated to ${optimisticStatus}`);
    } catch {
      showToast("Update failed — please retry");
      loadTickets();
    }
  }, [loadTickets, showToast]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    showToast(`Uploading ${files.length} file(s)…`);
    try {
      const createRes = await fetch("/api/ronyx/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scanned", source: "FastScan" }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        showToast(`Ticket creation failed: ${createData.error || createRes.statusText}`);
        return;
      }
      const ticketId = createData.ticket?.id || createData.id;
      if (!ticketId) {
        showToast("Ticket created but no ID returned — reload to check.");
        setTimeout(loadTickets, 1000);
        return;
      }
      let uploadError = "";
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("ticket_id", ticketId);
        const upRes = await fetch("/api/ronyx/tickets/upload", { method: "POST", body: form });
        if (!upRes.ok) {
          const upData = await upRes.json().catch(() => ({}));
          uploadError = upData.error || upRes.statusText;
        }
      }
      if (uploadError) {
        showToast(`Ticket saved but file upload failed: ${uploadError}`);
      } else {
        showToast("Ticket uploaded — processing OCR…");
      }
      setTimeout(loadTickets, 2000);
    } catch (e: any) {
      showToast(`Upload failed: ${e?.message || "check connection"}`);
    }
  }, [loadTickets, showToast]);

  const filteredTickets = useMemo(() => {
    const query = search.toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.ticketNo.toLowerCase().includes(query) ||
        ticket.driver.toLowerCase().includes(query) ||
        ticket.truck.toLowerCase().includes(query) ||
        ticket.load.toLowerCase().includes(query) ||
        ticket.customer.toLowerCase().includes(query) ||
        ticket.jobsite.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All Statuses" || ticket.status === statusFilter;
      const matchesRisk = riskFilter === "All Risks" || ticket.risk === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [search, statusFilter, riskFilter, tickets]);

  const totalTickets = tickets.length;
  const verifiedTickets = tickets.filter((t) => t.ticketHealthScore >= 90).length;
  const reviewTickets = tickets.filter((t) => t.status === "Needs Review").length;
  const payrollHolds = tickets.filter((t) => !t.payrollReady).length;
  const billingHolds = tickets.filter((t) => !t.billingReady).length;
  const missingProofCount = tickets.filter((t) => t.proofStatus !== "Complete").length;
  const duplicateTickets = tickets.filter((t) => t.duplicateRisk).length;
  const weightVarianceTickets = tickets.filter((t) => Math.abs(t.weightVariancePct) >= 2).length;
  const ticketHealthAverage = tickets.length
    ? Math.round(tickets.reduce((sum, t) => sum + t.ticketHealthScore, 0) / tickets.length)
    : 0;

  return (
    <main className="tickets-page">
      {toast && <div className="tickets-toast">{toast}</div>}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <section className="tickets-hero">
        <div>
          <p className="tickets-eyebrow">MoveAround TMS / Fast Scan</p>
          <h1>Ticket Command Center</h1>
          <p>
            Scan tickets, extract data, match tickets to drivers, loads, payroll,
            and billing, then approve everything from one control center.
          </p>
        </div>

        <div className="tickets-hero-actions">
          <button className="tickets-button primary" onClick={() => setActiveTab("fastscan")}>
            ⚡ Fast Scan Ticket
          </button>
          <button className="tickets-button ghost" onClick={() => fileInputRef.current?.click()}>
            Batch Upload
          </button>
          <button className="tickets-button ghost" onClick={() => setManualOpen(true)}>
            Manual Entry
          </button>
          <button className="tickets-button ghost" onClick={() => window.location.href = "/ronyx/crosscheck"}>
            Reconcile Invoice
          </button>
          <button className="tickets-button dark" onClick={() => setActiveTab("exceptions")}>
            View Exceptions
          </button>
        </div>
      </section>

      <section className="tickets-kpi-grid">
        <div className="tickets-kpi">
          <span>Total Tickets</span>
          <strong>{totalTickets}</strong>
          <p>Current queue</p>
        </div>
        <div className="tickets-kpi success">
          <span>Verified</span>
          <strong>{verifiedTickets}</strong>
          <p>High health score</p>
        </div>
        <div className="tickets-kpi warning">
          <span>Review Required</span>
          <strong>{reviewTickets}</strong>
          <p>Manual exceptions</p>
        </div>
        <div className="tickets-kpi danger">
          <span>Payroll Holds</span>
          <strong>{payrollHolds}</strong>
          <p>Action required before pay</p>
        </div>
        <div className="tickets-kpi blue">
          <span>Billing Holds</span>
          <strong>{billingHolds}</strong>
          <p>Action required before invoicing</p>
        </div>
        <div className="tickets-kpi purple">
          <span>Missing Proof</span>
          <strong>{missingProofCount}</strong>
          <p>Signatures or documents</p>
        </div>
        <div className="tickets-kpi orange">
          <span>Duplicates</span>
          <strong>{duplicateTickets}</strong>
          <p>Possible duplicate tickets</p>
        </div>
        <div className="tickets-kpi teal">
          <span>Weight Variances</span>
          <strong>{weightVarianceTickets}</strong>
          <p>Out-of-tolerance loads</p>
        </div>
      </section>

      {/* Sub-tab nav */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 24, overflowX: "auto" }}>
        {TICKET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.83rem",
              color: activeTab === tab.id ? "#1e40af" : "#64748b",
              borderBottom: activeTab === tab.id ? "2px solid #1e40af" : "2px solid transparent",
              marginBottom: -2,
              whiteSpace: "nowrap" as const,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === "exceptions" && (tickets.filter(t => t.exceptionCount > 0).length > 0) && (
              <span style={{ background: "#dc2626", color: "#fff", borderRadius: 99, fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", lineHeight: 1.4 }}>
                {tickets.filter(t => t.exceptionCount > 0).length}
              </span>
            )}
            {tab.id === "payroll_review" && (tickets.filter(t => !t.payrollReady).length > 0) && (
              <span style={{ background: "#d97706", color: "#fff", borderRadius: 99, fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", lineHeight: 1.4 }}>
                {tickets.filter(t => !t.payrollReady).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Fast Scan tab */}
      {activeTab === "fastscan" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          <div>
            {/* Drop zone */}
            <div
              className="scan-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); setActiveTab("all"); }}
              style={{ marginBottom: 20 }}
            >
              <div className="scan-icon">📄</div>
              <h3>Drop ticket image or PDF here</h3>
              <p>Creates a full ticket record — driver, truck, tons, rate, date, signatures auto-detected.</p>
              <div className="scan-actions">
                <button onClick={() => fileInputRef.current?.click()}>Upload File</button>
                <button onClick={() => fileInputRef.current?.click()}>Batch Scan</button>
              </div>
            </div>

            {/* Scan type + manual fields */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", marginBottom: 14 }}>Scan Type &amp; Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                {SCAN_TYPES_INLINE.map(t => (
                  <button key={t.value} onClick={() => setScanType(t.value)}
                    style={{ padding: "10px 6px", borderRadius: 9, border: `2px solid ${scanType === t.value ? t.color : "#e2e8f0"}`, background: scanType === t.value ? t.color + "15" : "#f8fafc", cursor: "pointer", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.2rem" }}>{t.icon}</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: scanType === t.value ? t.color : "#64748b", marginTop: 3 }}>{t.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["Driver Name", scanDriver, setScanDriver, "e.g. John Smith"],
                  ["Truck / Unit #", scanTruck, setScanTruck, "e.g. 142"],
                  ["Job / Project #", scanJob, setScanJob, "e.g. MM-4421"],
                  ["Amount ($)", scanAmount, setScanAmount, "e.g. 245.00"],
                ].map(([label, val, set, ph]) => (
                  <div key={String(label)}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{String(label)}</label>
                    <input value={String(val)} onChange={e => (set as any)(e.target.value)} placeholder={String(ph)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", background: "#f8fafc" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Notes / Extracted Text</label>
                <textarea value={scanNotes} onChange={e => setScanNotes(e.target.value)} placeholder="Paste OCR text, ticket notes, or any details…"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", background: "#f8fafc", height: 72, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button
                  disabled={scanSubmitting}
                  onClick={async () => {
                    if (!scanDriver.trim() && !scanTruck.trim()) { showToast("Enter a driver name or truck number."); return; }
                    setScanSubmitting(true);
                    try {
                      const res = await fetch("/api/ronyx/fast-scan", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          file_url: `manual://fastscan/${Date.now()}`,
                          file_type: "manual",
                          scan_type: scanType,
                          driver_name: scanDriver || null,
                          detected_vehicle: scanTruck || null,
                          job_number: scanJob || null,
                          detected_amount: scanAmount ? parseFloat(scanAmount) : null,
                          extracted_text: scanNotes || null,
                          confidence_score: 1,
                          uploaded_by: "dispatcher",
                        }),
                      });
                      const data = await res.json();
                      setScanResult(data);
                      if (res.ok) {
                        showToast(`✓ Scan submitted — ${data.payroll_impact ? `Payroll: ${data.payroll_action}` : "No payroll impact"}`);
                        setScanDriver(""); setScanTruck(""); setScanJob(""); setScanAmount(""); setScanNotes("");
                        setTimeout(() => { loadTickets(); setActiveTab("all"); }, 1500);
                      } else {
                        showToast(`Scan failed: ${data.error}`);
                      }
                    } catch (e: any) { showToast(e.message); }
                    finally { setScanSubmitting(false); }
                  }}
                  style={{ padding: "10px 24px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.88rem", cursor: scanSubmitting ? "not-allowed" : "pointer", opacity: scanSubmitting ? 0.7 : 1 }}
                >
                  {scanSubmitting ? "Submitting…" : "⚡ Submit Scan"}
                </button>
                <button onClick={() => { setActiveTab("all"); }} style={{ padding: "10px 16px", borderRadius: 8, background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              {scanResult && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: "0.82rem" }}>
                  <div style={{ fontWeight: 700, color: "#16a34a" }}>✓ Scan Submitted</div>
                  <div style={{ color: "#166534", marginTop: 4 }}>{scanResult.message}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: what gets checked */}
          <div style={{ background: "#0f172a", borderRadius: 14, padding: 24, color: "#e2e8f0", alignSelf: "start" }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", marginBottom: 16 }}>What FastScan Checks</div>
            {[
              ["Ticket Number", "Unique ID, duplicate detection"],
              ["Driver",        "Matched to dispatch, CDL check"],
              ["Truck",         "Matched to fleet, inspection status"],
              ["Customer",      "Matched to job order"],
              ["Project / Job", "Linked to open project"],
              ["Pit / Quarry",  "Pickup location verified"],
              ["Material",      "Type + material code"],
              ["Tons / Loads",  "Weight vs. truck capacity"],
              ["Rate",          "Against contract rate"],
              ["Date",          "Within active load window"],
              ["Signature",     "Driver + customer proof"],
              ["Invoice Status","Pending / Matched / Missing"],
              ["Payroll Status","Ready / Hold / Review"],
            ].map(([field, desc]) => (
              <div key={String(field)} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>✓</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#f1f5f9" }}>{field}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Routes ticket to</div>
              {[["💵", "Ready for Payroll"], ["🧾", "Ready for Billing"], ["⚠️", "Needs Review"]].map(([icon, label]) => (
                <div key={String(label)} style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 6, display: "flex", gap: 8 }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exceptions tab */}
      {activeTab === "exceptions" && (() => {
        const excTickets = tickets.filter(t => t.exceptionCount > 0 || t.crossCheckStatus !== "Matched" || t.duplicateRisk);
        return (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>Exceptions</span>
              <span style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600, background: "#fee2e2", padding: "2px 10px", borderRadius: 99 }}>{excTickets.length} tickets</span>
              <button onClick={() => window.location.href = "/ronyx/exception-center"} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e40af", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                Open Exception Center →
              </button>
            </div>
            {excTickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600 }}>No exceptions — all tickets look clean</div>
              </div>
            ) : (
              <div className="tickets-list" style={{ padding: 16 }}>
                {excTickets.map(ticket => (
                  <article className="ticket-card" key={ticket.id}>
                    <div className="ticket-card-top">
                      <div>
                        <h3>Ticket #{ticket.ticketNo}</h3>
                        <span>{ticket.driver} · {ticket.truck} · {ticket.ticketDate}</span>
                      </div>
                      <div className="ticket-card-meta">
                        <TicketHealthBadge score={ticket.ticketHealthScore} />
                        <TicketBadge value={ticket.status} />
                        <TicketBadge value={ticket.risk} />
                      </div>
                    </div>
                    <div style={{ padding: "8px 0", display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {ticket.duplicateRisk && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#ede9fe", color: "#7c3aed" }}>Duplicate Risk</span>}
                      {ticket.crossCheckStatus !== "Matched" && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fee2e2", color: "#dc2626" }}>CrossCheck: {ticket.crossCheckStatus}</span>}
                      {ticket.exceptionCount > 0 && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fff7ed", color: "#ea580c" }}>{ticket.exceptionCount} Exceptions</span>}
                      {!ticket.payrollReady && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fef3c7", color: "#d97706" }}>Payroll Hold</span>}
                      {ticket.proofStatus !== "Complete" && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fef3c7", color: "#d97706" }}>{ticket.proofStatus}</span>}
                    </div>
                    <div className="ticket-card-footer">
                      <div className="ticket-action-group">
                        <button onClick={() => updateTicketStatus(ticket.id, "matched")}>Verify</button>
                        <button onClick={() => updateTicketStatus(ticket.id, "approved")}>Approve</button>
                        {ticket.duplicateRisk && <button onClick={() => updateTicketStatus(ticket.id, "rejected")}>Lock Duplicate</button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Invoice Match tab */}
      {activeTab === "invoice_match" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", marginBottom: 8 }}>Invoice CrossCheck</div>
          <p style={{ color: "#64748b", maxWidth: 400, margin: "0 auto 20px" }}>
            Upload your pit invoice + master Excel and cross-reference against system tickets for weight variances, rate conflicts, and duplicates.
          </p>
          <button onClick={() => window.location.href = "/ronyx/crosscheck"}
            style={{ padding: "12px 28px", borderRadius: 10, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
            Open CrossCheck →
          </button>
        </div>
      )}

      {/* Payroll Review tab */}
      {activeTab === "payroll_review" && (() => {
        const holds = tickets.filter(t => !t.payrollReady);
        const ready = tickets.filter(t => t.payrollReady);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                ["Payroll Holds",   holds.length,  "#dc2626", "#fee2e2", "#fecaca"],
                ["Ready for Pay",   ready.length,  "#16a34a", "#f0fdf4", "#bbf7d0"],
                ["Total Tickets",   tickets.length,"#0f172a", "#f8fafc", "#e2e8f0"],
              ].map(([l, v, c, bg, border]) => (
                <div key={String(l)} style={{ background: String(bg), border: `1px solid ${String(border)}`, borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: String(c), textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Holds list */}
            {holds.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#dc2626" }}>Payroll Holds ({holds.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Ticket #","Driver","Truck","Tons","Rate","Total","Status","Health","Action"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holds.map((t, i) => (
                        <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>{t.ticketNo}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{t.driver}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{t.truck}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.rate.toFixed(2)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>${t.total.toFixed(2)}</td>
                          <td style={{ padding: "8px 12px" }}><TicketBadge value={t.status} /></td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <div style={{ width: 32, height: 5, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", display: "inline-block" }}>
                              <div style={{ height: "100%", width: `${t.ticketHealthScore}%`, background: t.ticketHealthScore >= 80 ? "#16a34a" : "#d97706", borderRadius: 99 }} />
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <button onClick={() => updateTicketStatus(t.id, "approved")}
                              style={{ padding: "4px 12px", borderRadius: 7, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
                              Release
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Ready list */}
            {ready.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "#16a34a" }}>Ready for Payroll ({ready.length})</span>
                  <button onClick={() => ready.forEach(t => updateTicketStatus(t.id, "sent_to_payroll"))}
                    style={{ padding: "7px 16px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                    Send All to Payroll
                  </button>
                </div>
                <div style={{ padding: "8px 20px", fontSize: "0.8rem", color: "#64748b" }}>
                  {ready.slice(0, 5).map(t => `#${t.ticketNo} ${t.driver}`).join(" · ")}
                  {ready.length > 5 && ` + ${ready.length - 5} more`}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Audit Trail tab */}
      {activeTab === "audit_trail" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>Audit Trail</div>
          <div style={{ padding: 20 }}>
            {tickets.length === 0 ? (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No audit events yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {tickets.slice(0, 30).map((t, i) => (
                  <div key={t.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0", borderBottom: i < 29 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.status === "Approved" ? "#16a34a" : t.status === "Needs Review" ? "#dc2626" : "#94a3b8", flexShrink: 0, marginTop: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0f172a" }}>
                        Ticket #{t.ticketNo} — <span style={{ color: "#64748b", fontWeight: 400 }}>{t.status}</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                        {t.driver} · {t.truck} · {t.ticketDate} · Last updated {t.lastUpdated}
                      </div>
                    </div>
                    <TicketBadge value={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry modal */}
      {manualOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>Manual Ticket Entry</span>
              <button onClick={() => setManualOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Ticket Number", "ticket_number"],["Date", "ticket_date"],["Driver Name", "driver_name"],
                ["Truck Number", "truck_number"],["Customer", "customer_name"],["Material", "material"],
                ["Quantity (Tons)", "quantity"],["Pay Rate", "pay_rate"],["Bill Rate", "bill_rate"],["Job Name", "job_name"],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{label}</label>
                  <input id={`manual-${field}`}
                    type={field === "ticket_date" ? "date" : field.includes("rate") || field === "quantity" ? "number" : "text"}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setManualOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={async () => {
                const fields = ["ticket_number","ticket_date","driver_name","truck_number","customer_name","material","quantity","pay_rate","bill_rate","job_name"];
                const body: Record<string, any> = { status: "scanned", source: "ManualEntry" };
                fields.forEach(f => {
                  const el = document.getElementById(`manual-${f}`) as HTMLInputElement;
                  if (el?.value) body[f] = el.value;
                });
                const res = await fetch("/api/ronyx/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                const data = await res.json();
                if (res.ok) { showToast(`✓ Ticket ${data.ticket?.ticket_number || ""} created`); setManualOpen(false); setTimeout(loadTickets, 500); }
                else showToast(`Failed: ${data.error}`);
              }}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Tickets tab (existing layout) */}
      {activeTab === "all" && <section className="tickets-layout">
        <div className="tickets-main-column">
          <div className="tickets-scan-panel">
            <div>
              <p className="tickets-eyebrow">Fast Scan Upload</p>
              <h2>Scan Tickets Into Payroll &amp; Billing</h2>
              <p>
                Upload photos or PDFs. Fast Scan extracts ticket data, matches it to a
                driver/load/truck, and flags anything that may block payroll or billing.
              </p>
            </div>

            <div
              className="scan-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <div className="scan-icon">📄</div>
              <h3>Drop tickets here</h3>
              <p>Camera scans, PDFs, images, and batch uploads supported.</p>
              <div className="scan-actions">
                <button onClick={() => fileInputRef.current?.click()}>Open Camera</button>
                <button onClick={() => fileInputRef.current?.click()}>Upload Files</button>
                <button onClick={() => fileInputRef.current?.click()}>Batch Scan</button>
              </div>
            </div>
          </div>

          <div className="tickets-panel">
            <div className="tickets-panel-header">
              <div>
                <p className="tickets-eyebrow">Fast Scan Audit</p>
                <h2>Ticket Exceptions</h2>
                <span>
                  Catch duplicates, missing fields, low scan confidence, and unmatched payroll before approval.
                </span>
              </div>
              <button className="tickets-button ghost" onClick={loadTickets}>Run Audit</button>
            </div>

            <div className="tickets-alert-grid">
              {auditAlerts.map((alert) => (
                <div
                  key={alert.title}
                  className={
                    alert.level === "critical"
                      ? "tickets-alert critical"
                      : alert.level === "danger"
                      ? "tickets-alert danger"
                      : "tickets-alert warning"
                  }
                >
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                  <button>Resolve</button>
                </div>
              ))}
            </div>
          </div>

          <div className="tickets-panel">
            <div className="tickets-panel-header">
              <div>
                <p className="tickets-eyebrow">Ticket Work Queue</p>
                <h2>All Tickets</h2>
                <span>
                  Search, verify, approve, send to payroll, send to billing, or lock duplicates.
                </span>
              </div>
            </div>

            <div className="tickets-filter-bar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket, driver, truck, load, customer, or jobsite..."
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Statuses</option>
                <option>Scanned</option>
                <option>Needs Review</option>
                <option>Matched</option>
                <option>Approved</option>
                <option>Sent to Payroll</option>
                <option>Sent to Billing</option>
                <option>Paid</option>
                <option>Archived</option>
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option>All Risks</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div className="tickets-list">
              {loading ? (
                <div className="tickets-loading">Loading tickets…</div>
              ) : filteredTickets.length === 0 ? (
                <div className="tickets-empty">
                  {tickets.length === 0
                    ? "No tickets yet — upload your first ticket above."
                    : "No tickets match your filters."}
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <article className="ticket-card" key={ticket.id}>
                  {ticket.duplicateRisk && ticket.duplicateMatch && (
                    <div className="ticket-duplicate-banner">
                      <strong>POSSIBLE DUPLICATE</strong>
                      <span>Ticket #{ticket.ticketNo}</span>
                      <span>Similar to #{ticket.duplicateMatch}</span>
                    </div>
                  )}
                  <div className="ticket-card-top">
                    <div>
                      <p className="tickets-eyebrow">{ticket.id}</p>
                      <h3>Ticket #{ticket.ticketNo}</h3>
                      <span>{ticket.customer} · {ticket.plant} → {ticket.jobsite}</span>
                    </div>
                    <div className="ticket-card-meta">
                      <TicketHealthBadge score={ticket.ticketHealthScore} />
                      <TicketBadge value={ticket.status} />
                      <TicketBadge value={ticket.risk} />
                      <SourceBadge source={ticket.ticketSource} />
                    </div>
                  </div>

                    <div className="ticket-body">
                      <div className="ticket-preview-box">
                        <div className="ticket-paper">
                          <strong>FAST SCAN</strong>
                          <span>Ticket Image Preview</span>
                          <p>{ticket.ticketNo}</p>
                        </div>
                      </div>

                      <div className="ticket-data-grid">
                        <div>
                          <span>Driver</span>
                          <strong>
                            {ticket.driver} {ticket.driverVerified ? "✓" : "⚠"}
                            {!ticket.driverVerified ? " Dispatch Mismatch" : ""}
                          </strong>
                        </div>
                        <div>
                          <span>Truck</span>
                          <strong>
                            {ticket.truck} {ticket.truckVerified ? "✓" : "⚠"}
                            {!ticket.truckVerified ? " Dispatch Mismatch" : ""}
                          </strong>
                        </div>
                        <div><span>Source</span><strong><SourceBadge source={ticket.ticketSource} /></strong></div>
                        <div><span>CrossCheck</span><strong>{ticket.crossCheckStatus}</strong></div>
                        <div><span>Material</span><strong>{ticket.material}</strong></div>
                        <div><span>Tons</span><strong>{ticket.tons}</strong></div>
                        <div><span>Weight Variance</span><strong><WeightVarianceChip percent={ticket.weightVariancePct} /></strong></div>
                        <div><span>Date</span><strong>{ticket.ticketDate}</strong></div>
                        <div>
                          <span>Proof Status</span>
                          <strong><ProofBadge status={ticket.proofStatus} /></strong>
                        </div>
                        <div>
                          <span>Payroll</span>
                          <strong>{ticket.payrollReady ? "Payroll Ready" : "Payroll Hold"}</strong>
                        </div>
                        <div>
                          <span>Billing</span>
                          <strong>{ticket.billingReady ? "Billing Ready" : "Billing Hold"}</strong>
                        </div>
                        <div>
                          <span>Exceptions</span>
                          <strong>{ticket.exceptionCount ? `⚠️ ${ticket.exceptionCount} Issues` : "None"}</strong>
                        </div>
                      </div>
                    </div>

                    <ConfidenceBar score={ticket.scanConfidence} />

                    <div className="ticket-card-footer">
                      <div className="ticket-action-group">
                        <button onClick={() => updateTicketStatus(ticket.id, "matched")}>Open</button>
                        <button onClick={() => updateTicketStatus(ticket.id, "matched")}>Verify</button>
                        <button onClick={() => updateTicketStatus(ticket.id, "matched")}>Match Load</button>
                        <button onClick={() => updateTicketStatus(ticket.id, "sent_to_payroll")}>Hold Payroll</button>
                        <button onClick={() => updateTicketStatus(ticket.id, "invoiced")}>Release Hold</button>
                        <button onClick={() => showToast(`Open audit for ${ticket.ticketNo}`)}>Open Audit</button>
                        <button onClick={() => showToast(`Assign ticket ${ticket.ticketNo}`)}>Assign</button>
                      </div>
                      <button
                        className={
                          ticket.duplicateRisk || ticket.risk === "Critical"
                            ? "ticket-danger-button"
                            : "ticket-approve-button"
                        }
                        onClick={() =>
                          ticket.duplicateRisk
                            ? updateTicketStatus(ticket.id, "rejected")
                            : updateTicketStatus(ticket.id, "approved")
                        }
                      >
                        {ticket.duplicateRisk ? "Lock Duplicate" : "Approve Ticket"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="tickets-side-column">
          <div className="tickets-panel">
            <p className="tickets-eyebrow">Fast Scan Tools</p>
            <h2>Quick Actions</h2>
            <div className="tickets-quick-list">
              <button onClick={() => fileInputRef.current?.click()}>Fast Scan Ticket</button>
              <button onClick={() => fileInputRef.current?.click()}>Batch Upload Tickets</button>
              <button onClick={() => setRiskFilter("Low")}>Review Low Confidence</button>
              <button onClick={() => setRiskFilter("Critical")}>Find Duplicate Tickets</button>
              <button onClick={() => setStatusFilter("Matched")}>Match Tickets to Loads</button>
              <button onClick={() => setStatusFilter("Approved")}>Send Approved to Payroll</button>
              <button onClick={() => setStatusFilter("Approved")}>Send Approved to Billing</button>
              <button onClick={loadTickets}>Export Ticket Report</button>
            </div>
          </div>

          <div className="tickets-panel dark-tickets-panel">
            <p className="tickets-eyebrow">AI Ticket Auditor</p>
            <h2>Recommended Actions</h2>
            <p>
              {duplicateTickets > 0
                ? `${duplicateTickets} duplicate ticket(s) detected — lock before payroll.`
                : reviewTickets > 0
                ? `${reviewTickets} ticket(s) need manual review before approval.`
                : "All tickets look good. Run audit for final check."}
            </p>
            <button className="tickets-button primary full" onClick={loadTickets}>
              Run Fast Scan Audit
            </button>
          </div>

          <div className="tickets-panel">
            <p className="tickets-eyebrow">Fast Scan Must Feed</p>
            <h2>Connected Modules</h2>
            <ul className="tickets-feature-list">
              <li>Payroll records</li>
              <li>Driver weekly invoices</li>
              <li>Customer billing</li>
              <li>Load history</li>
              <li>Truck utilization</li>
              <li>Jobsite production totals</li>
              <li>Material totals</li>
              <li>Audit logs</li>
            </ul>
          </div>
        </aside>
      </section>}

    </main>
  );
}
