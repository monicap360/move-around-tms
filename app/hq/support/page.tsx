"use client";

import { useEffect, useMemo, useState } from "react";
import HqShell from "../HqShell";

type Ticket = { id: string; name: string | null; email: string; company: string | null; subject: string | null; message: string; category: string; status: string; created_at: string };

const CATC: Record<string, string> = { concern: "#d97706", question: "#2563eb", bug: "#dc2626", billing: "#16a34a" };

export default function HqSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState<Ticket | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/hq/support").then(r => r.status === 401 ? (window.location.href = "/hq/login?next=/hq/support", null) : r.json())
      .then(d => d && setTickets(d.tickets || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function setStatus(t: Ticket, status: string) {
    await fetch("/api/hq/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, status }) });
    setTickets(ts => ts.map(x => x.id === t.id ? { ...x, status } : x)); setOpen(o => o && o.id === t.id ? { ...o, status } : o);
  }

  const shown = useMemo(() => filter === "all" ? tickets : tickets.filter(t => t.status === filter), [tickets, filter]);
  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <HqShell active="support">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🎫 Support</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Concerns, questions, and problems from your site — {openCount} open.</p>
          </div>
          <a href="/support" target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>↗ Public support form</a>
        </div>

        <div style={{ display: "flex", gap: 6, margin: "16px 0", flexWrap: "wrap" }}>
          {["open", "resolved", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ cursor: "pointer", padding: "6px 14px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, textTransform: "capitalize", background: filter === f ? "#0f172a" : "#fff", color: filter === f ? "#fff" : "#475569", border: "1px solid " + (filter === f ? "#0f172a" : "#e2e8f0") }}>{f}</button>
          ))}
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading…</div> : shown.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "40px 20px", textAlign: "center", color: "#64748b" }}>No {filter === "all" ? "" : filter} tickets.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shown.map(t => (
              <div key={t.id} onClick={() => setOpen(t)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ background: (CATC[t.category] || "#64748b") + "1a", color: CATC[t.category] || "#64748b", padding: "3px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 800, textTransform: "capitalize", flexShrink: 0 }}>{t.category}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{t.subject || "(no subject)"}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name || t.email}{t.company ? ` · ${t.company}` : ""} — {t.message}</div>
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: t.status === "open" ? "#d97706" : "#16a34a", flexShrink: 0 }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ background: (CATC[open.category] || "#64748b") + "1a", color: CATC[open.category] || "#64748b", padding: "3px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 800, textTransform: "capitalize" }}>{open.category}</span>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{new Date(open.created_at).toLocaleString()}</span>
            </div>
            <h2 style={{ margin: "8px 0 4px", fontSize: "1.15rem", fontWeight: 900 }}>{open.subject || "(no subject)"}</h2>
            <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 12 }}>
              {open.name || "—"}{open.company ? ` · ${open.company}` : ""} · <a href={`mailto:${open.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{open.email}</a>
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 10, padding: "12px 14px", fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{open.message}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <a href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject || "your message")}`} style={{ background: "#2563eb", color: "#fff", borderRadius: 9, padding: "10px 18px", fontWeight: 800, fontSize: "0.84rem", textDecoration: "none" }}>✉ Reply</a>
              {open.status === "open"
                ? <button onClick={() => setStatus(open, "resolved")} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>✓ Mark resolved</button>
                : <button onClick={() => setStatus(open, "open")} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}>Reopen</button>}
              <button onClick={() => setOpen(null)} style={{ marginLeft: "auto", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </HqShell>
  );
}
