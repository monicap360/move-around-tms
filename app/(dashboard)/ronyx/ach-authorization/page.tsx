"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PRIME = {
  name:    "Ronyx Logistics LLC",
  address: "3741 Graves Ave,",
  city:    "Groves Tx, 77619",
  email:   "ar.ap@ronyxlogistics.llc",
  phone:   "337-930-0840",
};

const KNOWN_COMPANIES = [
  "TC Red Wine Services, LLC",
  "BAS Equipment & Trucking LLC",
  "M.A. Mortenson Company",
  "Denesse Group Inc",
  "Denesse Duran",
  "J&J Alvarado LLC",
];

type AuthRecord = {
  id: string;
  recipient_name: string;
  company_name: string | null;
  email: string | null;
  status: string;
  sign_token: string;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
};

/* ── Signature Canvas ─────────────────────────────────────────────── */
function SignatureCanvas({ onSave, onClear }: { onSave: (url: string) => void; onClear: () => void }) {
  const ref     = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last    = useRef<{ x: number; y: number } | null>(null);

  function pos(e: MouseEvent | TouchEvent, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const s = "touches" in e ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  }
  const start = (e: any) => { e.preventDefault(); drawing.current = true; last.current = pos(e, ref.current!); };
  const move  = (e: any) => {
    if (!drawing.current || !ref.current) return; e.preventDefault();
    const ctx = ref.current.getContext("2d")!; const p = pos(e, ref.current);
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; };

  return (
    <div>
      <div style={{ border: "1px solid #0f172a", borderRadius: 6, background: "#fafafa", display: "inline-block", touchAction: "none" }}>
        <canvas ref={ref} width={320} height={80} style={{ display: "block", cursor: "crosshair", borderRadius: 6 }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={() => { if (ref.current) onSave(ref.current.toDataURL()); }}
          style={{ padding: "5px 14px", borderRadius: 7, background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Apply
        </button>
        <button onClick={() => { ref.current?.getContext("2d")?.clearRect(0, 0, 320, 80); onClear(); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

/* ── ACH Document Preview ─────────────────────────────────────────── */
function ACHDocument({ name, company, signature, signedDate }: { name: string; company: string; signature: string | null; signedDate?: string }) {
  const blank = (val: string, w = 200) =>
    val ? <strong style={{ borderBottom: "1px solid #000", minWidth: w, display: "inline-block" }}>{val}</strong>
        : <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: w }} />;

  return (
    <div id="ach-preview" style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#000", lineHeight: 1.7, maxWidth: 680, margin: "0 auto", padding: "32px 40px", background: "#fff" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{PRIME.name}</div>
        <div>{PRIME.address}</div>
        <div>{PRIME.city}</div>
      </div>

      {company && <div style={{ marginBottom: 16 }}>To: <strong>{company}</strong></div>}

      <p style={{ marginBottom: 12 }}>
        {PRIME.name} is offering ACH payments for your convenience. This option allows us to make secure electronic payments directly to your bank account.
      </p>

      <p style={{ marginBottom: 12 }}>
        <strong>Please note that a processing fee will apply to each ACH transaction.</strong> Once your payment is processed, funds will be deposited into your bank account the next business day.
      </p>

      <p style={{ marginBottom: 20 }}>Please sign below to indicate your agreement to the ACH processing terms.</p>

      <hr style={{ border: "none", borderTop: "1px solid #000", marginBottom: 16 }} />

      <p style={{ marginBottom: 20 }}>
        <strong>I agree to the ACH processing terms, including the processing fee of $14.99 per transaction.</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, width: 80 }}>Name:</span>
          {blank(name, 220)}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <span style={{ fontWeight: 700, width: 80 }}>Signature:</span>
          {signature ? (
            <img src={signature} alt="Signature" style={{ height: 40, borderBottom: "1px solid #000", minWidth: 220 }} />
          ) : (
            <span style={{ display: "inline-block", borderBottom: "1px solid #000", width: 220, height: 40 }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, width: 80 }}>Date:</span>
          {blank(signedDate || "", 200)}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #000", margin: "24px 0 16px" }} />

      <p style={{ marginBottom: 4 }}>Thank you for your continued business and trust.</p>
      <p style={{ marginBottom: 12 }}>If you have any questions, please contact us.</p>
      <p style={{ marginBottom: 4 }}>Sincerely,</p>
      <p><strong>{PRIME.name}</strong></p>
    </div>
  );
}

/* ── Status chip ──────────────────────────────────────────────────── */
function Chip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    draft:  ["#f1f5f9", "#475569"],
    sent:   ["#dbeafe", "#1e40af"],
    signed: ["#dcfce7", "#166534"],
  };
  const [bg, color] = map[status] || ["#f1f5f9", "#475569"];
  return <span style={{ padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: bg, color }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function ACHAuthorizationPage() {
  const [tab, setTab]               = useState<"new" | "history">("new");
  const [recipientName, setRecipientName] = useState("");
  const [companyName, setCompanyName]   = useState("");
  const [email, setEmail]           = useState("");
  const [customCompany, setCustomCompany] = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [sending, setSending]       = useState(false);
  const [history, setHistory]       = useState<AuthRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function selectCompany(name: string) {
    if (name === "__custom__") { setCustomCompany(true); setCompanyName(""); }
    else { setCustomCompany(false); setCompanyName(name); }
  }

  async function loadHistory() {
    setHistLoading(true);
    try {
      const res = await fetch("/api/ronyx/ach-authorizations");
      const d   = await res.json();
      setHistory(d.authorizations || []);
    } finally {
      setHistLoading(false);
    }
  }

  useEffect(() => { void loadHistory(); }, []);

  async function createAndSend() {
    if (!recipientName.trim()) { showToast("Recipient name is required", false); return; }
    setSaving(true);
    try {
      // Create record
      const res  = await fetch("/api/ronyx/ach-authorizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_name: recipientName, company_name: companyName || null, email: email || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const auth = data.authorization;

      if (email.trim()) {
        await sendEmail(auth);
      } else {
        showToast("Authorization saved. No email on file — copy the signing link from History.");
      }

      setRecipientName(""); setCompanyName(""); setEmail(""); setShowPreview(false);
      await loadHistory();
      setTab("history");
    } catch (err: any) {
      showToast(err.message || "Failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function sendEmail(auth: any) {
    setSending(true);
    try {
      const signingUrl = `${window.location.origin}/ronyx/sign-ach/${auth.sign_token}`;
      const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
    <strong>Ronyx Logistics LLC</strong> — ACH Payment Authorization
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${auth.recipient_name}</strong>${auth.company_name ? ` (${auth.company_name})` : ""},</p>
    <p>
      Ronyx Logistics LLC is offering ACH payments for your convenience. This option allows us to make secure electronic payments directly to your bank account.
    </p>
    <p>
      <strong>Please note that a processing fee of $14.99 will apply to each ACH transaction.</strong> Once your payment is processed, funds will be deposited into your bank account the next business day.
    </p>
    <p>Please click the button below to review and sign the ACH authorization form:</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${signingUrl}" style="background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Review &amp; Sign ACH Authorization →
      </a>
    </div>
    <p style="font-size:12px;color:#64748b">Or copy this link: <a href="${signingUrl}">${signingUrl}</a></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
    <p style="font-size:12px;color:#64748b">Questions? Contact us at <a href="mailto:${PRIME.email}">${PRIME.email}</a> or call ${PRIME.phone}.</p>
    <p style="font-size:11px;color:#94a3b8;margin-top:8px">Sincerely, Ronyx Logistics LLC · ${PRIME.address} ${PRIME.city}</p>
  </div>
</div>`;

      await fetch("/api/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to:      auth.email,
          subject: `ACH Payment Authorization — Ronyx Logistics LLC`,
          html,
          from:    PRIME.email,
        }),
      });

      // Mark as sent
      await fetch("/api/ronyx/ach-authorizations", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: auth.id, status: "sent", sent_at: new Date().toISOString() }),
      });

      showToast(`Authorization emailed to ${auth.email}`);
    } catch (err: any) {
      showToast(err.message || "Email failed", false);
    } finally {
      setSending(false);
    }
  }

  async function resend(auth: AuthRecord) {
    if (!auth.email) { showToast("No email on file for this record", false); return; }
    await sendEmail(auth);
    await loadHistory();
  }

  function printPreview() {
    const el = document.getElementById("ach-preview");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>ACH Authorization — Ronyx Logistics LLC</title><style>body{margin:40px;font-family:Arial,sans-serif}@media print{body{margin:0}}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };

  return (
    <div className="ronyx-shell">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Payments</p>
          <h1>ACH Authorization</h1>
          <p className="ronyx-muted">Send the ACH processing fee agreement to subhaulers and vendors for e-signature.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/ronyx/subhauler-agreement" className="ronyx-action" style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#475569" }}>Subhauler Agreement</Link>
          <Link href="/ronyx" className="ronyx-action" style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#475569" }}>Dashboard</Link>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[["new", "✏️  Send New"], ["history", "📋  Sent History"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{ padding: "8px 20px", borderRadius: 20, border: "1px solid #e2e8f0", background: tab === key ? "#0f172a" : "#fff", color: tab === key ? "#fff" : "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <div style={{ display: "grid", gridTemplateColumns: showPreview ? "420px 1fr" : "420px", gap: 24, alignItems: "start" }}>
          {/* Form */}
          <div className="ronyx-card">
            <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>Send ACH Authorization</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Company</label>
              <select
                style={{ ...inp, fontWeight: 600 }}
                value={customCompany ? "__custom__" : companyName}
                onChange={(e) => selectCompany(e.target.value)}
              >
                <option value="">— Select company —</option>
                {KNOWN_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">Other (type below)</option>
              </select>
            </div>

            {customCompany && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Company Name</label>
                <input style={inp} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Recipient Name *</label>
              <input style={inp} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. John Smith" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Email Address</label>
              <input type="email" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="The authorization will be emailed here" />
            </div>

            {/* Inline document summary */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Document Summary</div>
              <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>
                <strong>Ronyx Logistics LLC</strong> is offering ACH payments. A processing fee of{" "}
                <strong style={{ color: "#991b1b" }}>$14.99 per transaction</strong> applies. Funds deposited the next business day.
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#475569", fontStyle: "italic" }}>
                "I agree to the ACH processing terms, including the processing fee of $14.99 per transaction."
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button onClick={() => setShowPreview(!showPreview)}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {showPreview ? "Hide Preview" : "Preview Document"}
              </button>
              {showPreview && (
                <button onClick={printPreview}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Print / PDF
                </button>
              )}
              <button onClick={createAndSend} disabled={saving || sending}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving || sending ? "Sending…" : "✉  Save & Email for Signature"}
              </button>
            </div>
            {!email && (
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Add an email address to send the signing link automatically.</p>
            )}
          </div>

          {/* Preview */}
          {showPreview && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Document Preview
              </div>
              <ACHDocument name={recipientName} company={companyName} signature={null} />
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="ronyx-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Sent Authorizations ({history.length})</h2>
            <button onClick={loadHistory} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>Refresh</button>
          </div>

          {histLoading ? (
            <div style={{ color: "#64748b", padding: "20px 0" }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>
              No authorizations sent yet.{" "}
              <button onClick={() => setTab("new")} style={{ color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Send one now</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Recipient", "Company", "Email", "Status", "Sent", "Signed", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 700 }}>{a.recipient_name}</td>
                    <td style={{ padding: "10px 10px", color: "#475569" }}>{a.company_name || "—"}</td>
                    <td style={{ padding: "10px 10px", color: "#64748b", fontSize: 12 }}>{a.email || "—"}</td>
                    <td style={{ padding: "10px 10px" }}><Chip status={a.status} /></td>
                    <td style={{ padding: "10px 10px", color: "#64748b", fontSize: 12 }}>
                      {a.sent_at ? new Date(a.sent_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12 }}>
                      {a.signed_at
                        ? <span style={{ color: "#166534", fontWeight: 700 }}>✓ {new Date(a.signed_at).toLocaleDateString()}</span>
                        : <span style={{ color: "#94a3b8" }}>Pending</span>}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ronyx/sign-ach/${a.sign_token}`); showToast("Link copied!"); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Copy Link
                        </button>
                        {a.email && a.status !== "signed" && (
                          <button onClick={() => resend(a)} disabled={sending}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Resend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
