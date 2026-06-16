"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const PRIME = {
  name:    "Ronyx Logistics, LLC",
  address: "3741 Graves Ave, Groves Texas 77619",
  attn:    "Veronica Y Butanda",
  phone:   "337-930-0840",
  email:   "ar.ap@ronyxlogistics.llc",
};

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
    if (!drawing.current || !ref.current) return;
    e.preventDefault();
    const ctx = ref.current.getContext("2d")!;
    const p   = pos(e, ref.current);
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; last.current = null; };

  return (
    <div>
      <div style={{ border: "1px solid #0f172a", borderRadius: 8, background: "#fff", display: "inline-block", touchAction: "none" }}>
        <canvas ref={ref} width={440} height={120} style={{ display: "block", cursor: "crosshair", borderRadius: 8 }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => { if (ref.current) onSave(ref.current.toDataURL()); }}
          style={{ padding: "8px 20px", borderRadius: 8, background: "#166534", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Apply Signature
        </button>
        <button onClick={() => { if (ref.current) { ref.current.getContext("2d")!.clearRect(0, 0, 440, 120); onClear(); } }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default function SignPage() {
  const params  = useParams();
  const token   = params?.token as string;

  const [agreement, setAgreement]   = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [sig, setSig]               = useState<string | null>(null);
  const [name, setName]             = useState("");
  const [title, setTitle]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/ronyx/subhauler-agreements/sign?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAgreement(d.agreement);
      })
      .catch(() => setError("Failed to load agreement."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (!sig)  { alert("Please draw your signature."); return; }
    if (!name) { alert("Please enter your printed name."); return; }
    setSubmitting(true);
    try {
      const res  = await fetch("/api/ronyx/subhauler-agreements/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature: sig, signed_by: `${name}${title ? " / " + title : ""}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err: any) {
      alert(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", color: "#64748b" }}>Loading agreement…</div>;
  if (error)   return <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", color: "#991b1b" }}>Error: {error}</div>;
  if (done)    return (
    <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#166534", marginBottom: 8 }}>Agreement Signed!</h1>
      <p style={{ color: "#475569" }}>Thank you for signing the subhauler agreement with Ronyx Logistics, LLC. A copy will be sent to your email.</p>
      <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 24 }}>Questions? Contact us at {PRIME.email} or {PRIME.phone}</p>
    </div>
  );

  const a = agreement;
  const trucks = (a.trucks || []) as { type: string; truck_number: string }[];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f8fafc", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", color: "#fff", borderRadius: "12px 12px 0 0", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>Ronyx Logistics, LLC</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Subhauler Agreement — Review & Sign</div>
          </div>
          {a.status === "signed" && (
            <span style={{ background: "#22c55e", color: "#fff", padding: "4px 12px", borderRadius: 20, fontWeight: 800, fontSize: 12 }}>SIGNED</span>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 28 }}>
          {a.status === "signed" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#166534" }}>This agreement has already been signed.</div>
              <div style={{ color: "#64748b", marginTop: 8 }}>Signed on {new Date(a.subhauler_signed_at).toLocaleDateString()}</div>
            </div>
          ) : (
            <>
              {/* Agreement document */}
              <div style={{ fontFamily: "Times New Roman, serif", fontSize: 12, lineHeight: 1.7, marginBottom: 32 }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, textDecoration: "underline", marginBottom: 6 }}>SUBHAULER AGREEMENT</div>
                  <div>BETWEEN PRIME CARRIER: <strong>Ronyx Logistics, LLC</strong> AND SUBHAULER: <strong>{a.subhauler_name}</strong></div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 11 }}>
                  <thead>
                    <tr><th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>PRIME CARRIER</th>
                    <th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>SUBHAULER</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ["Name", PRIME.name,    "Name",      a.subhauler_name],
                      ["Address", PRIME.address, "Address", a.subhauler_address || ""],
                      ["ATTN",    PRIME.attn,    "ATTN",    a.subhauler_attn || ""],
                      ["Phone",   PRIME.phone,   "Phone",   a.subhauler_phone || ""],
                      ["Email",   PRIME.email,   "Email",   a.subhauler_email || ""],
                    ].map(([l, v, l2, v2], i) => (
                      <tr key={i}>
                        <td style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>{l}:</strong> {v}</td>
                        <td style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>{l2}:</strong> {v2}</td>
                      </tr>
                    ))}
                    <tr><td colSpan={2} style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>USDOT No:</strong> {a.subhauler_usdot || ""}</td></tr>
                  </tbody>
                </table>

                {trucks.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 11 }}>
                    <thead><tr><th style={{ border: "1px solid #000", padding: "3px 8px", background: "#f1f5f9", textAlign: "left" }}>Type of Truck</th><th style={{ border: "1px solid #000", padding: "3px 8px", background: "#f1f5f9", textAlign: "left" }}>Truck Number</th></tr></thead>
                    <tbody>{trucks.map((t, i) => <tr key={i}><td style={{ border: "1px solid #000", padding: "3px 8px" }}>{t.type}</td><td style={{ border: "1px solid #000", padding: "3px 8px" }}>{t.truck_number}</td></tr>)}</tbody>
                  </table>
                )}

                <p style={{ marginBottom: 8 }}>Prime Carrier and Subhauler are sometimes collectively referred to herein as the "Parties." The Sub-Work described in Article I shall be performed in accordance with the Subcontract Documents attached hereto as Exhibits A, B, and C.</p>
                <p><strong style={{ textDecoration: "underline" }}>ARTICLE I: SCOPE OF SUB-WORK</strong><br />Subhauler agrees to furnish all labor, materials, equipment, property insurance, casualty insurance, and liability insurance, and/or other facilities required to complete the Sub-Work described in Exhibit A.</p>
                <p><strong style={{ textDecoration: "underline" }}>ARTICLE II: THE "SUB-CONTRACT SUM"</strong><br />Prime Carrier agrees to pay Subhauler for the strict performance of the Sub-Work in accordance with the General Terms and Conditions set forth in Exhibit B.</p>
                <p><strong style={{ textDecoration: "underline" }}>ARTICLE III: TIME OF PERFORMANCE</strong><br />
                  DATE OF COMMENCEMENT: {a.commencement_day} of {a.commencement_month} 20{a.commencement_year}.<br />
                  SUBSTANTIAL COMPLETION: {a.completion_day} of {a.completion_month} 20{a.completion_year}.
                </p>
                {a.general_contractor && (
                  <p><strong style={{ textDecoration: "underline" }}>ARTICLE IV: THE SERVICE AGREEMENT</strong><br />
                    Subhauler is made aware that Prime Carrier has entered into a Service Agreement with General Contractor <strong>{a.general_contractor}</strong> for the project <strong>{a.project_name || ""}</strong>.
                  </p>
                )}
              </div>

              {/* Signature section */}
              <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 24 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>Your Signature</h3>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
                  By signing below you agree to the Subhauler Agreement with Ronyx Logistics, LLC.
                </p>

                {/* Ronyx already signed */}
                {a.prime_carrier_sig && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Prime Carrier (Ronyx) — Already Signed</div>
                    <img src={a.prime_carrier_sig} alt="Ronyx signature" style={{ height: 60, border: "1px solid #e2e8f0", borderRadius: 6, padding: 4 }} />
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>✓ Signed by {a.prime_carrier_signed_by} on {new Date(a.prime_carrier_signed_at).toLocaleDateString()}</div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Printed Name *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                    style={{ width: 280, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Owner, Operations Manager"
                    style={{ width: 280, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
                </div>

                <SignatureCanvas onSave={setSig} onClear={() => setSig(null)} />

                {sig && (
                  <div style={{ marginTop: 12, padding: "8px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 12, color: "#166534", fontWeight: 700, display: "inline-block" }}>
                    ✓ Signature ready
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <button onClick={submit} disabled={submitting || !sig || !name}
                    style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: sig && name ? "#0f172a" : "#94a3b8", color: "#fff", fontSize: 15, fontWeight: 800, cursor: sig && name ? "pointer" : "not-allowed" }}>
                    {submitting ? "Submitting…" : "Sign & Submit Agreement"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>
                  By clicking Sign & Submit you are providing an electronic signature with legal binding effect. Date: {new Date().toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#94a3b8" }}>
          Ronyx Logistics, LLC · {PRIME.address} · {PRIME.email} · {PRIME.phone}
        </div>
      </div>
    </div>
  );
}
