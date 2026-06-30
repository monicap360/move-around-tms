"use client";

/* Accounting Command Center — Phase 4b: Owner-Operator Settlement Center (contractors).
   Seeded demo data; wires to owner_operator_settlements + owner_operator_settlement_lines. */

import { useEffect, useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Appr = "Draft" | "Awaiting Approval" | "Approved" | "Paid";
type Settle = {
  id: string; oo: string; company: string; period: string; loads: number;
  gross: number; agreed: number; fuel: number; ins: number; trailer: number; advance: number; other: number; reimb: number;
  appr: Appr; paid: boolean; blocks: string[]; settleHold?: boolean; reviewId?: string;
};

const DEMO: Settle[] = [
  { id: "STL-0613", oo: "Indy Dump LLC.",          company: "Indy Dump LLC.",          period: "Wk 26", loads: 58, gross: 12400, agreed: 9920, fuel: 1180, ins: 240, trailer: 150, advance: 0,   other: 0,  reimb: 0,  appr: "Awaiting Approval", paid: false, blocks: [] },
  { id: "STL-0614", oo: "Double F Transport",      company: "Double F Transport",      period: "Wk 26", loads: 71, gross: 15630, agreed: 12504,fuel: 1420, ins: 0,   trailer: 0,   advance: 500, other: 0,  reimb: 60, appr: "Draft",             paid: false, blocks: [] },
  { id: "STL-0611", oo: "Pineda Commodity",        company: "Pineda Commodity",        period: "Wk 26", loads: 22, gross: 4180,  agreed: 3344, fuel: 412,  ins: 0,   trailer: 0,   advance: 0,   other: 350,reimb: 0,  appr: "Draft",             paid: false, blocks: ["Owner-op deduction over limit"], settleHold: true },
  { id: "STL-0609", oo: "Urdaneta Trucking",       company: "Urdaneta Trucking LLC",   period: "Wk 26", loads: 19, gross: 4560,  agreed: 3648, fuel: 360,  ins: 0,   trailer: 0,   advance: 0,   other: 0,  reimb: 0,  appr: "Draft",             paid: false, blocks: ["Expired insurance", "Missing W-9"] },
  { id: "STL-0605", oo: "Coyans Trucking",         company: "Coyans Trucking LLC",     period: "Wk 26", loads: 14, gross: 2660,  agreed: 2128, fuel: 240,  ins: 0,   trailer: 0,   advance: 0,   other: 0,  reimb: 0,  appr: "Approved",          paid: false, blocks: [] },
  { id: "STL-0598", oo: "Chavez Transport",        company: "Chavez Transports",       period: "Wk 25", loads: 26, gross: 4940,  agreed: 3952, fuel: 470,  ins: 0,   trailer: 0,   advance: 0,   other: 0,  reimb: 0,  appr: "Paid",              paid: true,  blocks: [] },
];
const net = (s: Settle) => s.agreed - s.fuel - s.ins - s.trailer - s.advance - s.other + s.reimb;

const APPR_STYLE: Record<Appr, { bg: string; fg: string }> = {
  Draft: { bg: "#f1f5f9", fg: "#475569" }, "Awaiting Approval": { bg: "#fef9c3", fg: "#b45309" }, Approved: { bg: "#dcfce7", fg: "#15803d" }, Paid: { bg: "#dbeafe", fg: "#1d4ed8" },
};
const ACTIONS = ["Generate Settlement", "Review Tickets", "Add Deduction", "Add Reimbursement", "Approve Settlement", "Send Statement", "Export Payment File", "Place on Hold", "Create Adjustment"];

export default function Settlements() {
  const [drawer, setDrawer] = useState<Settle | null>(null);
  const [toast, setToast] = useState("");
  const [data, setData] = useState<typeof DEMO>([]);
  const [live, setLive] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    fetch("/api/ronyx/accounting/settlements").then(r => r.json()).then(d => {
      if (d.live && Array.isArray(d.items) && d.items.length) { setData(d.items); setLive(true); }
    }).catch(() => {});
  }, []);

  const cards = useMemo(() => {
    const curPeriod = data[0]?.period;
    const cur = data.filter(s => s.period === curPeriod);
    return [
      { label: "Gross Payable",     v: fmt(cur.reduce((s, x) => s + x.agreed, 0)), tone: "#0f172a" },
      { label: "Fuel Deductions",   v: fmt(cur.reduce((s, x) => s + x.fuel, 0)), tone: "#b45309" },
      { label: "Insurance Deduct.", v: fmt(cur.reduce((s, x) => s + x.ins, 0)), tone: "#7c3aed" },
      { label: "Trailer/Equip.",    v: fmt(cur.reduce((s, x) => s + x.trailer, 0)), tone: "#0e7490" },
      { label: "Advances",          v: fmt(cur.reduce((s, x) => s + x.advance, 0)), tone: "#ea580c" },
      { label: "Chargebacks/Other", v: fmt(cur.reduce((s, x) => s + x.other, 0)), tone: "#dc2626" },
      { label: "Net Settlements",   v: fmt(cur.reduce((s, x) => s + net(x), 0)), tone: "#15803d" },
      { label: "Awaiting Approval", v: String(cur.filter(s => s.appr === "Awaiting Approval").length), tone: "#1d4ed8" },
    ];
  }, [data]);

  return (
    <AcctShell active="settlements" title="Owner Operator Settlement Center" subtitle="Settle contractors off their tickets, with deductions and compliance enforced."
      controls={<><span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: live ? "#dcfce7" : "#f1f5f9", color: live ? "#15803d" : "#94a3b8", alignSelf: "center" }}>{live ? "● Live data" : "No data yet"}</span><button style={ctrlBtn}>Wk 26 ▾</button><button style={ctrlBtn}>⬇ Export Payment File</button><button style={primaryBtn}>+ Generate Settlements</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {cards.map(c => <div key={c.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{c.label}</div><div style={{ fontSize: "1.3rem", fontWeight: 900, color: c.tone, marginTop: 4 }}>{c.v}</div></div>)}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: 1250 }}>
            <thead><tr>{["Owner Operator", "Period", "Loads", "Gross Rev", "Agreed Pay", "Fuel", "Insurance", "Trailer", "Advances", "Other", "Net", "Compliance", "Approval", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.map(s => {
                const ap = APPR_STYLE[s.appr]; const blocked = s.blocks.length > 0;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9", background: blocked ? "#fffafa" : "transparent" }}>
                    <td style={{ ...td, fontWeight: 800 }}>{s.oo}</td>
                    <td style={td}>{s.period}</td>
                    <td style={{ ...td, textAlign: "right" }}>{s.loads}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtc(s.gross)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtc(s.agreed)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#b45309" }}>-{fmtc(s.fuel)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#7c3aed" }}>{s.ins ? "-" + fmtc(s.ins) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#0e7490" }}>{s.trailer ? "-" + fmtc(s.trailer) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#ea580c" }}>{s.advance ? "-" + fmtc(s.advance) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#dc2626" }}>{s.other ? "-" + fmtc(s.other) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900, color: "#15803d" }}>{fmtc(net(s))}</td>
                    <td style={td}>{blocked ? <span style={{ ...chip, background: "#fee2e2", color: "#dc2626" }} title={s.blocks.join("; ")}>🚫 {s.blocks.length} block{s.blocks.length > 1 ? "s" : ""}</span> : <span style={{ ...chip, background: "#dcfce7", color: "#15803d" }}>✓ Clear</span>}</td>
                    <td style={td}><span style={{ ...chip, background: ap.bg, color: ap.fg }}>{s.appr}</span></td>
                    <td style={td}><button onClick={() => setDrawer(s)} style={{ ...chip, cursor: "pointer", background: "#0f172a", color: "#fff" }}>Review ▸</button></td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr><td colSpan={14} style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No settlements yet — generate them from approved owner-operator tickets.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 4 of 8 · seeded demo data · settlements blocked by expired insurance / missing W-9 / contract / COI / holds</div>
      </div>

      {drawer && (() => {
        const blocked = drawer.blocks.length > 0;
        return (
          <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", padding: "22px 24px", boxShadow: "-10px 0 40px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{drawer.oo}</div><div style={{ fontSize: "0.78rem", color: "#64748b" }}>{drawer.company} · {drawer.period} · {drawer.loads} loads</div></div><button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
              {blocked && <div style={{ marginTop: 14, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.82rem", fontWeight: 700 }}>🚫 Cannot approve until resolved:<ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{drawer.blocks.map(b => <li key={b}>{b}</li>)}</ul></div>}
              <div style={{ margin: "16px 0 6px", fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Settlement breakdown</div>
              {[["Gross load revenue", fmtc(drawer.gross)], ["Agreed pay", fmtc(drawer.agreed)], ["Fuel deduction", "-" + fmtc(drawer.fuel)], ["Insurance", "-" + fmtc(drawer.ins)], ["Trailer/equipment", "-" + fmtc(drawer.trailer)], ["Advances", "-" + fmtc(drawer.advance)], ["Other/chargebacks", "-" + fmtc(drawer.other)], ["Reimbursements", "+" + fmtc(drawer.reimb)], ["Net settlement", fmtc(net(drawer))]].map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", fontWeight: i === 8 ? 900 : 500 }}><span style={{ color: i === 8 ? "#0f172a" : "#475569" }}>{k}</span><span style={{ color: i === 8 ? "#15803d" : "inherit" }}>{v}</span></div>
              ))}
              {drawer.reviewId && (
                <button onClick={() => {
                  const link = `${window.location.origin}/settlement-review/${drawer.reviewId}`;
                  navigator.clipboard?.writeText(link).then(() => flash("Driver review link copied — text it to the driver.")).catch(() => flash(link));
                }} style={{ width: "100%", marginTop: 16, padding: "11px 0", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>📱 Copy Driver Review Link</button>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {ACTIONS.map(a => <button key={a} disabled={blocked && a.includes("Approve")} onClick={() => flash(`${a} — ${drawer.oo} (demo)`)} style={{ ...chip, cursor: blocked && a.includes("Approve") ? "not-allowed" : "pointer", opacity: blocked && a.includes("Approve") ? 0.4 : 1, padding: "7px 11px", background: a.includes("Approve") ? "#16a34a" : a.includes("Hold") ? "#fef2f2" : "#f8fafc", color: a.includes("Approve") ? "#fff" : a.includes("Hold") ? "#dc2626" : "#1e293b", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>)}
              </div>
            </div>
          </div>
        );
      })()}
    </AcctShell>
  );
}
