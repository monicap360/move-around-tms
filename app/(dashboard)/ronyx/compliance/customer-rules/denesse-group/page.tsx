"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DRule = {
  id: string;
  customer_name: string;
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
};

type Toggle = { key: keyof DRule; label: string; overrideKey?: keyof DRule; overrideLabel?: string; section: string };

const TOGGLES: Toggle[] = [
  // COI
  { key: "auto_liability_required",    label: "Auto Liability COI",    section: "COI Requirements" },
  { key: "general_liability_required", label: "General Liability COI", section: "COI Requirements" },
  { key: "workers_comp_required",      label: "Workers Comp",          overrideKey: "workers_comp_override_allowed", overrideLabel: "Allow override", section: "COI Requirements" },
  // Driver docs
  { key: "driver_cdl_required",             label: "CDL / Driver License", section: "Driver Documents" },
  { key: "driver_medical_card_required",    label: "Medical Card",         section: "Driver Documents" },
  { key: "mvr_required",                    label: "MVR",                  section: "Driver Documents" },
  { key: "drug_test_required",              label: "Drug Test",            section: "Driver Documents" },
  { key: "background_check_required",       label: "Background Check",     section: "Driver Documents" },
  // Agreements
  { key: "loan_agreement_required_if_loan", label: "Loan Agreement (if loan exists)", section: "Agreements" },
];

const SECTIONS = ["COI Requirements", "Driver Documents", "Agreements"];

export default function DenessGroupRulesPage() {
  const [rule, setRule]     = useState<DRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const [dirty,   setDirty]   = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/ronyx/compliance/customer-rules?customer_name=Denesse+Group");
    const data = await res.json();
    const r    = (data.rules ?? [])[0] ?? null;
    setRule(r);
    setLoading(false);
    setDirty(false);
  }

  useEffect(() => { void load(); }, []);

  function toggle(key: keyof DRule) {
    if (!rule) return;
    setRule(r => r ? { ...r, [key]: !r[key] } : r);
    setDirty(true);
  }

  async function save() {
    if (!rule) return;
    setSaving(true);
    const res = await fetch("/api/ronyx/compliance/customer-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Save failed."); return; }
    showToast("Denesse Group rules saved.");
    setDirty(false);
  }

  async function createIfMissing() {
    setSaving(true);
    const res = await fetch("/api/ronyx/compliance/customer-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_name: "Denesse Group" }),
    });
    setSaving(false);
    if (!res.ok) { showToast("Could not create profile."); return; }
    showToast("Denesse Group profile created with defaults.");
    void load();
  }

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontFamily: "Inter,sans-serif" }}>Loading…</div>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              <Link href="/ronyx/compliance/customer-rules" style={{ color: "#94a3b8", textDecoration: "none" }}>Customer Rules</Link>
              {" / "}Denesse Group
            </div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#0f172a" }}>Denesse Group Compliance Rules</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Configure which documents are required for Denesse Group work. Cargo and Workers Comp may be allowed as manager-approved overrides when permitted by the project.
            </p>
          </div>
          {dirty && (
            <button onClick={save} disabled={saving} style={{ padding: "9px 20px", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 860 }}>

        {!rule ? (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>⚠</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>No Denesse Group profile found</div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>The database migration has not been applied or the seed did not run. Create the default profile now.</p>
            <button onClick={createIfMissing} disabled={saving} style={{ padding: "9px 20px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {saving ? "Creating…" : "Create Default Profile"}
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>Or run migration 139_company_specific_compliance.sql in Supabase SQL Editor first.</div>
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: "#1e40af", fontSize: 13, marginBottom: 4 }}>About Denesse Group Compliance</div>
              <div style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.6 }}>
                Auto Liability and General Liability are always required. Cargo COI and Workers Comp can be enabled or set to override-allowed. Toggle CDL, Medical Card, MVR, and other driver document requirements below. All changes are logged and checked by Dispatch Guard before every job assignment.
              </div>
            </div>

            {SECTIONS.map(section => (
              <div key={section} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 14, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>{section}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {TOGGLES.filter(t => t.section === section).map(t => {
                    const val = rule[t.key] as boolean;
                    return (
                      <div key={String(t.key)}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #f1f5f9" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{t.label}</div>
                            {val && t.overrideKey && (
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                Override: {(rule[t.overrideKey] as boolean) ? "Allowed with manager approval" : "Not allowed — hard requirement"}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                              onClick={() => toggle(t.key)}
                              style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: val ? "#1d4ed8" : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                            >
                              <span style={{ position: "absolute", top: 3, left: val ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 700, color: val ? "#1d4ed8" : "#94a3b8", minWidth: 62 }}>{val ? "Required" : "Not Required"}</span>
                          </div>
                        </div>
                        {val && t.overrideKey && (
                          <div style={{ marginLeft: 14, padding: "8px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderTop: "none", borderRadius: "0 0 8px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>{t.overrideLabel}</span>
                            <button
                              onClick={() => toggle(t.overrideKey!)}
                              style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: (rule[t.overrideKey] as boolean) ? "#d97706" : "#cbd5e1", position: "relative", flexShrink: 0 }}
                            >
                              <span style={{ position: "absolute", top: 2, left: (rule[t.overrideKey] as boolean) ? 19 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 10 }}>Notes</div>
              <textarea
                value={rule.notes ?? ""}
                onChange={e => { setRule(r => r ? { ...r, notes: e.target.value } : r); setDirty(true); }}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, resize: "vertical", minHeight: 72, outline: "none", boxSizing: "border-box" }}
                placeholder="Notes about Denesse Group compliance requirements, project overrides, or contact information…"
              />
            </div>

            {/* Active Overrides shortcut */}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#15803d" }}>Active Overrides for Denesse Group</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>View and manage Cargo / Workers Comp overrides approved for Denesse Group work.</div>
              </div>
              <Link href="/ronyx/compliance/overrides?customer=Denesse+Group" style={{ padding: "7px 14px", background: "#16a34a", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                View Overrides →
              </Link>
            </div>

            {dirty && (
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button onClick={save} disabled={saving} style={{ padding: "10px 24px", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={load} style={{ padding: "10px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Discard Changes
                </button>
              </div>
            )}
          </>
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
