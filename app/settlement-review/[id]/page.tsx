"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const fmt = (n: number) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SettlementReview() {
  const params = useParams();
  const id = String(params?.id || "");
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/settlement-review/${id}`).then(r => r.json()).then(d => { if (d.error) setErr(d.error); else setS(d); }).catch(() => setErr("Could not load this settlement."));
  }, [id]);

  async function act(action: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/settlement-review/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Something went wrong."); return; }
      setDone(d.message);
    } catch { setErr("Network error — please try again."); }
    finally { setBusy(false); }
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0b1220", color: "#e2e8f0", fontFamily: "Inter, system-ui, sans-serif", display: "flex", justifyContent: "center", padding: "24px 16px" };
  const card: React.CSSProperties = { width: "100%", maxWidth: 440, background: "#fff", color: "#0f172a", borderRadius: 16, padding: "22px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", height: "fit-content" };

  if (err) return <div style={wrap}><div style={card}><div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#dc2626" }}>⚠ {err}</div><div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 6 }}>If you think this is a mistake, contact the office.</div></div></div>;
  if (done) return <div style={wrap}><div style={card}><div style={{ fontSize: "2rem", textAlign: "center" }}>✅</div><div style={{ fontWeight: 900, fontSize: "1.1rem", textAlign: "center", marginTop: 8 }}>{done}</div></div></div>;
  if (!s) return <div style={wrap}><div style={{ ...card, textAlign: "center", color: "#64748b" }}>Loading your settlement…</div></div>;

  const rows: [string, number, boolean][] = [
    ["Gross load revenue", s.gross, false], ["Agreed pay", s.agreed, false],
    ["Fuel deduction", -s.fuel, false], ["Insurance", -s.insurance, false],
    ["Trailer / equipment", -s.trailer, false], ["Advances", -s.advances, false],
    ["Other / chargebacks", -s.other, false], ["Reimbursements", s.reimbursements, false],
  ];

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Settlement Review</div>
        <div style={{ fontWeight: 900, fontSize: "1.25rem", marginTop: 2 }}>{s.company}</div>
        <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{s.period} · {s.loads} loads</div>

        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px", margin: "16px 0", textAlign: "center" }}>
          <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>Net payment</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#15803d" }}>{fmt(s.net)}</div>
        </div>

        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem" }}>
            <span style={{ color: "#475569" }}>{k}</span>
            <span style={{ fontWeight: 700, color: v < 0 ? "#dc2626" : "#0f172a" }}>{v < 0 ? "-" : ""}{fmt(Math.abs(v))}</span>
          </div>
        ))}

        {!disputing ? (
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => act("approve")} disabled={busy} style={{ flex: 1, padding: "13px 0", background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.92rem", cursor: "pointer" }}>✓ Approve</button>
            <button onClick={() => setDisputing(true)} disabled={busy} style={{ flex: 1, padding: "13px 0", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, fontWeight: 800, fontSize: "0.92rem", cursor: "pointer" }}>Dispute</button>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 800, fontSize: "0.85rem", marginBottom: 6 }}>What's the issue?</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Tell the office what looks wrong (e.g. a deduction or a missing load)…" rows={3} style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => act("dispute")} disabled={busy || !reason.trim()} style={{ flex: 1, padding: "12px 0", background: reason.trim() ? "#dc2626" : "#fca5a5", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.9rem", cursor: reason.trim() ? "pointer" : "not-allowed" }}>Send Dispute</button>
              <button onClick={() => setDisputing(false)} disabled={busy} style={{ padding: "12px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>Back</button>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.7rem", marginTop: 16 }}>MoveAround TMS · secure settlement review</div>
      </div>
    </div>
  );
}
