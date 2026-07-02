"use client";

import { useEffect, useMemo, useState } from "react";
import HqShell from "../HqShell";

type Product = { id: string; name: string; tagline: string | null; description: string | null; ideal_buyer: string | null; why_it_matters: string | null; demo_notes: string | null; demo_url: string | null; icon: string | null; sort_order: number; active: boolean };
type Script = { id: string; title: string; category: string; content: string | null; sort_order: number };
type Battlecard = { id: string; system_name: string; category: string | null; our_edge: string | null; talk_track: string | null; avoid: string | null; sort_order: number };

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 3 };
const CATS = ["Strategy", "Pitch", "Cold Call", "Discovery", "ROI", "Objections", "Demo", "Close", "Training"];
const catColor: Record<string, string> = { Strategy: "#9333ea", Pitch: "#2563eb", "Cold Call": "#0891b2", Discovery: "#7c3aed", ROI: "#16a34a", Objections: "#dc2626", Demo: "#d97706", Close: "#15803d", Training: "#475569" };

export default function SalesKitPage() {
  const [tab, setTab] = useState<"products" | "scripts" | "battlecards">("scripts");
  const [products, setProducts] = useState<Product[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [battlecards, setBattlecards] = useState<Battlecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [pForm, setPForm] = useState<any | null>(null);
  const [sForm, setSForm] = useState<any | null>(null);
  const [bForm, setBForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const lock = () => { window.location.href = "/hq/login?next=/hq/sales-kit"; };

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/hq/products").then(async r => { if (r.status === 401) { lock(); return null; } return r.json(); }),
      fetch("/api/hq/scripts").then(r => r.json()),
      fetch("/api/hq/battlecards").then(r => r.json()),
    ]).then(([p, s, b]) => { if (p) setProducts(p.products || []); if (s) setScripts(s.scripts || []); if (b) setBattlecards(b.battlecards || []); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const byCat = useMemo(() => {
    const g: Record<string, Script[]> = {};
    for (const s of scripts) (g[s.category || "Pitch"] ||= []).push(s);
    return g;
  }, [scripts]);

  async function saveProduct() {
    if (!pForm.name?.trim()) { flash("Name required."); return; }
    setSaving(true);
    try { const r = await fetch("/api/hq/products", { method: pForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pForm) }); if (r.status === 401) { lock(); return; } const j = await r.json(); if (j.error) { flash(j.error); return; } setPForm(null); flash("Product saved."); load(); } finally { setSaving(false); }
  }
  async function saveScript() {
    if (!sForm.title?.trim()) { flash("Title required."); return; }
    setSaving(true);
    try { const r = await fetch("/api/hq/scripts", { method: sForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sForm) }); if (r.status === 401) { lock(); return; } const j = await r.json(); if (j.error) { flash(j.error); return; } setSForm(null); flash("Script saved."); load(); } finally { setSaving(false); }
  }
  async function saveBattlecard() {
    if (!bForm.system_name?.trim()) { flash("System name required."); return; }
    setSaving(true);
    try { const r = await fetch("/api/hq/battlecards", { method: bForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bForm) }); if (r.status === 401) { lock(); return; } const j = await r.json(); if (j.error) { flash(j.error); return; } setBForm(null); flash("Battlecard saved."); load(); } finally { setSaving(false); }
  }
  async function delBattlecard(b: Battlecard) { if (!confirm(`Delete battlecard for "${b.system_name}"?`)) return; await fetch(`/api/hq/battlecards?id=${b.id}`, { method: "DELETE" }); setBForm(null); load(); }
  async function delProduct(p: Product) { if (!confirm(`Delete "${p.name}"?`)) return; await fetch(`/api/hq/products?id=${p.id}`, { method: "DELETE" }); setPForm(null); load(); }
  async function delScript(s: Script) { if (!confirm(`Delete "${s.title}"?`)) return; await fetch(`/api/hq/scripts?id=${s.id}`, { method: "DELETE" }); setSForm(null); load(); }
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => flash("Copied to clipboard.")); };

  return (
    <HqShell active="saleskit">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>📚 Sales Kit</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Everything your reps need to sell MoveAround TMS — product demo content and sales scripts / training.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {(["scripts", "products", "battlecards"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 14px", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", background: tab === t ? "#0f172a" : "#fff", color: tab === t ? "#fff" : "#475569" }}>{t === "scripts" ? "📚 Scripts & Training" : t === "products" ? "📦 Products" : "⚔ Battlecards"}</button>
              ))}
            </div>
            {tab === "products"
              ? <button onClick={() => setPForm({ name: "", tagline: "", description: "", ideal_buyer: "", why_it_matters: "", demo_notes: "", demo_url: "", icon: "🧩", sort_order: (products.length + 1), active: true })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>+ Product</button>
              : tab === "battlecards"
              ? <button onClick={() => setBForm({ system_name: "", category: "", our_edge: "", talk_track: "", avoid: "", sort_order: (battlecards.length + 1) })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>+ Battlecard</button>
              : <button onClick={() => setSForm({ title: "", category: "Pitch", content: "", sort_order: (scripts.length + 1) })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>+ Script</button>}
          </div>
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading…</div> : tab === "products" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginTop: 20 }}>
            {products.map(p => (
              <div key={p.id} onClick={() => setPForm({ ...p })} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.5rem" }}>{p.icon || "🧩"}</span>
                  <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>{p.name}</div>
                </div>
                {p.tagline && <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{p.tagline}</div>}
                {p.description && <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>{p.description}</div>}
                {p.ideal_buyer && <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#334155", background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: 8, padding: "8px 10px" }}><strong style={{ color: "#0369a1" }}>👤 Who needs it:</strong> {p.ideal_buyer}</div>}
                {p.why_it_matters && <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#334155", background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 8, padding: "8px 10px" }}><strong style={{ color: "#15803d" }}>💡 Why it matters:</strong> {p.why_it_matters}</div>}
                {p.demo_notes && <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#334155", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 10px" }}><strong>Demo:</strong> {p.demo_notes}</div>}
                {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: "inline-block", marginTop: 8, fontSize: "0.78rem", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>▶ Demo link</a>}
              </div>
            ))}
          </div>
        ) : tab === "battlecards" ? (
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "0.84rem" }}>When a prospect says what they already use, here's how to position MoveAround's difference — <strong>without knocking anyone</strong>. These also pop up right on the lead in the Sales Pipeline.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {battlecards.map(b => (
                <div key={b.id} onClick={() => setBForm({ ...b })} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ background: "#0f172a", color: "#fff", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>⚔ {b.system_name}</span>
                    {b.category && <span style={{ marginLeft: "auto", fontSize: "0.66rem", background: "rgba(255,255,255,0.12)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{b.category}</span>}
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {b.talk_track && <div style={{ fontSize: "0.8rem", color: "#334155", lineHeight: 1.5, background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 8, padding: "8px 10px" }}><strong style={{ color: "#1e40af" }}>💬 What to say:</strong> {b.talk_track}</div>}
                    {b.our_edge && <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.45 }}><strong style={{ color: "#15803d" }}>Our edge:</strong> {b.our_edge}</div>}
                    {b.avoid && <div style={{ fontSize: "0.75rem", color: "#7f1d1d", lineHeight: 1.45, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px" }}><strong>⚠ Don't:</strong> {b.avoid}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
            {CATS.filter(c => byCat[c]?.length).map(cat => (
              <div key={cat}>
                <div style={{ fontWeight: 900, fontSize: "0.9rem", color: catColor[cat], textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{cat}</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {byCat[cat].map(s => (
                    <div key={s.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColor[s.category] || "#94a3b8" }} />
                        <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", flex: 1 }}>{s.title}</div>
                        <button onClick={() => copy(s.content || "")} style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 7, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>⧉ Copy</button>
                        <button onClick={() => setSForm({ ...s })} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>✏ Edit</button>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pForm && (
        <div onClick={() => setPForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>{pForm.id ? "Edit Product" : "Add Product"}</div>
            <div style={{ display: "grid", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 10 }}>
                <div><label style={lbl}>Icon</label><input value={pForm.icon || ""} onChange={e => setPForm({ ...pForm, icon: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Name *</label><input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} style={inp} /></div>
              </div>
              <div><label style={lbl}>Tagline</label><input value={pForm.tagline || ""} onChange={e => setPForm({ ...pForm, tagline: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Description</label><textarea value={pForm.description || ""} onChange={e => setPForm({ ...pForm, description: e.target.value })} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
              <div><label style={lbl}>👤 Who Needs It (ideal buyer)</label><textarea value={pForm.ideal_buyer || ""} onChange={e => setPForm({ ...pForm, ideal_buyer: e.target.value })} style={{ ...inp, minHeight: 56, resize: "vertical" }} placeholder="Who is this for and what does their operation look like?" /></div>
              <div><label style={lbl}>💡 Why It Matters (the pain it solves)</label><textarea value={pForm.why_it_matters || ""} onChange={e => setPForm({ ...pForm, why_it_matters: e.target.value })} style={{ ...inp, minHeight: 56, resize: "vertical" }} placeholder="What does it cost them today, and how does this fix it?" /></div>
              <div><label style={lbl}>Demo Notes / Talking Points</label><textarea value={pForm.demo_notes || ""} onChange={e => setPForm({ ...pForm, demo_notes: e.target.value })} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
              <div><label style={lbl}>Demo Link (video/URL)</label><input value={pForm.demo_url || ""} onChange={e => setPForm({ ...pForm, demo_url: e.target.value })} style={inp} placeholder="https://…" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveProduct} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setPForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {pForm.id && <button onClick={() => delProduct(pForm)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}

      {bForm && (
        <div onClick={() => setBForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 4 }}>{bForm.id ? "Edit Battlecard" : "Add Battlecard"}</div>
            <div style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: 16 }}>Position our difference without knocking the competitor.</div>
            <div style={{ display: "grid", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10 }}>
                <div><label style={lbl}>System / Competitor *</label><input value={bForm.system_name} onChange={e => setBForm({ ...bForm, system_name: e.target.value })} style={inp} placeholder="RMIS, McLeod, spreadsheets…" /></div>
                <div><label style={lbl}>Category</label><input value={bForm.category || ""} onChange={e => setBForm({ ...bForm, category: e.target.value })} style={inp} placeholder="TMS, Compliance…" /></div>
              </div>
              <div><label style={lbl}>💬 What to Say (talk track)</label><textarea value={bForm.talk_track || ""} onChange={e => setBForm({ ...bForm, talk_track: e.target.value })} style={{ ...inp, minHeight: 90, resize: "vertical", lineHeight: 1.5 }} /></div>
              <div><label style={lbl}>Our Edge (what we do different)</label><textarea value={bForm.our_edge || ""} onChange={e => setBForm({ ...bForm, our_edge: e.target.value })} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
              <div><label style={lbl}>⚠ What NOT to Say</label><textarea value={bForm.avoid || ""} onChange={e => setBForm({ ...bForm, avoid: e.target.value })} style={{ ...inp, minHeight: 50, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveBattlecard} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setBForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {bForm.id && <button onClick={() => delBattlecard(bForm)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}

      {sForm && (
        <div onClick={() => setSForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>{sForm.id ? "Edit Script" : "Add Script"}</div>
            <div style={{ display: "grid", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
                <div><label style={lbl}>Title *</label><input value={sForm.title} onChange={e => setSForm({ ...sForm, title: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Category</label><select value={sForm.category} onChange={e => setSForm({ ...sForm, category: e.target.value })} style={inp}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div><label style={lbl}>Script / Content</label><textarea value={sForm.content || ""} onChange={e => setSForm({ ...sForm, content: e.target.value })} style={{ ...inp, minHeight: 180, resize: "vertical", lineHeight: 1.6 }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveScript} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setSForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {sForm.id && <button onClick={() => delScript(sForm)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}
    </HqShell>
  );
}
