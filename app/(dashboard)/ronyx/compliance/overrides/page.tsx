"use client";

import { useEffect, useState } from "react";
import { safePrompt } from "@/lib/safePrompt";

type Override = {
  id: string;
  document_type: string;
  requirement_type: string;
  override_type: string;
  override_reason: string;
  approved_by_name: string;
  approved_at: string;
  expiration_date: string | null;
  status: string;
  customer_name: string | null;
  project_name: string | null;
  owner_operator_name: string | null;
  driver_name: string | null;
  notes: string | null;
};

const DOC_TYPES = [
  { value: "cargo_coi",         label: "Cargo COI" },
  { value: "workers_comp",      label: "Workers Comp" },
  { value: "auto_liability",    label: "Auto Liability COI" },
  { value: "general_liability", label: "General Liability COI" },
  { value: "cdl",               label: "CDL" },
  { value: "medical_card",      label: "Medical Card" },
  { value: "mvr",               label: "MVR" },
];

const OVERRIDE_TYPES = [
  { value: "temporary",  label: "Temporary" },
  { value: "one_time",   label: "One-Time Dispatch" },
  { value: "customer",   label: "Customer-Specific" },
  { value: "project",    label: "Project-Specific" },
  { value: "global",     label: "Global" },
];

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function statusBadge(o: Override) {
  const days = daysLeft(o.expiration_date);
  if (o.status === "revoked")   return { text: "Revoked",  color: "#dc2626", bg: "#fef2f2" };
  if (o.status === "expired")   return { text: "Expired",  color: "#64748b", bg: "#f1f5f9" };
  if (days !== null && days <= 0) return { text: "Expired", color: "#64748b", bg: "#f1f5f9" };
  if (days !== null && days <= 7) return { text: `Expiring in ${days}d`, color: "#ea580c", bg: "#fff7ed" };
  return { text: "Active", color: "#16a34a", bg: "#f0fdf4" };
}

const BLANK_FORM = {
  document_type: "", override_type: "temporary", override_reason: "",
  approved_by_name: "", expiration_date: "", customer_name: "",
  owner_operator_name: "", driver_name: "", notes: "",
  requirement_type: "document",
};

export default function ComplianceOverridesPage() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ ...BLANK_FORM });
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ronyx/compliance/overrides?status=${statusFilter}`);
      const data = await res.json();
      setOverrides(data.overrides ?? []);
    } catch { /* keep empty */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [statusFilter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.document_type || !form.override_reason || !form.approved_by_name) {
      showToast("Document type, reason, and approver are required."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/compliance/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Save failed."); return; }
      showToast("Override saved.");
      setShowForm(false);
      setForm({ ...BLANK_FORM });
      void load();
    } catch { showToast("Network error — try again."); }
    finally { setSaving(false); }
  }

  async function revoke(id: string) {
    const reason = safePrompt("Reason for revoking this override?", "Override revoked by manager");
    if (!reason) return;
    await fetch("/api/ronyx/compliance/overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "revoke", revoked_by_name: "Admin", revoke_reason: reason }),
    });
    showToast("Override revoked.");
    void load();
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Compliance</div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#0f172a" }}>Compliance Overrides</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Overrides do not remove a requirement — they allow dispatch with manager approval, a reason, an expiration date, and a full audit trail.
            </p>
          </div>
          <button onClick={() => setShowForm(s => !s)} style={{ padding: "9px 18px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            {showForm ? "Cancel" : "+ New Override"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* New Override Form */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 22, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>New Compliance Override</h2>
            <form onSubmit={submit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Document Type *</label>
                  <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))} style={inp} required>
                    <option value="">Select…</option>
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Override Type *</label>
                  <select value={form.override_type} onChange={e => setForm(f => ({ ...f, override_type: e.target.value }))} style={inp}>
                    {OVERRIDE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Expiration Date</label>
                  <input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Approved By *</label>
                  <input value={form.approved_by_name} onChange={e => setForm(f => ({ ...f, approved_by_name: e.target.value }))} style={inp} placeholder="Manager name" required />
                </div>
                <div>
                  <label style={lbl}>Customer (optional)</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inp} placeholder="e.g. Denesse Group" />
                </div>
                <div>
                  <label style={lbl}>Owner Operator (optional)</label>
                  <input value={form.owner_operator_name} onChange={e => setForm(f => ({ ...f, owner_operator_name: e.target.value }))} style={inp} placeholder="Company name" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Override Reason *</label>
                <textarea value={form.override_reason} onChange={e => setForm(f => ({ ...f, override_reason: e.target.value }))} style={{ ...inp, height: 72, resize: "vertical" }} placeholder="Why is this override necessary?" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="Additional notes…" />
              </div>
              <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", marginBottom: 16 }}>
                This override will appear as a badge on the driver/OO dispatch screen. The original document requirement remains — the override only permits dispatch while active.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : "Save Override"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm({ ...BLANK_FORM }); }} style={{ padding: "9px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter strip */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["active","expired","revoked"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "6px 14px", background: statusFilter === s ? "#1e40af" : "#fff", color: statusFilter === s ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
              {s}
            </button>
          ))}
          <button onClick={load} style={{ marginLeft: "auto", padding: "6px 14px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>↺ Refresh</button>
        </div>

        {/* Overrides list */}
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading overrides…</div>
        ) : overrides.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No {statusFilter} overrides</div>
            <div style={{ fontSize: 13 }}>Active overrides will appear here after a manager approves them.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 14 }}>
            {overrides.map(o => {
              const badge = statusBadge(o);
              const days  = daysLeft(o.expiration_date);
              const docLabel = DOC_TYPES.find(d => d.value === o.document_type)?.label ?? o.document_type;
              return (
                <div key={o.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", borderLeft: `4px solid ${badge.color}`, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 3 }}>{docLabel}</div>
                      {o.customer_name && <div style={{ fontSize: 11, color: "#64748b" }}>Customer: {o.customer_name}</div>}
                      {o.owner_operator_name && <div style={{ fontSize: 11, color: "#64748b" }}>OO: {o.owner_operator_name}</div>}
                      {o.driver_name && <div style={{ fontSize: 11, color: "#64748b" }}>Driver: {o.driver_name}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>{badge.text}</span>
                  </div>

                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, fontStyle: "italic" }}>
                    "{o.override_reason}"
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                    {[
                      ["Type",      OVERRIDE_TYPES.find(t => t.value === o.override_type)?.label ?? o.override_type],
                      ["Approved",  o.approved_by_name],
                      ["Expires",   o.expiration_date ? new Date(o.expiration_date).toLocaleDateString("en-US") : "No expiration"],
                      ["Approved",  new Date(o.approved_at).toLocaleDateString("en-US")],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{lbl}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {days !== null && days <= 7 && days >= 0 && o.status === "active" && (
                    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#b45309", fontWeight: 700, marginBottom: 10 }}>
                      ⚠ Expiring in {days} day{days !== 1 ? "s" : ""} — renew or let expire
                    </div>
                  )}

                  {o.notes && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Note: {o.notes}</div>}

                  {o.status === "active" && (
                    <button onClick={() => revoke(o.id)} style={{ padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                      Revoke Override
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
