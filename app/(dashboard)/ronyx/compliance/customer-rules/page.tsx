"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Rule = {
  id: string;
  customer_name: string;
  project_name: string | null;
  auto_liability_required: boolean;
  general_liability_required: boolean;
  cargo_required: boolean;
  cargo_override_allowed: boolean;
  workers_comp_required: boolean;
  workers_comp_override_allowed: boolean;
  driver_cdl_required: boolean;
  driver_medical_card_required: boolean;
  mvr_required: boolean;
  drug_test_required: boolean;
  background_check_required: boolean;
  loan_agreement_required_if_loan: boolean;
  notes: string | null;
  is_active: boolean;
  updated_at: string;
};

function ReqBadge({ val, overrideAllowed }: { val: boolean; overrideAllowed?: boolean }) {
  if (val)  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#dcfce7", color: "#15803d" }}>Required</span>;
  if (overrideAllowed) return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#fffbeb", color: "#b45309" }}>Override OK</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#f1f5f9", color: "#64748b" }}>Not Required</span>;
}

export default function CustomerRulesPage() {
  const [rules, setRules]   = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ customer_name: "", project_name: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3200); }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/compliance/customer-rules");
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim()) { showToast("Customer name required."); return; }
    setSaving(true);
    const res = await fetch("/api/ronyx/compliance/customer-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Save failed."); return; }
    showToast("Profile created.");
    setShowForm(false);
    setForm({ customer_name: "", project_name: "", notes: "" });
    void load();
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Compliance</div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#0f172a" }}>Customer Compliance Rules</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Configure which documents are required per customer. Rules are checked by Dispatch Guard before every assignment.</p>
          </div>
          <button onClick={() => setShowForm(s => !s)} style={{ padding: "9px 18px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            {showForm ? "Cancel" : "+ Add Customer"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {showForm && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 22, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>New Customer Profile</h2>
            <form onSubmit={createProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label style={lbl}>Customer Name *</label><input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inp} placeholder="e.g. Denesse Group" required /></div>
                <div><label style={lbl}>Project (optional)</label><input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} style={inp} placeholder="Project or site name" /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Notes</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="Notes about this customer's requirements" /></div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px" }}>Default requirements will be applied (CDL, Medical, MVR, Auto Liability, Cargo required). You can edit them on the customer profile page.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{saving ? "Saving…" : "Create Profile"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16 }}>
            {rules.map(r => {
              const isDenessse = r.customer_name === "Denesse Group";
              return (
                <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${isDenessse ? "#bfdbfe" : "#e2e8f0"}`, borderTop: `4px solid ${isDenessse ? "#1e40af" : "#e2e8f0"}`, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>{r.customer_name}</div>
                      {r.project_name && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Project: {r.project_name}</div>}
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Updated {new Date(r.updated_at).toLocaleDateString("en-US")}</div>
                    </div>
                    <Link href={`/ronyx/compliance/customer-rules/${r.customer_name.toLowerCase().replace(/\s+/g, "-")}`}
                      style={{ padding: "6px 14px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                      Configure →
                    </Link>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Auto Liability",   r.auto_liability_required,    false],
                      ["General Liability",r.general_liability_required,  false],
                      ["Cargo COI",        r.cargo_required,              r.cargo_override_allowed],
                      ["Workers Comp",     r.workers_comp_required,       r.workers_comp_override_allowed],
                      ["CDL",              r.driver_cdl_required,         false],
                      ["Medical Card",     r.driver_medical_card_required,false],
                      ["MVR",              r.mvr_required,                false],
                      ["Drug Test",        r.drug_test_required,          false],
                    ].map(([label, req, oa]) => (
                      <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#f8fafc", borderRadius: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label as string}</span>
                        <ReqBadge val={req as boolean} overrideAllowed={oa as boolean} />
                      </div>
                    ))}
                  </div>

                  {r.notes && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", fontStyle: "italic" }}>Note: {r.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
