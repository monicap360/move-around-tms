"use client";

import { useEffect, useMemo, useState } from "react";
import HqShell from "../HqShell";

type Sub = {
  id: string; customer_company: string; contact_name: string | null; email: string | null; phone: string | null;
  plan_name: string | null; amount: number | null; billing_cycle: string; status: string;
  start_date: string | null; next_due_date: string | null; last_paid_date: string | null; notes: string | null;
  autopay: boolean; payment_method: string | null; mandate_status: string | null;
};

const STATUS = ["trial", "active", "paused", "canceled"];
const stColor: Record<string, string> = { trial: "#2563eb", active: "#16a34a", paused: "#d97706", canceled: "#dc2626" };
const money = (n: number | null | undefined) => "$" + Number(n || 0).toLocaleString();
const BLANK = { customer_company: "", contact_name: "", email: "", phone: "", plan_name: "MoveAround TMS", amount: "", billing_cycle: "monthly", status: "active", start_date: "", next_due_date: "", notes: "" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 3 };
const chip: React.CSSProperties = { cursor: "pointer", padding: "5px 11px", borderRadius: 999, fontSize: "0.74rem", fontWeight: 800, background: "#fff", color: "#15803d", border: "1px solid #bbf7d0" };

export default function HqBillingPage() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<any | null>(null);
  const [ccbCount, setCcbCount] = useState("");
  const applyCcb = () => {
    const n = Number(ccbCount) || 0;
    const tier = n <= 50 ? "Starter" : n <= 200 ? "Growth" : "Fleet";
    const amt = n <= 50 ? 299 : n * 5;
    setForm((f: any) => ({ ...f, plan_name: `CCB — ${tier} (${n} carriers)`, amount: String(amt) }));
  };
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any | null>(null); // billing settings modal
  const [savingSettings, setSavingSettings] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const lock = () => { window.location.href = "/hq/login?next=/hq/billing"; };

  async function openSettings() {
    const d = await fetch("/api/hq/settings").then(r => r.json()).catch(() => ({ settings: {} }));
    setSettings({ ...(d.settings || {}), gocardless_token: "" });
  }
  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/hq/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (res.status === 401) { lock(); return; }
      const j = await res.json();
      if (j.error) { flash(`Error: ${j.error}`); return; }
      setSettings(null); flash("Billing settings saved.");
    } finally { setSavingSettings(false); }
  }

  function load() {
    setLoading(true);
    fetch("/api/hq/subscriptions").then(async r => { if (r.status === 401) { lock(); return null; } return r.json(); })
      .then(d => { if (d) setRows(d.subscriptions || []); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const active = rows.filter(s => s.status === "active" || s.status === "trial");
    const mrr = active.reduce((sum, s) => sum + (s.billing_cycle === "annual" ? Number(s.amount || 0) / 12 : Number(s.amount || 0)), 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = rows.filter(s => s.status !== "canceled" && s.next_due_date && s.next_due_date < today).length;
    return { mrr, active: rows.filter(s => s.status === "active").length, overdue, autopay: rows.filter(s => s.autopay && s.mandate_status === "active").length };
  }, [rows]);

  async function save() {
    if (!form.customer_company?.trim()) { flash("Customer company is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/hq/subscriptions", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.status === 401) { lock(); return; }
      const j = await res.json();
      if (j.error) { flash(`Error: ${j.error}`); return; }
      setForm(null); flash(form.id ? "Subscription updated." : "Subscription added."); load();
    } finally { setSaving(false); }
  }
  async function markPaid(s: Sub) {
    const res = await fetch("/api/hq/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, action: "mark_paid" }) });
    if (res.status === 401) { lock(); return; }
    const j = await res.json(); if (j.error) { flash(`Error: ${j.error}`); return; }
    flash(`✓ Payment recorded for ${s.customer_company}. Next due ${j.subscription?.next_due_date}.`); load();
  }
  async function setupAutopay(s: Sub) {
    flash("Creating a secure bank-authorization link…");
    const res = await fetch("/api/hq/subscriptions/autopay-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) });
    const j = await res.json();
    if (j.error) { flash(j.error); return; }
    if (j.auth_url) { window.open(j.auth_url, "_blank"); flash(`Auto-pay link opened — send it to ${s.customer_company} to approve ACH debits.`); load(); }
  }
  async function del(s: Sub) { if (!confirm(`Delete subscription for "${s.customer_company}"?`)) return; await fetch(`/api/hq/subscriptions?id=${s.id}`, { method: "DELETE" }); setRows(rs => rs.filter(x => x.id !== s.id)); setForm(null); flash("Deleted."); }

  const overdue = (d: string | null) => d && d < new Date().toISOString().slice(0, 10);
  const cell: React.CSSProperties = { padding: "10px 12px", fontSize: "0.82rem", color: "#334155", verticalAlign: "middle" };

  return (
    <HqShell active="billing">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700, maxWidth: 360 }}>{toast}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>💳 Billing &amp; Subscriptions</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Customer subscriptions billed by <strong>ACH / check</strong> — money goes straight to your bank. Auto-pay via GoCardless (no Stripe).</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openSettings} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 14px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}>⚙ Settings</button>
            <button onClick={() => setForm({ ...BLANK })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>+ Add Subscription</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "18px 0" }}>
          {[
            { label: "MRR (Monthly)", value: money(Math.round(kpis.mrr)), color: "#16a34a" },
            { label: "Active Subs", value: String(kpis.active), color: "#2563eb" },
            { label: "Overdue", value: String(kpis.overdue), color: kpis.overdue ? "#dc2626" : "#0f172a" },
            { label: "Auto-pay Active", value: String(kpis.autopay), color: "#7c3aed" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, marginTop: 3 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading…</div>
          : rows.length === 0 ? <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8" }}>No subscriptions yet. Add one when a customer starts a paid plan.</div>
          : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Customer", "Plan", "Amount", "Next due", "Status", "Auto-pay", "Actions"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map(s => (
                    <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={cell}><div style={{ fontWeight: 800, color: "#0f172a", cursor: "pointer" }} onClick={() => setForm({ ...s, amount: s.amount ?? "", start_date: s.start_date || "", next_due_date: s.next_due_date || "" })}>{s.customer_company}</div><div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.contact_name || s.email || ""}</div></td>
                      <td style={cell}>{s.plan_name}<span style={{ color: "#94a3b8", fontSize: "0.72rem" }}> /{s.billing_cycle === "annual" ? "yr" : "mo"}</span></td>
                      <td style={{ ...cell, fontWeight: 800 }}>{money(s.amount)}</td>
                      <td style={cell}>{s.next_due_date ? <span style={{ color: overdue(s.next_due_date) ? "#dc2626" : "#334155", fontWeight: overdue(s.next_due_date) ? 800 : 500 }}>{s.next_due_date}{overdue(s.next_due_date) ? " ⚠" : ""}</span> : "—"}</td>
                      <td style={cell}><span style={{ fontSize: "0.7rem", fontWeight: 800, color: stColor[s.status], background: stColor[s.status] + "18", border: `1px solid ${stColor[s.status]}55`, borderRadius: 999, padding: "2px 9px", textTransform: "capitalize" }}>{s.status}</span></td>
                      <td style={cell}>{s.autopay ? <span style={{ fontSize: "0.7rem", fontWeight: 800, color: s.mandate_status === "active" ? "#15803d" : "#b45309" }}>{s.mandate_status === "active" ? "✓ ACH on" : "⏳ pending"}</span> : <span style={{ color: "#cbd5e1", fontSize: "0.72rem" }}>manual</span>}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>
                        <button onClick={() => markPaid(s)} title="Record a payment" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 7, padding: "5px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", marginRight: 5 }}>✓ Mark Paid</button>
                        <a href={`/api/hq/subscriptions/${s.id}/invoice`} title="Download invoice PDF" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 7, padding: "5px 10px", fontSize: "0.72rem", fontWeight: 800, textDecoration: "none", marginRight: 5 }}>📄 Invoice</a>
                        {!s.autopay && <button onClick={() => setupAutopay(s)} title="Send customer a GoCardless ACH authorization" style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 7, padding: "5px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>🔗 Auto-pay</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>{form.id ? "Edit Subscription" : "Add Subscription"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Customer Company *</label><input value={form.customer_company} onChange={e => setForm({ ...form, customer_company: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Contact Name</label><input value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Email</label><input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Phone</label><input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: "1 / -1", background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "10px 12px" }}>
                <label style={lbl}>Quick-fill plan</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" onClick={() => setForm({ ...form, plan_name: "MoveAround TMS" })} style={chip}>MoveAround TMS</button>
                  <button type="button" onClick={() => setForm({ ...form, plan_name: "CCB — Starter", amount: "299" })} style={chip}>CCB Starter · $299</button>
                  <span style={{ width: 1, height: 22, background: "#cbd5e1" }} />
                  <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700 }}>CCB by carriers:</span>
                  <input type="number" value={ccbCount} onChange={e => setCcbCount(e.target.value)} placeholder="#" style={{ ...inp, width: 80 }} />
                  <button type="button" onClick={applyCcb} style={{ ...chip, background: "#16a34a", color: "#fff", border: "none" }}>Apply ($5/carrier)</button>
                </div>
              </div>
              <div><label style={lbl}>Plan</label><input value={form.plan_name || ""} onChange={e => setForm({ ...form, plan_name: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Amount ($)</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Billing Cycle</label><select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })} style={inp}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></div>
              <div><label style={lbl}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Start Date</label><input type="date" value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Next Due</label><input type="date" value={form.next_due_date || ""} onChange={e => setForm({ ...form, next_due_date: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, minHeight: 56, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: saving ? "default" : "pointer" }}>{saving ? "Saving…" : form.id ? "Save Changes" : "Add Subscription"}</button>
              <button onClick={() => setForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
              {form.id && <button onClick={() => del(form)} style={{ marginLeft: "auto", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}
      {settings && (
        <div onClick={() => setSettings(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 4 }}>⚙ Billing Settings</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 16 }}>These appear on your invoices and power auto-pay. Money goes straight to your bank.</div>
            <div style={{ fontWeight: 800, fontSize: "0.72rem", color: "#475569", textTransform: "uppercase", marginBottom: 8 }}>Invoice / ACH details</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div><label style={lbl}>Your Business Name (on invoice)</label><input value={settings.billing_from || ""} onChange={e => setSettings({ ...settings, billing_from: e.target.value })} style={inp} placeholder="MoveAround TMS LLC" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Bank Name</label><input value={settings.billing_bank || ""} onChange={e => setSettings({ ...settings, billing_bank: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Routing #</label><input value={settings.billing_routing || ""} onChange={e => setSettings({ ...settings, billing_routing: e.target.value })} style={inp} /></div>
              </div>
              <div><label style={lbl}>Account #</label><input value={settings.billing_account || ""} onChange={e => setSettings({ ...settings, billing_account: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Check Remit-To Address</label><input value={settings.billing_remit || ""} onChange={e => setSettings({ ...settings, billing_remit: e.target.value })} style={inp} placeholder="123 Main St, Houston, TX 77001" /></div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.72rem", color: "#475569", textTransform: "uppercase", margin: "18px 0 8px" }}>Auto-pay (GoCardless ACH)</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div><label style={lbl}>GoCardless Access Token {settings.gocardless_connected && <span style={{ color: "#15803d" }}>· connected (…{settings.gocardless_last4})</span>}</label><input value={settings.gocardless_token || ""} onChange={e => setSettings({ ...settings, gocardless_token: e.target.value })} style={inp} placeholder={settings.gocardless_connected ? "leave blank to keep current" : "paste your token"} /></div>
              <div><label style={lbl}>Environment</label><select value={settings.gocardless_env || "sandbox"} onChange={e => setSettings({ ...settings, gocardless_env: e.target.value })} style={inp}><option value="sandbox">Sandbox (testing)</option><option value="live">Live</option></select></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveSettings} disabled={savingSettings} style={{ background: savingSettings ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: savingSettings ? "default" : "pointer" }}>{savingSettings ? "Saving…" : "Save Settings"}</button>
              <button onClick={() => setSettings(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </HqShell>
  );
}
