"use client";

import { useEffect, useMemo, useState } from "react";

type Driver = {
  id: string; oo_id: string; company: string; name: string; phone: string;
  cdl_number: string; cdl_state: string; cdl_class: string; truck_number: string;
  cdl_expiration: string; med_card_expiration: string; med_card_number: string; updated_at: string;
};

const EDITABLE = ["cdl_number", "cdl_state", "cdl_class", "cdl_expiration", "med_card_expiration", "med_card_number"] as const;
const daysUntil = (d: string) => { if (!d) return null; const t = new Date(d + "T00:00:00").getTime(); if (isNaN(t)) return null; return Math.ceil((t - Date.now()) / 86400000); };
const expBg = (n: number | null) => n === null ? "#f1f5f9" : n < 0 ? "#fee2e2" : n <= 30 ? "#fef9c3" : "#f0fdf4";
const expFg = (n: number | null) => n === null ? "#94a3b8" : n < 0 ? "#dc2626" : n <= 30 ? "#b45309" : "#15803d";
const lbl = (n: number | null) => n === null ? "—" : n < 0 ? "EXPIRED" : n + "d";
const inp: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.8rem", outline: "none", boxSizing: "border-box", background: "#fff" };

const BLANK_ADD = { oo_id: "", name: "", phone: "", truck_number: "", cdl_number: "", cdl_state: "TX", cdl_class: "", cdl_expiration: "", med_card_expiration: "", med_card_number: "" };

