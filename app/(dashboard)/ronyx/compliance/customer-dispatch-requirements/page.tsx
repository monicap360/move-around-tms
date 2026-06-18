"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

type Req = {
  id: string;
  customer_name: string;
  applies_to: string;
  requirement_key: string;
  requirement_label: string;
  requirement_status: string;
  blocks_dispatch: boolean;
  requires_manager_override: boolean;
  assigned_role: string | null;
  notes: string | null;
  is_active: boolean;
};

type Override = {
  id: string;
  customer_name: string | null;
  document_type: string | null;
  requirement_key: string | null;
  status: string;
  expiration_date: string | null;
  approved_by_name: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  required:         { label: "Required",          color: "#991b1b", bg: "#fef2f2",   border: "#fca5a5" },
  optional:         { label: "Optional",          color: "#1e40af", bg: "#eff6ff",   border: "#bfdbfe" },
  override_allowed: { label: "Override Allowed",  color: "#92400e", bg: "#fffbeb",   border: "#fcd34d" },
  not_required:     { label: "Not Required",      color: "#166534", bg: "#f0fdf4",   border: "#86efac" },
  project_specific: { label: "Project-Specific",  color: "#6b21a8", bg: "#faf5ff",   border: "#d8b4fe" },
};

const APPLIES_ICONS: Record<string, string> = {
  driver: "🧑‍✈️", truck: "🚛", owner_operator: "🏢", company: "🏗️", project: "📋",
};

