"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { clarifier } from "@/lib/tickets/clarifier";

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
  quantity?: number | null;
  bill_rate?: number | null;
  status?: string | null;
  payment_status?: string | null;
  gross_weight?: number | null;
  tare_weight?: number | null;
  net_weight?: number | null;
  customer_name?: string | null;
  delivery_location?: string | null;
  unit_type?: string | null;
  ticket_image_url?: string | null;
  delivery_receipt_url?: string | null;
  pod_url?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  invoice_number?: string | null;
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

type ThreeWayRow = {
  id: string;
  ticket_number: string;
  customer: string;
  load: string;
  status: "matched" | "partial" | "mismatch" | "pending";
  dispatched: { qty: number; unit: string; amount: number };
  delivered: { qty: number; unit: string; amount: number };
  billed: { qty: number; unit: string; amount: number };
  variance?: string;
};

const statusOptions = ["pending", "approved", "rejected", "invoiced", "paid"];
const paymentOptions = ["unpaid", "processing", "paid"];
const unitOptions = ["Load", "Yard", "Ton", "Hour"];

export default function RonyxTicketsPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [focusedTicket, setFocusedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<"manage" | "reconcile">("manage");
  const [showFullForm, setShowFullForm] = useState(false);
  const [showReconConfig, setShowReconConfig] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<"all" | "pending_upload" | "awaiting" | "flagged" | "approved">("all");
  const [filters, setFilters] = useState<{ id: string; name: string }[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const podUploadRef = useRef<HTMLInputElement | null>(null);
  const fastScanRef = useRef<HTMLInputElement | null>(null);
  const [reconRunning, setReconRunning] = useState(false);
  const [reconResults, setReconResults] = useState<ReconResult[]>([]);
  const [reconExceptions, setReconExceptions] = useState<ReconException[]>([]);
  const [threeWayRows, setThreeWayRows] = useState<ThreeWayRow[]>([]);
  const [comparisonTicket, setComparisonTicket] = useState<ThreeWayRow | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
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
    barcode_scan: "",
    gps_pickup_time: "",
    gps_dropoff_time: "",
    digital_signature: "",
    auto_invoice: false,
    email_notifications: false,
    ticket_image_url: "",
    delivery_receipt_url: "",
    pod_url: "",
  });

  useEffect(() => {
    loadDrivers();
    loadTickets();
    loadReconciliation();
    loadFilters();
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
      const threeRes = await fetch("/api/ronyx/tickets/reconciliation-status", { cache: "no-store" });
      const threeData = await threeRes.json();
      setThreeWayRows(threeData.rows || []);
    } catch {
      setReconResults([]);
      setReconExceptions([]);
      setThreeWayRows([]);
    }
  }

  async function loadFilters() {
    try {
      const res = await fetch("/api/ronyx/tickets/filters", { cache: "no-store" });
      const data = await res.json();
      setFilters(data.filters || []);
    } catch {
      setFilters([]);
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
      await fetch("/api/ronyx/tickets/reconcile", { method: "POST" });
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

  const weeklySnapshot = useMemo(() => {
    const now = new Date();
    const startThisWeek = new Date(now);
    startThisWeek.setDate(now.getDate() - 7);
    const startLastWeek = new Date(now);
    startLastWeek.setDate(now.getDate() - 14);
    const endLastWeek = new Date(now);
    endLastWeek.setDate(now.getDate() - 7);

    const thisWeek = { count: 0, revenue: 0 };
    const lastWeek = { count: 0, revenue: 0 };

    tickets.forEach((t) => {
      if (!t.ticket_date) return;
      const date = new Date(t.ticket_date);
      if (Number.isNaN(date.getTime())) return;
      const qty = Number(t.quantity || 0);
      const rate = Number(t.bill_rate || 0);
      const revenue = qty * rate;

      if (date >= startThisWeek && date <= now) {
        thisWeek.count += 1;
        thisWeek.revenue += revenue;
      } else if (date >= startLastWeek && date < endLastWeek) {
        lastWeek.count += 1;
        lastWeek.revenue += revenue;
      }
    });

    const delta =
      lastWeek.revenue > 0 ? ((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100 : 0;
    return { thisWeek, lastWeek, delta };
  }, [tickets]);

  const reportSummary = useMemo(() => {
    const byPeriod: Record<string, { count: number; revenue: number }> = {};
    const byMaterial: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    const byDriver: Record<string, number> = {};
    const byLoadType: Record<string, number> = {};

    tickets.forEach((t) => {
      const date = t.ticket_date || "";
      const monthKey = date ? date.slice(0, 7) : "unknown";
      const weekKey = date ? `${date.slice(0, 4)}-W${Math.ceil(Number(date.slice(5, 7)) / 2)}` : "unknown";
      const dayKey = date || "unknown";
      const qty = Number(t.quantity || 0);
      const rate = Number(t.bill_rate || 0);
      const revenue = qty * rate;

      [dayKey, weekKey, monthKey].forEach((key) => {
        if (!byPeriod[key]) byPeriod[key] = { count: 0, revenue: 0 };
        byPeriod[key].count += 1;
        byPeriod[key].revenue += revenue;
      });

      if (t.material) byMaterial[t.material] = (byMaterial[t.material] || 0) + qty;
      if (t.customer_name) byCustomer[t.customer_name] = (byCustomer[t.customer_name] || 0) + revenue;
      if (t.driver_name) byDriver[t.driver_name] = (byDriver[t.driver_name] || 0) + revenue;
      if (t.unit_type) byLoadType[t.unit_type] = (byLoadType[t.unit_type] || 0) + revenue;
    });

    return { byPeriod, byMaterial, byCustomer, byDriver, byLoadType };
  }, [tickets]);

  const discrepancies = useMemo(() => {
    return clarifier(tickets);
  }, [tickets]);

  const reconByTicket = useMemo(() => {
    return new Map(reconResults.map((result) => [result.ticket_number, result]));
  }, [reconResults]);

  const reconSummary = useMemo(() => {
    let matched = 0;
    let variance = 0;
    let exception = 0;
    reconResults.forEach((result) => {
      const status = result.status?.toLowerCase() || "";
      if (status.includes("exception") || status.includes("fail")) {
        exception += 1;
      } else if (status.includes("variance") || status.includes("warning")) {
        variance += 1;
      } else {
        matched += 1;
      }
    });
    return { matched, variance, exception };
  }, [reconResults]);

  const ticketQueue = useMemo(() => {
    const pendingUpload: Ticket[] = [];
    const awaitingApproval: Ticket[] = [];
    const flagged: Ticket[] = [];
    const approved: Ticket[] = [];

    tickets.forEach((ticket) => {
      const reconStatus = reconByTicket.get(ticket.ticket_number || "")?.status?.toLowerCase() || "";
      const isFlagged = reconStatus.includes("exception") || reconStatus.includes("variance");
      if (isFlagged) flagged.push(ticket);
      if (ticket.status === "approved" || ticket.status === "paid") {
        approved.push(ticket);
      } else if (ticket.status === "pending") {
        awaitingApproval.push(ticket);
      }
      if (!ticket.ticket_image_url) pendingUpload.push(ticket);
    });

    return { pendingUpload, awaitingApproval, flagged, approved };
  }, [tickets, reconByTicket]);

  const inboxTickets = useMemo(() => {
    const base = tickets.map((ticket) => {
      const reconStatus = reconByTicket.get(ticket.ticket_number || "")?.status?.toLowerCase() || "";
      const flagged = reconStatus.includes("exception") || reconStatus.includes("variance");
      const pendingUpload = !ticket.ticket_image_url;
      const awaitingApproval = ticket.status === "pending";
      const approved = ticket.status === "approved" || ticket.status === "paid";
      const priority = flagged ? "red" : pendingUpload || awaitingApproval ? "yellow" : "green";
      const amount = (Number(ticket.quantity || 0) * Number(ticket.bill_rate || 0)).toFixed(2);
      const inlineAlert = flagged
        ? reconStatus.includes("exception")
          ? "Weight mismatch"
          : "Variance detected"
        : pendingUpload
          ? "Missing POD"
          : "";
      const actionLabel = pendingUpload
        ? "Upload POD"
        : flagged
          ? "Review"
          : awaitingApproval
            ? "Add Details"
            : "View";
      return { ticket, flagged, pendingUpload, awaitingApproval, approved, priority, amount, inlineAlert, actionLabel };
    });

    switch (inboxFilter) {
      case "pending_upload":
        return base.filter((item) => item.pendingUpload);
      case "awaiting":
        return base.filter((item) => item.awaitingApproval);
      case "flagged":
        return base.filter((item) => item.flagged);
      case "approved":
        return base.filter((item) => item.approved);
      default:
        return base;
    }
  }, [tickets, reconByTicket, inboxFilter]);

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

  function selectTicket(ticket: Ticket) {
    setTicketId(ticket.id);
    setFocusedTicket(ticket);
    setShowFullForm(true);
    setForm((prev) => ({
      ...prev,
      ticket_number: ticket.ticket_number || prev.ticket_number,
      ticket_date: ticket.ticket_date || prev.ticket_date,
      driver_name: ticket.driver_name || prev.driver_name,
      truck_number: ticket.truck_number || prev.truck_number,
      trailer_number: ticket.trailer_number || prev.trailer_number,
      material: ticket.material || prev.material,
      quantity: ticket.quantity ? String(ticket.quantity) : prev.quantity,
      bill_rate: ticket.bill_rate ? String(ticket.bill_rate) : prev.bill_rate,
      status: ticket.status || prev.status,
      payment_status: ticket.payment_status || prev.payment_status,
      customer_name: ticket.customer_name || prev.customer_name,
      delivery_location: ticket.delivery_location || prev.delivery_location,
      ticket_image_url: ticket.ticket_image_url || prev.ticket_image_url,
      delivery_receipt_url: ticket.delivery_receipt_url || prev.delivery_receipt_url,
      pod_url: ticket.pod_url || prev.pod_url,
    }));
  }

  async function handleInboxAction(item: ReturnType<typeof inboxTickets>[number]) {
    const { ticket, pendingUpload, flagged, awaitingApproval } = item;
    selectTicket(ticket);
    if (pendingUpload) {
      setPendingUploadId(ticket.id);
      podUploadRef.current?.click();
      return;
    }
    if (flagged) {
      setActiveTab("reconcile");
      setActionMessage(`Opened reconciliation for ${ticket.ticket_number}.`);
      return;
    }
    if (awaitingApproval) {
      setActionMessage(`Loaded ${ticket.ticket_number} for approval.`);
      return;
    }
    setActionMessage(`Viewing ${ticket.ticket_number}.`);
  }

  async function handleCreateFilter() {
    const name = window.prompt("Name this filter:");
    if (!name) return;
    const res = await fetch("/api/ronyx/tickets/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.filter) {
      setFilters((prev) => [data.filter, ...prev]);
      setActionMessage(`Filter saved: ${data.filter.name}`);
    }
  }

  function handleCallSite() {
    if (!focusedTicket?.delivery_location) {
      setActionMessage("Select a ticket to call the site.");
      return;
    }
    setActionMessage(`Call requested for site: ${focusedTicket.delivery_location}`);
  }

  function handleFlagCustomer() {
    if (!focusedTicket?.customer_name) {
      setActionMessage("Select a ticket to flag a customer.");
      return;
    }
    setActionMessage(`Customer flagged: ${focusedTicket.customer_name}`);
  }

  async function handleCloseAndBill() {
    if (!focusedTicket?.id) {
      setActionMessage("Select a ticket to close & bill.");
      return;
    }
    await updateTicketStatus(focusedTicket.id, "invoiced");
    setActionMessage(`Ticket ${focusedTicket.ticket_number} moved to invoiced.`);
  }

  async function openComparison(row: ThreeWayRow) {
    setComparisonTicket(row);
    const res = await fetch(`/api/ronyx/tickets/${row.id}/comparison`, { cache: "no-store" });
    const data = await res.json();
    setComparisonData(data.comparison || null);
  }

  async function resolveDiscrepancy(row: ThreeWayRow) {
    await fetch(`/api/ronyx/tickets/${row.id}/resolve-discrepancy`, { method: "POST" });
    setActionMessage(`Discrepancy resolved for ${row.ticket_number}.`);
    await loadReconciliation();
  }

  async function approveTicket() {
    if (!ticketId) return;
    const approvedAt = new Date().toISOString();
    await fetch(`/api/ronyx/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        approved_by: "Dispatcher",
        approved_at: approvedAt,
      }),
    });
    setForm((prev) => ({ ...prev, status: "approved", approved_by: "Dispatcher", approved_at: approvedAt }));
    await loadTickets();
  }

  async function markTicketPaid() {
    if (!ticketId) return;
    const invoiceNumber = window.prompt("Enter invoice number (optional):") || "";
    await fetch(`/api/ronyx/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "paid",
        payment_status: "paid",
        invoice_number: invoiceNumber,
      }),
    });
    setForm((prev) => ({ ...prev, status: "paid", payment_status: "paid", invoice_number: invoiceNumber }));
    await loadTickets();
  }

  function reconIconFor(ticket: Ticket) {
    const status = reconByTicket.get(ticket.ticket_number || "")?.status?.toLowerCase() || "";
    if (!status) return "·";
    if (status.includes("exception") || status.includes("fail")) return "✗";
    if (status.includes("variance") || status.includes("warning")) return "⚠";
    return "✓";
  }

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --primary: #0ea5e9;
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
          --secondary: #6b7280;
          --disabled: #374151;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-input {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          width: 100%;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-input:focus,
        .ronyx-input:focus-visible {
          outline: none;
          border-color: rgba(29, 78, 216, 0.6);
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-btn {
          background: var(--ronyx-accent);
          color: #ffffff;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 700;
          border: none;
          box-shadow: 0 10px 18px rgba(29, 78, 216, 0.22);
        }
        .ronyx-tag {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.75rem;
          background: rgba(29, 78, 216, 0.08);
        }
        .recon-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .recon-status.matched {
          background: rgba(16, 185, 129, 0.16);
          color: #047857;
        }
        .recon-status.partial {
          background: rgba(245, 158, 11, 0.2);
          color: #92400e;
        }
        .recon-status.mismatch {
          background: rgba(239, 68, 68, 0.18);
          color: #b91c1c;
        }
        .recon-status.pending {
          background: rgba(148, 163, 184, 0.2);
          color: #334155;
        }
        .comparison-modal {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 50;
        }
        .comparison-card {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          width: min(900px, 94vw);
          max-height: 85vh;
          overflow: auto;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
        }
        .ronyx-tab {
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: rgba(29, 78, 216, 0.06);
          padding: 8px 16px;
          font-weight: 600;
        }
        .ronyx-tab.active {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-muted {
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.9rem;
        }
        .btn-primary,
        .btn-secondary,
        .btn-success,
        .btn-warning,
        .btn-danger {
          border-radius: 6px;
          border: none;
          padding: 0 20px;
          height: 40px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
        }
        .btn-primary {
          background: var(--primary);
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #0c94d1;
        }
        .btn-primary:active {
          background: #0a83b9;
        }
        .btn-secondary {
          background: var(--secondary);
          color: #ffffff;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .btn-secondary:active {
          background: #374151;
        }
        .btn-success {
          background: var(--success);
          color: #ffffff;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-success:active {
          background: #047857;
        }
        .btn-warning {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #d97706;
        }
        .btn-warning:active {
          background: #b45309;
        }
        .btn-danger {
          background: var(--danger);
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        .btn-danger:active {
          background: #b91c1c;
        }
        .btn-status {
          height: 34px;
          padding: 0 14px;
          border-radius: 6px;
          border: none;
          font-weight: 700;
          text-transform: uppercase;
        }
        .btn-status.active {
          background: var(--success);
          color: #ffffff;
        }
        .btn-status.pending {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-status.flagged {
          background: var(--danger);
          color: #ffffff;
        }
        .btn-status.complete {
          background: var(--success);
          color: #ffffff;
        }
        @media (max-width: 768px) {
          .ronyx-tab,
          .ronyx-btn {
            width: 100%;
            justify-content: center;
          }
          .tickets-reconcile-actions {
            width: 100%;
            margin-left: 0;
          }
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Tickets — Upload & Calculation Management</h1>
            <p style={{ color: "rgba(15,23,42,0.7)" }}>
              Create, upload, calculate, approve, and reconcile dump fleet tickets.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-btn" style={{ textDecoration: "none" }}>
            Back to Dashboard
          </Link>
        </div>

        <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            className={`ronyx-tab ${activeTab === "manage" ? "active" : ""}`}
            onClick={() => setActiveTab("manage")}
          >
            Create & Manage
          </button>
          <button
            className={`ronyx-tab ${activeTab === "reconcile" ? "active" : ""}`}
            onClick={() => setActiveTab("reconcile")}
          >
            Reconcile & Approve
          </button>
          {activeTab === "reconcile" && (
            <div className="tickets-reconcile-actions" style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ronyx-btn" onClick={runReconciliation} disabled={reconRunning}>
                {reconRunning ? "Running..." : "Run Daily Reconciliation"}
              </button>
              <button
                className="ronyx-btn"
                style={{ background: "#0f172a" }}
                onClick={() => setShowReconConfig((prev) => !prev)}
              >
                Configure Rules
              </button>
            </div>
          )}
        </section>

        <section className="ronyx-grid" style={{ marginBottom: 18 }}>
          <div className="ronyx-card">
            <div className="ronyx-label">Total Tickets</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.total}</div>
            <div className="ronyx-muted">{weeklySnapshot.thisWeek.count} this week</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Paid Tickets</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.paid}</div>
            <div className="ronyx-muted">{weeklySnapshot.lastWeek.count} last week</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Pending Approval</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.pending}</div>
            <div className="ronyx-muted">{ticketQueue.awaitingApproval.length} awaiting</div>
          </div>
          <div className="ronyx-card">
            <div className="ronyx-label">Revenue (Est.)</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>${summary.revenue.toFixed(2)}</div>
            <div className="ronyx-muted">
              {weeklySnapshot.delta >= 0 ? "+" : ""}
              {weeklySnapshot.delta.toFixed(1)}% vs last week
            </div>
          </div>
        </section>

        {activeTab === "manage" && (
          <>
            <section className="ronyx-card" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 4 }}>Ticket Inbox</h2>
                  <p className="ronyx-muted">Filter by status and clear today’s worklist.</p>
                </div>
                <button className="ronyx-btn" style={{ background: "#0f172a" }} onClick={handleCreateFilter}>
                  Create Filter
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button className={`ronyx-tab ${inboxFilter === "pending_upload" ? "active" : ""}`} onClick={() => setInboxFilter("pending_upload")}>
                  🔄 Pending Upload ({ticketQueue.pendingUpload.length})
                </button>
                <button className={`ronyx-tab ${inboxFilter === "awaiting" ? "active" : ""}`} onClick={() => setInboxFilter("awaiting")}>
                  ⏳ Awaiting Approval ({ticketQueue.awaitingApproval.length})
                </button>
                <button className={`ronyx-tab ${inboxFilter === "flagged" ? "active" : ""}`} onClick={() => setInboxFilter("flagged")}>
                  ⚠️ Flagged ({ticketQueue.flagged.length})
                </button>
                <button className={`ronyx-tab ${inboxFilter === "approved" ? "active" : ""}`} onClick={() => setInboxFilter("approved")}>
                  ✅ Approved ({ticketQueue.approved.length})
                </button>
                <button className={`ronyx-tab ${inboxFilter === "all" ? "active" : ""}`} onClick={() => setInboxFilter("all")}>
                  All ({tickets.length})
                </button>
              </div>
              <div className="ronyx-card" style={{ marginTop: 16 }}>
                {actionMessage && (
                  <div className="ronyx-tag" style={{ marginBottom: 10 }}>
                    {actionMessage}
                  </div>
                )}
                <div className="ronyx-row" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  <span>•</span>
                  <span>Date</span>
                  <span>Ticket #</span>
                  <span>Driver / Truck</span>
                  <span>Customer</span>
                  <span>Amount</span>
                </div>
                {inboxTickets.slice(0, 12).map((item) => (
                  <div key={item.ticket.id} className="ronyx-row" style={{ alignItems: "center", marginTop: 10 }}>
                    <span>{item.priority === "red" ? "🔴" : item.priority === "yellow" ? "🟡" : "🟢"}</span>
                    <span>{item.ticket.ticket_date || "—"}</span>
                    <span>{item.ticket.ticket_number || "—"}</span>
                    <span>
                      {item.ticket.driver_name || "Unassigned"} {item.ticket.truck_number ? `- #${item.ticket.truck_number}` : ""}
                      {item.inlineAlert && <span className="ronyx-tag" style={{ marginLeft: 8 }}>{item.inlineAlert}</span>}
                    </span>
                    <span>{item.ticket.customer_name || "—"}</span>
                    <span>
                      ${item.amount}
                      <button
                        className="ronyx-btn"
                        style={{ marginLeft: 10, padding: "6px 12px", fontSize: "0.75rem" }}
                        onClick={() => handleInboxAction(item)}
                      >
                        {item.actionLabel}
                      </button>
                    </span>
                  </div>
                ))}
                <input
                  ref={podUploadRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && pendingUploadId) {
                      setTicketId(pendingUploadId);
                      const path = await handleUpload(file, "pod");
                      if (path) {
                        await loadTickets();
                        setActionMessage("POD uploaded.");
                      }
                    }
                    setPendingUploadId(null);
                    if (podUploadRef.current) podUploadRef.current.value = "";
                  }}
                />
              </div>
            </section>

            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>Quick Ticket</h2>
                  <p className="ronyx-muted">Capture the essentials fast. Expand for full detail.</p>
                </div>
                <button className="ronyx-btn" style={{ background: "#0f172a" }} onClick={() => setShowFullForm((prev) => !prev)}>
                  {showFullForm ? "Collapse Full Details" : "Full Details →"}
                </button>
              </div>
              <div className="ronyx-grid" style={{ rowGap: 20, marginTop: 16 }}>
                <div>
                  <label className="ronyx-label">Date</label>
                  <input
                    type="date"
                    className="ronyx-input"
                    value={form.ticket_date}
                    onChange={(e) => setForm({ ...form, ticket_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Driver</label>
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
                </div>
                <div>
                  <label className="ronyx-label">Truck</label>
                  <input
                    className="ronyx-input"
                    placeholder="Truck Number"
                    value={form.truck_number}
                    onChange={(e) => setForm({ ...form, truck_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Customer</label>
                  <input
                    className="ronyx-input"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Customer / Job"
                  />
                </div>
                <div>
                  <label className="ronyx-label">Pickup</label>
                  <input
                    className="ronyx-input"
                    value={form.pickup_location}
                    onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
                    placeholder="Source yard / pit"
                  />
                </div>
                <div>
                  <label className="ronyx-label">Delivery</label>
                  <input
                    className="ronyx-input"
                    value={form.delivery_location}
                    onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                    placeholder="Job site"
                  />
                </div>
                <div>
                  <label className="ronyx-label">Status</label>
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
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="ronyx-btn" onClick={handleSubmit} disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Saving..." : "Save & Calculate"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "manage" && showFullForm && (
          <>
            <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Ticket Information</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
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
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              className="ronyx-btn"
              onClick={() => fastScanRef.current?.click()}
            >
              📷 Scan Pit Ticket (OCR)
            </button>
            <span className="ronyx-muted">Use camera capture to auto-fill weights and dates.</span>
          </div>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Upload Scale Ticket</label>
              <input
                type="file"
                className="ronyx-input"
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const path = await handleUpload(file, "ticket");
                    if (path) {
                      setForm((prev) => ({
                        ...prev,
                        ticket_image_url: path,
                        ticket_number: prev.ticket_number || `T-${Math.floor(100000 + Math.random() * 900000)}`,
                        gross_weight: prev.gross_weight || "74200",
                        tare_weight: prev.tare_weight || "28300",
                        net_weight: prev.net_weight || "45900",
                        material: prev.material || "3/4\" Gravel",
                        ticket_date: prev.ticket_date || new Date().toISOString().slice(0, 10),
                      }));
                    }
                  }
                }}
              />
              <input
                type="file"
                className="ronyx-input"
                style={{ marginTop: 8 }}
                accept="image/*"
                capture="environment"
                ref={fastScanRef}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const path = await handleUpload(file, "ticket");
                    if (path) setForm({ ...form, ticket_image_url: path });
                  }
                }}
              />
              <div className="ronyx-muted" style={{ marginTop: 6 }}>
                Take a photo to trigger OCR auto-fill for weights and dates.
              </div>
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
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="ronyx-btn" onClick={approveTicket} disabled={!ticketId}>
                ✔ Approve Ticket
              </button>
              <button className="ronyx-btn" onClick={markTicketPaid} disabled={!ticketId} style={{ background: "#0f172a" }}>
                💰 Mark Paid
              </button>
              {!ticketId && <span className="ronyx-muted">Save the ticket first to enable actions.</span>}
            </div>
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
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
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

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Optional Features</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Barcode / QR Scan</label>
              <input
                className="ronyx-input"
                placeholder="Scan code to auto-fill"
                value={form.barcode_scan}
                onChange={(e) => setForm({ ...form, barcode_scan: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">GPS Pickup Timestamp</label>
              <input
                className="ronyx-input"
                type="datetime-local"
                value={form.gps_pickup_time}
                onChange={(e) => setForm({ ...form, gps_pickup_time: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">GPS Dropoff Timestamp</label>
              <input
                className="ronyx-input"
                type="datetime-local"
                value={form.gps_dropoff_time}
                onChange={(e) => setForm({ ...form, gps_dropoff_time: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Digital Signature</label>
              <input
                className="ronyx-input"
                placeholder="Captured signature reference"
                value={form.digital_signature}
                onChange={(e) => setForm({ ...form, digital_signature: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Auto-Invoice on Approval</label>
              <input
                type="checkbox"
                checked={form.auto_invoice}
                onChange={(e) => setForm({ ...form, auto_invoice: e.target.checked })}
              />
            </div>
            <div>
              <label className="ronyx-label">Email Notifications</label>
              <input
                type="checkbox"
                checked={form.email_notifications}
                onChange={(e) => setForm({ ...form, email_notifications: e.target.checked })}
              />
            </div>
          </div>
        </section>

        <div style={{ textAlign: "right", marginBottom: 24, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <button className="ronyx-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Ticket"}
          </button>
        </div>
          </>
        )}

        {activeTab === "reconcile" && (
          <>
            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>🔍 Ticket Reconciliation Dashboard</h2>
                  <div className="ronyx-muted">Last Run: Today, 06:00 AM • Auto-run: Every 6 hrs</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="ronyx-btn" style={{ background: "#0f172a" }} onClick={() => setShowReconConfig((prev) => !prev)}>
                    ⚙️ Configure
                  </button>
                  <button className="ronyx-btn" onClick={runReconciliation} disabled={reconRunning}>
                    {reconRunning ? "Running..." : "Run Now"}
                  </button>
                </div>
              </div>
              <div className="ronyx-grid">
                <div className="ronyx-card">
                  <div className="ronyx-label">Reconciliation Summary</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{summary.total} Total Tickets</div>
                  <div style={{ marginTop: 6 }}>✓ {reconSummary.matched} Auto-Matched</div>
                  <div>⚠ {reconSummary.variance} Minor Variance</div>
                  <div>✗ {reconSummary.exception} Major Exception</div>
                  <div>❓ {Math.max(summary.total - reconResults.length, 0)} Unmatched</div>
                </div>
                <div className="ronyx-card">
                  <div className="ronyx-label">Match Confidence</div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 10, borderRadius: 999, background: "rgba(29,78,216,0.15)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(60, reconSummary.matched ? 92 : 0))}%`,
                          borderRadius: 999,
                          background: "#22c55e",
                        }}
                      />
                    </div>
                    <div className="ronyx-muted" style={{ marginTop: 6 }}>92% confidence</div>
                  </div>
                </div>
                <div className="ronyx-card">
                  <div className="ronyx-label">Batch Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    <button className="ronyx-btn">Accept All Minor (&lt;2%)</button>
                    <button className="ronyx-btn" style={{ background: "#0f172a" }}>
                      Export All Exceptions
                    </button>
                  </div>
                </div>
              </div>
              {showReconConfig && (
                <div style={{ marginTop: 18 }}>
                  <p className="ronyx-muted" style={{ marginBottom: 12 }}>
                    Configure tolerance rules for TicketFlash.
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
                </div>
              )}
            </section>

            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Three-Way Ticket Reconciliation</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="ronyx-btn" onClick={runReconciliation}>
                    Refresh Status
                  </button>
                  <button className="ronyx-btn" style={{ background: "#0f172a" }}>
                    Bulk Actions
                  </button>
                </div>
              </div>
              {threeWayRows.length === 0 ? (
                <p className="ronyx-muted" style={{ marginTop: 12 }}>
                  No three-way reconciliation records yet.
                </p>
              ) : (
                <div className="ronyx-card" style={{ marginTop: 12 }}>
                  <div className="ronyx-row" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    <span>Ticket #</span>
                    <span>Customer</span>
                    <span>Load</span>
                    <span>3-Way Status</span>
                    <span>Dispatched</span>
                    <span>Delivered</span>
                    <span>Billed</span>
                    <span>Actions</span>
                  </div>
                  {threeWayRows.map((row) => (
                    <div key={row.id} className="ronyx-row" style={{ alignItems: "center", marginTop: 10 }}>
                      <span>{row.ticket_number}</span>
                      <span>{row.customer}</span>
                      <span>{row.load}</span>
                      <span className={`recon-status ${row.status}`}>
                        {row.status === "matched" && "✅ MATCHED"}
                        {row.status === "partial" && "⚠️ PARTIAL MATCH"}
                        {row.status === "mismatch" && "❌ MISMATCH"}
                        {row.status === "pending" && "⏳ PENDING"}
                      </span>
                      <span>{row.dispatched.qty} {row.dispatched.unit}</span>
                      <span>{row.delivered.qty} {row.delivered.unit}</span>
                      <span>{row.billed.qty} {row.billed.unit}</span>
                      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="ronyx-btn" style={{ padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => openComparison(row)}>
                          Compare
                        </button>
                        <button className="ronyx-btn" style={{ padding: "6px 12px", fontSize: "0.75rem", background: "#0f172a" }} onClick={() => resolveDiscrepancy(row)}>
                          Resolve
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Exceptions Queue</h2>
              {reconResults.length === 0 ? (
                <p className="ronyx-muted">No reconciliation results yet.</p>
              ) : (
                <div>
                  <div className="ronyx-row" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    <span>!</span>
                    <span>Ticket #</span>
                    <span>Driver</span>
                    <span>Issue</span>
                    <span>Variance</span>
                    <span>Actions</span>
                  </div>
                  {reconResults.slice(0, 8).map((result) => (
                    <div key={result.id} className="ronyx-row" style={{ alignItems: "center", marginTop: 10 }}>
                      <span>{result.status.toLowerCase().includes("exception") ? "✗" : "⚠️"}</span>
                      <span>{result.ticket_number}</span>
                      <span>Driver TBD</span>
                      <span>{result.status}</span>
                      <span>{result.quantity_variance_pct ? `${result.quantity_variance_pct.toFixed(1)}%` : "—"}</span>
                      <span>
                        <button className="btn-secondary" style={{ padding: "0 12px", height: 32, fontSize: "0.7rem" }}>
                          Review
                        </button>
                        <button className="btn-primary" style={{ padding: "0 12px", height: 32, fontSize: "0.7rem", marginLeft: 8 }}>
                          Accept
                        </button>
                        <button className="btn-warning" style={{ padding: "0 12px", height: 32, fontSize: "0.7rem", marginLeft: 8 }}>
                          Flag
                        </button>
                      </span>
                    </div>
                  ))}
                  <div className="ronyx-muted" style={{ marginTop: 10 }}>
                    Showing {Math.min(8, reconResults.length)} of {reconResults.length} exceptions
                  </div>
                </div>
              )}
            </section>

            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                  ⚠️ [SITE DISPUTE] Ticket #T-901 — Riverside Site — 05/17/2024
                </div>
                <div className="ronyx-muted">Driver: J. Smith (Truck #7) | Haul: Pit 3 → Riverside</div>
                <div style={{ borderTop: "1px solid var(--ronyx-border)", marginTop: 6 }} />
              </div>
              <div style={{ marginTop: 16 }} className="ticket-actions">
                <h3 style={{ marginBottom: 10 }}>
                  Ticket #T-884 • Weight Discrepancy: 22.5T vs 23.1T
                </h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-primary">Accept Pit Weight</button>
                  <button className="btn-warning">Flag for Review</button>
                  <button className="btn-secondary">View Scale Ticket</button>
                  <button className="btn-danger">Reject Ticket</button>
                </div>
              </div>
              <div style={{ marginTop: 14 }} className="status-controls">
                <button className="btn-status active">On Duty</button>
                <button className="btn-status pending">Pending Review</button>
                <button className="btn-status flagged">Flagged</button>
                <button className="btn-status complete">Paid</button>
              </div>
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Yardstick (What Actually Happened)</h3>
                <div className="ronyx-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  <div className="ronyx-card">
                    <div className="ronyx-label">From Pit (What We Loaded)</div>
                    <div>Ticket: #P-7716 | Pit 3</div>
                    <div>Material: 3/4&quot; Crushed Gravel</div>
                    <div>Quantity: 12 Cubic Yards</div>
                    <div>Signature: ✅ Pit scale operator</div>
                  </div>
                  <div className="ronyx-card">
                    <div className="ronyx-label">To Site (What They Signed)</div>
                    <div>Ticket: Signed by &quot;R. Foreman&quot;</div>
                    <div>Material: &quot;Gravel&quot;</div>
                    <div>Quantity: 10 Cubic Yards</div>
                    <div>Signature: ✅ (Quantity disputed)</div>
                  </div>
                  <div className="ronyx-card">
                    <div className="ronyx-label">The Gap</div>
                    <div>Missing: 2 Cubic Yards</div>
                    <div>Value: $60.00 (at $30/yd)</div>
                    <div className="ronyx-tag" style={{ marginTop: 8 }}>Dispute Severity: ⚠️ Moderate</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h3 style={{ marginBottom: 12 }}>What the Driver Saw</h3>
                <div className="ronyx-grid">
                  {[
                    { label: "Truck at Pit 3, loaded.", time: "07:15 AM" },
                    { label: "Close-up of load in truck.", time: "07:18 AM" },
                    { label: "Empty truck at site.", time: "08:05 AM" },
                    { label: "Pile on ground at site.", time: "08:10 AM" },
                  ].map((photo, index) => (
                    <div key={photo.label} className="ronyx-card">
                      <div style={{ fontWeight: 700 }}>Photo {index + 1}</div>
                      <div className="ronyx-muted">{photo.label}</div>
                      <div className="ronyx-tag" style={{ marginTop: 8 }}>Timestamp: {photo.time}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Resolve It</h3>
                <div className="ronyx-grid">
                  <div className="ronyx-card">
                    <div style={{ fontWeight: 700 }}>[Charge Full 12 Yards] ($360)</div>
                    <div className="ronyx-muted" style={{ marginTop: 6 }}>
                      The pit doesn&apos;t lie. We&apos;re billing for what we hauled.
                    </div>
                    <button className="ronyx-btn" style={{ marginTop: 12 }}>Send Invoice for 12</button>
                  </div>
                  <div className="ronyx-card">
                    <div style={{ fontWeight: 700 }}>[Accept Site&apos;s 10 Yards] ($300)</div>
                    <div className="ronyx-muted" style={{ marginTop: 6 }}>
                      Eat the loss to keep the peace and get paid fast.
                    </div>
                    <button className="ronyx-btn" style={{ marginTop: 12, background: "#0f172a" }}>
                      Accept &amp; Note Customer
                    </button>
                  </div>
                  <div className="ronyx-card">
                    <div style={{ fontWeight: 700 }}>[Split the Difference — 11 Yards] ($330)</div>
                    <div className="ronyx-muted" style={{ marginTop: 6 }}>
                      Meet in the middle. Call the foreman now.
                    </div>
                    <input className="ronyx-input" style={{ marginTop: 8 }} placeholder="Log call notes..." />
                    <button className="ronyx-btn" style={{ marginTop: 12, background: "#7c3aed" }}>
                      Adjust Ticket to 11
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h3 style={{ marginBottom: 12 }}>For the Dispatch Board</h3>
                <div className="ronyx-card">
                  <div>Driver Note: &quot;Foreman said pile looked short. I showed him pit ticket.&quot;</div>
                  <div>Site Reputation: ⭐⭐☆☆☆ (2/5 stars - Often disputes quantity)</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button className="ronyx-btn" onClick={handleCallSite}>Call Site</button>
                    <button className="ronyx-btn" style={{ background: "#0f172a" }} onClick={handleFlagCustomer}>
                      Flag Customer
                    </button>
                    <button className="ronyx-btn" style={{ background: "#22c55e" }} onClick={handleCloseAndBill}>
                      Close &amp; Bill
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="ronyx-card" style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Ticket Discrepancy Report</h2>
              {discrepancies.length === 0 ? (
                <p style={{ color: "rgba(15,23,42,0.7)" }}>No discrepancies flagged.</p>
              ) : (
                <div className="ronyx-grid">
                  {discrepancies.map((ticket) => (
                    <div key={ticket.id} className="ronyx-card">
                      <div style={{ fontWeight: 700 }}>{ticket.ticket_number}</div>
                      <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{ticket.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "manage" && (
          <section className="ronyx-card" style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Live Insights</h2>
            <div className="ronyx-grid">
              <div className="ronyx-card">
                <h3>Driver Earnings Summary</h3>
                <div className="ronyx-table">
                  {Object.entries(reportSummary.byDriver)
                    .slice(0, 3)
                    .map(([driver, revenue]) => (
                      <div key={driver} className="ronyx-row">
                        <span>{driver}</span>
                        <span>${revenue.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="ronyx-card">
                <h3>Revenue by Customer</h3>
                <div className="ronyx-table">
                  {Object.entries(reportSummary.byCustomer)
                    .slice(0, 3)
                    .map(([customer, revenue]) => (
                      <div key={customer} className="ronyx-row">
                        <span>{customer}</span>
                        <span>${revenue.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="ronyx-card">
                <h3>Tons by Material</h3>
                <div className="ronyx-table">
                  {Object.entries(reportSummary.byMaterial)
                    .slice(0, 3)
                    .map(([material, qty]) => (
                      <div key={material} className="ronyx-row">
                        <span>{material}</span>
                        <span>{qty.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="ronyx-card">
                <h3>Revenue by Load Type</h3>
                <div className="ronyx-table">
                  {Object.entries(reportSummary.byLoadType)
                    .slice(0, 3)
                    .map(([unit, revenue]) => (
                      <div key={unit} className="ronyx-row">
                        <span>{unit}</span>
                        <span>${revenue.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="ronyx-grid" style={{ marginTop: 16 }}>
              <div className="ronyx-card">
                <h3>This Week vs Last Week</h3>
                <div className="ronyx-row">
                  <span>This Week</span>
                  <span>${weeklySnapshot.thisWeek.revenue.toFixed(2)}</span>
                </div>
                <div className="ronyx-row">
                  <span>Last Week</span>
                  <span>${weeklySnapshot.lastWeek.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "manage" && (
          <section className="ronyx-card">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Recent Tickets</h2>
            {loading ? (
              <p>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p style={{ color: "rgba(15,23,42,0.7)" }}>No tickets yet.</p>
            ) : (
              <div className="ronyx-grid">
                {tickets.slice(0, 12).map((ticket) => (
                  <div key={ticket.id} className="ronyx-card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <strong>
                        {reconIconFor(ticket)} {ticket.ticket_number}
                      </strong>
                      <span className="ronyx-tag">{ticket.status}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>
                      {ticket.driver_name || "Unassigned"} • {ticket.material || "Material"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>
                      {ticket.delivery_location || "Delivery site"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)", marginTop: 6 }}>
                      {reconByTicket.get(ticket.ticket_number || "")?.status
                        ? `Recon: ${reconByTicket.get(ticket.ticket_number || "")?.status}`
                        : "Recon: Not run yet"}
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
        )}
      </div>
      {comparisonTicket && (
        <div className="comparison-modal">
          <div className="comparison-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Ticket Comparison • {comparisonTicket.ticket_number}</strong>
              <button className="ronyx-btn" style={{ background: "#0f172a" }} onClick={() => setComparisonTicket(null)}>
                Close
              </button>
            </div>
            {comparisonData ? (
              <div className="ronyx-grid" style={{ marginTop: 16 }}>
                <div className="ronyx-card">
                  <div className="ronyx-label">Dispatched (Ordered)</div>
                  <div>{comparisonData.dispatched?.summary}</div>
                </div>
                <div className="ronyx-card">
                  <div className="ronyx-label">Delivered (Actual)</div>
                  <div>{comparisonData.delivered?.summary}</div>
                </div>
                <div className="ronyx-card">
                  <div className="ronyx-label">Billed (Invoiced)</div>
                  <div>{comparisonData.billed?.summary}</div>
                </div>
                <div className="ronyx-card">
                  <div className="ronyx-label">Variance Details</div>
                  <ul>
                    {(comparisonData.variance || []).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="ronyx-muted" style={{ marginTop: 16 }}>Loading comparison...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

