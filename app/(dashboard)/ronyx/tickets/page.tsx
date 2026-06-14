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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [riskFilter, setRiskFilter] = useState("All Risks");
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
        body: JSON.stringify({ status: "scanned", scan_source: "Fast Scan" }),
      });
      const createData = await createRes.json();
      const ticketId = createData.ticket?.id || createData.id;
      if (ticketId) {
        for (const file of Array.from(files)) {
          const form = new FormData();
          form.append("file", file);
          form.append("ticket_id", ticketId);
          await fetch("/api/ronyx/tickets/upload", { method: "POST", body: form });
        }
      }
      showToast("Upload complete — processing OCR…");
      setTimeout(loadTickets, 2000);
    } catch {
      showToast("Upload failed — check connection");
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
          <button className="tickets-button ghost" onClick={() => fileInputRef.current?.click()}>
            Batch Upload
          </button>
          <button className="tickets-button dark">Review Exceptions</button>
          <button className="tickets-button primary" onClick={() => fileInputRef.current?.click()}>
            + Fast Scan Ticket
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

      <section className="tickets-layout">
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
      </section>
    </main>
  );
}