function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function CustomerCard({ customer, reqs, overrides }: { customer: string; reqs: Req[]; overrides: Override[] }) {
  const active = reqs.filter((r) => r.is_active);
  const blocks  = active.filter((r) => r.blocks_dispatch && r.requirement_status === "required").length;
  const oas     = active.filter((r) => r.requirement_status === "override_allowed").length;
  const custOverrides = overrides.filter((o) => o.customer_name === customer && o.status === "active");
  const expiring = custOverrides.filter((o) => { const d = daysUntil(o.expiration_date); return d !== null && d <= 7; });

  const byAppliesTo = active.reduce<Record<string, Req[]>>((acc, r) => {
    (acc[r.applies_to] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{customer}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {active.length} active rules · {blocks} dispatch blockers · {oas} override-allowed
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {expiring.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "2px 8px" }}>
              ⚠ {expiring.length} override{expiring.length > 1 ? "s" : ""} expiring
            </span>
          )}
          <Link href={`/ronyx/compliance/customer-dispatch-requirements/${encodeURIComponent(customer)}`}>
            <button style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Configure →
            </button>
          </Link>
        </div>
      </div>

      <div style={{ padding: "12px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
        {Object.entries(byAppliesTo).map(([applies, rs]) => (
          <div key={applies}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              {APPLIES_ICONS[applies] ?? "•"} {applies.replace("_", " ")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {rs.map((r) => {
                const m = STATUS_META[r.requirement_status] ?? STATUS_META.optional;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#334155" }}>{r.requirement_label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MissingQueue({ reqs }: { reqs: Req[] }) {
  const issues = reqs.filter(
    (r) => r.is_active && r.blocks_dispatch && r.requirement_status === "required"
  );
  if (issues.length === 0) return null;

  return (
    <div style={{ border: "1px solid #fca5a5", borderRadius: 12, background: "#fff", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "12px 18px", background: "#fef2f2", borderBottom: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#991b1b" }}>Missing Requirements Work Queue</div>
          <div style={{ fontSize: 11, color: "#dc2626" }}>{issues.length} requirement{issues.length > 1 ? "s" : ""} that block dispatch if missing</div>
        </div>
      </div>
      <div style={{ padding: "12px 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              {["Customer","Applies To","Requirement","Assigned Role","Action"].map((h) => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                <td style={{ padding: "7px 10px", fontWeight: 600, color: "#0f172a" }}>{r.customer_name}</td>
                <td style={{ padding: "7px 10px", color: "#475569" }}>{APPLIES_ICONS[r.applies_to]} {r.applies_to.replace("_"," ")}</td>
                <td style={{ padding: "7px 10px", color: "#0f172a" }}>{r.requirement_label}</td>
                <td style={{ padding: "7px 10px", color: "#64748b" }}>{r.assigned_role ?? "—"}</td>
                <td style={{ padding: "7px 10px" }}>
                  <Link href={`/ronyx/compliance/customer-dispatch-requirements/${encodeURIComponent(r.customer_name)}`}>
                    <button style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      Review
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CustomerDispatchRequirementsPage() {
  const [reqs, setReqs]         = useState<Req[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", applies_to: "driver", requirement_key: "",
    requirement_label: "", requirement_status: "required",
    blocks_dispatch: true, requires_manager_override: false,
    assigned_role: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/ronyx/compliance/customer-dispatch-requirements").then((r) => r.json()),
      fetch("/api/ronyx/compliance/overrides?status=active").then((r) => r.json()),
    ]).then(([reqData, ovData]) => {
      setReqs(reqData.requirements ?? []);
      setOverrides(ovData.overrides ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const customers = useMemo(() => {
    const names = [...new Set(reqs.map((r) => r.customer_name))].sort();
    if (!search) return names;
    return names.filter((n) => n.toLowerCase().includes(search.toLowerCase()));
  }, [reqs, search]);

  const groupedReqs = useMemo(() => {
    const g: Record<string, Req[]> = {};
    for (const r of reqs) {
      (g[r.customer_name] ??= []).push(r);
    }
    return g;
  }, [reqs]);

  const totalBlockers = reqs.filter((r) => r.is_active && r.blocks_dispatch && r.requirement_status === "required").length;
  const totalOverrideAllowed = reqs.filter((r) => r.is_active && r.requirement_status === "override_allowed").length;
  const activeOverrides = overrides.filter((o) => o.status === "active").length;
  const expiringOverrides = overrides.filter((o) => { const d = daysUntil(o.expiration_date); return d !== null && d <= 7; }).length;

  async function saveRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.requirement_key || !form.requirement_label) {
      setToast("Customer, key, and label are required."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/compliance/customer-dispatch-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReqs((prev) => {
        const idx = prev.findIndex((r) => r.id === data.requirement.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = data.requirement; return next; }
        return [...prev, data.requirement];
      });
      setToast("Requirement saved.");
      setShowBuilder(false);
    } catch (err: any) {
      setToast(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3500);
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      Loading dispatch requirements…
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1300, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
          Clearance Check™
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Customer, driver, truck, owner operator, COI, insurance, and document requirements checked before dispatch.
        </div>
      </div>

      {/* AI Requirement Guard */}
      <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, background: "linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%)", padding: "18px 22px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>AI Clearance Check</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>Today's Focus</div>
            <div style={{ fontSize: 13, color: "#1e40af" }}>
              Checks customer-specific requirements before release so no driver, truck, or owner operator is dispatched with missing documents.
            </div>
            {expiringOverrides > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                ⚠ {expiringOverrides} override{expiringOverrides > 1 ? "s" : ""} expiring within 7 days — review before dispatch.
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
            {[
              { label: "Customers",         value: customers.length,    color: "#1d4ed8" },
              { label: "Dispatch Blockers",  value: totalBlockers,       color: "#dc2626" },
              { label: "Override-Allowed",   value: totalOverrideAllowed, color: "#d97706" },
              { label: "Active Overrides",   value: activeOverrides,     color: "#16a34a" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Link href="/ronyx/compliance/overrides">
            <button style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Active Overrides
            </button>
          </Link>
          <button
            onClick={() => setShowBuilder(true)}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            + Add Requirement
          </button>
          <Link href="/ronyx/compliance">
            <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Compliance Center
            </button>
          </Link>
        </div>
      </div>

      {/* Missing Requirements Queue */}
      <MissingQueue reqs={reqs} />

      {/* Requirement Builder */}
      {showBuilder && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Add Requirement</div>
            <button onClick={() => setShowBuilder(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <form onSubmit={saveRequirement}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { label: "Customer Name", key: "customer_name", type: "text", placeholder: "Denesse Group" },
                { label: "Requirement Key", key: "requirement_key", type: "text", placeholder: "cargo_coi" },
                { label: "Requirement Label", key: "requirement_label", type: "text", placeholder: "Cargo COI" },
                { label: "Assigned Role", key: "assigned_role", type: "text", placeholder: "Compliance Admin" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Applies To</label>
                <select value={form.applies_to} onChange={(e) => setForm((p) => ({ ...p, applies_to: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12 }}>
                  <option value="driver">Driver</option>
                  <option value="truck">Truck</option>
                  <option value="owner_operator">Owner Operator</option>
                  <option value="company">Company</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Rule</label>
                <select value={form.requirement_status} onChange={(e) => setForm((p) => ({ ...p, requirement_status: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12 }}>
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                  <option value="override_allowed">Override Allowed</option>
                  <option value="not_required">Not Required</option>
                  <option value="project_specific">Project-Specific</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form.blocks_dispatch}
                  onChange={(e) => setForm((p) => ({ ...p, blocks_dispatch: e.target.checked }))} />
                Blocks Dispatch
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form.requires_manager_override}
                  onChange={(e) => setForm((p) => ({ ...p, requires_manager_override: e.target.checked }))} />
                Requires Manager Override
              </label>
              <button type="submit" disabled={saving}
                style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "none", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Save Requirement"}
              </button>
              <button type="button" onClick={() => setShowBuilder(false)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Customer Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Customer Rulebook</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, width: 240, outline: "none" }}
        />
      </div>

      {customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No customers yet</div>
          <div style={{ fontSize: 13 }}>Run migration 141 to seed the Denesse Group rulebook, or add a requirement above.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {customers.map((c) => (
            <CustomerCard key={c} customer={c} reqs={groupedReqs[c] ?? []} overrides={overrides} />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
