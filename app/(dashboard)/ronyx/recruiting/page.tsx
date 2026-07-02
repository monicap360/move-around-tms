"use client";

import { useEffect, useMemo, useState } from "react";

type Recruit = {
  id: string;
  recruiter: string | null;
  candidate_type: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  service_area: string | null;
  equipment: string | null;
  pay_range: string | null;
  stage: string;
  notes: string | null;
  next_follow_up: string | null;
  pushed_to_find_drivers: boolean;
  driver_profile_id: string | null;
  updated_at: string;
};

const STAGES = [
  { key: "new",        label: "New",        color: "#2563eb", bg: "#eff6ff" },
  { key: "contacted",  label: "Contacted",  color: "#7c3aed", bg: "#f5f3ff" },
  { key: "interested", label: "Interested", color: "#0891b2", bg: "#ecfeff" },
  { key: "screening",  label: "Screening",  color: "#d97706", bg: "#fffbeb" },
  { key: "offer",      label: "Offer",      color: "#0d9488", bg: "#f0fdfa" },
  { key: "hired",      label: "Hired",      color: "#16a34a", bg: "#f0fdf4" },
  { key: "passed",     label: "Passed",     color: "#dc2626", bg: "#fef2f2" },
] as const;
const RECRUITERS = ["Andrew", "Laura", "Sylvia", "Veronica", "Monica"];

const BLANK = { recruiter: "Andrew", candidate_type: "driver", full_name: "", phone: "", email: "", source: "", service_area: "", equipment: "", pay_range: "", stage: "new", notes: "", next_follow_up: "" };

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 3 };

