"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScanRole = "office" | "driver" | "customer" | null;
type ScanStep = "role" | "loading" | "not_found" | "view" | "sign" | "signed";

type TicketData = {
  id: string;
  ticket_number: string;
  ticket_date: string;
  driver_name?: string;
  truck_number?: string;
  truck_type?: string;
  shift?: string;
  material?: string;
  quantity?: number;
  customer_name?: string;
  pickup_location?: string;
  authorized_person?: string;
  signature_present?: boolean;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  status?: string;
  payment_status?: string;
  reconciliation_status?: string;
  payroll_hold?: boolean;
  billing_hold?: boolean;
  payroll_ready?: boolean;
  billing_ready?: boolean;
  missing_fields?: string[];
  exception_flags?: string[];
  ocr_confidence?: number;
  extraction_confidence?: number;
  company_name_of_truck?: string;
  customer_approved?: boolean;
  customer_signed_name?: string;
  customer_signed_at?: string;
  document_type?: string;
  job_name?: string;
  invoice_number?: string;
  qr_scan_count?: number;
  copy_color?: string;
};

function fmt(v: string | undefined | null): string {
  return v || "—";
}

function StatusBadge({ status }: { status: string | undefined }) {
  const s = status?.toLowerCase() || "";
  const [bg, color] = s.includes("approv") || s.includes("paid") || s.includes("ready") ? ["#f0fdf4", "#16a34a"]
    : s.includes("hold") || s.includes("missing") ? ["#fff7ed", "#d97706"]
    : s.includes("pending") ? ["#eff6ff", "#1d4ed8"]
    : s.includes("void") ? ["#f1f5f9", "#64748b"]
    : ["#f1f5f9", "#475569"];
  return (
    <span style={{ padding: "3px 10px", borderRadius: 99, background: bg, color, fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {status || "Pending"}
    </span>
  );
}

function Field({ label, value, warn }: { label: string; value: string | undefined | null; warn?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: warn && !value ? "#dc2626" : "#0f172a" }}>
        {value || <span style={{ color: "#dc2626", fontStyle: "italic" }}>Missing</span>}
      </div>
    </div>
  );
}

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [role, setRole]   = useState<ScanRole>(null);
  const [step, setStep]   = useState<ScanStep>("role");
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer signature state
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing]       = useState(false);
  const [hasSig, setHasSig]         = useState(false);
  const [sigName, setSigName]       = useState("");
  const [sigNotes, setSigNotes]     = useState("");
  const [signing, setSigning]       = useState(false);
  const [signedOk, setSignedOk]     = useState(false);
  const [signMsg, setSignMsg]       = useState("");

  // Read token + optional role from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t") || "";
    const r = params.get("r") as ScanRole | null;
    setToken(t);
    if (!t) { setStep("not_found"); setErrorMsg("No scan token in URL."); return; }
    if (r && ["office", "driver", "customer"].includes(r)) {
      setRole(r);
      loadTicket(t, r);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTicket = useCallback(async (t: string, r: ScanRole) => {
    setStep("loading");
    try {
      const res  = await fetch(`/api/ronyx/scan?t=${encodeURIComponent(t)}&r=${r}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Ticket not found.");
        setStep("not_found");
        return;
      }
      setTicket(data.ticket);
      setStep("view");
    } catch {
      setErrorMsg("Could not load ticket — check your connection.");
      setStep("not_found");
    }
  }, []);

  const selectRole = (r: ScanRole) => {
    setRole(r);
    loadTicket(token, r);
  };

  // Canvas helpers
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    setDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y); ctx.stroke(); ctx.moveTo(x, y);
    setHasSig(true);
  };
  const endDraw = () => setDrawing(false);
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const submitSignature = async () => {
    if (!sigName.trim()) { alert("Please print your name."); return; }
    setSigning(true);
    try {
      const sigDataUrl = canvasRef.current?.toDataURL("image/png");
      const res  = await fetch(`/api/ronyx/scan?t=${encodeURIComponent(token)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ customer_signed_name: sigName, customer_notes: sigNotes, signature_data_url: sigDataUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setSignMsg(data.error || "Submit failed"); }
      else { setSignedOk(true); setSignMsg(data.message); setStep("signed"); }
    } catch { setSignMsg("Submit failed — check connection"); }
    finally   { setSigning(false); }
  };

  const S = { /* shared container */ maxWidth: 520, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,-apple-system,sans-serif", color: "#0f172a" };

  /* ── not found ── */
  if (step === "not_found") return (
    <div style={{ ...S, textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>❌</div>
      <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 8 }}>Ticket Not Found</h2>
      <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{errorMsg || "This QR code is invalid or the ticket no longer exists."}</p>
      <div style={{ marginTop: 16, fontSize: "0.72rem", color: "#94a3b8" }}>Scan logged. Contact Ronyx Logistics LLC if you believe this is an error.</div>
    </div>
  );

  /* ── loading ── */
  if (step === "loading") return (
    <div style={{ ...S, textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 12, animation: "spin 1s linear infinite" }}>⟳</div>
      <p style={{ color: "#64748b" }}>Loading ticket…</p>
    </div>
  );

  /* ── role selector ── */
  if (step === "role") return (
    <div style={S}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Ronyx Logistics LLC</div>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 12 }}>FAST SCAN™ QR</div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 8 }}>Who are you?</h1>
        <p style={{ color: "#64748b", fontSize: "0.83rem" }}>Select your role to see the right ticket view.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { r: "office" as ScanRole,   icon: "📋", label: "Office / Admin Staff",          desc: "Full ticket review, reconciliation, approve payroll & billing" },
          { r: "driver" as ScanRole,   icon: "🚛", label: "Driver",                         desc: "See your ticket status — loads, hours, and payment status" },
          { r: "customer" as ScanRole, icon: "✍️",  label: "Customer / Authorized Signer",  desc: "Verify work and sign to approve the ticket" },
        ].map(({ r, icon, label, desc }) => (
          <button key={r} onClick={() => selectRole(r)}
            style={{ padding: "18px 20px", borderRadius: 14, border: "2px solid #e2e8f0", background: "#f8fafc", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ── signed confirmation ── */
  if (step === "signed") return (
    <div style={{ ...S, textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
      <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 8 }}>Ticket Approved</h2>
      <p style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.88rem" }}>{signMsg}</p>
      <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 12 }}>This ticket has been signed and sent for billing approval. Thank you.</p>
    </div>
  );

  if (!ticket) return null;

  /* ── DRIVER VIEW ── */
  if (role === "driver") return (
    <div style={S}>
      <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 22px", color: "#fff", marginBottom: 20 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Ronyx Logistics LLC · Fast Scan™</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>Ticket #{fmt(ticket.ticket_number)}</div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>{fmt(ticket.ticket_date)} · Truck {fmt(ticket.truck_number)}</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Customer"    value={ticket.customer_name} />
          <Field label="Location"    value={ticket.pickup_location} />
          <Field label="Material"    value={ticket.material} />
          <Field label="Loads / Qty" value={ticket.quantity?.toString()} />
          <Field label="Start Time"  value={ticket.start_time} />
          <Field label="End Time"    value={ticket.end_time} />
          <Field label="Total Hours" value={ticket.total_hours?.toString()} />
          <Field label="Shift"       value={ticket.shift} />
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: 12 }}>Ticket Status</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Ticket Status",  ticket.status],
            ["Payment Status", ticket.payment_status],
            ["Signature",      ticket.signature_present ? "Signed ✓" : "Missing ⚠"],
          ].map(([lbl, val]) => (
            <div key={lbl as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{lbl}</span>
              <StatusBadge status={val as string} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── CUSTOMER / SIGNER VIEW ── */
  if (role === "customer") return (
    <div style={S}>
      <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 22px", color: "#fff", marginBottom: 20 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Customer Ticket Verification</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>Ticket #{fmt(ticket.ticket_number)}</div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>{fmt(ticket.ticket_date)} · {fmt(ticket.company_name_of_truck)}</div>
      </div>

      {ticket.customer_approved ? (
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #86efac", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "0.95rem" }}>✓ Already Approved</div>
          <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: 4 }}>
            Signed by {fmt(ticket.customer_signed_name)} on {ticket.customer_signed_at ? new Date(ticket.customer_signed_at).toLocaleDateString("en-US") : "—"}
          </div>
        </div>
      ) : null}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Ticket #"     value={ticket.ticket_number} />
          <Field label="Date"         value={ticket.ticket_date} />
          <Field label="Truck #"      value={ticket.truck_number} />
          <Field label="Company"      value={ticket.company_name_of_truck} />
          <Field label="Customer"     value={ticket.customer_name}    warn />
          <Field label="Location"     value={ticket.pickup_location}  warn />
          <Field label="Material"     value={ticket.material} />
          <Field label="Loads / Qty"  value={ticket.quantity?.toString()} />
          <Field label="Start Time"   value={ticket.start_time} />
          <Field label="End Time"     value={ticket.end_time} />
          <Field label="Total Hours"  value={ticket.total_hours?.toString()} />
          <Field label="Auth. Person" value={ticket.authorized_person} warn />
        </div>
      </div>

      {!ticket.customer_approved && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 14 }}>✍️ Sign to Approve This Ticket</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Print Your Name *
            </label>
            <input value={sigName} onChange={e => setSigName(e.target.value)}
              placeholder="e.g. John Smith"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.88rem", boxSizing: "border-box", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Signature (draw below)
            </label>
            <canvas ref={canvasRef} width={480} height={120}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, background: "#f8fafc", touchAction: "none", display: "block" }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Sign with your finger or mouse</span>
              <button onClick={clearSig} style={{ fontSize: "0.7rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear</button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Notes (optional)
            </label>
            <textarea value={sigNotes} onChange={e => setSigNotes(e.target.value)} rows={2}
              placeholder="Any comments about the work performed…"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.83rem", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", outline: "none" }} />
          </div>

          {signMsg && <div style={{ marginBottom: 12, fontSize: "0.78rem", color: signedOk ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{signMsg}</div>}

          <button onClick={submitSignature} disabled={signing || !sigName.trim()}
            style={{ width: "100%", padding: "13px", borderRadius: 10, background: signing || !sigName.trim() ? "#93c5fd" : "#1d4ed8", color: "#fff", border: "none", fontWeight: 900, fontSize: "0.92rem", cursor: signing || !sigName.trim() ? "not-allowed" : "pointer" }}>
            {signing ? "Submitting…" : "✓ Submit Approval"}
          </button>
          <p style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
            By submitting, you confirm the work described on this ticket was performed as specified.
          </p>
        </div>
      )}
    </div>
  );

  /* ── OFFICE VIEW ── */
  const mf = ticket.missing_fields || [];
  const ef = ticket.exception_flags || [];
  return (
    <div style={S}>
      {/* Header */}
      <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 22px", color: "#fff", marginBottom: 20 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Office Staff View · Ronyx Logistics LLC</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>Ticket #{fmt(ticket.ticket_number)}</div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
          {fmt(ticket.ticket_date)} · Truck {fmt(ticket.truck_number)} · {fmt(ticket.document_type?.replace(/_/g, " "))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <StatusBadge status={ticket.status} />
          <StatusBadge status={ticket.reconciliation_status ? `Recon: ${ticket.reconciliation_status}` : "Recon: pending"} />
          {ticket.payroll_hold  && <StatusBadge status="Payroll Hold" />}
          {ticket.billing_hold  && <StatusBadge status="Billing Hold" />}
          {ticket.payroll_ready && <StatusBadge status="Payroll Ready" />}
          {ticket.billing_ready && <StatusBadge status="Billing Ready" />}
        </div>
      </div>

      {/* Exception flags */}
      {ef.length > 0 && (
        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "#dc2626", marginBottom: 8 }}>Exception Flags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ef.map(f => <span key={f} style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "#fee2e2", color: "#dc2626" }}>{f}</span>)}
          </div>
          {mf.length > 0 && <div style={{ fontSize: "0.72rem", color: "#d97706", marginTop: 8 }}>Missing: {mf.join(", ")}</div>}
        </div>
      )}

      {/* Core fields */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: "0.78rem", marginBottom: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ticket Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Ticket #"          value={ticket.ticket_number} />
          <Field label="Date"              value={ticket.ticket_date} />
          <Field label="Driver"            value={ticket.driver_name}      warn />
          <Field label="Truck #"           value={ticket.truck_number}     warn />
          <Field label="Truck Type"        value={ticket.truck_type} />
          <Field label="Shift"             value={ticket.shift} />
          <Field label="Customer"          value={ticket.customer_name}    warn />
          <Field label="Location"          value={ticket.pickup_location}  warn />
          <Field label="Material"          value={ticket.material} />
          <Field label="Loads / Qty"       value={ticket.quantity?.toString()} />
          <Field label="Start Time"        value={ticket.start_time}       warn />
          <Field label="End Time"          value={ticket.end_time}         warn />
          <Field label="Total Hours"       value={ticket.total_hours?.toString()} warn />
          <Field label="Authorized Person" value={ticket.authorized_person} warn />
          <Field label="Signature"         value={ticket.signature_present ? "Present ✓" : undefined} warn />
          <Field label="Copy Color"        value={ticket.copy_color} />
          <Field label="Job"               value={ticket.job_name} />
          <Field label="Invoice #"         value={ticket.invoice_number} />
        </div>
      </div>

      {/* OCR confidence */}
      {(ticket.ocr_confidence || ticket.extraction_confidence) ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: "0.78rem", marginBottom: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>OCR Quality</div>
          {[["OCR Confidence", ticket.ocr_confidence], ["Extraction Confidence", ticket.extraction_confidence]].map(([lbl, val]) => {
            const pct = Number(val ?? 0);
            return (
              <div key={lbl as string} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 3 }}>
                  <span style={{ color: "#64748b" }}>{lbl}</span>
                  <strong style={{ color: pct >= 70 ? "#16a34a" : "#d97706" }}>{pct}%</strong>
                </div>
                <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct >= 70 ? "#16a34a" : "#d97706", borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Customer approval status */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: "0.78rem", marginBottom: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Approval</div>
        {ticket.customer_approved ? (
          <div>
            <div style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 700 }}>✓ Approved by {ticket.customer_signed_name}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
              {ticket.customer_signed_at ? new Date(ticket.customer_signed_at).toLocaleString("en-US") : ""}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "0.83rem", color: "#d97706", fontWeight: 600 }}>⚠ Not yet approved by customer</div>
        )}
      </div>

      {/* QR stats */}
      <div style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", paddingTop: 8, paddingBottom: 20 }}>
        QR scan #{(ticket.qr_scan_count || 0) + 1} · Scan logged to audit trail
      </div>

      {/* Back to full TMS */}
      <div style={{ textAlign: "center" }}>
        <a href="/ronyx/tickets" style={{ fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 700 }}>
          Open Full Ticket in Ronyx TMS →
        </a>
      </div>
    </div>
  );
}
