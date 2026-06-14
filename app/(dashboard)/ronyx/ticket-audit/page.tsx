"use client";

import { useEffect, useMemo, useState } from "react";

type AuditTicket = {
  id: string;
  ticketNo: string;
  driver: string;
  truck: string;
  customer: string;
  material: string;
  tons: number;
  rate: number;
  total: number;
  ticketDate: string;
  status: string;
  crossCheckStatus: string;
  payrollReady: boolean;
  billingReady: boolean;
  exceptionCount: number;
  weightVariancePct: number;
  proofStatus: string;
  risk: string;
  ticketHealthScore: number;
};

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  Low:      { bg: "#dcfce7", color: "#16a34a" },
  Medium:   { bg: "#fef3c7", color: "#d97706" },
  High:     { bg: "#fee2e2", color: "#dc2626" },
  Critical: { bg: "#fdf2f8", color: "#9d174d" },
};

const CC_COLORS: Record<string, { bg: string; color: string }> = {
  Matched:    { bg: "#dcfce7", color: "#16a34a" },
  Conflict:   { bg: "#fef3c7", color: "#d97706" },
  "No Match": { bg: "#fee2e2", color: "#dc2626" },
  Duplicate:  { bg: "#ede9fe", color: "#7c3aed" },
};

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color, border: `1px solid ${color}22` }}>{text}</span>;
}

type AuditAction = "approve_payroll" | "approve_billing" | "approve_both" | "hold" | "flag";

const ACTION_LABELS: Record<AuditAction, { label: string; color: string; bg: string }> = {
  approve_payroll: { label: "✓ Payroll",   color: "#16a34a", bg: "#f0fdf4" },
  approve_billing: { label: "✓ Billing",   color: "#2563eb", bg: "#eff6ff" },
  approve_both:    { label: "✓ Both",      color: "#16a34a", bg: "#dcfce7" },
  hold:            { label: "⏸ Hold",      color: "#d97706", bg: "#fffbeb" },
  flag:            { label: "⚑ Flag",      color: "#dc2626", bg: "#fee2e2" },
};

