"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────────────── */

type RateCard = {
  id: string;
  customer_name: string;
  rate_name: string | null;
  structure: string | null;
  method: string;
  base_rate: number | null;
  fuel_linked: boolean;
  fuel_pct: number | null;
  detention_free_minutes: number | null;
  detention_rate: number | null;
  minimum_charge: number | null;
  material_surcharges: MaterialSurcharge[];
  notes: string | null;
  status: string;
  effective_date: string | null;
  updated_at: string;
};

type MaterialSurcharge = { material: string; surcharge: number; unit: string };

const METHODS = ["hour","load","ton","mile","trip","per_yard"] as const;
const METHOD_LABELS: Record<string, string> = {
  hour: "Per Hour", load: "Per Load", ton: "Per Ton",
  mile: "Per Mile", trip: "Per Trip", per_yard: "Per Yard",
};

const FONT  = "'Inter','Segoe UI',sans-serif";
const BLUE  = "#1d4ed8";
const DARK  = "#0f172a";
const MED   = "#475569";
const LIGHT = "#64748b";
const BORD  = "#e2e8f0";
const WHITE = "#fff";

const EMPTY_CARD: Omit<RateCard,"id"|"updated_at"> = {
  customer_name: "", rate_name: "", structure: "", method: "load",
  base_rate: null, fuel_linked: false, fuel_pct: null,
  detention_free_minutes: null, detention_rate: null, minimum_charge: null,
  material_surcharges: [], notes: "", status: "active", effective_date: null,
};

const RATE_TYPES = [
  { key: "per_load",           label: "Per Load",             desc: "Fixed rate per load" },
  { key: "per_ton",            label: "Per Ton",              desc: "Rate multiplied by tonnage" },
  { key: "per_mile",           label: "Per Mile",             desc: "Rate multiplied by miles" },
  { key: "per_hour",           label: "Per Hour",             desc: "Hourly rate, minimum hours may apply" },
  { key: "owner_op_pct",       label: "Owner-Op %",           desc: "Percentage of haul revenue to owner-operator" },
  { key: "fuel_surcharge",     label: "Fuel Surcharge",       desc: "Percentage added to base rate for fuel" },
  { key: "detention",          label: "Detention / Wait Time",desc: "Per-hour charge after free minutes" },
  { key: "minimum_load",       label: "Minimum Charge",       desc: "Minimum invoice per load or trip" },
];

