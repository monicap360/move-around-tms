"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const fmt = (n: number) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SettlementStatement() {
  const params = useParams();
  const id = String(params?.id || "");
  const [s, setS] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/settlement-review/${id}`).then(r => r.json()).then(d => { if (d.error) setErr(d.error); else setS(d); }).catch(() => setErr("Could not load."));
    fetch(`/api/ronyx/accounting/settlements/lines?settlement_id=${id}`).then(r => r.json()).then(d => setLines(d.lines || [])).catch(() => {});
  }, [id]);

  if (err) return <div style={{ padding: 40, color: "#dc2626", fontFamily: "Inter, sans-serif" }}>⚠ {err}</div>;
  if (!s) return <div style={{ padding: 40, color: "#64748b", fontFamily: "Inter, sans-serif" }}>Loading statement…</div>;

  const deductions = (s.fuel || 0) + (s.insurance || 0) + (s.trailer || 0) + (s.advances || 0) + (s.other || 0);
  const rows: [string, number, boolean][] = [
    ["Gross load revenue", s.gross, false], ["Agreed pay (contract)", s.agreed, false],
    ["Fuel deduction", -s.fuel, true], ["Insurance", -s.insurance, true], ["Trailer / equipment", -s.trailer, true],
    ["Advances", -s.advances, true], ["Other / chargebacks", -s.other, true], ["Reimbursements", s.reimbursements, false],
  ];

  return (
    <div style={{ background: "#e8eef5", minHeight: "100vh", padding: "24px 16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .sheet { box-shadow: none !important; margin: 0 !important; } } @page { margin: 16mm; }`}</style>

      <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 14px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => history.back()} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 16px", fontWeight: 700, cursor: "pointer", color: "#475569" }}>← Back</button>
        <button onClick={() => window.print()} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 800, cursor: "pointer" }}>🖨 Print / Save PDF</button>
      </div>

      <div className="sheet" style={{ maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "40px 48px", color: "#0f172a" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #0f172a", paddingBottom: 18, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/ronyx_logo.png" alt="Ronyx Logistics" style={{ height: 64, width: "auto" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "0.04em" }}>RONYX LOGISTICS LLC</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>3741 Graves Ave, Groves, TX 77619</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>info@ronyxlogistics.llc</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1e3a8a" }}>SETTLEMENT STATEMENT</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Period: <strong>{s.period}</strong></div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Status: <strong>{s.approval_status || "draft"}</strong></div>
          </div>
        </div>

        {/* Pay to */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pay to — Owner Operator</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 3 }}>{s.company}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{s.loads} loads · {lines.length} ticket{lines.length === 1 ? "" : "s"}</div>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 20px", textAlign: "right" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>Net Settlement</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#15803d" }}>{fmt(s.net)}</div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Settlement Breakdown</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem", marginBottom: 24 }}>
          <tbody>
            {rows.map(([k, v, ded]) => (
              <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 0", color: "#475569" }}>{k}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: ded && v < 0 ? "#dc2626" : "#0f172a" }}>{v < 0 ? "-" : ""}{fmt(Math.abs(v))}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #0f172a" }}>
              <td style={{ padding: "10px 0", fontWeight: 900 }}>NET SETTLEMENT</td>
              <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 900, color: "#15803d", fontSize: "1.05rem" }}>{fmt(s.net)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tickets */}
        {lines.length > 0 && (<>
          <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Tickets Included</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginBottom: 24 }}>
            <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Ticket #", "Date", "Customer", "Truck", "Driver", "Qty", "Rate", "Amount"].map(h => <th key={h} style={{ padding: "7px 8px", textAlign: h === "Amount" ? "right" : "left", color: "#64748b", fontWeight: 700 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "7px 8px", fontWeight: 700, color: "#4338ca" }}>{l.ticket}</td>
                  <td style={{ padding: "7px 8px" }}>{l.date || "—"}</td>
                  <td style={{ padding: "7px 8px" }}>{l.customer || "—"}</td>
                  <td style={{ padding: "7px 8px" }}>{l.truck || "—"}</td>
                  <td style={{ padding: "7px 8px" }}>{l.driver || "—"}</td>
                  <td style={{ padding: "7px 8px" }}>{l.qty ? `${l.qty} ${l.unit}` : "—"}</td>
                  <td style={{ padding: "7px 8px" }}>{l.rate ? fmt(l.rate) : "—"}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(l.gross || l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 40, marginTop: 40 }}>
          <div style={{ flex: 1 }}><div style={{ borderTop: "1px solid #94a3b8", paddingTop: 5, fontSize: "0.72rem", color: "#64748b" }}>Owner-Operator signature</div></div>
          <div style={{ flex: 1 }}><div style={{ borderTop: "1px solid #94a3b8", paddingTop: 5, fontSize: "0.72rem", color: "#64748b" }}>Date</div></div>
        </div>
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.68rem", marginTop: 28 }}>Generated by MoveAround TMS · Ronyx Logistics LLC</div>
      </div>
    </div>
  );
}