export default function RecruitingCenter() {
  const [rows, setRows] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3200); };
  const lock = () => { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; };

  function load() {
    setLoading(true);
    fetch("/api/ronyx/recruits")
      .then(async r => { if (r.status === 401) { lock(); return null; } return r.json(); })
      .then(d => { if (d) setRows(d.recruits || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const scoped = useMemo(() => ownerFilter === "All" ? rows : rows.filter(r => (r.recruiter || "") === ownerFilter), [rows, ownerFilter]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return scoped;
    return scoped.filter(r => [r.full_name, r.phone, r.email, r.source, r.service_area].some(v => (v || "").toLowerCase().includes(s)));
  }, [scoped, q]);

  const kpis = useMemo(() => {
    const active = scoped.filter(r => r.stage !== "hired" && r.stage !== "passed");
    return { total: scoped.length, active: active.length, hired: scoped.filter(r => r.stage === "hired").length, pushed: scoped.filter(r => r.pushed_to_find_drivers).length };
  }, [scoped]);

  async function save() {
    if (!form.full_name?.trim()) { flash("Name is required."); return; }
    setSaving(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const res = await fetch("/api/ronyx/recruits", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.status === 401) { lock(); return; }
      const j = await res.json();
      if (j.error) { flash(`Error: ${j.error}`); return; }
      setForm(null); flash(form.id ? "Recruit updated." : "Recruit added."); load();
    } finally { setSaving(false); }
  }

  async function move(r: Recruit, stage: string) {
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, stage } : x));
    const res = await fetch("/api/ronyx/recruits", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, stage }) });
    if (res.status === 401) { lock(); return; }
    const j = await res.json(); if (j.error) { flash(`Error: ${j.error}`); load(); }
  }

  async function push(r: Recruit) {
    if (r.pushed_to_find_drivers) { flash("Already in Find Drivers."); return; }
    if (!confirm(`Push ${r.full_name} into MoveAround Find Drivers? They'll appear in the driver pool.`)) return;
    const res = await fetch("/api/ronyx/recruits", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, action: "push_to_find_drivers" }) });
    if (res.status === 401) { lock(); return; }
    const j = await res.json();
    if (j.error) { flash(`Error: ${j.error}`); return; }
    flash(`🚀 ${r.full_name} pushed to Find Drivers.`); load();
  }

  async function del(r: Recruit) {
    if (!confirm(`Delete recruit "${r.full_name}"?`)) return;
    await fetch(`/api/ronyx/recruits?id=${r.id}`, { method: "DELETE" });
    setRows(rs => rs.filter(x => x.id !== r.id)); setForm(null); flash("Recruit deleted.");
  }

  const overdue = (d: string | null) => d && new Date(d + "T23:59:59") < new Date();

  return (
    <div style={{ padding: "22px 18px 60px", maxWidth: 1600, margin: "0 auto", color: "#0f172a" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🧲 Recruiting Center</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Track driver &amp; owner-operator recruits from first contact to hire — then push the good ones straight into MoveAround <strong>Find Drivers</strong>.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setForm({ ...BLANK, recruiter: ownerFilter !== "All" ? ownerFilter : "Andrew" })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>+ Add Recruit</button>
          <button onClick={load} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 13px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer", color: "#475569" }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "18px 0" }}>
        {[
          { label: "Total Recruits", value: String(kpis.total), color: "#0f172a" },
          { label: "In Pipeline", value: String(kpis.active), color: "#2563eb" },
          { label: "Hired", value: String(kpis.hired), color: "#16a34a" },
          { label: "In Find Drivers", value: String(kpis.pushed), color: "#7c3aed" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, marginTop: 3 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, area…" style={{ ...inp, maxWidth: 280, marginBottom: 0 }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Recruiter:</span>
        {["All", ...RECRUITERS].map(name => (
          <button key={name} onClick={() => setOwnerFilter(name)} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, background: ownerFilter === name ? "#0f172a" : "#fff", color: ownerFilter === name ? "#fff" : "#475569", border: "1px solid " + (ownerFilter === name ? "#0f172a" : "#e2e8f0") }}>{name}</button>
        ))}
      </div>

      {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading recruits…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`, gap: 12, overflowX: "auto", paddingBottom: 10 }}>
          {STAGES.map(st => {
            const col = shown.filter(r => r.stage === st.key);
            return (
              <div key={st.key} style={{ background: st.bg, borderRadius: 14, border: `1px solid ${st.color}22`, display: "flex", flexDirection: "column", minHeight: 120 }}>
                <div style={{ padding: "11px 13px", borderBottom: `2px solid ${st.color}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 900, fontSize: "0.86rem", color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: st.color, background: "#fff", borderRadius: 999, padding: "2px 8px" }}>{col.length}</span>
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                  {col.length === 0 && <div style={{ color: "#94a3b8", fontSize: "0.74rem", textAlign: "center", padding: "14px 0" }}>—</div>}
                  {col.map(r => {
                    const idx = STAGES.findIndex(s => s.key === r.stage);
                    return (
                      <div key={r.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 11px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                        <div onClick={() => setForm({ ...r, next_follow_up: r.next_follow_up || "" })} style={{ cursor: "pointer" }}>
                          <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "#0f172a", lineHeight: 1.2 }}>{r.full_name}
                            {r.candidate_type === "owner_operator" && <span style={{ marginLeft: 5, fontSize: "0.6rem", fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", borderRadius: 5, padding: "1px 5px" }}>OO</span>}
                          </div>
                          {r.phone && <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>📞 {r.phone}</div>}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {r.service_area && <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#334155", background: "#f1f5f9", borderRadius: 6, padding: "1px 7px" }}>📍 {r.service_area}</span>}
                            {r.equipment && <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#334155", background: "#f1f5f9", borderRadius: 6, padding: "1px 7px" }}>🚚 {r.equipment}</span>}
                            {r.recruiter && <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#1e40af", background: "#eff6ff", borderRadius: 6, padding: "1px 7px" }}>{r.recruiter}</span>}
                            {r.next_follow_up && <span style={{ fontSize: "0.66rem", fontWeight: 800, color: overdue(r.next_follow_up) ? "#dc2626" : "#15803d", background: overdue(r.next_follow_up) ? "#fef2f2" : "#f0fdf4", borderRadius: 6, padding: "1px 7px" }}>📅 {r.next_follow_up}{overdue(r.next_follow_up) ? " ⚠" : ""}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          <button disabled={idx <= 0} onClick={() => move(r, STAGES[idx - 1].key)} title="Move back" style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: idx <= 0 ? "#cbd5e1" : "#475569", fontWeight: 800, fontSize: "0.72rem", cursor: idx <= 0 ? "default" : "pointer" }}>←</button>
                          <button disabled={idx >= STAGES.length - 1} onClick={() => move(r, STAGES[idx + 1].key)} title="Advance" style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: "none", background: idx >= STAGES.length - 1 ? "#e2e8f0" : st.color, color: "#fff", fontWeight: 800, fontSize: "0.72rem", cursor: idx >= STAGES.length - 1 ? "default" : "pointer" }}>{idx >= STAGES.length - 1 ? "—" : `→ ${STAGES[idx + 1].label}`}</button>
                        </div>
                        {r.pushed_to_find_drivers ? (
                          <div style={{ marginTop: 6, textAlign: "center", fontSize: "0.68rem", fontWeight: 800, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 0" }}>✓ In Find Drivers</div>
                        ) : (
                          <button onClick={() => push(r)} style={{ marginTop: 6, width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "5px 0", fontWeight: 800, fontSize: "0.7rem", cursor: "pointer" }}>🚀 Push to Find Drivers</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>{form.id ? "Edit Recruit" : "Add Recruit"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Full Name *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inp} placeholder="Driver / owner name" /></div>
              <div><label style={lbl}>Type</label>
                <select value={form.candidate_type || "driver"} onChange={e => setForm({ ...form, candidate_type: e.target.value })} style={inp}>
                  <option value="driver">Driver</option><option value="owner_operator">Owner-Operator</option>
                </select>
              </div>
              <div><label style={lbl}>Recruiter</label>
                <select value={form.recruiter || "Andrew"} onChange={e => setForm({ ...form, recruiter: e.target.value })} style={inp}>
                  {RECRUITERS.map(p => <option key={p} value={p}>{p}</option>)}
                  {form.recruiter && !RECRUITERS.includes(form.recruiter) && <option value={form.recruiter}>{form.recruiter}</option>}
                </select>
              </div>
              <div><label style={lbl}>Phone</label><input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Email</label><input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Source</label><input value={form.source || ""} onChange={e => setForm({ ...form, source: e.target.value })} style={inp} placeholder="Referral, ad, cold call…" /></div>
              <div><label style={lbl}>Service Area</label><input value={form.service_area || ""} onChange={e => setForm({ ...form, service_area: e.target.value })} style={inp} placeholder="Houston, TX" /></div>
              <div><label style={lbl}>Equipment</label><input value={form.equipment || ""} onChange={e => setForm({ ...form, equipment: e.target.value })} style={inp} placeholder="End dump, belly…" /></div>
              <div><label style={lbl}>Pay Range</label><input value={form.pay_range || ""} onChange={e => setForm({ ...form, pay_range: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Stage</label>
                <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={inp}>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
              </div>
              <div><label style={lbl}>Next Follow-up</label><input type="date" value={form.next_follow_up} onChange={e => setForm({ ...form, next_follow_up: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: saving ? "default" : "pointer" }}>{saving ? "Saving…" : form.id ? "Save Changes" : "Add Recruit"}</button>
              <button onClick={() => setForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {form.id && !form.pushed_to_find_drivers && <button onClick={() => push(form)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>🚀 Push to Find Drivers</button>}
              {form.id && <button onClick={() => del(form)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