export default function RateCardsPage() {
  const [cards, setCards]       = useState<RateCard[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<(typeof EMPTY_CARD & { id?: string }) | null>(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [surchargeText, setSurchargeText] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadCards() {
    try {
      const r = await fetch("/api/ronyx/rate-cards");
      const d = await r.json();
      setCards(d.rateCards || []);
    } catch {
      showToast("Failed to load rate cards.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCards(); }, []);

  function openCreate() {
    setModal({ ...EMPTY_CARD });
    setSurchargeText("");
  }

  function openEdit(c: RateCard) {
    setModal({ ...c });
    setSurchargeText((c.material_surcharges || []).map(s => `${s.material}:${s.surcharge}:${s.unit}`).join("\n"));
  }

  function parseSurcharges(text: string): MaterialSurcharge[] {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [material, surcharge, unit] = line.split(":");
      return { material: material || "", surcharge: Number(surcharge) || 0, unit: unit || "flat" };
    }).filter(s => s.material);
  }

  async function save() {
    if (!modal) return;
    if (!modal.customer_name?.trim()) { showToast("Customer name required.", false); return; }
    setSaving(true);
    try {
      const payload = {
        ...modal,
        material_surcharges: parseSurcharges(surchargeText),
        base_rate:               modal.base_rate         ? Number(modal.base_rate)         : null,
        fuel_pct:                modal.fuel_pct          ? Number(modal.fuel_pct)          : null,
        detention_free_minutes:  modal.detention_free_minutes ? Number(modal.detention_free_minutes) : null,
        detention_rate:          modal.detention_rate    ? Number(modal.detention_rate)    : null,
        minimum_charge:          modal.minimum_charge    ? Number(modal.minimum_charge)    : null,
      };
      const isEdit = Boolean((modal as any).id);
      const res = await fetch("/api/ronyx/rate-cards", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setModal(null);
      showToast(isEdit ? "Rate card updated." : "Rate card created.");
      await loadCards();
    } catch (e: any) {
      showToast(e.message || "Save failed.", false);
    } finally {
      setSaving(false);
    }
  }

  const filtered = cards.filter(c =>
    !search ||
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.rate_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.method?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt$ = (n: number | null) => n != null ? `$${Number(n).toFixed(2)}` : "—";

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, maxWidth: 1200, margin: "0 auto", minHeight: "100vh", background: "#f8fafc" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/ronyx/settings" style={{ fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>← Admin</Link>
        <span style={{ color: "#cbd5e1" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Rate Card Center</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: DARK, letterSpacing: "-0.5px", marginBottom: 4 }}>Rate Card Center</div>
          <div style={{ fontSize: 13, color: LIGHT }}>Manage customer rates, contractor splits, surcharges, minimums, and detention rules.</div>
        </div>
        <button onClick={openCreate}
          style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
          + New Rate Card
        </button>
      </div>

      {/* Rate type reference */}
      <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: MED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Rate Structures Supported</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {RATE_TYPES.map(rt => (
            <div key={rt.key} style={{ background: "#f8fafc", border: `1px solid ${BORD}`, borderRadius: 8, padding: "7px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{rt.label}</div>
              <div style={{ fontSize: 10.5, color: LIGHT }}>{rt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, rate name, or method…"
        style={{ width: "100%", padding: "10px 14px", border: `1px solid ${BORD}`, borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: FONT, background: WHITE }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: LIGHT }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 8 }}>No rate cards yet</div>
          <div style={{ fontSize: 13, color: LIGHT, maxWidth: 380, margin: "0 auto 20px" }}>
            Create rate cards for each customer so dispatch and payroll automatically apply the right rate.
          </div>
          <button onClick={openCreate}
            style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Create First Rate Card
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "18px 20px", opacity: c.status === "active" ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14.5, color: DARK, marginBottom: 2 }}>{c.customer_name}</div>
                  {c.rate_name && <div style={{ fontSize: 11.5, color: LIGHT }}>{c.rate_name}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.status === "active" ? "#f0fdf4" : "#f1f5f9", color: c.status === "active" ? "#16a34a" : LIGHT, border: `1px solid ${c.status === "active" ? "#86efac" : BORD}` }}>
                    {c.status}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Method",   value: METHOD_LABELS[c.method] || c.method },
                  { label: "Base Rate", value: fmt$(c.base_rate) },
                  { label: "Min Charge",value: fmt$(c.minimum_charge) },
                  { label: "Fuel +",   value: c.fuel_linked ? `${c.fuel_pct ?? 0}%` : "—" },
                ].map(row => (
                  <div key={row.label} style={{ background: "#f8fafc", borderRadius: 7, padding: "7px 10px" }}>
                    <div style={{ fontSize: 10, color: LIGHT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginTop: 1 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {(c.material_surcharges || []).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Material Surcharges</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {c.material_surcharges.map((s, i) => (
                      <span key={i} style={{ fontSize: 11, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 5, padding: "2px 8px", color: BLUE, fontWeight: 600 }}>
                        {s.material}: ${s.surcharge}/{s.unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {c.detention_free_minutes && (
                <div style={{ fontSize: 11.5, color: LIGHT, marginBottom: 10 }}>
                  Detention: ${c.detention_rate}/hr after {c.detention_free_minutes} min free
                </div>
              )}

              {c.notes && <div style={{ fontSize: 11.5, color: LIGHT, lineHeight: 1.5, marginBottom: 10 }}>{c.notes}</div>}

              <button onClick={() => openEdit(c)}
                style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>
                Edit Rate Card
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: FONT }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: WHITE, borderRadius: 16, width: "100%", maxWidth: 600, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${BORD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>
                {(modal as any).id ? "Edit Rate Card" : "New Rate Card"}
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: LIGHT }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {/* Customer name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Customer Name *</label>
                  <input value={modal.customer_name} onChange={e => setModal(m => m ? { ...m, customer_name: e.target.value } : m)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Rate Card Name</label>
                  <input value={modal.rate_name || ""} onChange={e => setModal(m => m ? { ...m, rate_name: e.target.value } : m)} placeholder="e.g. Crushed Limestone - Zone A"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Rate Method</label>
                  <select value={modal.method} onChange={e => setModal(m => m ? { ...m, method: e.target.value } : m)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", background: WHITE, fontFamily: FONT }}>
                    {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Base Rate ($)</label>
                  <input type="number" step="0.01" value={modal.base_rate ?? ""} onChange={e => setModal(m => m ? { ...m, base_rate: e.target.value ? Number(e.target.value) : null } : m)}
                    placeholder="0.00"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Minimum Charge ($)</label>
                  <input type="number" step="0.01" value={modal.minimum_charge ?? ""} onChange={e => setModal(m => m ? { ...m, minimum_charge: e.target.value ? Number(e.target.value) : null } : m)}
                    placeholder="0.00"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5, cursor: "pointer" }}>
                    <input type="checkbox" checked={modal.fuel_linked} onChange={e => setModal(m => m ? { ...m, fuel_linked: e.target.checked } : m)} style={{ accentColor: BLUE }} />
                    Fuel Surcharge Linked
                  </label>
                  <input type="number" step="0.1" value={modal.fuel_pct ?? ""} onChange={e => setModal(m => m ? { ...m, fuel_pct: e.target.value ? Number(e.target.value) : null } : m)}
                    placeholder="%" disabled={!modal.fuel_linked}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT, opacity: modal.fuel_linked ? 1 : 0.4 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Free Minutes (Detention)</label>
                  <input type="number" value={modal.detention_free_minutes ?? ""} onChange={e => setModal(m => m ? { ...m, detention_free_minutes: e.target.value ? Number(e.target.value) : null } : m)}
                    placeholder="e.g. 30"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Detention Rate ($/hr)</label>
                  <input type="number" step="0.01" value={modal.detention_rate ?? ""} onChange={e => setModal(m => m ? { ...m, detention_rate: e.target.value ? Number(e.target.value) : null } : m)}
                    placeholder="0.00"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>
                  Material Surcharges <span style={{ fontWeight: 400, color: LIGHT }}>(one per line: material:amount:unit)</span>
                </label>
                <textarea value={surchargeText} onChange={e => setSurchargeText(e.target.value)} rows={3}
                  placeholder={"Crushed Limestone:2.50:ton\nSand:1.00:load\nTopsoil:3.00:ton"}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Status</label>
                  <select value={modal.status} onChange={e => setModal(m => m ? { ...m, status: e.target.value } : m)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", background: WHITE, fontFamily: FONT }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Effective Date</label>
                  <input type="date" value={modal.effective_date || ""} onChange={e => setModal(m => m ? { ...m, effective_date: e.target.value || null } : m)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Notes</label>
                <textarea value={modal.notes || ""} onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)} rows={2}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: FONT }} />
              </div>
            </div>
            <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${BORD}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", color: MED, fontFamily: FONT }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: saving ? "#93c5fd" : BLUE, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", color: WHITE, fontFamily: FONT }}>
                {saving ? "Saving…" : (modal as any).id ? "Save Changes" : "Create Rate Card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? DARK : "#dc2626", color: WHITE, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, fontFamily: FONT, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
