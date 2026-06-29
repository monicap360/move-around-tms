"use client";

// Driver Pay — each driver's own weekly pay card with the tickets that make up their pay.
// Pay weeks run Saturday → Friday (pay day = Friday). Data comes from aggregate_tickets
// (the agg portion) via /api/ronyx/payroll/from-tickets.

import { useEffect, useMemo, useState } from "react";

type Ticket = { ticket_number: string | null; ticket_date: string | null; truck_number: string | null; material: string | null; quantity: number; rate: number; amount: number; bill: number };
type Driver = { driver_id: string | null; driver_name: string; trucks: string[]; ticket_count: number; total_loads: number; total_pay: number; tickets: Ticket[]; paid?: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtMoney = (n: number) => "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// The pay-day Friday on/after the given date (today if it's Friday).
function upcomingFriday(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + ((5 - x.getDay() + 7) % 7));
  return x;
}

export default function DriverPayPage() {
  const [friday, setFriday] = useState<Date>(() => upcomingFriday(new Date()));
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string>("");

  const start = useMemo(() => { const s = new Date(friday); s.setDate(s.getDate() - 6); return s; }, [friday]); // Saturday
  const periodStart = toISO(start);
  const periodEnd = toISO(friday);

  function load() {
    setLoading(true);
    fetch(`/api/ronyx/payroll/from-tickets?period_start=${periodStart}&period_end=${periodEnd}`)
      .then(r => r.json())
      .then(d => { setDrivers(d.drivers || []); setUnassigned((d.unassigned || []).length); })
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [periodStart, periodEnd]);

  async function markPaid(d: Driver, paid: boolean) {
    await fetch("/api/ronyx/payroll/mark-paid", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_id: d.driver_id, driver_name: d.driver_name, period_start: periodStart, period_end: periodEnd, paid }),
    }).catch(() => {});
    load();
  }

  const totalPay = drivers.reduce((s, d) => s + d.total_pay, 0);
  const shiftWeek = (n: number) => { const x = new Date(friday); x.setDate(x.getDate() + n * 7); setFriday(x); };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>💵 Driver Pay</div>
          <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>Each driver's tickets and pay for the week. Pay day is <strong>Friday</strong>.</div>
        </div>
        <button onClick={() => window.print()} style={ghost}>🖨 Print stubs</button>
      </div>

      {/* Pay-week selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
        <button onClick={() => shiftWeek(-1)} style={navBtn}>◀ Prev</button>
        <div style={{ textAlign: "center", flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pay Week</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{fmtDay(start)} → {fmtDay(friday)}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>Pay Day: Friday {friday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
        <button onClick={() => shiftWeek(1)} style={navBtn}>Next ▶</button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Drivers" value={String(drivers.length)} tone="#334155" />
        <Stat label="Total Payroll" value={fmtMoney(totalPay)} tone="#16a34a" />
        {unassigned > 0 && <Stat label="Tickets w/o driver" value={String(unassigned)} tone="#b45309" />}
      </div>

      {loading ? (
        <div style={card}>Loading driver pay…</div>
      ) : drivers.length === 0 ? (
        <div style={{ ...card, color: "#94a3b8" }}>No driver tickets for this pay week. {unassigned > 0 && `(${unassigned} ticket(s) have no driver assigned — fix them in Fast Scan to include in pay.)`}</div>
      ) : drivers.map((d) => {
        const id = d.driver_id || d.driver_name;
        const isOpen = open === id;
        return (
          <div key={id} style={{ ...card, marginBottom: 14, padding: 0, overflow: "hidden" }} className="pay-stub">
            {/* Driver header — the pay summary */}
            <div onClick={() => setOpen(isOpen ? "" : id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", background: "#f8fafc", borderBottom: isOpen ? "1px solid #e2e8f0" : "none", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{d.driver_name}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>🛻 {d.trucks.length ? d.trucks.join(", ") : "—"} · {d.ticket_count} ticket{d.ticket_count !== 1 ? "s" : ""} · {d.total_loads} load{d.total_loads !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{fmtMoney(d.total_pay)}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{isOpen ? "▲ hide tickets" : "▼ show tickets"}</div>
              </div>
              {d.paid
                ? <button onClick={(e) => { e.stopPropagation(); if (confirm(`Un-pay ${d.driver_name} for this week?`)) markPaid(d, false); }} title="Paid — click to reverse" style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #86efac", background: "#dcfce7", color: "#15803d", fontWeight: 800, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>✓ PAID</button>
                : <button onClick={(e) => { e.stopPropagation(); if (confirm(`Mark ${d.driver_name} PAID for ${fmtMoney(d.total_pay)} (week ending Fri ${periodEnd})? This locks the week.`)) markPaid(d, true); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>Mark Paid</button>}
            </div>

            {/* Ticket detail */}
            {isOpen && (
              <div style={{ padding: "4px 20px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 1fr 60px 70px 80px 36px", gap: 8, padding: "8px 0", fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #f1f5f9" }}>
                  <div>Date</div><div>Ticket #</div><div>Truck</div><div>Material</div><div>Loads</div><div>Rate</div><div>Amount</div><div>✍</div>
                </div>
                {d.tickets.map((t, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 1fr 60px 70px 80px 36px", gap: 8, padding: "8px 0", fontSize: 13, color: "#334155", borderBottom: "1px solid #f8fafc", alignItems: "center" }}>
                    <div>{t.ticket_date ? new Date(t.ticket_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
                    <div style={{ fontWeight: 600 }}>{t.ticket_number || "—"}</div>
                    <div>{t.truck_number || "—"}</div>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.material || "—"}</div>
                    <div>{t.quantity || "—"}</div>
                    <div>{t.rate ? fmtMoney(t.rate) : "—"}</div>
                    <div style={{ fontWeight: 700 }}>{fmtMoney(t.amount)}</div>
                    <div style={{ textAlign: "center" }}>{(t as any).signature ? "✓" : ""}</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, padding: "10px 0 0", fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
                  Week total: <span style={{ color: "#16a34a" }}>{fmtMoney(d.total_pay)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
        Pay totals come from scanned tickets (Fast Scan → agg). A ticket needs a driver and a rate to appear here — set them in Fast Scan if OCR misses them.
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", minWidth: 130 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 };
const ghost: React.CSSProperties = { padding: "9px 15px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const navBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" };
