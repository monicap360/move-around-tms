"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lead = {
  id: string;
  owner_name: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  estimated_value: number | null;
  trucks_count: number | null;
  notes: string | null;
  next_follow_up: string | null;
  last_contact_date: string | null;
  updated_at: string;
};

const STAGES = [
  { key: "new",       label: "New",       color: "#2563eb", bg: "#eff6ff" },
  { key: "contacted", label: "Contacted", color: "#7c3aed", bg: "#f5f3ff" },
  { key: "demo",      label: "Demo",      color: "#0891b2", bg: "#ecfeff" },
  { key: "proposal",  label: "Proposal",  color: "#d97706", bg: "#fffbeb" },
  { key: "won",       label: "Won",       color: "#16a34a", bg: "#f0fdf4" },
  { key: "lost",      label: "Lost",      color: "#dc2626", bg: "#fef2f2" },
] as const;
const stageOf = (k: string) => STAGES.find(s => s.key === k) || STAGES[0];
const money = (n: number | null | undefined) => "$" + Number(n || 0).toLocaleString();

// The sales team — each person's leads are tagged with their name (Owner).
const SALESPEOPLE = ["Andrew", "Laura", "Sylvia", "Veronica", "Monica"];

const BLANK = { owner_name: "", company_name: "", contact_name: "", phone: "", email: "", source: "", stage: "new", estimated_value: "", trucks_count: "", notes: "", next_follow_up: "" };

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 3 };