export default function TicketAuditPage() {
  const [tickets, setTickets]     = useState<AuditTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<AuditTicket | null>(null);
  const [filter, setFilter]       = useState<"all" | "needs_review" | "conflicts" | "ready">("all");
  const [search, setSearch]       = useState("");
  const [actioned, setActioned]   = useState<Record<string, AuditAction>>({});
  const [flash, setFlash]         = useState("");

  useEffect(() => {
    fetch("/api/ronyx/tickets?limit=500")
      .then(r => r.json())
      .then(d => {
        const rawList = d.tickets || d.data || [];
        const list: AuditTicket[] = rawList.map((t: any) => {
          const tons     = parseFloat(t.tons || t.quantity || t.net_weight || 0);
          const rate     = parseFloat(t.pay_rate || t.bill_rate || t.rate || t.rate_amount || 0);
          const total    = t.total_amount || t.gross_amount || (tons * rate) || 0;
          const varPct   = t.weight_variance_pct != null ? Number(t.weight_variance_pct)
            : t.weight_variance != null ? Number(t.weight_variance)
            : t.variance_pct != null ? Number(t.variance_pct) : 0;
          const hasDriver   = Boolean(t.driver_name);
          const hasTruck    = Boolean(t.truck_number || t.unit_number);
          const confidence  = t.ocr_confidence != null ? Math.round(t.ocr_confidence * 100) : 85;
          const isDuplicate = rawList.filter((x: any) => x.ticket_number === t.ticket_number && x.id !== t.id).length > 0;
          const missing     = (!hasDriver ? 1 : 0) + (!hasTruck ? 1 : 0) + (!tons ? 1 : 0) + (!t.ticket_number ? 1 : 0);
          const drSig       = Boolean(t.driver_signature || t.has_driver_signature || t.driver_signed);
          const cuSig       = Boolean(t.customer_signature || t.has_customer_signature || t.customer_signed);
          const payrollReady = t.payroll_hold === false && ["approved","sent_to_payroll","paid"].includes((t.status||"").toLowerCase());
          const billingReady = t.billing_hold === false && ["approved","sent_to_billing","invoiced"].includes((t.status||"").toLowerCase());
          const crossCheck = ((t.crosscheck_status || t.cross_check || t.match_status || "No Match") as string)
            .toLowerCase() === "matched" ? "Matched"
            : (t.crosscheck_status || t.cross_check || t.match_status || "").toString().toLowerCase() === "conflict" ? "Conflict"
            : (t.crosscheck_status || t.cross_check || t.match_status || "").toString().toLowerCase() === "duplicate" ? "Duplicate"
            : "No Match";
          const excs = [!hasDriver,!hasTruck,Math.abs(varPct)>2,!drSig,!cuSig,isDuplicate,!payrollReady,!billingReady].filter(Boolean).length;
          const health = Math.round(([hasDriver,hasTruck,Math.abs(varPct)<=2,drSig,cuSig,!isDuplicate,payrollReady,billingReady].filter(Boolean).length / 8) * 100);
          const risk = isDuplicate || missing >= 3 ? "Critical" : missing >= 2 || confidence < 50 ? "High" : missing === 1 || confidence < 75 ? "Medium" : "Low";
          return {
            id: t.id,
            ticketNo: t.ticket_number || "—",
            driver: t.driver_name || "Unknown Driver",
            truck: t.truck_number || t.unit_number || "—",
            customer: t.customer_name || t.client_name || "—",
            material: t.material || t.material_type || "—",
            tons, rate, total,
            ticketDate: t.ticket_date || t.created_at?.slice(0,10) || "",
            status: t.status || "pending",
            crossCheckStatus: crossCheck,
            payrollReady, billingReady,
            exceptionCount: excs,
            weightVariancePct: varPct,
            proofStatus: t.proof_status || (!drSig ? "Missing Driver Signature" : !cuSig ? "Missing Customer Signature" : "Complete"),
            risk, ticketHealthScore: health,
          };
        });
        setTickets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function doAction(ticket: AuditTicket, action: AuditAction) {
    setActioned(prev => ({ ...prev, [ticket.id]: action }));
    const msg = action === "approve_both" ? `✓ Approved for payroll & billing — ${ticket.ticketNo}`
      : action === "approve_payroll" ? `✓ Approved for payroll — ${ticket.ticketNo}`
      : action === "approve_billing" ? `✓ Approved for billing — ${ticket.ticketNo}`
      : action === "hold" ? `⏸ Put on hold — ${ticket.ticketNo}`
      : `⚑ Flagged for review — ${ticket.ticketNo}`;
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);

    // Fire to API in background
    fetch(`/api/ronyx/tickets/${ticket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: action === "approve_both" || action === "approve_billing" || action === "approve_payroll"
          ? "approved"
          : action === "hold" ? "needs_review"
          : "needs_review",
        payroll_ready: action === "approve_payroll" || action === "approve_both",
        billing_ready: action === "approve_billing" || action === "approve_both",
      }),
    }).catch(() => {});
  }

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter === "needs_review") list = list.filter(t => t.exceptionCount > 0 || t.crossCheckStatus !== "Matched");
    if (filter === "conflicts")    list = list.filter(t => t.crossCheckStatus === "Conflict" || t.weightVariancePct > 2);
    if (filter === "ready")        list = list.filter(t => t.payrollReady || t.billingReady);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.ticketNo.toLowerCase().includes(q) ||
        t.driver.toLowerCase().includes(q) ||
        t.truck.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filter, search]);

  const stats = useMemo(() => ({
    total:      tickets.length,
    needsReview: tickets.filter(t => t.exceptionCount > 0).length,
    conflicts:  tickets.filter(t => t.crossCheckStatus === "Conflict").length,
    ready:      tickets.filter(t => t.payrollReady && t.billingReady).length,
    actioned:   Object.keys(actioned).length,
  }), [tickets, actioned]);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "28px 32px 24px", borderRadius: 14, marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Ticket Audit</h1>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
              Review and approve tickets for payroll & billing release
            </p>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              ["Total",        stats.total,       "#94a3b8"],
              ["Needs Review", stats.needsReview, "#fbbf24"],
              ["Conflicts",    stats.conflicts,   "#f87171"],
              ["Actioned",     stats.actioned,    "#4ade80"],
            ].map(([l, v, c]) => (
              <div key={String(l)} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: String(c) }}>{v}</div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 600, fontSize: "0.85rem" }}>
          {flash}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "needs_review", "conflicts", "ready"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                background: filter === f ? "#1e40af" : "#f1f5f9", color: filter === f ? "#fff" : "#64748b" }}>
              {f === "all" ? "All" : f === "needs_review" ? "Needs Review" : f === "conflicts" ? "Conflicts" : "Ready"}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by ticket #, driver, truck…"
          style={{ flex: 1, maxWidth: 300, padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", outline: "none" }}
        />
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} tickets</span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No tickets match this filter</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Ticket #","Date","Driver","Truck","Customer","Material","Tons","Rate","Total","Health","CrossCheck","Risk","Proof","Exceptions","Actions"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "0.7rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const acted = actioned[t.id];
                  const riskC = RISK_COLORS[t.risk] || RISK_COLORS.Medium;
                  const ccC   = CC_COLORS[t.crossCheckStatus] || CC_COLORS["No Match"];
                  return (
                    <tr key={t.id} style={{ background: acted ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9", opacity: acted ? 0.75 : 1 }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>
                        <button onClick={() => setSelected(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontWeight: 700, fontSize: "0.78rem", padding: 0 }}>
                          {t.ticketNo}
                        </button>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{t.ticketDate ? new Date(t.ticketDate).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{t.driver}</td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{t.truck}</td>
                      <td style={{ padding: "8px 12px", color: "#475569", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customer}</td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{t.material}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{t.tons.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.rate.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>${t.total.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 36, height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${t.ticketHealthScore}%`, background: t.ticketHealthScore >= 80 ? "#16a34a" : t.ticketHealthScore >= 60 ? "#d97706" : "#dc2626", borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{t.ticketHealthScore}</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px" }}><Badge text={t.crossCheckStatus} {...ccC} /></td>
                      <td style={{ padding: "8px 12px" }}><Badge text={t.risk} {...riskC} /></td>
                      <td style={{ padding: "8px 12px", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b", fontSize: "0.72rem" }}>{t.proofStatus}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        {t.exceptionCount > 0 && <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.78rem" }}>{t.exceptionCount}</span>}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {acted ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a" }}>✓ {ACTION_LABELS[acted]?.label}</span>
                        ) : (
                          <div style={{ display: "flex", gap: 4 }}>
                            {(["approve_both", "hold", "flag"] as AuditAction[]).map(a => {
                              const al = ACTION_LABELS[a];
                              return (
                                <button key={a} onClick={() => doAction(t, a)}
                                  style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${al.color}33`, background: al.bg, color: al.color, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                  {al.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={() => setSelected(null)} />
          <div style={{ position: "relative", width: 480, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>Ticket #{selected.ticketNo}</span>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94a3b8" }}>✕</button>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <Badge text={selected.crossCheckStatus} {...(CC_COLORS[selected.crossCheckStatus] || CC_COLORS["No Match"])} />
                <Badge text={selected.risk} {...(RISK_COLORS[selected.risk] || RISK_COLORS.Medium)} />
                <Badge text={selected.proofStatus} bg="#f1f5f9" color="#475569" />
              </div>
            </div>
            <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Driver",    selected.driver],
                ["Truck",     selected.truck],
                ["Customer",  selected.customer],
                ["Material",  selected.material],
                ["Date",      selected.ticketDate],
                ["Tons",      selected.tons.toFixed(3)],
                ["Rate",      `$${selected.rate.toFixed(2)}`],
                ["Total",     `$${selected.total.toFixed(2)}`],
                ["Wt Var%",   `${selected.weightVariancePct.toFixed(1)}%`],
                ["Health",    `${selected.ticketHealthScore}/100`],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{k}</span>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0" }}>
              {actioned[selected.id] ? (
                <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.9rem" }}>✓ {ACTION_LABELS[actioned[selected.id]]?.label}</div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  {(["approve_payroll", "approve_billing", "approve_both", "hold", "flag"] as AuditAction[]).map(a => {
                    const al = ACTION_LABELS[a];
                    return (
                      <button key={a} onClick={() => { doAction(selected, a); setSelected(null); }}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${al.color}44`, background: al.bg, color: al.color, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                        {al.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
