"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PayrollStatus =
  | "Ready to Pay"
  | "Needs Review"
  | "Missing Tickets"
  | "Disputed"
  | "Paid"
  | "Locked";

type DriverType = "W2" | "1099" | "Owner Operator";

type PayrollRecord = {
  id: string;
  driverId: string;
  driver: string;
  driverType: DriverType;
  phone: string;
  truck: string;
  payPeriod: string;
  tickets: number;
  loads: number;
  grossPay: number;
  deductions: number;
  reimbursements: number;
  netPay: number;
  advances: number;
  fuelDeduction: number;
  missingTickets: number;
  disputedTickets: number;
  status: PayrollStatus;
  invoiceVisible: boolean;
  lastUpdated: string;
};

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end:   sun.toISOString().slice(0, 10),
  };
}

function fmtPeriod(start: string, end: string): string {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end   + "T12:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function mapCalcResult(d: any, period: string): PayrollRecord {
  const gross       = parseFloat(d.gross_pay || d.total_pay || 0);
  const deductions  = parseFloat(d.deductions || d.total_deductions || 0);
  const reimb       = parseFloat(d.reimbursements || 0);
  const advances    = parseFloat(d.advances || 0);
  const fuel        = parseFloat(d.fuel_deduction || 0);
  const net         = gross - deductions + reimb;
  const missing     = parseInt(d.missing_tickets || 0);
  const disputed    = parseInt(d.disputed_tickets || 0);
  const tickets     = parseInt(d.ticket_count || d.tickets || 0);
  const loads       = parseInt(d.load_count || d.loads || 0);

  let status: PayrollStatus = "Ready to Pay";
  if (disputed > 0) status = "Disputed";
  else if (missing > 0) status = "Missing Tickets";
  else if (d.status) status = d.status as PayrollStatus;

  const name: string = d.driver_name || d.name || "Unknown Driver";

  return {
    id:              `PAY-${(d.driver_id || d.id || "").toString().slice(-6).toUpperCase()}`,
    driverId:        d.driver_id || d.id || "",
    driver:          name,
    driverType:      (d.driver_type as DriverType) || "1099",
    phone:           d.phone || "—",
    truck:           d.truck_number || d.unit_number || "—",
    payPeriod:       period,
    tickets,
    loads,
    grossPay:        gross,
    deductions,
    reimbursements:  reimb,
    netPay:          net,
    advances,
    fuelDeduction:   fuel,
    missingTickets:  missing,
    disputedTickets: disputed,
    status,
    invoiceVisible:  status === "Ready to Pay" || status === "Paid",
    lastUpdated:     d.calculated_at
      ? new Date(d.calculated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "Just now",
  };
}

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function PayrollBadge({ value }: { value: PayrollStatus | DriverType }) {
  const className =
    value === "Ready to Pay" || value === "1099"
      ? "payroll-badge green"
      : value === "Paid" || value === "W2"
      ? "payroll-badge blue"
      : value === "Needs Review" || value === "Missing Tickets"
      ? "payroll-badge amber"
      : value === "Owner Operator"
      ? "payroll-badge purple"
      : "payroll-badge red";

  return <span className={className}>{value}</span>;
}

export default function PayrollPage() {
  const [records, setRecords]         = useState<PayrollRecord[]>([]);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter]   = useState("All Types");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd]     = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadPayroll = useCallback(async (start: string, end: string) => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const r = await fetch("/api/ronyx/payroll/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: start, end_date: end }),
      });
      const data = await r.json();
      const period = fmtPeriod(start, end);
      if (Array.isArray(data.drivers) && data.drivers.length > 0) {
        setRecords(data.drivers.map((d: any) => mapCalcResult(d, period)));
      } else if (Array.isArray(data.results) && data.results.length > 0) {
        setRecords(data.results.map((d: any) => mapCalcResult(d, period)));
      } else {
        setRecords([]);
        showToast("No payroll data for this period.");
      }
    } catch {
      showToast("Could not load payroll — check connection");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const { start, end } = getWeekBounds();
    setPeriodStart(start);
    setPeriodEnd(end);
  }, []);

  useEffect(() => {
    if (periodStart && periodEnd) loadPayroll(periodStart, periodEnd);
  }, [periodStart, periodEnd, loadPayroll]);

  const handleApproveDriver = useCallback(async (record: PayrollRecord) => {
    try {
      await fetch("/api/ronyx/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id:   record.driverId,
          start_date:  periodStart,
          end_date:    periodEnd,
          gross_pay:   record.grossPay,
          deductions:  record.deductions,
          net_pay:     record.netPay,
          status:      "approved",
        }),
      });
      setRecords((prev) =>
        prev.map((r) => r.id === record.id ? { ...r, status: "Paid" as PayrollStatus } : r)
      );
      showToast(`${record.driver} pay approved`);
    } catch {
      showToast("Approve failed — please retry");
    }
  }, [periodStart, periodEnd, showToast]);

  const handleLockPeriod = useCallback(async () => {
    try {
      await fetch("/api/ronyx/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: periodStart, end_date: periodEnd, status: "locked" }),
      });
      showToast("Pay period locked");
      setRecords((prev) => prev.map((r) => ({ ...r, status: r.status === "Paid" ? "Locked" as PayrollStatus : r.status })));
    } catch {
      showToast("Lock failed — please retry");
    }
  }, [periodStart, periodEnd, showToast]);

  const handleExport = useCallback(() => {
    if (records.length === 0) { showToast("No records to export"); return; }
    const headers = ["ID","Driver","Type","Phone","Truck","Pay Period","Tickets","Loads","Gross","Deductions","Reimb","Net","Status"];
    const rows    = records.map((r) =>
      [r.id,r.driver,r.driverType,r.phone,r.truck,r.payPeriod,r.tickets,r.loads,r.grossPay,r.deductions,r.reimbursements,r.netPay,r.status].join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `payroll-${periodStart}-to-${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Payroll exported");
  }, [records, periodStart, periodEnd, showToast]);

  const filteredPayroll = useMemo(() => {
    const query = search.toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        record.driver.toLowerCase().includes(query) ||
        record.truck.toLowerCase().includes(query) ||
        record.id.toLowerCase().includes(query) ||
        record.phone.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All Statuses" || record.status === statusFilter;
      const matchesType   = typeFilter   === "All Types"    || record.driverType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter, records]);

  const totalGross         = records.reduce((t, r) => t + r.grossPay, 0);
  const totalDeductions    = records.reduce((t, r) => t + r.deductions, 0);
  const totalReimbursements = records.reduce((t, r) => t + r.reimbursements, 0);
  const totalNet           = records.reduce((t, r) => t + r.netPay, 0);
  const readyToPay         = records.filter((r) => r.status === "Ready to Pay").length;
  const needsReview        = records.filter((r) => ["Needs Review","Missing Tickets","Disputed"].includes(r.status)).length;
  const missingTicketCount = records.reduce((t, r) => t + r.missingTickets, 0);

  const auditAlerts = records
    .filter((r) => r.status !== "Ready to Pay" && r.status !== "Paid")
    .map((r) => ({
      title:  r.status,
      driver: r.driver,
      detail: r.missingTickets > 0
        ? `${r.missingTickets} missing ticket(s), ${r.disputedTickets} disputed`
        : `Status needs resolution before payment`,
      level: r.status === "Disputed" ? "critical" : r.status === "Missing Tickets" ? "warning" : "danger",
    }));

  const readiness = (r: PayrollRecord) =>
    r.status === "Ready to Pay" || r.status === "Paid" ? 100
    : r.status === "Missing Tickets" ? 72
    : r.status === "Disputed" ? 48
    : 80;

  return (
    <main className="payroll-page">
      {toast && <div className="payroll-toast">{toast}</div>}

      <section className="payroll-hero">
        <div>
          <p className="payroll-eyebrow">MoveAround TMS / Payroll</p>
          <h1>Payroll Command Center</h1>
          <p>
            Review driver pay, ticket totals, load totals, deductions, reimbursements,
            advances, disputes, missing tickets, and weekly driver invoices before payroll is approved.
          </p>
          <div className="payroll-period-bar">
            <label>Pay Period:</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <span>to</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            <button className="payroll-button ghost" onClick={() => loadPayroll(periodStart, periodEnd)}>
              {loading ? "Loading…" : "Load Payroll"}
            </button>
          </div>
        </div>

        <div className="payroll-hero-actions">
          <button className="payroll-button ghost" onClick={handleExport}>Export Payroll</button>
          <button className="payroll-button dark" onClick={handleLockPeriod}>Lock Pay Period</button>
          <Link href="/ronyx/payroll/new" className="payroll-button primary">
            + Create Payroll Run
          </Link>
        </div>
      </section>

      <section className="payroll-kpi-grid">
        <div className="payroll-kpi">
          <span>Gross Payroll</span>
          <strong>{money(totalGross)}</strong>
          <p>Current pay period</p>
        </div>
        <div className="payroll-kpi danger">
          <span>Total Deductions</span>
          <strong>{money(totalDeductions)}</strong>
          <p>Advances, fuel, other</p>
        </div>
        <div className="payroll-kpi success">
          <span>Reimbursements</span>
          <strong>{money(totalReimbursements)}</strong>
          <p>Approved reimbursements</p>
        </div>
        <div className="payroll-kpi blue">
          <span>Net Pay</span>
          <strong>{money(totalNet)}</strong>
          <p>Estimated payout</p>
        </div>
        <div className="payroll-kpi green">
          <span>Ready to Pay</span>
          <strong>{readyToPay}</strong>
          <p>Drivers approved</p>
        </div>
        <div className="payroll-kpi warning">
          <span>Needs Review</span>
          <strong>{needsReview}</strong>
          <p>{missingTicketCount} missing tickets</p>
        </div>
      </section>

      <section className="payroll-layout">
        <div className="payroll-main-column">
          <div className="payroll-panel">
            <div className="payroll-panel-header">
              <div>
                <p className="payroll-eyebrow">Payroll Audit</p>
                <h2>Exceptions &amp; Review Alerts</h2>
                <span>
                  Catch missing tickets, disputes, deduction issues, and invoice problems before payment.
                </span>
              </div>
              <button className="payroll-button ghost" onClick={() => loadPayroll(periodStart, periodEnd)}>
                Review All
              </button>
            </div>

            <div className="payroll-alert-grid">
              {auditAlerts.length === 0 ? (
                <div className="payroll-alert">
                  <strong>All Clear</strong>
                  <p>No exceptions found for this pay period.</p>
                </div>
              ) : (
                auditAlerts.map((alert) => (
                  <div
                    key={`${alert.title}-${alert.driver}`}
                    className={
                      alert.level === "critical"
                        ? "payroll-alert critical"
                        : alert.level === "danger"
                        ? "payroll-alert danger"
                        : "payroll-alert warning"
                    }
                  >
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.driver}</p>
                      <span>{alert.detail}</span>
                    </div>
                    <button>Open</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="payroll-panel">
            <div className="payroll-panel-header">
              <div>
                <p className="payroll-eyebrow">Driver Pay Records</p>
                <h2>Weekly Payroll</h2>
                <span>Search, filter, approve, lock, export, and manage driver pay records.</span>
              </div>
            </div>

            <div className="payroll-filter-bar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver, truck, payroll ID, or phone..."
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Statuses</option>
                <option>Ready to Pay</option>
                <option>Needs Review</option>
                <option>Missing Tickets</option>
                <option>Disputed</option>
                <option>Paid</option>
                <option>Locked</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option>All Types</option>
                <option>W2</option>
                <option>1099</option>
                <option>Owner Operator</option>
              </select>
            </div>

            <div className="payroll-record-list">
              {loading ? (
                <div className="payroll-loading">Calculating payroll…</div>
              ) : filteredPayroll.length === 0 ? (
                <div className="payroll-empty">
                  {records.length === 0
                    ? "No payroll data for this period — try adjusting the date range."
                    : "No drivers match your filters."}
                </div>
              ) : (
                filteredPayroll.map((record) => (
                  <article className="payroll-record-card" key={record.id}>
                    <div className="payroll-record-top">
                      <div className="payroll-driver-block">
                        <div className="payroll-avatar">
                          {record.driver.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <div>
                          <p className="payroll-eyebrow">{record.id}</p>
                          <h3>{record.driver}</h3>
                          <span>{record.phone} · {record.truck} · {record.payPeriod}</span>
                        </div>
                      </div>
                      <div className="payroll-badge-row">
                        <PayrollBadge value={record.status} />
                        <PayrollBadge value={record.driverType} />
                      </div>
                    </div>

                    <div className="payroll-money-grid">
                      <div><span>Gross Pay</span><strong>{money(record.grossPay)}</strong></div>
                      <div>
                        <span>Deductions</span>
                        <strong className={record.deductions > 400 ? "payroll-danger-text" : ""}>
                          {money(record.deductions)}
                        </strong>
                      </div>
                      <div><span>Reimbursements</span><strong>{money(record.reimbursements)}</strong></div>
                      <div><span>Net Pay</span><strong>{money(record.netPay)}</strong></div>
                    </div>

                    <div className="payroll-detail-grid">
                      <div><span>Tickets</span><strong>{record.tickets}</strong></div>
                      <div><span>Loads</span><strong>{record.loads}</strong></div>
                      <div><span>Advances</span><strong>{money(record.advances)}</strong></div>
                      <div><span>Fuel Deduction</span><strong>{money(record.fuelDeduction)}</strong></div>
                      <div>
                        <span>Missing Tickets</span>
                        <strong className={record.missingTickets > 0 ? "payroll-danger-text" : ""}>
                          {record.missingTickets}
                        </strong>
                      </div>
                      <div>
                        <span>Disputed Tickets</span>
                        <strong className={record.disputedTickets > 0 ? "payroll-danger-text" : ""}>
                          {record.disputedTickets}
                        </strong>
                      </div>
                      <div><span>Invoice Visible</span><strong>{record.invoiceVisible ? "Yes" : "No"}</strong></div>
                      <div><span>Last Updated</span><strong>{record.lastUpdated}</strong></div>
                    </div>

                    <div className="payroll-progress-wrap">
                      <div className="payroll-progress-top">
                        <span>Payroll Readiness</span>
                        <strong>{readiness(record)}%</strong>
                      </div>
                      <div className="payroll-progress-track">
                        <div
                          className={
                            readiness(record) === 100
                              ? "payroll-progress-fill good"
                              : readiness(record) < 60
                              ? "payroll-progress-fill bad"
                              : "payroll-progress-fill warn"
                          }
                          style={{ width: `${readiness(record)}%` }}
                        />
                      </div>
                    </div>

                    <div className="payroll-card-footer">
                      <div className="payroll-action-group">
                        <button>Review</button>
                        <button>Tickets</button>
                        <button>Invoice</button>
                        <button>Deductions</button>
                      </div>
                      <button
                        className={
                          record.status === "Ready to Pay"
                            ? "payroll-approve-button"
                            : "payroll-danger-button"
                        }
                        onClick={() =>
                          record.status === "Ready to Pay"
                            ? handleApproveDriver(record)
                            : showToast(`Open ${record.driver}'s record to resolve issue first`)
                        }
                      >
                        {record.status === "Ready to Pay" ? "Approve Pay" : "Resolve Issue"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="payroll-side-column">
          <div className="payroll-panel">
            <p className="payroll-eyebrow">Quick Actions</p>
            <h2>Payroll Tools</h2>
            <div className="payroll-quick-list">
              <button onClick={() => loadPayroll(periodStart, periodEnd)}>Create Payroll Run</button>
              <button>Import Tickets</button>
              <button onClick={() => setStatusFilter("Missing Tickets")}>Review Missing Tickets</button>
              <button>Add Deduction</button>
              <button>Add Reimbursement</button>
              <button>Send Driver Invoice</button>
              <button onClick={handleExport}>Export to Accounting</button>
              <button onClick={handleLockPeriod}>Lock Pay Period</button>
            </div>
          </div>

          <div className="payroll-panel dark-payroll-panel">
            <p className="payroll-eyebrow">AI Payroll Auditor</p>
            <h2>Recommended Actions</h2>
            <p>
              {needsReview > 0
                ? `${needsReview} driver(s) need review before this pay period can be locked. Resolve disputes and missing tickets first.`
                : readyToPay > 0
                ? `${readyToPay} driver(s) are ready for pay approval. Lock the period when done.`
                : "Load payroll data above to see AI recommendations."}
            </p>
            <button className="payroll-button primary full" onClick={() => loadPayroll(periodStart, periodEnd)}>
              Run Payroll Audit
            </button>
          </div>

          <div className="payroll-panel">
            <p className="payroll-eyebrow">Driver Visibility</p>
            <h2>Invoice Rules</h2>
            <div className="payroll-info-box">
              <strong>Drivers should see weekly totals only.</strong>
              <p>
                Drivers may view approved weekly invoices, load counts, ticket counts,
                and weekly totals. Sensitive payroll, deductions, HR notes, and admin
                controls should only be visible to Admin or HR roles.
              </p>
            </div>
          </div>

          <div className="payroll-panel">
            <p className="payroll-eyebrow">Advanced Payroll Features</p>
            <h2>Build Next</h2>
            <ul className="payroll-feature-list">
              <li>Ticket-to-pay matching</li>
              <li>Driver weekly invoice portal</li>
              <li>Payroll approval workflow</li>
              <li>Missing ticket detection</li>
              <li>Advance and deduction tracking</li>
              <li>1099 contractor summaries</li>
              <li>W2 payroll export</li>
              <li>QuickBooks export</li>
              <li>Dispute resolution workflow</li>
              <li>Pay period lock and audit trail</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