export default function SalesDashboard({ apiPath = "/api/hq/leads", title = "Sales Pipeline", subtitle = "Track every lead from first contact to close." }: { apiPath?: string; title?: string; subtitle?: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [view, setView] = useState<"owner" | "board" | "list">("list"); // owner = rollup, board = kanban, list = table
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<any | null>(null); // add/edit form (null = closed)
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4500); };

  // Parse a CSV (handles quoted fields) and map flexible headers → lead fields.
  function parseCsv(text: string): any[] {
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
    if (!lines.length) return [];
    const splitRow = (l: string) => { const out: string[] = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === "," && !q) { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out.map(s => s.trim()); };
    const headers = splitRow(lines[0]).map(h => h.toLowerCase());
    const find = (...names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
    const iCompany = find("company", "carrier", "legal name", "name"), iContact = find("contact", "owner name", "dba"), iPhone = find("phone", "tel"), iEmail = find("email"), iTrucks = find("truck", "power unit", "fleet", "units", "vehicles"), iSource = find("source");
    return lines.slice(1).map(l => { const c = splitRow(l); return { company_name: c[iCompany] || "", contact_name: iContact >= 0 ? c[iContact] : "", phone: iPhone >= 0 ? c[iPhone] : "", email: iEmail >= 0 ? c[iEmail] : "", trucks_count: iTrucks >= 0 ? c[iTrucks] : "", source: iSource >= 0 ? c[iSource] : "" }; });
  }

  async function importCsv(file: File) {
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) { flash("Couldn't read any rows from that file."); return; }
      const res = await fetch(`${apiPath}/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, min_trucks: 75, owner_name: "" }) });
      if (res.status === 401) { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; return; }
      const j = await res.json();
      if (j.error) { flash(`Import error: ${j.error}`); return; }
      flash(`Imported ${j.added} carriers with 75+ trucks (${j.skipped_low || 0} under 75 skipped).`);
      load();
    } catch { flash("Import failed — check the file format."); }
    finally { setImporting(false); }
  }

  function load() {
    setLoading(true);
    fetch(apiPath)
      .then(async r => { if (r.status === 401) { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; return null; } return r.json(); })
      .then(d => { if (d) setLeads(d.leads || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  // Scope everything to the selected salesperson (or All).
  const ownerScoped = useMemo(() => {
    if (ownerFilter === "All") return leads;
    if (ownerFilter === "Unassigned") return leads.filter(l => !l.owner_name);
    return leads.filter(l => (l.owner_name || "") === ownerFilter);
  }, [leads, ownerFilter]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ownerScoped;
    return ownerScoped.filter(l => [l.company_name, l.contact_name, l.phone, l.email, l.source].some(v => (v || "").toLowerCase().includes(s)));
  }, [ownerScoped, q]);

  const kpis = useMemo(() => {
    const base = ownerScoped;
    const active = base.filter(l => l.stage !== "won" && l.stage !== "lost");
    const pipeline = active.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const wonMonth = base.filter(l => l.stage === "won" && (l.updated_at || "").slice(0, 7) === thisMonth);
    const wonValue = base.filter(l => l.stage === "won").reduce((s, l) => s + Number(l.estimated_value || 0), 0);
    return { total: base.length, active: active.length, pipeline, wonMonth: wonMonth.length, wonValue };
  }, [ownerScoped]);

  // Per-rep leaderboard (team-wide) for the owner view — selling the TMS system.
  const repStats = useMemo(() => {
    const by: Record<string, any> = {};
    for (const name of SALESPEOPLE) by[name] = { name, leads: 0, active: 0, pipeline: 0, won: 0, wonValue: 0 };
    for (const l of leads) {
      const r = l.owner_name || "Unassigned";
      const b = (by[r] ||= { name: r, leads: 0, active: 0, pipeline: 0, won: 0, wonValue: 0 });
      b.leads++;
      if (l.stage !== "won" && l.stage !== "lost") { b.active++; b.pipeline += Number(l.estimated_value || 0); }
      if (l.stage === "won") { b.won++; b.wonValue += Number(l.estimated_value || 0); }
    }
    return Object.values(by).sort((a: any, z: any) => z.wonValue - a.wonValue || z.pipeline - a.pipeline);
  }, [leads]);
  const teamKpis = useMemo(() => {
    const active = leads.filter(l => l.stage !== "won" && l.stage !== "lost");
    const thisMonth = new Date().toISOString().slice(0, 7);
    return {
      total: leads.length, active: active.length,
      pipeline: active.reduce((s, l) => s + Number(l.estimated_value || 0), 0),
      wonMonth: leads.filter(l => l.stage === "won" && (l.updated_at || "").slice(0, 7) === thisMonth).length,
      wonValue: leads.filter(l => l.stage === "won").reduce((s, l) => s + Number(l.estimated_value || 0), 0),
    };
  }, [leads]);

  async function save() {
    if (!form.company_name?.trim()) { flash("Company name is required."); return; }
    setSaving(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(apiPath, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.status === 401) { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; return; }
      const j = await res.json();
      if (j.error) { flash(`Error: ${j.error}`); return; }
      setForm(null);
      flash(form.id ? "Lead updated." : "Lead added.");
      load();
    } finally { setSaving(false); }
  }

  async function move(lead: Lead, stage: string) {
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage } : l)); // optimistic
    const res = await fetch(apiPath, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, stage }) });
    if (res.status === 401) { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; return; }
    const j = await res.json();
    if (j.error) { flash(`Error: ${j.error}`); load(); }
  }

  async function del(lead: Lead) {
    if (!confirm(`Delete lead "${lead.company_name}"?`)) return;
    await fetch(`/api/ronyx/sales-leads?id=${lead.id}`, { method: "DELETE" });
    setLeads(ls => ls.filter(l => l.id !== lead.id));
    setForm(null);
    flash("Lead deleted.");
  }

  const overdue = (d: string | null) => d && new Date(d + "T23:59:59") < new Date();

  return (
    <div style={{ padding: "22px 18px 60px", maxWidth: 1500, margin: "0 auto", color: "#0f172a" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>📈 Sales Pipeline</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Track every lead from first contact to close. Drag between stages with the arrows on each card.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            {(["list", "board", "owner"] as const).map(v => (
              <button key={v} onClick={() => { setView(v); if (v === "owner") setOwnerFilter("All"); }}
                style={{ padding: "9px 14px", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", background: view === v ? "#0f172a" : "#fff", color: view === v ? "#fff" : "#475569" }}>
                {v === "list" ? "📋 List" : v === "board" ? "▦ Board" : "📊 Owner"}
              </button>
            ))}
          </div>
          <button onClick={() => setForm({ ...BLANK, owner_name: (ownerFilter !== "All" && ownerFilter !== "Unassigned") ? ownerFilter : "" })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>+ Add Lead</button>
          <button onClick={() => importRef.current?.click()} disabled={importing} title="Upload a carrier CSV — auto-adds every company with 75+ trucks" style={{ background: "#fff", border: "1px solid #2563eb", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: "0.84rem", cursor: importing ? "default" : "pointer", color: "#2563eb" }}>{importing ? "Importing…" : "⬆ Import 75+"}</button>
          <input ref={importRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <button onClick={load} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 13px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer", color: "#475569" }}>↻ Refresh</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "18px 0" }}>
        {[
          { label: "Total Leads", value: String(kpis.total), color: "#0f172a" },
          { label: "Active (Open)", value: String(kpis.active), color: "#2563eb" },
          { label: "Pipeline Value", value: money(kpis.pipeline), color: "#d97706" },
          { label: "Won This Month", value: String(kpis.wonMonth), color: "#16a34a" },
          { label: "Won (Total $)", value: money(kpis.wonValue), color: "#16a34a" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, marginTop: 3 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── OWNER VIEW: rep leaderboard + team stage breakdown ── */}
      {view === "owner" && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: "0.95rem", color: "#0f172a" }}>👥 Rep Leaderboard — TMS System Sales</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Rep", "Leads", "Active", "Pipeline $", "Won", "Won $", "Win rate"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: i === 0 ? "left" : "right", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {repStats.map((r: any) => {
                    const winRate = r.leads ? Math.round((r.won / r.leads) * 100) : 0;
                    return (
                      <tr key={r.name} onClick={() => { setOwnerFilter(r.name); setView("board"); }} title="Open this rep's board" style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0f172a" }}>{r.name}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{r.leads}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#2563eb", fontWeight: 700 }}>{r.active}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#d97706", fontWeight: 800 }}>{money(r.pipeline)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#15803d", fontWeight: 700 }}>{r.won}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#15803d", fontWeight: 800 }}>{money(r.wonValue)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 8 }}>Tap a rep to open their board. KPI cards above are team-wide.</div>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", margin: "16px 0 8px" }}>Team pipeline by stage</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {STAGES.map(st => {
              const c = leads.filter(l => l.stage === st.key);
              const v = c.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
              return (
                <div key={st.key} style={{ background: st.bg, border: `1px solid ${st.color}22`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.66rem", fontWeight: 800, color: st.color, textTransform: "uppercase" }}>{st.label}</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", marginTop: 2 }}>{c.length}</div>
                  {v > 0 && <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>{money(v)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view !== "owner" && (<>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search company, contact, phone…" style={{ ...inp, maxWidth: 300, marginBottom: 0 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Rep:</span>
          {["All", "Unassigned", ...SALESPEOPLE].map(name => (
            <button key={name} onClick={() => setOwnerFilter(name)}
              style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, background: ownerFilter === name ? "#0f172a" : "#fff", color: ownerFilter === name ? "#fff" : "#475569", border: "1px solid " + (ownerFilter === name ? "#0f172a" : "#e2e8f0") }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* LIST view — table with contact info */}
      {!loading && view === "list" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "auto" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>{shown.length} lead{shown.length === 1 ? "" : "s"}{ownerFilter !== "All" ? ` · ${ownerFilter}` : ""}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Company", "Contact", "Phone", "Email", "Trucks", "Stage", "Rep", "Value"].map(h => (
                <th key={h} style={{ padding: "9px 12px", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f8fafc" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={8} style={{ padding: 34, textAlign: "center", color: "#94a3b8" }}>No leads in this view.</td></tr>}
              {shown.map(l => {
                const st = stageOf(l.stage);
                return (
                  <tr key={l.id} onClick={() => setForm({ ...l, estimated_value: l.estimated_value ?? "", trucks_count: l.trucks_count ?? "", next_follow_up: l.next_follow_up || "" })} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0f172a", fontSize: "0.84rem" }}>{l.company_name}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{l.contact_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>{l.phone ? <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{l.phone}</a> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>{l.email ? <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()} style={{ color: "#2563eb", textDecoration: "none" }}>{l.email}</a> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 700 }}>{l.trucks_count ? `${l.trucks_count} 🚚` : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontSize: "0.7rem", fontWeight: 800, color: st.color, background: st.bg, border: `1px solid ${st.color}44`, borderRadius: 999, padding: "2px 9px" }}>{st.label}</span></td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>{l.owner_name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 700, color: "#d97706" }}>{l.estimated_value ? money(l.estimated_value) : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* pipeline board */}
      {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading leads…</div> : view === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(230px, 1fr))`, gap: 12, overflowX: "auto", paddingBottom: 10 }}>
          {STAGES.map(st => {
            const col = shown.filter(l => l.stage === st.key);
            const colValue = col.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
            return (
              <div key={st.key} style={{ background: st.bg, borderRadius: 14, border: `1px solid ${st.color}22`, display: "flex", flexDirection: "column", minHeight: 120 }}>
                <div style={{ padding: "11px 13px", borderBottom: `2px solid ${st.color}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 900, fontSize: "0.86rem", color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: st.color, background: "#fff", borderRadius: 999, padding: "2px 8px" }}>{col.length}{colValue ? ` · ${money(colValue)}` : ""}</span>
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                  {col.length === 0 && <div style={{ color: "#94a3b8", fontSize: "0.74rem", textAlign: "center", padding: "14px 0" }}>—</div>}
                  {col.map(l => {
                    const idx = STAGES.findIndex(s => s.key === l.stage);
                    return (
                      <div key={l.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 11px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                        <div onClick={() => setForm({ ...l, estimated_value: l.estimated_value ?? "", trucks_count: l.trucks_count ?? "", next_follow_up: l.next_follow_up || "" })} style={{ cursor: "pointer" }}>
                          <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "#0f172a", lineHeight: 1.2 }}>{l.company_name}</div>
                          {l.contact_name && <div style={{ fontSize: "0.74rem", color: "#475569", marginTop: 2 }}>👤 {l.contact_name}</div>}
                          {l.phone && <div style={{ fontSize: "0.74rem", color: "#64748b" }}>📞 {l.phone}</div>}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {!!Number(l.estimated_value) && <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "1px 7px" }}>{money(l.estimated_value)}</span>}
                            {!!l.trucks_count && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#334155", background: "#f1f5f9", borderRadius: 6, padding: "1px 7px" }}>🚚 {l.trucks_count}</span>}
                            {l.next_follow_up && <span style={{ fontSize: "0.68rem", fontWeight: 800, color: overdue(l.next_follow_up) ? "#dc2626" : "#15803d", background: overdue(l.next_follow_up) ? "#fef2f2" : "#f0fdf4", borderRadius: 6, padding: "1px 7px" }}>📅 {l.next_follow_up}{overdue(l.next_follow_up) ? " ⚠" : ""}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "space-between" }}>
                          <button disabled={idx <= 0} onClick={() => move(l, STAGES[idx - 1].key)} title="Move back" style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: idx <= 0 ? "#cbd5e1" : "#475569", fontWeight: 800, fontSize: "0.72rem", cursor: idx <= 0 ? "default" : "pointer" }}>←</button>
                          <button disabled={idx >= STAGES.length - 1} onClick={() => move(l, STAGES[idx + 1].key)} title="Advance" style={{ flex: 2, padding: "4px 0", borderRadius: 6, border: "none", background: idx >= STAGES.length - 1 ? "#e2e8f0" : st.color, color: "#fff", fontWeight: 800, fontSize: "0.72rem", cursor: idx >= STAGES.length - 1 ? "default" : "pointer" }}>{idx >= STAGES.length - 1 ? "—" : `→ ${STAGES[idx + 1].label}`}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}

      {/* add / edit modal */}
      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>{form.id ? "Edit Lead" : "Add Lead"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Company *</label><input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} style={inp} placeholder="ABC Hauling LLC" /></div>
              <div><label style={lbl}>Contact Name</label><input value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Phone</label><input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Email</label><input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Source</label><input value={form.source || ""} onChange={e => setForm({ ...form, source: e.target.value })} style={inp} placeholder="Referral, cold call…" /></div>
              <div><label style={lbl}>Stage</label>
                <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={inp}>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
              </div>
              <div><label style={lbl}>Owner (Rep)</label>
                <select value={form.owner_name || ""} onChange={e => setForm({ ...form, owner_name: e.target.value })} style={inp}>
                  <option value="">— Unassigned (pool) —</option>
                  {SALESPEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
                  {form.owner_name && !SALESPEOPLE.includes(form.owner_name) && <option value={form.owner_name}>{form.owner_name}</option>}
                </select>
              </div>
              <div><label style={lbl}>Est. Value ($)</label><input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Fleet Size (trucks)</label><input type="number" value={form.trucks_count} onChange={e => setForm({ ...form, trucks_count: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Next Follow-up</label><input type="date" value={form.next_follow_up} onChange={e => setForm({ ...form, next_follow_up: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, minHeight: 70, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
              <button onClick={save} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: saving ? "default" : "pointer" }}>{saving ? "Saving…" : form.id ? "Save Changes" : "Add Lead"}</button>
              <button onClick={() => setForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {form.id && <button onClick={() => del(form)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
