"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgRow = {
  id: string;
  name: string;
  organization_code: string | null;
  organization_slug: string | null;
  slug_verified: boolean;
  status: string;
  account_type: string | null;
  subscription_status: string | null;
  bypass_subscription: boolean;
  subscription_required: boolean;
  onboarding_tier: string | null;
  onboarding_setup_fee: number | null;
  onboarding_monthly_fee: number | null;
  platform_notes: string | null;
  created_at: string;
  subdomain_url: string | null;
  is_ronyx: boolean;
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: "free_trial",       label: "Free Trial",        color: "#0891b2" },
  { value: "paid_onboarding",  label: "Paid Onboarding",   color: "#16a34a" },
  { value: "paid_subscription",label: "Paid Subscription", color: "#7c3aed" },
  { value: "suspended",        label: "Suspended",          color: "#dc2626" },
  { value: "standard",         label: "Standard",           color: "#64748b" },
];

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "trial_active",    label: "Trial Active" },
  { value: "onboarding_paid", label: "Onboarding Paid" },
  { value: "active",          label: "Active" },
  { value: "past_due",        label: "Past Due" },
  { value: "cancelled",       label: "Cancelled" },
  { value: "none",            label: "None" },
];

const ONBOARDING_TIERS = [
  { value: "none",                  label: "None" },
  { value: "founding_carrier_full", label: "Founding Carrier Full — $2,500 + $499/mo" },
  { value: "operations_launch",     label: "Operations Launch — $2,500 + $599/mo" },
  { value: "starter_launch",        label: "Starter Launch — $999 + $299/mo" },
  { value: "custom",                label: "Custom Pricing" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function accountTypeBadge(type: string | null): { bg: string; color: string; label: string } {
  const opt = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type);
  if (!opt) return { bg: "#f1f5f9", color: "#64748b", label: type || "—" };
  return { bg: opt.color + "20", color: opt.color, label: opt.label };
}

function subStatusBadge(status: string | null): { bg: string; color: string; label: string } {
  switch (status) {
    case "trial_active":    return { bg: "#cffafe", color: "#0e7490", label: "Trial Active" };
    case "onboarding_paid": return { bg: "#dcfce7", color: "#15803d", label: "Onboarding Paid ✓" };
    case "active":          return { bg: "#dcfce7", color: "#15803d", label: "Active" };
    case "past_due":        return { bg: "#fee2e2", color: "#dc2626", label: "Past Due ⚠️" };
    case "cancelled":       return { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" };
    default:                return { bg: "#f1f5f9", color: "#64748b", label: status || "—" };
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlatformAdminPage() {
  const [orgs, setOrgs]         = useState<OrgRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<OrgRow>>({});
  const [search, setSearch]     = useState("");
  const [notesEdit, setNotesEdit] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/platform/orgs");
    const d = await r.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    setOrgs(d.orgs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveOrg(orgId: string, patch: Partial<OrgRow>) {
    setSaving(orgId);
    const r = await fetch("/api/admin/platform/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId, ...patch }),
    });
    const d = await r.json();
    if (d.error) { alert(d.error); } else {
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...d.org } : o)));
    }
    setSaving(null);
    setEditId(null);
    setEditDraft({});
  }

  const filtered = orgs.filter((o) =>
    !search ||
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.organization_slug?.includes(search.toLowerCase()),
  );

  // ── Stats bar ──────────────────────────────────────────────────────────────

  const stats = {
    total:   orgs.length,
    paid:    orgs.filter((o) => o.subscription_status === "onboarding_paid" || o.subscription_status === "active").length,
    trial:   orgs.filter((o) => o.account_type === "free_trial").length,
    pending: orgs.filter((o) => !o.organization_slug).length,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "Inter, sans-serif",
      padding: "32px 24px",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem",
          }}>🏢</div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f8fafc" }}>
              Platform Admin Console
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              admin.movearoundtms.app · MoveAround TMS
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Orgs",       val: stats.total,   bg: "#1e293b", border: "#334155" },
          { label: "Paid / Active",    val: stats.paid,    bg: "#052e16", border: "#166534" },
          { label: "Free Trial",       val: stats.trial,   bg: "#172554", border: "#1e40af" },
          { label: "Needs Slug",       val: stats.pending, bg: "#431407", border: "#9a3412" },
        ].map(({ label, val, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 12,
            padding: "14px 20px", minWidth: 120,
          }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc", lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          style={{
            width: "100%", maxWidth: 380, padding: "10px 14px",
            borderRadius: 10, border: "1px solid #334155",
            background: "#1e293b", color: "#f1f5f9", fontSize: "0.88rem",
            outline: "none",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #991b1b", borderRadius: 10, padding: "12px 16px", color: "#fca5a5", marginBottom: 16, fontSize: "0.88rem" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: "#64748b", fontSize: "0.9rem", padding: "32px 0", textAlign: "center" }}>
          Loading organizations...
        </div>
      )}

      {/* Org cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((org) => {
          const atBadge  = accountTypeBadge(org.account_type);
          const subBadge = subStatusBadge(org.subscription_status);
          const isEditing = editId === org.id;
          const draft = isEditing ? editDraft : {};

          return (
            <div key={org.id} style={{
              background: "#1e293b",
              border: `1px solid ${org.is_ronyx ? "#1d4ed8" : "#334155"}`,
              borderRadius: 14,
              padding: "18px 22px",
              position: "relative",
            }}>
              {org.is_ronyx && (
                <div style={{
                  position: "absolute", top: 10, right: 14,
                  fontSize: "0.7rem", background: "#1d4ed820", color: "#60a5fa",
                  padding: "2px 8px", borderRadius: 6, fontWeight: 700, border: "1px solid #1d4ed840",
                }}>
                  🏠 Internal
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                {/* Left: name + slug */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "1rem", marginBottom: 4 }}>
                    {org.name}
                  </div>
                  {org.organization_slug ? (
                    <a
                      href={org.subdomain_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.8rem", color: "#60a5fa", textDecoration: "none" }}
                    >
                      🔗 {org.organization_slug}.movearoundtms.app
                    </a>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "#f97316" }}>
                      ⚠️ No subdomain slug assigned
                    </div>
                  )}
                  {org.organization_code && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                      Code: {org.organization_code}
                    </div>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: 4 }}>
                    Joined {fmtDate(org.created_at)}
                  </div>
                </div>

                {/* Middle: badges */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px",
                      borderRadius: 6, background: atBadge.bg, color: atBadge.color,
                    }}>{atBadge.label}</span>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px",
                      borderRadius: 6, background: subBadge.bg, color: subBadge.color,
                    }}>{subBadge.label}</span>
                    {org.bypass_subscription && (
                      <span style={{
                        fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px",
                        borderRadius: 6, background: "#064e3b", color: "#34d399", border: "1px solid #065f46",
                      }}>Bypass ✓</span>
                    )}
                  </div>
                  {org.onboarding_tier && org.onboarding_tier !== "none" && (
                    <div style={{ fontSize: "0.75rem", color: "#a78bfa" }}>
                      💳 {ONBOARDING_TIERS.find((t) => t.value === org.onboarding_tier)?.label ?? org.onboarding_tier}
                    </div>
                  )}
                  {org.onboarding_setup_fee != null && (
                    <div style={{ fontSize: "0.75rem", color: "#86efac" }}>
                      Setup: ${org.onboarding_setup_fee.toLocaleString()} · Monthly: ${org.onboarding_monthly_fee?.toLocaleString() ?? "—"}
                    </div>
                  )}
                </div>

                {/* Right: action buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {org.organization_slug && (
                    <a
                      href={org.subdomain_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "1px solid #334155",
                        background: "#0f172a", color: "#94a3b8", fontSize: "0.8rem",
                        cursor: "pointer", textDecoration: "none", fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      🖥️ View Dashboard
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (isEditing) { setEditId(null); setEditDraft({}); }
                      else { setEditId(org.id); setEditDraft({}); }
                    }}
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${isEditing ? "#1d4ed8" : "#334155"}`,
                      background: isEditing ? "#1e3a8a" : "#0f172a",
                      color: isEditing ? "#93c5fd" : "#94a3b8",
                      fontSize: "0.8rem", cursor: "pointer", fontWeight: 600,
                    }}
                  >
                    {isEditing ? "✕ Cancel" : "✏️ Edit"}
                  </button>
                </div>
              </div>

              {/* Inline edit panel */}
              {isEditing && (
                <div style={{
                  marginTop: 16, padding: "16px 18px",
                  background: "#0f172a", borderRadius: 10,
                  border: "1px solid #1e293b",
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12,
                }}>
                  {/* Account type */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      ACCOUNT TYPE
                    </label>
                    <select
                      value={(draft.account_type ?? org.account_type) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, account_type: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    >
                      {ACCOUNT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subscription status */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      SUBSCRIPTION STATUS
                    </label>
                    <select
                      value={(draft.subscription_status ?? org.subscription_status) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, subscription_status: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    >
                      {SUBSCRIPTION_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Onboarding tier */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      ONBOARDING TIER
                    </label>
                    <select
                      value={(draft.onboarding_tier ?? org.onboarding_tier) || "none"}
                      onChange={(e) => setEditDraft((d) => ({ ...d, onboarding_tier: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    >
                      {ONBOARDING_TIERS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Org slug */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      SUBDOMAIN SLUG
                    </label>
                    <input
                      value={(draft.organization_slug ?? org.organization_slug) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, organization_slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))}
                      placeholder="e.g. solis"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    />
                    <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: 3 }}>
                      {(draft.organization_slug ?? org.organization_slug) || "—"}.movearoundtms.app
                    </div>
                  </div>

                  {/* Setup fee */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      SETUP FEE ($)
                    </label>
                    <input
                      type="number"
                      value={(draft.onboarding_setup_fee ?? org.onboarding_setup_fee) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, onboarding_setup_fee: Number(e.target.value) || null }))}
                      placeholder="2500"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    />
                  </div>

                  {/* Monthly fee */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      MONTHLY FEE ($)
                    </label>
                    <input
                      type="number"
                      value={(draft.onboarding_monthly_fee ?? org.onboarding_monthly_fee) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, onboarding_monthly_fee: Number(e.target.value) || null }))}
                      placeholder="499"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155", fontSize: "0.83rem" }}
                    />
                  </div>

                  {/* Bypass subscription */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>
                      ACCESS
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={(draft.bypass_subscription ?? org.bypass_subscription) || false}
                        onChange={(e) => setEditDraft((d) => ({ ...d, bypass_subscription: e.target.checked }))}
                      />
                      <span style={{ fontSize: "0.83rem", color: "#94a3b8" }}>Bypass subscription gate</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={(draft.subscription_required ?? org.subscription_required) || false}
                        onChange={(e) => setEditDraft((d) => ({ ...d, subscription_required: e.target.checked }))}
                      />
                      <span style={{ fontSize: "0.83rem", color: "#94a3b8" }}>Require subscription</span>
                    </label>
                  </div>

                  {/* Platform notes */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginBottom: 4, fontWeight: 700 }}>
                      INTERNAL NOTES
                    </label>
                    <textarea
                      value={(draft.platform_notes ?? org.platform_notes) || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, platform_notes: e.target.value }))}
                      placeholder="Payment status, contact notes, setup progress..."
                      rows={2}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155",
                        fontSize: "0.83rem", resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Save button */}
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => saveOrg(org.id, editDraft)}
                      disabled={saving === org.id || Object.keys(editDraft).length === 0}
                      style={{
                        padding: "9px 22px", borderRadius: 9,
                        background: saving === org.id ? "#334155" : "#1d4ed8",
                        color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                        cursor: saving === org.id ? "not-allowed" : "pointer",
                        border: "none",
                      }}
                    >
                      {saving === org.id ? "Saving..." : "💾 Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Platform notes preview */}
              {org.platform_notes && !isEditing && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b",
                  fontSize: "0.78rem", color: "#94a3b8",
                }}>
                  📝 {org.platform_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ color: "#475569", textAlign: "center", padding: "40px 0", fontSize: "0.9rem" }}>
          No organizations found{search ? ` matching "${search}"` : ""}.
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 32, paddingTop: 16, borderTop: "1px solid #1e293b",
        fontSize: "0.75rem", color: "#334155", textAlign: "center",
      }}>
        MoveAround TMS · Platform Admin · admin.movearoundtms.app
      </div>
    </div>
  );
}