export default function FleetCdlMedical() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Driver>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "expired" | "expiring" | "missing">("all");
  const [toast, setToast] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...BLANK_ADD });
  const [adding, setAdding] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3200); };

  function load() {
    setLoading(true);
    fetch("/api/ronyx/drivers/cdl-medical").then(r => r.json()).then(d => { setRows(d.drivers || []); setCompanies(d.companies || []); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function addDriver() {
    if (!addForm.oo_id) { flash("Pick an owner operator."); return; }
    if (!addForm.name.trim()) { flash("Enter the driver's name."); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/ronyx/drivers/cdl-medical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
      const j = await res.json();
      if (res.ok && j.ok) { flash(`Added ${addForm.name} to ${j.company}.`); setShowAdd(false); setAddForm({ ...BLANK_ADD }); load(); }
      else flash(`Couldn't add — ${j.error || "try again"}.`);
    } catch { flash("Network error."); }
    finally { setAdding(false); }
  }

  const val = (d: Driver, f: keyof Driver) => (edits[d.id]?.[f] ?? d[f]) as string;
  const dirty = (id: string) => edits[id] && Object.keys(edits[id]).length > 0;
  function setField(id: string, f: keyof Driver, v: string) {
    setEdits(e => ({ ...e, [id]: { ...e[id], [f]: f === "cdl_state" ? v.toUpperCase().slice(0, 2) : v } }));
  }

  function cancelEdit(id: string) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
    setEditingId(null);
  }

  async function save(d: Driver) {
    const patch = edits[d.id];
    if (!patch || !Object.keys(patch).length) { setEditingId(null); return; }
    setSaving(d.id);
    try {
      const res = await fetch("/api/ronyx/drivers/cdl-medical", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, ...patch }) });
      const j = await res.json();
      if (res.ok && j.ok) {
        setRows(rs => rs.map(r => r.id === d.id ? { ...r, ...patch } : r));
        setEdits(e => { const n = { ...e }; delete n[d.id]; return n; });
        setEditingId(null);
        flash(`Saved ${d.name}.`);
      } else flash(`Couldn't save — ${j.error || "try again"}.`);
    } catch { flash("Network error."); }
    finally { setSaving(null); }
  }

  const shown = useMemo(() => rows.filter(d => {
    const cur = { ...d, ...edits[d.id] };
    if (filter === "expired") { const c = daysUntil(cur.cdl_expiration), m = daysUntil(cur.med_card_expiration); if (!((c !== null && c < 0) || (m !== null && m < 0))) return false; }
    if (filter === "expiring") { const c = daysUntil(cur.cdl_expiration), m = daysUntil(cur.med_card_expiration); if (!((c !== null && c >= 0 && c <= 30) || (m !== null && m >= 0 && m <= 30))) return false; }
    if (filter === "missing") { if (cur.cdl_expiration && cur.med_card_expiration && cur.cdl_number) return false; }
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return d.name.toLowerCase().includes(s) || d.company.toLowerCase().includes(s) || (d.cdl_number || "").toLowerCase().includes(s);
  }), [rows, edits, q, filter]);

  const counts = useMemo(() => {
    let expired = 0, expiring = 0, missing = 0;
    for (const d of rows) {
      const c = daysUntil(d.cdl_expiration), m = daysUntil(d.med_card_expiration);
      if ((c !== null && c < 0) || (m !== null && m < 0)) expired++;
      else if ((c !== null && c <= 30) || (m !== null && m <= 30)) expiring++;
      if (!d.cdl_expiration || !d.med_card_expiration || !d.cdl_number) missing++;
    }
    return { expired, expiring, missing };
  }, [rows]);

  const dirtyCount = Object.keys(edits).filter(id => edits[id] && Object.keys(edits[id]).length).length;

  // Pagination — keep the page short. Reset to page 1 when the filter/search changes.
  useEffect(() => { setPage(1); }, [q, filter]);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount);
  const paged = shown.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <div style={{ padding: "22px 18px 60px", maxWidth: 1400, margin: "0 auto", color: "#0f172a" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🪪 Fleet CDL & Medical</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Add or edit CDL and medical-card info for <strong>every owner-operator's drivers</strong> in one place. Changes save per row.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAdd(s => !s)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>{showAdd ? "× Close" : "+ Add Driver"}</button>
          <button onClick={load} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", color: "#475569" }}>↻ Refresh</button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 18px", marginTop: 14, boxShadow: "0 4px 14px rgba(22,163,74,0.08)" }}>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 12 }}>Add a driver to an owner operator</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Owner Operator *</label>
              <select value={addForm.oo_id} onChange={e => setAddForm(f => ({ ...f, oo_id: e.target.value }))} style={{ ...inp, marginTop: 3 }}>
                <option value="">— Select company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {([["Driver Name *", "name"], ["Truck #", "truck_number"], ["Phone", "phone"], ["CDL #", "cdl_number"], ["CDL State", "cdl_state"], ["Med Card #", "med_card_number"]] as const).map(([label, f]) => (
              <div key={f}>
                <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{label}</label>
                <input value={(addForm as any)[f]} onChange={e => setAddForm(s => ({ ...s, [f]: f === "cdl_state" ? e.target.value.toUpperCase().slice(0, 2) : e.target.value }))} style={{ ...inp, marginTop: 3 }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>CDL Class</label>
              <select value={addForm.cdl_class} onChange={e => setAddForm(f => ({ ...f, cdl_class: e.target.value }))} style={{ ...inp, marginTop: 3 }}>
                <option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>CDL Expiration</label>
              <input type="date" value={addForm.cdl_expiration} onChange={e => setAddForm(f => ({ ...f, cdl_expiration: e.target.value }))} style={{ ...inp, marginTop: 3 }} />
            </div>
            <div>
              <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Med Card Expiration</label>
              <input type="date" value={addForm.med_card_expiration} onChange={e => setAddForm(f => ({ ...f, med_card_expiration: e.target.value }))} style={{ ...inp, marginTop: 3 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={addDriver} disabled={adding} style={{ background: adding ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 800, fontSize: "0.84rem", cursor: adding ? "default" : "pointer" }}>{adding ? "Adding…" : "Add Driver"}</button>
            <button onClick={() => { setShowAdd(false); setAddForm({ ...BLANK_ADD }); }} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 18px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "14px 0 16px" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search driver, company, CDL #…" style={{ ...inp, width: 280, padding: "8px 12px" }} />
        {([["all", `All (${rows.length})`], ["expired", `🔴 Expired (${counts.expired})`], ["expiring", `🟡 Expiring ≤30d (${counts.expiring})`], ["missing", `⚪ Missing info (${counts.missing})`]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ cursor: "pointer", padding: "7px 13px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, background: filter === k ? "#0f172a" : "#fff", color: filter === k ? "#fff" : "#475569", border: "1px solid " + (filter === k ? "#0f172a" : "#e2e8f0") }}>{t}</button>
        ))}
        {dirtyCount > 0 && <span style={{ marginLeft: "auto", fontSize: "0.78rem", fontWeight: 800, color: "#b45309", background: "#fef9c3", padding: "6px 11px", borderRadius: 8 }}>{dirtyCount} unsaved</span>}
      </div>

      {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading drivers…</div>
        : shown.length === 0 ? <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 30, textAlign: "center", color: "#94a3b8" }}>No drivers in this view.</div>
        : (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: 940 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Company / Driver", "Truck #", "CDL #", "State", "Class", "CDL Expiration", "Med Card Expiration", "Med Card #", ""].map((h, i, arr) => (
                    <th key={h || "actions"} style={{ padding: "9px 10px", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f8fafc", ...(i === arr.length - 1 ? { right: 0, zIndex: 2 } : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(d => {
                  const c = daysUntil(val(d, "cdl_expiration")); const m = daysUntil(val(d, "med_card_expiration"));
                  const editing = editingId === d.id;
                  const cell: React.CSSProperties = { padding: "7px 10px", color: "#334155" };
                  if (!editing) {
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ ...cell, minWidth: 150 }}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{d.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{d.company}</div>
                        </td>
                        <td style={cell}>{d.truck_number ? <span style={{ background: "#f1f5f9", color: "#0f172a", padding: "2px 8px", borderRadius: 6, fontWeight: 800, fontSize: "0.74rem" }}>{d.truck_number}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={cell}>{d.cdl_number || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={cell}>{d.cdl_state ? <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 7px", borderRadius: 6, fontWeight: 700, fontSize: "0.72rem" }}>{d.cdl_state}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={cell}>{d.cdl_class ? <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 7px", borderRadius: 6, fontWeight: 700, fontSize: "0.72rem" }}>Class {d.cdl_class}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={cell}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span>{d.cdl_expiration || <span style={{ color: "#cbd5e1" }}>—</span>}</span>
                            {d.cdl_expiration && <span style={{ background: expBg(c), color: expFg(c), padding: "1px 6px", borderRadius: 6, fontWeight: 800, fontSize: "0.64rem", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{lbl(c)}</span>}
                          </div>
                        </td>
                        <td style={cell}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span>{d.med_card_expiration || <span style={{ color: "#cbd5e1" }}>—</span>}</span>
                            {d.med_card_expiration && <span style={{ background: expBg(m), color: expFg(m), padding: "1px 6px", borderRadius: 6, fontWeight: 800, fontSize: "0.64rem", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{lbl(m)}</span>}
                          </div>
                        </td>
                        <td style={cell}>{d.med_card_number || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap", position: "sticky", right: 0, background: "#fff" }}>
                          <button onClick={() => { setEditingId(d.id); }} disabled={!!editingId}
                            style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: editingId ? "not-allowed" : "pointer", opacity: editingId && !editing ? 0.4 : 1 }}>✏ Edit</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: "#fffbeb", boxShadow: "inset 3px 0 0 #f59e0b" }}>
                      <td style={{ padding: "7px 10px", minWidth: 150 }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{d.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{d.company}</div>
                      </td>
                      <td style={{ padding: "5px 8px", width: 80 }}><input value={val(d, "truck_number")} onChange={e => setField(d.id, "truck_number", e.target.value)} placeholder="Truck #" style={inp} /></td>
                      <td style={{ padding: "5px 8px", minWidth: 120 }}><input autoFocus value={val(d, "cdl_number")} onChange={e => setField(d.id, "cdl_number", e.target.value)} style={inp} /></td>
                      <td style={{ padding: "5px 8px", width: 56 }}><input value={val(d, "cdl_state")} onChange={e => setField(d.id, "cdl_state", e.target.value)} maxLength={2} placeholder="TX" style={{ ...inp, textTransform: "uppercase" }} /></td>
                      <td style={{ padding: "5px 8px", width: 78 }}>
                        <select value={val(d, "cdl_class")} onChange={e => setField(d.id, "cdl_class", e.target.value)} style={inp}>
                          <option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>
                        </select>
                      </td>
                      <td style={{ padding: "5px 8px", width: 140 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <input type="date" value={val(d, "cdl_expiration")} onChange={e => setField(d.id, "cdl_expiration", e.target.value)} style={inp} />
                          <span style={{ background: expBg(c), color: expFg(c), padding: "1px 6px", borderRadius: 6, fontWeight: 800, fontSize: "0.64rem", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{lbl(c)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "5px 8px", width: 140 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <input type="date" value={val(d, "med_card_expiration")} onChange={e => setField(d.id, "med_card_expiration", e.target.value)} style={inp} />
                          <span style={{ background: expBg(m), color: expFg(m), padding: "1px 6px", borderRadius: 6, fontWeight: 800, fontSize: "0.64rem", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{lbl(m)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "5px 8px", minWidth: 110 }}><input value={val(d, "med_card_number")} onChange={e => setField(d.id, "med_card_number", e.target.value)} style={inp} /></td>
                      <td style={{ padding: "5px 10px", whiteSpace: "nowrap", position: "sticky", right: 0, background: "#fffbeb" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => save(d)} disabled={saving === d.id}
                            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                            {saving === d.id ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => cancelEdit(d.id)} disabled={saving === d.id}
                            style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Pagination */}
      {!loading && shown.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage <= 1}
            style={{ padding: "7px 13px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 700, fontSize: "0.8rem", color: curPage <= 1 ? "#cbd5e1" : "#475569", cursor: curPage <= 1 ? "default" : "pointer" }}>← Prev</button>
          {Array.from({ length: pageCount }, (_, i) => i + 1)
            .filter(p => p === 1 || p === pageCount || Math.abs(p - curPage) <= 2)
            .reduce((acc: (number | string)[], p, idx, src) => { if (idx > 0 && p - (src[idx - 1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, [])
            .map((p, i) => p === "…"
              ? <span key={`g${i}`} style={{ color: "#94a3b8", padding: "0 4px" }}>…</span>
              : <button key={p} onClick={() => setPage(p as number)}
                  style={{ minWidth: 36, padding: "7px 0", borderRadius: 8, border: "1px solid " + (p === curPage ? "#0f172a" : "#e2e8f0"), background: p === curPage ? "#0f172a" : "#fff", color: p === curPage ? "#fff" : "#475569", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{p}</button>)}
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={curPage >= pageCount}
            style={{ padding: "7px 13px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 700, fontSize: "0.8rem", color: curPage >= pageCount ? "#cbd5e1" : "#475569", cursor: curPage >= pageCount ? "default" : "pointer" }}>Next →</button>
          <span style={{ marginLeft: 10, fontSize: "0.76rem", color: "#94a3b8", fontWeight: 600 }}>Page {curPage} of {pageCount} · {shown.length} drivers</span>
        </div>
      )}
    </div>
  );
}
