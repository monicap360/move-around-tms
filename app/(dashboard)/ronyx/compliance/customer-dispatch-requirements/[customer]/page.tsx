"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

type Req = {
  id: string;
  customer_name: string;
  applies_to: string;
  requirement_key: string;
  requirement_label: string;
  requirement_status: string;
  blocks_dispatch: boolean;
  requires_expiration_check: boolean;
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
  override_type: string | null;
  status: string;
  expiration_date: string | null;
  approved_by_name: string | null;
  notes: string | null;
};

const STATUS_OPTS = [
  { value: "required",         label: "Required",          color: "#991b1b", bg: "#fef2f2",   border: "#fca5a5" },
  { value: "optional",         label: "Optional",          color: "#1e40af", bg: "#eff6ff",   border: "#bfdbfe" },
  { value: "override_allowed", label: "Override Allowed",  color: "#92400e", bg: "#fffbeb",   border: "#fcd34d" },
  { value: "not_required",     label: "Not Required",      color: "#166534", bg: "#f0fdf4",   border: "#86efac" },
  { value: "project_specific", label: "Project-Specific",  color: "#6b21a8", bg: "#faf5ff",   border: "#d8b4fe" },
];

const APPLIES_SECTIONS: { key: string; label: string; icon: string }[] = [
  { key: "driver",         label: "Driver Requirements",          icon: "🧑‍✈️" },
  { key: "truck",          label: "Truck Requirements",           icon: "🚛" },
  { key: "owner_operator", label: "Owner Operator Requirements",  icon: "🏢" },
  { key: "company",        label: "Company Requirements",         icon: "🏗️" },
  { key: "project",        label: "Project-Specific Requirements",icon: "📋" },
];

function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function StatusPill({ status }: { status: string }) {
  const opt = STATUS_OPTS.find((o) => o.value === status) ?? STATUS_OPTS[0];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: opt.color, background: opt.bg, border: `1px solid ${opt.border}`, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
      {opt.label}
    </span>
  );
}

