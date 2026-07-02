"use client";

import { useEffect, useMemo, useState } from "react";
import HqShell from "../HqShell";

type Signup = {
  id: string; name: string | null; company: string | null; email: string | null; phone: string | null;
  fleet_size: string | null; role: string | null; referral: string | null;
  founding: boolean; status: string; trial_ends_at: string | null; created_at: string;
};

const STATUSES = ["new", "contacted", "provisioned", "active", "lost"];
const stColor: Record<string, string> = { new: "#2563eb", contacted: "#7c3aed", provisioned: "#d97706", active: "#16a34a", lost: "#dc2626" };

export default function HqSignupsPage() {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  function load() {
    setLoading(true);
    fetch("/api/hq/signups")
      .then(async r => { if (r.status === 401) { window.location.href = "/hq/login?next=/hq/signups"; return null; } return r.json(); })
      .then(d => { if (d) setRows(d.signups || []); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => filter === "all" ? rows : rows.filter(r => r.status === filter), [rows, filter]);
  const kpis = useMemo(() => ({
    total: rows.length,
    news: rows.filter(r => r.status === "new").length,
    founding: rows.filter(r => r.founding).length,
    active: rows.filter(r => r.status === "active").length,
  }), [rows]);

  async function setStatus(s: Signup, status: string) {
    setRows(rs => rs.map(r => r.id === s.id ? { ...r, status } : r));
    const res = await fetch("/api/hq/signups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, status }) });
    if (res.status === 401) { window.location.href = "/hq/login?next=/hq/signups"; return; }
    const j = await res.json(); if (j.error) { flash(`Error: ${j.error}`); load(); }
  }

  const daysLeft = (d: string | null) => { if (!d) return null; return Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000); };
  const cell: React.CSSProperties = { padding: "10px 12px", fontSize: "0.82rem", color: "#334155", verticalAlign: "top" };

  return (
    <HqShell active="signups">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🚀 Signups &amp; Trials</h1>
        <p style={{ margin: "4px 0 18px", color: "#64748b", fontSize: "0.86rem" }}>7-day free-trial signups from movearoundtms.com — work each one from new lead to active customer.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Total Signups", value: kpis.total, color: "#0f172a" },
            { label: "New", value: kpis.news, color: "#2563eb" },
            { label: "Founding 100", value: kpis.founding, color: "#d97706" },
            { label: "Active Customers", value: kpis.active, color: "#16a34a" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, marginTop: 3 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {["all", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ cursor: "pointer", padding: "6px 13px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, textTransform: "capitalize", background: filter === s ? "#0f172a" : "#fff", color: filter === s ? "#fff" : "#475569", border: "1px solid " + (filter === s ? "#0f172a" : "#e2e8f0") }}>{s}</button>
          ))}
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading signups…</div>
          : shown.length === 0 ? <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8" }}>No signups {filter !== "all" ? `in "${filter}"` : "yet"}. New free-trial signups from the site will show up here.</div>
          : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Company / Contact", "Email", "Phone", "Fleet", "Trial ends", "Status"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {shown.map(s => {
                    const dl = daysLeft(s.trial_ends_at);
                    return (
                      <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={cell}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{s.company || "—"}{s.founding && <span style={{ marginLeft: 6, fontSize: "0.6rem", fontWeight: 800, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "1px 6px" }}>★ Founding</span>}</div>
                          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{s.name}{s.role ? ` · ${s.role}` : ""}</div>
                        </td>
                        <td style={cell}>{s.email ? <a href={`mailto:${s.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{s.email}</a> : "—"}</td>
                        <td style={cell}>{s.phone || "—"}</td>
                        <td style={cell}>{s.fleet_size || "—"}</td>
                        <td style={cell}>{s.trial_ends_at ? <span>{s.trial_ends_at}{dl !== null && <span style={{ color: dl < 0 ? "#dc2626" : "#15803d", fontWeight: 700 }}> ({dl < 0 ? `${Math.abs(dl)}d ago` : `${dl}d`})</span>}</span> : "—"}</td>
                        <td style={{ ...cell, minWidth: 150 }}>
                          <select value={s.status} onChange={e => setStatus(s, e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${stColor[s.status] || "#e2e8f0"}`, fontWeight: 800, fontSize: "0.76rem", color: stColor[s.status] || "#475569", background: "#fff", textTransform: "capitalize", cursor: "pointer" }}>
                            {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </HqShell>
  );
}
