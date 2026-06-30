"use client";

/* Accounting Command Center — Phase 4b: Owner-Operator Settlement Center (contractors).
   Seeded demo data; wires to owner_operator_settlements + owner_operator_settlement_lines. */

import { useEffect, useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";
import { safePrompt } from "@/lib/safePrompt";

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
const ACTIONS = ["Generate Settlement", "Review Tickets", "Add Deduction", "Add Reimbursement", "Approve Settlement", "Print Statement", "Send Statement", "Export Payment File", "Place on Hold", "Create Adjustment"];

export default function Settlements() {
  const [drawer, setDrawer] = useState<Settle | null>(null);
  const [toast, setToast] = useState("");
  const [data, setData] = useState<typeof DEMO>([]);
  const [live, setLive] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  function loadSettlements(focusId?: string) {
    fetch("/api/ronyx/accounting/settlements").then(r => r.json()).then(d => {
      if (d.live && Array.isArray(d.items) && d.items.length) {
        setData(d.items); setLive(true);
        if (focusId) { const u = d.items.find((x: any) => x.reviewId === focusId); if (u) setDrawer(u); }
      }
    }).catch(() => {});
  }
  useEffect(() => { loadSettlements(); }, []);

  async function doAction(a: string) {
    if (!drawer) return;
    const id = (drawer as any).reviewId;
    if (a === "Review Tickets") { document.getElementById("settle-tickets")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const send = async (body: any) => { const r = await fetch("/api/ronyx/accounting/settlements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); return r.ok ? r.json() : null; };
    if (a === "Approve Settlement") { if (drawer.blocks.length) { flash("🚫 Resolve the compliance blocks first."); return; } const d = await send({ action: "approve" }); if (d) { flash("✓ Settlement approved."); loadSettlements(id); } else flash("Couldn't approve."); return; }
    if (a === "Place on Hold")    { const d = await send({ action: "hold" }); if (d) { flash("Settlement placed on hold."); loadSettlements(id); } return; }
    if (a === "Add Deduction" || a === "Add Reimbursement") {
      const amt = safePrompt(`${a} — amount ($):`); if (amt === null) return;
      const n = Number(String(amt).replace(/[^0-9.]/g, "")); if (!n || n <= 0) { flash("Enter a valid amount."); return; }
      const d = await send({ action: a === "Add Deduction" ? "deduction" : "reimbursement", amount: n });
      if (d) { flash(`${a}: ${fmtc(n)} — new net ${fmtc(d.net)}.`); loadSettlements(id); } else flash("Couldn't save.");
      return;
    }
    if (a === "Generate Settlement") {
      const d = await send({ action: "regenerate" });
      if (d) { flash(`Settlement regenerated from tickets — net ${fmtc(d.net)}.`); loadSettlements(id); } else flash("Couldn't regenerate.");
      return;
    }
    if (a === "Print Statement") {
      window.open(`/ronyx/accounting-command-center/settlements/${id}/statement`, "_blank");
      return;
    }
    if (a === "Send Statement") {
      flash("Sending statement…");
      const r = await fetch("/api/ronyx/accounting/settlements/send-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settlement_id: id }) });
      const d = await r.json().catch(() => ({}));
      if (d.ok) flash(`✉ Statement emailed to ${d.to}.`);
      else if (d.simulated) flash("Email isn't turned on yet — add the Proton SMTP token, then it sends.");
      else flash(`Couldn't send — ${d.error || "no email on file"}.`);
      return;
    }
    if (a === "Export Payment File") {
      const rows = [["Account #", "Owner Operator", "Period", "Loads", "Gross", "Deductions", "Net Settlement"],
        [(drawer as any).acct || "", drawer.oo, drawer.period, String(drawer.loads), drawer.gross.toFixed(2), (drawer.fuel + drawer.ins + drawer.trailer + drawer.advance + drawer.other).toFixed(2), net(drawer).toFixed(2)]];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a"); link.href = url; link.download = `settlement-${drawer.oo.replace(/\W+/g, "-")}-${drawer.period.replace(/\W+/g, "-")}.csv`; link.click();
      flash("Payment file exported (CSV).");
      return;
    }
    if (a === "Create Adjustment") {
      const amt = safePrompt("Adjustment amount ($) — positive deducts, negative credits:"); if (amt === null) return;
      const n = Number(String(amt).replace(/[^0-9.\-]/g, "")); if (!n) { flash("Enter a valid amount."); return; }
      const d = await send({ action: "adjustment", amount: n });
      if (d) { flash(`Adjustment ${fmtc(n)} applied — new net ${fmtc(d.net)}.`); loadSettlements(id); } else flash("Couldn't apply.");
      return;
    }
    flash(`${a} — ${drawer.oo}`);
  }

  // Load the ticket line-items when a settlement drawer opens.
  useEffect(() => {
    const id = (drawer as any)?.reviewId;
    if (id) fetch(`/api/ronyx/accounting/settlements/lines?settlement_id=${id}`).then(r => r.json()).then(d => setLines(d.lines || [])).catch(() => setLines([]));
    else setLines([]);
  }, [drawer]);

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
          <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "97vw", maxWidth: 1280, height: "95vh", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <button onClick={() => setDrawer(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", color: "#0f172a" }}>← Back</button>
                  <div><div style={{ fontWeight: 900, fontSize: "1.3rem" }}>{drawer.oo}</div><div style={{ fontSize: "0.82rem", color: "#64748b" }}>{drawer.company} · {drawer.period} · {drawer.loads} loads</div></div>
                </div>
                <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
              </div>

              {/* Two columns: breakdown + actions | tickets */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(330px, 400px) 1fr", flex: 1, overflow: "hidden" }}>
                {/* LEFT — breakdown + actions */}
                <div style={{ overflowY: "auto", padding: "18px 22px", borderRight: "1px solid #e2e8f0", background: "#fafbfc" }}>
                  {blocked && <div style={{ marginBottom: 14, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.82rem", fontWeight: 700 }}>🚫 Cannot approve until resolved:<ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{drawer.blocks.map(b => <li key={b}>{b}</li>)}</ul></div>}
                  <div style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Settlement breakdown</div>
                  {[["Gross load revenue", fmtc(drawer.gross)], ["Agreed pay", fmtc(drawer.agreed)], ["Fuel deduction", "-" + fmtc(drawer.fuel)], ["Insurance", "-" + fmtc(drawer.ins)], ["Trailer/equipment", "-" + fmtc(drawer.trailer)], ["Advances", "-" + fmtc(drawer.advance)], ["Other/chargebacks", "-" + fmtc(drawer.other)], ["Reimbursements", "+" + fmtc(drawer.reimb)], ["Net settlement", fmtc(net(drawer))]].map(([k, v], i) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", fontWeight: i === 8 ? 900 : 500 }}><span style={{ color: i === 8 ? "#0f172a" : "#475569" }}>{k}</span><span style={{ color: i === 8 ? "#15803d" : "inherit" }}>{v}</span></div>
                  ))}
                  {drawer.reviewId && (
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button onClick={() => {
                        const link = `${window.location.origin}/settlement-review/${drawer.reviewId}`;
                        navigator.clipboard?.writeText(link).then(() => flash("Driver review link copied — text it to the driver.")).catch(() => flash(link));
                      }} style={{ flex: 1, padding: "11px 0", background: "#fff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 10, fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>📱 Copy Link</button>
                      <button onClick={() => doAction("Print Statement")} style={{ flex: 1, padding: "11px 0", background: "#0f172a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>📄 Statement</button>
                      <button onClick={() => doAction("Send Statement")} style={{ flex: 1, padding: "11px 0", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>📧 Email</button>
                    </div>
                  )}
                  <div style={{ margin: "18px 0 6px", fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Actions</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ACTIONS.map(a => <button key={a} disabled={blocked && a.includes("Approve")} onClick={() => doAction(a)} style={{ ...chip, cursor: blocked && a.includes("Approve") ? "not-allowed" : "pointer", opacity: blocked && a.includes("Approve") ? 0.4 : 1, padding: "7px 11px", background: a.includes("Approve") ? "#16a34a" : a.includes("Hold") ? "#fef2f2" : a === "Review Tickets" ? "#eff6ff" : "#f8fafc", color: a.includes("Approve") ? "#fff" : a.includes("Hold") ? "#dc2626" : a === "Review Tickets" ? "#1d4ed8" : "#1e293b", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>)}
                  </div>
                </div>

                {/* RIGHT — tickets (the main view) */}
                <div id="settle-tickets" style={{ overflowY: "auto", padding: "18px 24px" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>🎫 Tickets in this settlement{lines.length > 0 ? ` (${lines.length})` : ""}</div>
                  {lines.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>No ticket detail recorded for this settlement.</div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                        {lines.map((l, i) => (
                          <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                              <span style={{ fontWeight: 800, color: "#4338ca", fontSize: "0.9rem" }}>🎫 {l.ticket}{l.date ? <span style={{ color: "#94a3b8", fontWeight: 600 }}> · {l.date}</span> : ""}</span>
                              <span style={{ fontWeight: 900, color: "#15803d", fontSize: "1rem" }}>{fmtc(l.gross || l.amount)}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px", padding: "12px 14px", fontSize: "0.8rem" }}>
                              {[
                                ["Customer", l.customer || "—"], ["Material", l.material || "—"],
                                ["Truck", l.truck || "—"], ["Driver", l.driver || "—"],
                                ["Quantity", l.qty ? `${l.qty} ${l.unit}` : "—"], ["Rate", l.rate ? `${fmtc(l.rate)}/${l.unit}` : "—"],
                              ].map(([k, v]) => (
                                <div key={k as string} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                  <span style={{ color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700 }}>{k}</span><span style={{ fontWeight: 700, color: "#0f172a" }}>{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, fontSize: "0.9rem", fontWeight: 900, background: "#0f172a", color: "#fff", marginTop: 12 }}>
                        <span>Total ticket revenue ({lines.length})</span><span>{fmtc(lines.reduce((s, l) => s + (l.gross || l.amount), 0))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AcctShell>
  );
}