function RequirementRow({ req, onUpdate }: { req: Req; onUpdate: (id: string, status: string) => void }) {
  const [saving, setSaving] = useState(false);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch("/api/ronyx/compliance/customer-dispatch-requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id, requirement_status: newStatus }),
      });
      onUpdate(req.id, newStatus);
    } finally {
      setSaving(false);
    }
  }

  const aiGuidance: Record<string, string> = {
    required:         `${req.requirement_label} is required before dispatch. Missing it will block the job.`,
    optional:         `${req.requirement_label} is optional. Staff should collect it if available, but it won't block dispatch.`,
    override_allowed: `${req.requirement_label} can be overridden with manager approval. Create an override if dispatch is urgent.`,
    not_required:     `${req.requirement_label} is not required for this customer. No action needed.`,
    project_specific: `${req.requirement_label} is only required for specific projects. Confirm before dispatch.`,
  };

  return (
    <div style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: "12px 14px", background: req.is_active ? "#fff" : "#f8fafc", opacity: req.is_active ? 1 : 0.55 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 3 }}>{req.requirement_label}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>key: {req.requirement_key}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
            {aiGuidance[req.requirement_status] ?? ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
          <StatusPill status={req.requirement_status} />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {STATUS_OPTS.filter((o) => o.value !== req.requirement_status).map((o) => (
              <button
                key={o.value}
                disabled={saving}
                onClick={() => changeStatus(o.value)}
                style={{ padding: "2px 8px", borderRadius: 5, border: `1px solid ${o.border}`, background: o.bg, color: o.color, fontSize: 9, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
              >
                → {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
        {req.blocks_dispatch && <span style={{ color: "#dc2626", fontWeight: 600 }}>⛔ Blocks Dispatch</span>}
        {req.requires_manager_override && <span style={{ color: "#d97706", fontWeight: 600 }}>🔓 Manager Override</span>}
        {req.assigned_role && <span>👤 {req.assigned_role}</span>}
      </div>
    </div>
  );
}

export default function CustomerRequirementsPage() {
  const params = useParams();
  const customer = decodeURIComponent(params.customer as string);

  const [reqs, setReqs]         = useState<Req[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState({
    applies_to: "driver", requirement_key: "", requirement_label: "",
    requirement_status: "required", blocks_dispatch: true,
    requires_manager_override: false, assigned_role: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/ronyx/compliance/customer-dispatch-requirements?customer=${encodeURIComponent(customer)}`).then((r) => r.json()),
      fetch(`/api/ronyx/compliance/overrides?customer_name=${encodeURIComponent(customer)}&status=active`).then((r) => r.json()),
    ]).then(([reqData, ovData]) => {
      setReqs(reqData.requirements ?? []);
      setOverrides(ovData.overrides ?? []);
    }).finally(() => setLoading(false));
  }, [customer]);

  function handleUpdate(id: string, newStatus: string) {
    setReqs((prev) => prev.map((r) => r.id === id ? { ...r, requirement_status: newStatus } : r));
  }

  const byAppliesTo = useMemo(() => {
    const g: Record<string, Req[]> = {};
    for (const r of reqs) (g[r.applies_to] ??= []).push(r);
    return g;
  }, [reqs]);

  const blockers = reqs.filter((r) => r.is_active && r.requirement_status === "required" && r.blocks_dispatch).length;
  const overrideCount = overrides.length;
  const expiringOverrides = overrides.filter((o) => { const d = daysUntil(o.expiration_date); return d !== null && d <= 7; });

  async function saveRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requirement_key || !form.requirement_label) { setToast("Key and label required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/compliance/customer-dispatch-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, customer_name: customer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReqs((prev) => {
        const idx = prev.findIndex((r) => r.id === data.requirement.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = data.requirement; return n; }
        return [...prev, data.requirement];
      });
      setToast("Requirement saved.");
      setShowBuilder(false);
      setForm({ applies_to: "driver", requirement_key: "", requirement_label: "", requirement_status: "required", blocks_dispatch: true, requires_manager_override: false, assigned_role: "", notes: "" });
    } catch (err: any) {
      setToast(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      Loading {customer} requirements…
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12, color: "#64748b" }}>
        <Link href="/ronyx/compliance/customer-dispatch-requirements" style={{ color: "#1d4ed8", fontWeight: 600 }}>
          ← Customer Dispatch Requirements
        </Link>
        <span>/</span>
        <span style={{ color: "#0f172a", fontWeight: 700 }}>{customer}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.4px" }}>{customer}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Customer Dispatch Requirement Profile</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowBuilder(true)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            + Add Requirement
          </button>
          <Link href="/ronyx/compliance/overrides">
            <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Overrides
            </button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "Total Rules",       value: reqs.length,        color: "#1d4ed8" },
          { label: "Dispatch Blockers", value: blockers,           color: "#dc2626" },
          { label: "Active Overrides",  value: overrideCount,      color: "#16a34a" },
          { label: "Overrides Expiring",value: expiringOverrides.length, color: "#d97706" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, minWidth: 120, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* AI Guidance */}
      <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#f0f9ff", padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>AI Staff Guidance</div>
        {blockers > 0 ? (
          <div style={{ fontSize: 13, color: "#1e3a8a" }}>
            {customer} has {blockers} dispatch-blocking requirement{blockers > 1 ? "s" : ""}. These must be verified before assigning any job. Use the toggles below to adjust rules or request overrides for urgent dispatches.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#1e3a8a" }}>
            All requirements for {customer} are configured. Review override-allowed rules regularly and ensure documents are renewed before expiration.
          </div>
        )}
        {expiringOverrides.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            ⚠ {expiringOverrides.length} override{expiringOverrides.length > 1 ? "s" : ""} expiring within 7 days. Request updated documents or renew overrides before they lapse.
          </div>
        )}
      </div>

      {/* Add Requirement Builder */}
      {showBuilder && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "18px 22px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Add Requirement for {customer}</div>
            <button onClick={() => setShowBuilder(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <form onSubmit={saveRequirement}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
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
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Requirement Key</label>
                <input value={form.requirement_key} onChange={(e) => setForm((p) => ({ ...p, requirement_key: e.target.value }))}
                  placeholder="cargo_coi" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Label</label>
                <input value={form.requirement_label} onChange={(e) => setForm((p) => ({ ...p, requirement_label: e.target.value }))}
                  placeholder="Cargo COI" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Rule</label>
                <select value={form.requirement_status} onChange={(e) => setForm((p) => ({ ...p, requirement_status: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12 }}>
                  {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Assigned Role</label>
                <input value={form.assigned_role} onChange={(e) => setForm((p) => ({ ...p, assigned_role: e.target.value }))}
                  placeholder="Compliance Admin" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form.blocks_dispatch} onChange={(e) => setForm((p) => ({ ...p, blocks_dispatch: e.target.checked }))} />
                Blocks Dispatch
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form.requires_manager_override} onChange={(e) => setForm((p) => ({ ...p, requires_manager_override: e.target.checked }))} />
                Requires Manager Override
              </label>
              <button type="submit" disabled={saving}
                style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 7, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setShowBuilder(false)}
                style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requirements by Category */}
      {APPLIES_SECTIONS.filter((s) => byAppliesTo[s.key]?.length > 0).map((section) => (
        <div key={section.key} style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{section.icon}</span> {section.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(byAppliesTo[section.key] ?? []).map((req) => (
              <RequirementRow key={req.id} req={req} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      ))}

      {/* Active Overrides */}
      {overrides.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 10 }}>🔓 Active Overrides</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Requirement","Override Type","Approved By","Expires","Status",""].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overrides.map((o) => {
                  const days = daysUntil(o.expiration_date);
                  const expColor = days !== null && days <= 7 ? "#dc2626" : days !== null && days <= 30 ? "#d97706" : "#16a34a";
                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{o.requirement_key ?? o.document_type ?? "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{o.override_type ?? "Temporary"}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{o.approved_by_name ?? "—"}</td>
                      <td style={{ padding: "9px 12px", color: expColor, fontWeight: 600 }}>
                        {o.expiration_date ? new Date(o.expiration_date).toLocaleDateString() : "—"}
                        {days !== null && ` (${days}d)`}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", background: "#dcfce7", borderRadius: 5, padding: "2px 7px" }}>Active</span>
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <Link href="/ronyx/compliance/overrides">
                          <button style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1d4ed8", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reqs.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No requirements configured for {customer}</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Run migration 141 or add requirements using the button above.</div>
          <button onClick={() => setShowBuilder(true)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Add First Requirement
          </button>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
