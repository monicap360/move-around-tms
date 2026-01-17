"use client";

import { useEffect, useMemo, useState } from "react";

type DriverOption = {
  id: string;
  full_name: string;
};

type Ticket = {
  id: string;
  ticket_number: string;
  ticket_date: string;
  driver_name?: string | null;
  truck_number?: string | null;
  trailer_number?: string | null;
  material?: string | null;
  unit_type?: string | null;
  quantity?: number | null;
  bill_rate?: number | null;
  status?: string | null;
  payment_status?: string | null;
  gross_weight?: number | null;
  tare_weight?: number | null;
  net_weight?: number | null;
  customer_name?: string | null;
  delivery_location?: string | null;
};

type ReconResult = {
  id: string;
  ticket_number: string;
  status: string;
  quantity_variance_pct?: number | null;
  price_variance_pct?: number | null;
};

type ReconException = {
  id: string;
  exception_type: string;
  severity: string;
  explanation: string;
};

const statusOptions = ["pending", "approved", "rejected", "invoiced", "paid"];
const paymentOptions = ["unpaid", "processing", "paid"];
const unitOptions = ["Load", "Yard", "Ton", "Hour"];

export default function RonyxTicketsPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [reconRunning, setReconRunning] = useState(false);
  const [reconResults, setReconResults] = useState<ReconResult[]>([]);
  const [reconExceptions, setReconExceptions] = useState<ReconException[]>([]);
  const [thresholds, setThresholds] = useState({
    scaleTolerancePct: "2",
    moistureTolerancePct: "1",
    finesTolerancePct: "1",
    priceVariancePct: "5",
    deliveryWindowHours: "12",
  });
  const [form, setForm] = useState({
    ticket_number: "",
    ticket_date: new Date().toISOString().slice(0, 10),
    driver_id: "",
    driver_name: "",
    truck_number: "",
    trailer_number: "",
    load_type: "Load",
    unit_type: "Load",
    material: "",
    customer_name: "",
    job_name: "",
    pickup_location: "",
    delivery_location: "",
    gross_weight: "",
    tare_weight: "",
    net_weight: "",
    quantity: "",
    rate_type: "Per Load",
    rate_amount: "",
    bill_rate: "",
    status: "pending",
    payment_status: "unpaid",
    invoice_number: "",
    driver_settlement_reference: "",
    approved_by: "",
    approved_at: "",
    ticket_notes: "",
    odometer: "",
    shift: "",
    work_order_number: "",
    ticket_image_url: "",
    delivery_receipt_url: "",
    pod_url: "",
  });

  useEffect(() => {
    loadDrivers();
    loadTickets();
    loadReconciliation();
  }, []);

  async function loadDrivers() {
    try {
      const res = await fetch("/api/hr/drivers", { cache: "no-store" });
      const data = await res.json();
      setDrivers((data || []).map((d: any) => ({ id: d.id, full_name: d.full_name })));
    } catch {
      setDrivers([]);
    }
  }

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/tickets", { cache: "no-store" });
      const data = await res.json();
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadReconciliation() {
    try {
      const res = await fetch("/api/aggregates/reconciliation/results", {
        cache: "no-store",
      });
      const data = await res.json();
      setReconResults(data.results || []);
      setReconExceptions(data.exceptions || []);
    } catch {
      setReconResults([]);
      setReconExceptions([]);
    }
  }

  async function runReconciliation() {
    setReconRunning(true);
    try {
      await fetch("/api/aggregates/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleTolerancePct: Number(thresholds.scaleTolerancePct || 2),
          moistureTolerancePct: Number(thresholds.moistureTolerancePct || 1),
          finesTolerancePct: Number(thresholds.finesTolerancePct || 1),
          priceVariancePct: Number(thresholds.priceVariancePct || 5),
          deliveryWindowHours: Number(thresholds.deliveryWindowHours || 12),
        }),
      });
      await loadReconciliation();
    } finally {
      setReconRunning(false);
    }
  }

  const calculatedNet = useMemo(() => {
    const gross = Number(form.gross_weight || 0);
    const tare = Number(form.tare_weight || 0);
    if (!gross || !tare) return "";
    return (gross - tare).toFixed(2);
  }, [form.gross_weight, form.tare_weight]);

  const calculatedTotal = useMemo(() => {
    const qty = Number(form.quantity || 0);
    const rate = Number(form.bill_rate || form.rate_amount || 0);
    if (!qty || !rate) return "0.00";
    return (qty * rate).toFixed(2);
  }, [form.quantity, form.bill_rate, form.rate_amount]);

  const summary = useMemo(() => {
    const total = tickets.length;
    const paid = tickets.filter((t) => t.payment_status === "paid").length;
    const pending = tickets.filter((t) => t.status === "pending").length;
    const revenue = tickets.reduce((sum, t) => {
      const qty = Number(t.quantity || 0);
      const rate = Number(t.bill_rate || 0);
      return sum + qty * rate;
    }, 0);
    return { total, paid, pending, revenue };
  }, [tickets]);

  const discrepancies = useMemo(() => {
    return clarifier(tickets);
  }, [tickets]);

  async function ensureTicketId() {
    if (ticketId) return ticketId;
    const res = await fetch("/api/ronyx/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_number: form.ticket_number,
        ticket_date: form.ticket_date,
        driver_id: form.driver_id || null,
        driver_name: form.driver_name || null,
        truck_number: form.truck_number || null,
        trailer_number: form.trailer_number || null,
        material: form.material || null,
        unit_type: form.unit_type,
        quantity: form.quantity || null,
        bill_rate: form.bill_rate || form.rate_amount || null,
        status: form.status,
        payment_status: form.payment_status,
      }),
    });
    const data = await res.json();
    if (data.ticket?.id) {
      setTicketId(data.ticket.id);
      if (!form.ticket_number && data.ticket.ticket_number) {
        setForm((prev) => ({ ...prev, ticket_number: data.ticket.ticket_number }));
      }
      return data.ticket.id as string;
    }
    throw new Error("Unable to create ticket");
  }

  async function handleUpload(file: File, docType: string) {
    const id = await ensureTicketId();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("ticket_id", id);

    const res = await fetch("/api/ronyx/tickets/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.path as string | undefined;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        net_weight: form.net_weight || calculatedNet,
        bill_rate: form.bill_rate || form.rate_amount,
      };
      const res = ticketId
        ? await fetch(`/api/ronyx/tickets/${ticketId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/ronyx/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setForm((prev) => ({ ...prev, ticket_number: "", material: "", quantity: "", rate_amount: "", bill_rate: "" }));
        setTicketId(null);
        await loadTickets();
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(ticketId: string, status: string, payment_status?: string) {
    await fetch(`/api/ronyx/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, payment_status }),
    });
    await loadTickets();
  }

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        :root {
          --ronyx-black: #080808;
          --ronyx-carbon: #121212;
          --ronyx-steel: #1e1e1e;
          --ronyx-border: rgba(255, 215, 0, 0.25);
          --ronyx-accent: #ffd700;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(0, 180, 255, 0.08), transparent 55%), var(--ronyx-black);
          color: #ffffff;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 14px;
          padding: 18px;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-input {
          background: var(--ronyx-steel);
          border: 1px solid var(--ronyx-border);
          border-radius: 10px;
          padding: 10px 12px;
          color: #fff;
          width: 100%;
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-btn {
          background: var(--ronyx-accent);
          color: #111;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 700;
          border: none;
        }
        .ronyx-tag {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.75rem;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Tickets — Upload & Calculation Management</h1>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>
            Create, upload, calculate, approve, and reconcile dump fleet tickets.
          </p>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 18 }}>
          <div className="ronyx-card">
            <div className="ronyx-label">Total Tickets</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.total}</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Paid Tickets</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.paid}</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Pending Approval</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.pending}</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Revenue (Est.)</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>${summary.revenue.toFixed(2)}</div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Ticket Information</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Ticket Number</label>
              <input
                className="ronyx-input"
                value={form.ticket_number}
                onChange={(e) => setForm({ ...form, ticket_number: e.target.value })}
                placeholder="Auto-generate if blank"
              />
            </div>
            <div>
              <label className="ronyx-label">Date & Time of Load</label>
              <input
                type="date"
                className="ronyx-input"
                value={form.ticket_date}
                onChange={(e) => setForm({ ...form, ticket_date: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Driver Name</label>
              <select
                className="ronyx-input"
                value={form.driver_id}
                onChange={(e) => {
                  const selected = drivers.find((d) => d.id === e.target.value);
                  setForm({
                    ...form,
                    driver_id: e.target.value,
                    driver_name: selected?.full_name || form.driver_name,
                  });
                }}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
              <input
                className="ronyx-input"
                style={{ marginTop: 8 }}
                placeholder="Or type driver name"
                value={form.driver_name}
                onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Truck / Trailer</label>
              <input
                className="ronyx-input"
                placeholder="Truck Number"
                value={form.truck_number}
                onChange={(e) => setForm({ ...form, truck_number: e.target.value })}
              />
              <input
                className="ronyx-input"
                style={{ marginTop: 8 }}
                placeholder="Trailer Number"
                value={form.trailer_number}
                onChange={(e) => setForm({ ...form, trailer_number: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Load Type</label>
              <select
                className="ronyx-input"
                value={form.unit_type}
                onChange={(e) => setForm({ ...form, unit_type: e.target.value, load_type: e.target.value })}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ronyx-label">Customer / Job Name</label>
              <input
                className="ronyx-input"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Customer / Job"
              />
              <input
                className="ronyx-input"
                style={{ marginTop: 8 }}
                value={form.job_name}
                onChange={(e) => setForm({ ...form, job_name: e.target.value })}
                placeholder="Job Name (optional)"
              />
            </div>
            <div>
              <label className="ronyx-label">Pickup Location</label>
              <input
                className="ronyx-input"
                value={form.pickup_location}
                onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
                placeholder="Source yard / pit"
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery Location</label>
              <input
                className="ronyx-input"
                value={form.delivery_location}
                onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                placeholder="Job site"
              />
            </div>
            <div>
              <label className="ronyx-label">Material Type</label>
              <input
                className="ronyx-input"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                placeholder="Gravel, sand, dirt..."
              />
            </div>
            <div>
              <label className="ronyx-label">Ticket Status</label>
              <select
                className="ronyx-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Weight / Quantity Details</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Gross Weight</label>
              <input
                className="ronyx-input"
                value={form.gross_weight}
                onChange={(e) => setForm({ ...form, gross_weight: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Tare Weight</label>
              <input
                className="ronyx-input"
                value={form.tare_weight}
                onChange={(e) => setForm({ ...form, tare_weight: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Net Weight</label>
              <input
                className="ronyx-input"
                value={form.net_weight || calculatedNet}
                onChange={(e) => setForm({ ...form, net_weight: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Quantity (loads/tons/yards/hours)</label>
              <input
                className="ronyx-input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Rate Amount ($)</label>
              <input
                className="ronyx-input"
                value={form.rate_amount}
                onChange={(e) => setForm({ ...form, rate_amount: e.target.value, bill_rate: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Calculated Total ($)</label>
              <input className="ronyx-input" value={calculatedTotal} readOnly />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Ticket Uploads</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Upload Scale Ticket</label>
              <input
                type="file"
                className="ronyx-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const path = await handleUpload(file, "ticket");
                    if (path) setForm({ ...form, ticket_image_url: path });
                  }
                }}
              />
              {form.ticket_image_url && <div className="ronyx-tag" style={{ marginTop: 8 }}>{form.ticket_image_url}</div>}
            </div>
            <div>
              <label className="ronyx-label">Upload Delivery Receipt</label>
              <input
                type="file"
                className="ronyx-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const path = await handleUpload(file, "receipt");
                    if (path) setForm({ ...form, delivery_receipt_url: path });
                  }
                }}
              />
              {form.delivery_receipt_url && <div className="ronyx-tag" style={{ marginTop: 8 }}>{form.delivery_receipt_url}</div>}
            </div>
            <div>
              <label className="ronyx-label">Upload Signed POD</label>
              <input
                type="file"
                className="ronyx-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const path = await handleUpload(file, "pod");
                    if (path) setForm({ ...form, pod_url: path });
                  }
                }}
              />
              {form.pod_url && <div className="ronyx-tag" style={{ marginTop: 8 }}>{form.pod_url}</div>}
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Approval & Payment</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Approval (Supervisor)</label>
              <input
                className="ronyx-input"
                placeholder="Approved by"
                value={form.approved_by}
                onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
              />
              <input
                type="date"
                className="ronyx-input"
                style={{ marginTop: 8 }}
                value={form.approved_at}
                onChange={(e) => setForm({ ...form, approved_at: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Payment Status</label>
              <select
                className="ronyx-input"
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
              >
                {paymentOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ronyx-label">Invoice Number</label>
              <input
                className="ronyx-input"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Driver Settlement Ref</label>
              <input
                className="ronyx-input"
                value={form.driver_settlement_reference}
                onChange={(e) => setForm({ ...form, driver_settlement_reference: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Additional Details</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Odometer</label>
              <input
                className="ronyx-input"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Shift</label>
              <input
                className="ronyx-input"
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Work Order #</label>
              <input
                className="ronyx-input"
                value={form.work_order_number}
                onChange={(e) => setForm({ ...form, work_order_number: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Notes</label>
              <input
                className="ronyx-input"
                value={form.ticket_notes}
                onChange={(e) => setForm({ ...form, ticket_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        <div style={{ textAlign: "right", marginBottom: 24 }}>
          <button className="ronyx-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Ticket"}
          </button>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Ticket Discrepancy Report</h2>
          {discrepancies.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.7)" }}>No discrepancies flagged.</p>
          ) : (
            <div className="ronyx-grid">
              {discrepancies.map((ticket) => (
                <div key={ticket.id} className="ronyx-card">
                  <div style={{ fontWeight: 700 }}>{ticket.ticket_number}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>{ticket.reason}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            TicketFlash Reconciliation
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
            Match tickets, weights, and rates to flag discrepancies automatically.
          </p>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Scale tolerance %</label>
              <input
                className="ronyx-input"
                value={thresholds.scaleTolerancePct}
                onChange={(e) => setThresholds({ ...thresholds, scaleTolerancePct: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Moisture tolerance %</label>
              <input
                className="ronyx-input"
                value={thresholds.moistureTolerancePct}
                onChange={(e) => setThresholds({ ...thresholds, moistureTolerancePct: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Fines tolerance %</label>
              <input
                className="ronyx-input"
                value={thresholds.finesTolerancePct}
                onChange={(e) => setThresholds({ ...thresholds, finesTolerancePct: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Price variance %</label>
              <input
                className="ronyx-input"
                value={thresholds.priceVariancePct}
                onChange={(e) => setThresholds({ ...thresholds, priceVariancePct: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery window (hours)</label>
              <input
                className="ronyx-input"
                value={thresholds.deliveryWindowHours}
                onChange={(e) => setThresholds({ ...thresholds, deliveryWindowHours: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="ronyx-btn" onClick={runReconciliation} disabled={reconRunning}>
              {reconRunning ? "Running..." : "Run TicketFlash Reconciliation"}
            </button>
          </div>
          <div className="ronyx-grid" style={{ marginTop: 18 }}>
            <div className="ronyx-card">
              <h3 style={{ marginBottom: 8 }}>Results</h3>
              {reconResults.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.7)" }}>No reconciliation results yet.</p>
              ) : (
                reconResults.slice(0, 6).map((result) => (
                  <div key={result.id} className="ronyx-row" style={{ marginBottom: 8 }}>
                    <span>{result.ticket_number}</span>
                    <span className="ronyx-tag">{result.status}</span>
                  </div>
                ))
              )}
            </div>
            <div className="ronyx-card">
              <h3 style={{ marginBottom: 8 }}>Exceptions</h3>
              {reconExceptions.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.7)" }}>No exceptions flagged.</p>
              ) : (
                reconExceptions.slice(0, 6).map((ex) => (
                  <div key={ex.id} className="ronyx-row" style={{ marginBottom: 8 }}>
                    <span>{ex.exception_type}</span>
                    <span className="ronyx-tag">{ex.severity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Recent Tickets</h2>
          {loading ? (
            <p>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.7)" }}>No tickets yet.</p>
          ) : (
            <div className="ronyx-grid">
              {tickets.slice(0, 12).map((ticket) => (
                <div key={ticket.id} className="ronyx-card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <strong>{ticket.ticket_number}</strong>
                    <span className="ronyx-tag">{ticket.status}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
                    {ticket.driver_name || "Unassigned"} • {ticket.material || "Material"}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
                    {ticket.delivery_location || "Delivery site"}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="ronyx-btn"
                      style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                      onClick={() => updateTicketStatus(ticket.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="ronyx-btn"
                      style={{ padding: "6px 12px", fontSize: "0.75rem", background: "#222", color: "#fff" }}
                      onClick={() => updateTicketStatus(ticket.id, "paid", "paid")}
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function clarifier(tickets: Ticket[]) {
  const issues: { id: string; ticket_number: string; reason: string }[] = [];
  tickets.forEach((ticket) => {
    const gross = Number(ticket.gross_weight || 0);
    const tare = Number(ticket.tare_weight || 0);
    const net = Number(ticket.net_weight || 0);
    if (gross && tare && net && Math.abs(gross - tare - net) > 0.01) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Net weight mismatch" });
      return;
    }
    if ((gross && !tare) || (!gross && tare)) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Missing gross or tare weight" });
      return;
    }
    if (!ticket.quantity || !ticket.bill_rate) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Missing quantity or rate" });
    }
  });
  return issues;
}
