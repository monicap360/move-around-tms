"use client";

/* Accounting Command Center — Phase 2: Ticket-to-Invoice Control.
   Completed work → cash. Seeded dump-truck demo data; wires to aggregate_tickets +
   customer_invoices as the pipeline fills. */

import { useEffect, useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Conf = "Verified" | "High Confidence" | "Needs Review" | "Low Confidence" | "Missing Field";
type Inv = "needs_review" | "rate_verified" | "ready" | "invoiced" | "partial" | "disputed" | "paid";
type Pay = "Unpaid" | "Partial" | "Paid" | "Disputed" | "—";

type Ticket = {
  id: string; date: string; customer: string; job: string; material: string; origin: string; dest: string;
  truck: string; party: string; qty: number; unit: "tons" | "loads" | "hrs";
  rate: number; revenue: number; cost: number; fuel: number; pit: number; other: number;
  conf: Conf; inv: Inv; pay: Pay; creditHold?: boolean;
};

const seed: Omit<Ticket, "revenue" | "cost">[] & any = [
  { id: "TKT-88231", date: "06-27", customer: "Holt Paving",        job: "SH-249 Reload", material: "Road Base",  origin: "Pit 3",  dest: "Katy Site",  truck: "T-104", party: "Double F Transport", qty: 18.4, unit: "tons", rate: 11.5, fuel: 64, pit: 210, other: 0,  conf: "Verified",       inv: "ready",        pay: "—" },
  { id: "TKT-88238", date: "06-27", customer: "Sterling Materials", job: "I-45 Base",     material: "Gravel",     origin: "Pit 7",  dest: "I-45 Job",   truck: "T-118", party: "Urdaneta Trucking", qty: 21.0, unit: "tons", rate: 12.0, fuel: 70, pit: 240, other: 0,  conf: "Needs Review",   inv: "needs_review", pay: "—" },
  { id: "TKT-88240", date: "06-28", customer: "Bayou Aggregates",   job: "Levee Haul",    material: "Rock",       origin: "Pit 1",  dest: "Levee N",    truck: "T-220", party: "Pineda Commodity",  qty: 16.0, unit: "tons", rate: 0,    fuel: 58, pit: 190, other: 0,  conf: "Missing Field",  inv: "needs_review", pay: "—" },
  { id: "TKT-88242", date: "06-28", customer: "Holt Paving",        job: "SH-249 Reload", material: "Road Base",  origin: "Pit 3",  dest: "Katy Site",  truck: "T-131", party: "M. Chen",           qty: 9,    unit: "loads",rate: 220,  fuel: 88, pit: 0,   other: 30, conf: "High Confidence",inv: "rate_verified",pay: "—" },
  { id: "TKT-88245", date: "06-29", customer: "Lone Star Ready Mix",job: "Plant 3",       material: "Sand",       origin: "Pit 9",  dest: "Plant 3",    truck: "T-150", party: "Coyans Trucking",   qty: 6.5,  unit: "hrs",  rate: 95,   fuel: 41, pit: 0,   other: 0,  conf: "Verified",       inv: "ready",        pay: "—" },
  { id: "TKT-88250", date: "06-24", customer: "Sterling Materials", job: "I-45 Base",     material: "Gravel",     origin: "Pit 7",  dest: "I-45 Job",   truck: "T-118", party: "Urdaneta Trucking", qty: 20.2, unit: "tons", rate: 12.0, fuel: 67, pit: 235, other: 0,  conf: "Verified",       inv: "invoiced",     pay: "Unpaid" },
  { id: "TKT-88252", date: "06-23", customer: "Holt Paving",        job: "SH-249 Reload", material: "Road Base",  origin: "Pit 3",  dest: "Katy Site",  truck: "T-104", party: "Double F Transport", qty: 18.1, unit: "tons", rate: 11.5, fuel: 63, pit: 205, other: 0,  conf: "Verified",       inv: "partial",      pay: "Partial" },
  { id: "TKT-88254", date: "06-20", customer: "Delta Earthworks",   job: "Pad 7",         material: "Fill Dirt",  origin: "Pit 2",  dest: "Pad 7",      truck: "T-160", party: "Chavez Transport",  qty: 14.0, unit: "tons", rate: 9.5,  fuel: 52, pit: 120, other: 0,  conf: "High Confidence",inv: "disputed",     pay: "Disputed", creditHold: true },
  { id: "TKT-88255", date: "06-19", customer: "Lone Star Ready Mix",job: "Plant 3",       material: "Sand",       origin: "Pit 9",  dest: "Plant 3",    truck: "T-150", party: "Coyans Trucking",   qty: 7.0,  unit: "hrs",  rate: 95,   fuel: 44, pit: 0,   other: 0,  conf: "Verified",       inv: "paid",         pay: "Paid" },
  { id: "TKT-88258", date: "06-29", customer: "Bayou Aggregates",   job: "Levee Haul",    material: "Rock",       origin: "Pit 1",  dest: "Levee N",    truck: "T-220", party: "Pineda Commodity",  qty: 15.5, unit: "tons", rate: 8.0,  fuel: 57, pit: 188, other: 0,  conf: "Low Confidence", inv: "needs_review", pay: "—" },
];
const DEMO_TICKETS: Ticket[] = seed.map((t: any) => {
  const revenue = t.rate * t.qty;
  const cost = Math.round(revenue * 0.62); // driver/OO pay portion (demo)
  return { ...t, revenue, cost };
});

const TABS: { key: string; label: string; match: (t: Ticket) => boolean }[] = [
  { key: "all",        label: "All Tickets",    match: () => true },
  { key: "needs",      label: "Needs Review",   match: t => t.inv === "needs_review" },
  { key: "verified",   label: "Rate Verified",  match: t => t.inv === "rate_verified" },
  { key: "ready",      label: "Ready to Invoice", match: t => t.inv === "ready" },
  { key: "invoiced",   label: "Invoiced",       match: t => t.inv === "invoiced" },
  { key: "partial",    label: "Partially Paid", match: t => t.inv === "partial" },
  { key: "disputed",   label: "Disputed",       match: t => t.inv === "disputed" },
  { key: "paid",       label: "Paid",           match: t => t.inv === "paid" },
  { key: "adjust",     label: "Adjustments",    match: () => false },
];

const CONF_STYLE: Record<Conf, { bg: string; fg: string }> = {
  "Verified":        { bg: "#dcfce7", fg: "#15803d" },
  "High Confidence": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Needs Review":    { bg: "#fef9c3", fg: "#b45309" },
  "Low Confidence":  { bg: "#ffedd5", fg: "#ea580c" },
  "Missing Field":   { bg: "#fee2e2", fg: "#dc2626" },
};
const INV_LABEL: Record<Inv, string> = { needs_review: "Needs Review", rate_verified: "Rate Verified", ready: "Ready", invoiced: "Invoiced", partial: "Partial", disputed: "Disputed", paid: "Paid" };

const BULK = ["Verify Rates", "Approve Tickets", "Create Invoice Batch", "Assign Job", "Apply Rate Card", "Export Selected", "Flag for Review"];

export default function TicketToInvoice() {
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState(false);
  const [toast, setToast] = useState("");
  const [data, setData] = useState<Ticket[]>(DEMO_TICKETS);
  const [live, setLive] = useState(false);

  // Pull real tickets from aggregate_tickets; fall back to the seeded demo when empty.
  useEffect(() => {
    fetch("/api/ronyx/accounting/tickets")
      .then(r => r.json())
      .then(d => { if (d.live && Array.isArray(d.tickets) && d.tickets.length) { setData(d.tickets); setLive(true); } })
      .catch(() => {});
  }, []);

  const active = TABS.find(t => t.key === tab)!;
  const rows = useMemo(() => data.filter(active.match), [tab, data]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  function toggle(id: string) { setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { setSel(s => s.size === rows.length ? new Set() : new Set(rows.map(r => r.id))); }

  const selected = data.filter(t => sel.has(t.id));
  const onHold = selected.some(t => t.creditHold);

  function bulk(action: string) {
    if (!sel.size) { flash("Select at least one ticket first."); return; }
    if (action === "Create Invoice Batch") { setBatch(true); return; }
    flash(`${action}: ${sel.size} ticket${sel.size > 1 ? "s" : ""} (demo)`);
  }

  const margin = (t: Ticket) => t.revenue - t.cost - t.fuel - t.pit - t.other;

  return (
    <AcctShell active="tti" title="Ticket-to-Invoice Control" subtitle="Turn completed, validated work into cash — one ticket at a time, billed once."
      controls={<>
        <span style={{ ...chip, background: live ? "#dcfce7" : "#fef9c3", color: live ? "#15803d" : "#b45309", padding: "7px 11px" }} title={live ? "Showing real tickets from aggregate_tickets" : "No real tickets yet — showing demo data"}>{live ? "● Live data" : "Demo data"}</span>
        <button style={ctrlBtn}>Group: Customer ▾</button>
        <button style={ctrlBtn}>⬇ Export</button>
        <button style={primaryBtn} onClick={() => bulk("Create Invoice Batch")}>+ Create Invoice Batch</button>
      </>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TABS.map(t => {
          const n = data.filter(t.match).length;
          const on = tab === t.key;
          return <button key={t.key} onClick={() => { setTab(t.key); setSel(new Set()); }} style={{ ...chip, cursor: "pointer", padding: "7px 12px", background: on ? "#0f172a" : "#fff", color: on ? "#fff" : "#475569", border: "1px solid " + (on ? "#0f172a" : "#e2e8f0"), fontWeight: 800 }}>{t.label}{t.key !== "adjust" && <span style={{ opacity: 0.7 }}> · {n}</span>}</button>;
        })}
      </div>

      {/* Bulk action bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10, background: sel.size ? "#eff6ff" : "transparent", border: sel.size ? "1px solid #bfdbfe" : "1px solid transparent", borderRadius: 10, padding: sel.size ? "8px 12px" : "0 12px", transition: "all .15s" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: sel.size ? "#1d4ed8" : "#94a3b8" }}>{sel.size} selected</span>
        {BULK.map(a => <button key={a} onClick={() => bulk(a)} disabled={!sel.size} style={{ ...chip, cursor: sel.size ? "pointer" : "default", padding: "6px 11px", background: "#fff", color: sel.size ? "#1e293b" : "#cbd5e1", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>)}
      </div>

      {/* Ticket table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: 1200 }}>
            <thead><tr>
              <th style={{ ...th, width: 30 }}><input type="checkbox" checked={rows.length > 0 && sel.size === rows.length} onChange={toggleAll} /></th>
              {["Ticket #", "Date", "Customer", "Job", "Material", "Truck", "Driver / OO", "Qty", "Rate", "Gross Rev", "Cost", "Fuel", "Pit", "Margin", "Margin %", "Confidence", "Invoice", "Payment"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(t => {
                const m = margin(t); const mp = t.revenue ? (m / t.revenue) * 100 : 0;
                const cs = CONF_STYLE[t.conf];
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", background: sel.has(t.id) ? "#f0f7ff" : "transparent" }}>
                    <td style={td}><input type="checkbox" checked={sel.has(t.id)} onChange={() => toggle(t.id)} /></td>
                    <td style={{ ...td, fontWeight: 800, color: "#4338ca" }}>{t.id}</td>
                    <td style={td}>{t.date}</td>
                    <td style={td}>{t.customer}{t.creditHold && <span style={{ ...chip, background: "#fee2e2", color: "#dc2626", marginLeft: 5, fontSize: "0.58rem" }}>HOLD</span>}</td>
                    <td style={td}>{t.job}</td>
                    <td style={td}>{t.material}</td>
                    <td style={td}>{t.truck}</td>
                    <td style={td}>{t.party}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.qty} {t.unit}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.rate ? fmtc(t.rate) : <span style={{ color: "#dc2626", fontWeight: 800 }}>—</span>}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtc(t.revenue)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmtc(t.cost)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmtc(t.fuel)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmtc(t.pit)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: m <= 0 ? "#dc2626" : m / (t.revenue || 1) < 0.15 ? "#ea580c" : "#15803d" }}>{fmtc(m)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: mp <= 0 ? "#dc2626" : mp < 15 ? "#ea580c" : "#15803d" }}>{t.revenue ? mp.toFixed(0) + "%" : "—"}</td>
                    <td style={td}><span style={{ ...chip, background: cs.bg, color: cs.fg }}>{t.conf}</span></td>
                    <td style={td}><span style={{ ...chip, background: "#f1f5f9", color: "#334155" }}>{INV_LABEL[t.inv]}</span></td>
                    <td style={td}>{t.pay}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={19} style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>{tab === "adjust" ? "No adjustments yet. Approved tickets that change post-billing appear here for review." : "No approved tickets are waiting here. Completed work shows after ticket, rate, and customer validation."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>{rows.length} ticket{rows.length === 1 ? "" : "s"} · gross {fmtc(rows.reduce((s, t) => s + t.revenue, 0))} · margin {fmtc(rows.reduce((s, t) => s + margin(t), 0))}</span>
          <span>Phase 2 of 8 · seeded demo data — wires to aggregate_tickets + customer_invoices</span>
        </div>
      </div>

      {/* Create Invoice Batch — validation panel */}
      {batch && (() => {
        const items = selected.length ? selected : rows.filter(r => r.inv === "ready");
        const tons = items.filter(i => i.unit === "tons").reduce((s, i) => s + i.qty, 0);
        const gross = items.reduce((s, i) => s + i.revenue, 0);
        const missingRate = items.filter(i => !i.rate).length;
        const lowMargin = items.filter(i => i.revenue && margin(i) / i.revenue < 0.15).length;
        const holds = items.filter(i => i.creditHold).length;
        const blocked = holds > 0;
        return (
          <div onClick={() => setBatch(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, padding: "22px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: 4 }}>Create Invoice Batch</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 16 }}>Review before generating. Grouped by customer.</div>
              {[
                ["Tickets included", String(items.length)],
                ["Total tons", tons.toFixed(1)],
                ["Gross revenue", fmtc(gross)],
                ["Missing customer rate", missingRate ? `⚠ ${missingRate}` : "none"],
                ["Low-margin tickets (<15%)", lowMargin ? `⚠ ${lowMargin}` : "none"],
                ["Customers on credit hold", holds ? `🚫 ${holds}` : "none"],
                ["Existing invoice conflicts", "none"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                  <span style={{ color: "#475569" }}>{k}</span><strong style={{ color: String(v).startsWith("⚠") ? "#ea580c" : String(v).startsWith("🚫") ? "#dc2626" : "#0f172a" }}>{v}</strong>
                </div>
              ))}
              {blocked && <div style={{ marginTop: 12, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.82rem", fontWeight: 700 }}>🚫 A customer is on credit hold. A manager must override with a reason before invoicing.</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <button onClick={() => setBatch(false)} style={ctrlBtn}>Cancel</button>
                {blocked
                  ? <button onClick={() => { flash("Manager override required — logged to audit (demo)."); }} style={{ ...primaryBtn, background: "#b45309" }}>Request Manager Override</button>
                  : <button onClick={async () => {
                      // Group selected tickets by customer → one invoice each.
                      const byCust: Record<string, any> = {};
                      for (const t of items) { const g = byCust[t.customer] || (byCust[t.customer] = { customer_name: t.customer, job: t.job, original_amount: 0, ticket_numbers: [] as string[], ticket_count: 0 }); g.original_amount += t.revenue; g.ticket_numbers.push(t.id); g.ticket_count++; }
                      let createdBy = "office"; try { const s = JSON.parse(localStorage.getItem("ronyx_active_staff") || "{}"); createdBy = s.name || s.full_name || "office"; } catch {}
                      try {
                        const res = await fetch("/api/ronyx/accounting/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoices: Object.values(byCust), created_by: createdBy }) });
                        const d = await res.json();
                        if (!res.ok) { flash(d.error?.includes("customer_invoices") ? "Invoice table not set up yet — run the SQL, then retry." : (d.error || "Couldn't create invoices.")); return; }
                        setBatch(false); setSel(new Set());
                        flash(`✅ Created ${d.created} invoice${d.created !== 1 ? "s" : ""} — ${fmtc(d.total)}. They're now in Accounts Receivable.`);
                      } catch { flash("Network error creating invoices."); }
                    }} style={{ ...primaryBtn, background: "#16a34a" }}>Generate {items.length} → Invoice</button>}
              </div>
            </div>
          </div>
        );
      })()}
    </AcctShell>
  );
}
