"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────── */
type Ticket = {
  id: string;
  ticket_number?: string;
  ticket_date?: string;
  driver_name?: string;
  driver_id?: string;
  truck_number?: string;
  trailer_number?: string;
  customer_name?: string;
  material?: string;
  unit_type?: string;
  quantity?: number;
  gross_weight?: number;
  tare_weight?: number;
  net_weight?: number;
  bill_rate?: number;
  pay_rate?: number;
  delivery_location?: string;
  pickup_location?: string;
  status?: string;
  payment_status?: string;
  ticket_notes?: string;
  ticket_image_url?: string;
  approved_by?: string;
  approved_at?: string;
  needs_review?: boolean;
  validation_status?: string;
  validation_score?: number;
  fuel_surcharge_amount?: number;
  detention_amount?: number;
};

/* ─── Status helpers ─────────────────────────────── */
function statusChip(status: string | undefined) {
  const map: Record<string, [string, string]> = {
    pending:  ["#fef3c7", "#d97706"],
    approved: ["#dcfce7", "#15803d"],
    rejected: ["#fee2e2", "#dc2626"],
    voided:   ["#f1f5f9", "#94a3b8"],
    invoiced: ["#eff6ff", "#1e40af"],
    paid:     ["#f0fdf4", "#15803d"],
  };
  const [bg, color] = map[status ?? "pending"] ?? map.pending;
  return (
    <span style={{ background: bg, color, padding: "3px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.78rem" }}>
      {status ?? "pending"}
    </span>
  );
}

