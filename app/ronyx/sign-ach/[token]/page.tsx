"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const PRIME = { name: "Ronyx Logistics LLC", address: "3741 Graves Ave, Groves Tx, 77619", email: "ar.ap@ronyxlogistics.llc", phone: "337-930-0840" };

function SignatureCanvas({ onSave, onClear }: { onSave: (url: string) => void; onClear: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  function pos(e: any, c: HTMLCanvasElement) { const r = c.getBoundingClientRect(); const s = e.touches ? e.touches[0] : e; return { x: s.clientX - r.left, y: s.clientY - r.top }; }
  const start = (e: any) => { e.preventDefault(); drawing.current = true; last.current = pos(e, ref.current!); };
  const move  = (e: any) => { if (!drawing.current || !ref.current) return; e.preventDefault(); const ctx = ref.current.getContext("2d")!; const p = pos(e, ref.current); ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke(); last.current = p; };
  const end   = () => { drawing.current = false; };
  return (
    <div>
      <div style={{ border: "2px solid #0f172a", borderRadius: 8, background: "#fff", display: "inline-block", touchAction: "none" }}>
        <canvas ref={ref} width={420} height={100} style={{ display: "block", cursor: "crosshair", borderRadius: 6 }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => ref.current && onSave(ref.current.toDataURL())}
          style={{ padding: "8px 20px", borderRadius: 8, background: "#166534", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Apply Signature</button>
        <button onClick={() => { ref.current?.getContext("2d")?.clearRect(0, 0, 420, 100); onClear(); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}>Clear</button>
      </div>
    </div>
  );
}

export default function SignACHPage() {
  const params  = useParams();
  const token   = params?.token as string;
  const [auth, setAuth]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [sig, setSig]           = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [title, setTitle]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/ronyx/ach-authorizations/sign?token=${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setAuth(d.authorization); })
      .catch(() => setError("Failed to load."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (!sig)  { alert("Please draw your signature."); return; }
    if (!name) { alert("Please enter your name."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ronyx/ach-authorizations/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature: sig, signed_name: name, signed_title: title }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDone(true);
    } catch (err: any) { alert(err.message || "Submission failed."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", color: "#64748b" }}>Loading…</div>;
  if (error)   return <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", color: "#991b1b" }}>Error: {error}</div>;

  if (done) return (
    <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#166534", marginBottom: 8 }}>Signed!</h1>
      <p style={{ color: "#475569" }}>Thank you for agreeing to the ACH payment processing terms with Ronyx Logistics LLC.</p>
      <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 24 }}>{PRIME.email} · {PRIME.phone}</p>
    </div>
  );

  if (!auth) return null;

  if (auth.status === "signed") return (
    <div style={{ textAlign: "center", padding: 80, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#166534" }}>Already signed on {new Date(auth.signed_at).toLocaleDateString()}</div>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f8fafc", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ background: "#0f172a", color: "#fff", borderRadius: "12px 12px 0 0", padding: "18px 28px" }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>Ronyx Logistics LLC</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>ACH Payment Authorization — Please Review & Sign</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "28px 32px" }}>
          {/* Document */}
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.7, marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 900 }}>{PRIME.name}</div>
              <div>3741 Graves Ave,</div>
              <div>Groves Tx, 77619</div>
            </div>
            {auth.company_name && <div style={{ marginBottom: 12 }}>To: <strong>{auth.company_name}</strong></div>}
            <p style={{ marginBottom: 10 }}>Ronyx Logistics LLC is offering ACH payments for your convenience. This option allows us to make secure electronic payments directly to your bank account.</p>
            <p style={{ marginBottom: 10 }}><strong>Please note that a processing fee will apply to each ACH transaction.</strong> Once your payment is processed, funds will be deposited into your bank account the next business day.</p>
            <p style={{ marginBottom: 16 }}>Please sign below to indicate your agreement to the ACH processing terms.</p>
            <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: 16 }} />
            <p style={{ fontWeight: 700, marginBottom: 20 }}>I agree to the ACH processing terms, including the processing fee of $14.99 per transaction.</p>
          </div>

          {/* Signature form */}
          <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 14 }}>Your Signature</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Owner, Accountant"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Draw Signature *</div>
            <SignatureCanvas onSave={setSig} onClear={() => setSig(null)} />
          </div>

          {sig && <div style={{ margin: "10px 0", padding: "6px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, fontSize: 12, color: "#166534", fontWeight: 700, display: "inline-block" }}>✓ Signature ready</div>}

          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Date: <strong>{today}</strong></div>

          <div style={{ marginTop: 20 }}>
            <button onClick={submit} disabled={submitting || !sig || !name}
              style={{ padding: "13px 36px", borderRadius: 10, border: "none", background: sig && name ? "#0f172a" : "#94a3b8", color: "#fff", fontSize: 15, fontWeight: 800, cursor: sig && name ? "pointer" : "not-allowed" }}>
              {submitting ? "Submitting…" : "Sign & Agree"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>By clicking Sign & Agree you are providing an electronic signature acknowledging the $14.99 ACH processing fee per transaction.</p>

          <div style={{ marginTop: 20, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
            <strong>Thank you for your continued business and trust.</strong><br />
            Questions? Contact us at <a href={`mailto:${PRIME.email}`}>{PRIME.email}</a> or {PRIME.phone}.<br />
            Sincerely, Ronyx Logistics LLC
          </div>
        </div>
      </div>
    </div>
  );
}