/* ─── Field row ──────────────────────────────────── */
function FieldRow({
  label,
  value,
  field,
  type = "text",
  options,
  onChange,
}: {
  label: string;
  value: string | number | undefined | null;
  field: string;
  type?: string;
  options?: string[];
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </label>
      {options ? (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(field, e.target.value)}
          style={inp}
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={String(value ?? "")}
          onChange={(e) => onChange(field, e.target.value)}
          style={inp}
        />
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────── */
export default function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [draft, setDraft] = useState<Partial<Ticket>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetch(`/api/ronyx/tickets/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setTicket(d.ticket);
        setDraft(d.ticket || {});
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function set(field: string, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function save(overrides?: Partial<Ticket>) {
    setSaving(true);
    setMsg("");
    const payload = { ...draft, ...overrides };
    const res = await fetch(`/api/ronyx/tickets/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setTicket(data.ticket);
      setDraft(data.ticket);
      flash(overrides?.status ? `Ticket ${overrides.status}.` : "Changes saved.");
    } else {
      flash(`Error: ${data.error}`, true);
    }
    setSaving(false);
  }

  async function approve() {
    if (!confirm("Approve this ticket? This action is logged.")) return;
    await save({ status: "approved", approved_by: "Admin", approved_at: new Date().toISOString() });
  }

  async function voidTicket() {
    if (!confirm("Void this ticket? This cannot be undone.")) return;
    await save({ status: "voided" });
  }

  async function flagNeedsReview() {
    await save({ needs_review: true, status: "pending" } as any);
  }

  function flash(message: string, isErr = false) {
    setMsg(isErr ? `error:${message}` : message);
    setTimeout(() => setMsg(""), 6000);
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading ticket…</div>;
  if (!ticket)  return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ color: "#dc2626", fontWeight: 600 }}>Ticket not found.</div>
      <Link href="/ronyx/tickets" style={{ color: "#1e40af", marginTop: 12, display: "inline-block" }}>← Back to Tickets</Link>
    </div>
  );

  const isErr = msg.startsWith("error:");
  const imgUrl = ticket.ticket_image_url;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 14 }}>
        <Link href="/ronyx/tickets" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>
          ← Tickets
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
          Ticket #{ticket.ticket_number || ticket.id.slice(0, 8)}
        </h1>
        {statusChip(ticket.status)}
        {(ticket as any).needs_review && (
          <span style={{ background: "#fef3c7", color: "#d97706", padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.75rem" }}>
            Needs Review
          </span>
        )}
        {saving && <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Saving…</span>}
      </div>

      {/* Status message */}
      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 500, background: isErr ? "#fee2e2" : "#eff6ff", color: isErr ? "#dc2626" : "#1e40af", border: `1px solid ${isErr ? "#fecaca" : "#bfdbfe"}` }}>
          {isErr ? msg.replace("error:", "") : msg}
        </div>
      )}

      {/* Two-column layout: image left, fields right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Left: Image preview */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>Source Document</span>
          </div>
          <div style={{ flex: 1, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, background: "#f8fafc" }}>
            {imgUrl && !imgError ? (
              imgUrl.endsWith(".pdf") ? (
                <iframe src={imgUrl} style={{ width: "100%", height: 500, border: "none" }} title="Ticket document" />
              ) : (
                <img
                  src={imgUrl}
                  alt="Ticket"
                  style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 8, objectFit: "contain" }}
                  onError={() => setImgError(true)}
                />
              )
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: "0.85rem" }}>{imgUrl ? "Failed to load image" : "No image attached"}</div>
                {imgUrl && (
                  <a href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontSize: "0.82rem", marginTop: 8, display: "inline-block" }}>
                    Open file →
                  </a>
                )}
              </div>
            )}
          </div>
          {imgUrl && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9" }}>
              <a href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontSize: "0.82rem", fontWeight: 600 }}>
                Open full size →
              </a>
            </div>
          )}
        </div>

        {/* Right: Editable fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Core fields */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ticket Fields</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <FieldRow label="Ticket #" value={draft.ticket_number} field="ticket_number" onChange={set} />
              <FieldRow label="Date" value={draft.ticket_date} field="ticket_date" type="date" onChange={set} />
              <FieldRow label="Driver" value={draft.driver_name} field="driver_name" onChange={set} />
              <FieldRow label="Truck #" value={draft.truck_number} field="truck_number" onChange={set} />
              <FieldRow label="Customer" value={draft.customer_name} field="customer_name" onChange={set} />
              <FieldRow label="Material" value={draft.material} field="material" onChange={set} />
              <FieldRow label="Unit Type" value={draft.unit_type} field="unit_type" options={["Load", "Yard", "Ton", "Hour"]} onChange={set} />
              <FieldRow label="Quantity" value={draft.quantity} field="quantity" type="number" onChange={set} />
            </div>
          </div>

          {/* Weight & billing */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>Weight & Billing</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FieldRow label="Gross Weight (lbs)" value={draft.gross_weight} field="gross_weight" type="number" onChange={set} />
                <FieldRow label="Tare Weight (lbs)" value={draft.tare_weight} field="tare_weight" type="number" onChange={set} />
                <FieldRow label="Net Weight (lbs)" value={draft.net_weight} field="net_weight" type="number" onChange={set} />
                <FieldRow label="Bill Rate ($)" value={draft.bill_rate} field="bill_rate" type="number" onChange={set} />
                <FieldRow label="Pay Rate ($)" value={draft.pay_rate} field="pay_rate" type="number" onChange={set} />
              </div>
            </div>
          </div>

          {/* Status & notes */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>Status & Notes</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <FieldRow label="Status" value={draft.status} field="status" options={["pending", "approved", "rejected", "invoiced", "paid", "voided"]} onChange={set} />
              <FieldRow label="Delivery Location" value={draft.delivery_location} field="delivery_location" onChange={set} />
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Admin Notes
                </label>
                <textarea
                  value={String(draft.ticket_notes ?? "")}
                  onChange={(e) => set("ticket_notes", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                />
              </div>
              {ticket.approved_by && (
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 8 }}>
                  Approved by <strong>{ticket.approved_by}</strong> at {new Date(ticket.approved_at || "").toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid #e2e8f0" }}>
        <button
          onClick={() => save()}
          disabled={saving}
          style={{ background: "#1e40af", color: "#fff", padding: "9px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          Save Edits
        </button>
        {ticket.status !== "approved" && (
          <button
            onClick={approve}
            disabled={saving}
            style={{ background: "#15803d", color: "#fff", padding: "9px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer" }}
          >
            Approve
          </button>
        )}
        {ticket.status !== "voided" && (
          <button
            onClick={voidTicket}
            disabled={saving}
            style={{ background: "#dc2626", color: "#fff", padding: "9px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer" }}
          >
            Void
          </button>
        )}
        <button
          onClick={flagNeedsReview}
          disabled={saving}
          style={{ background: "#f59e0b", color: "#fff", padding: "9px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer" }}
        >
          Flag for Review
        </button>
        <Link
          href="/ronyx/tickets"
          style={{ padding: "9px 18px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem", color: "#475569", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Back to Queue
        </Link>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: "0.87rem",
  outline: "none",
  background: "#fafafa",
  boxSizing: "border-box",
};
