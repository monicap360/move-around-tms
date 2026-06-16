"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Role = {
  id: string; role_name: string; role_description: string;
  is_system_role: boolean; permissions: Record<string, boolean>;
};

const PERMISSION_GROUPS: { label: string; keys: { key: string; label: string }[] }[] = [
  {
    label: "Drivers",
    keys: [
      { key: "view_drivers",   label: "View Drivers" },
      { key: "edit_drivers",   label: "Edit Drivers" },
    ],
  },
  {
    label: "Documents",
    keys: [
      { key: "upload_documents",    label: "Upload Docs" },
      { key: "view_documents",      label: "View Docs" },
      { key: "delete_documents",    label: "Delete Docs" },
    ],
  },
  {
    label: "Compliance",
    keys: [
      { key: "view_compliance",     label: "View Compliance" },
      { key: "approve_compliance",  label: "Approve Compliance" },
      { key: "request_override",    label: "Request Override" },
      { key: "approve_override",    label: "Approve Override" },
    ],
  },
  {
    label: "Dispatch",
    keys: [
      { key: "dispatch_jobs",       label: "Dispatch Jobs" },
      { key: "assign_trucks",       label: "Assign Trucks" },
      { key: "view_dispatch_board", label: "View Board" },
    ],
  },
  {
    label: "Payroll",
    keys: [
      { key: "view_payroll",        label: "View Payroll" },
      { key: "approve_payroll",     label: "Approve Payroll" },
      { key: "export_payroll",      label: "Export Payroll" },
    ],
  },
  {
    label: "Billing",
    keys: [
      { key: "view_invoices",       label: "View Invoices" },
      { key: "create_invoices",     label: "Create Invoices" },
      { key: "export_reports",      label: "Export Reports" },
    ],
  },
  {
    label: "Admin",
    keys: [
      { key: "access_admin_settings", label: "Admin Settings" },
      { key: "manage_staff",          label: "Manage Staff" },
      { key: "manage_roles",          label: "Manage Roles" },
    ],
  },
];

const ALL_KEYS = PERMISSION_GROUPS.flatMap(g => g.keys.map(k => k.key));

function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={disabled ? undefined : onChange}
      title={disabled ? "System role — cannot edit" : checked ? "Revoke" : "Grant"}
      style={{
        width: 20, height: 20, borderRadius: 4, border: `1px solid ${checked ? "#1d4ed8" : "#cbd5e1"}`,
        background: checked ? "#1d4ed8" : "#fff", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        opacity: disabled ? 0.5 : 1, transition: "background 0.15s",
      }}>
      {checked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
    </button>
  );
}

export default function RolesPage() {
  const [roles, setRoles]       = useState<Role[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [toast, setToast]       = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole]   = useState({ role_name: "", role_description: "" });

  useEffect(() => {
    fetch("/api/ronyx/settings/roles").then(r => r.json()).then(d => setRoles(d.roles ?? [])).finally(() => setLoading(false));
  }, []);

  async function togglePermission(role: Role, key: string) {
    if (role.is_system_role) return;
    const updated = { ...role.permissions, [key]: !role.permissions[key] };
    setSaving(role.id);
    const res = await fetch("/api/ronyx/settings/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, permissions: updated }),
    });
    if (res.ok) {
      setRoles(p => p.map(r => r.id === role.id ? { ...r, permissions: updated } : r));
      setToast("Saved.");
    } else {
      setToast("Save failed.");
    }
    setSaving(null);
    setTimeout(() => setToast(""), 1500);
  }

  async function grantAll(role: Role) {
    if (role.is_system_role) return;
    const updated = Object.fromEntries(ALL_KEYS.map(k => [k, true]));
    setSaving(role.id);
    const res = await fetch("/api/ronyx/settings/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, permissions: updated }),
    });
    if (res.ok) {
      setRoles(p => p.map(r => r.id === role.id ? { ...r, permissions: updated } : r));
      setToast("All permissions granted.");
    }
    setSaving(null);
    setTimeout(() => setToast(""), 1500);
  }

  async function revokeAll(role: Role) {
    if (role.is_system_role) return;
    const updated = Object.fromEntries(ALL_KEYS.map(k => [k, false]));
    setSaving(role.id);
    const res = await fetch("/api/ronyx/settings/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, permissions: updated }),
    });
    if (res.ok) {
      setRoles(p => p.map(r => r.id === role.id ? { ...r, permissions: updated } : r));
      setToast("All permissions revoked.");
    }
    setSaving(null);
    setTimeout(() => setToast(""), 1500);
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRole.role_name) return;
    const res = await fetch("/api/ronyx/settings/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newRole, permissions: {} }),
    });
    const data = await res.json();
    if (res.ok) {
      setRoles(p => [...p, data.role]);
      setNewRole({ role_name: "", role_description: "" });
      setShowAddForm(false);
      setToast("Role created.");
    } else {
      setToast(data.error ?? "Failed to create role.");
    }
    setTimeout(() => setToast(""), 2000);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1400, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Roles & Permissions</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Roles & Permissions</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
            {roles.length} roles · Click checkboxes to grant or revoke permissions. System roles are locked.
          </div>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Create Role
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addRole} style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Role Name *</label>
            <input required value={newRole.role_name} onChange={e => setNewRole(p => ({ ...p, role_name: e.target.value }))}
              placeholder="e.g. Night Dispatch" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "2 1 300px" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Description</label>
            <input value={newRole.role_description} onChange={e => setNewRole(p => ({ ...p, role_description: e.target.value }))}
              placeholder="Brief description of this role" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Create</button>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Permission Matrix */}
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, color: "#0f172a", fontSize: 12, minWidth: 200 }}>Permission</th>
              {roles.map(r => (
                <th key={r.id} style={{ padding: "8px 10px", textAlign: "center", minWidth: 110, fontWeight: 700, fontSize: 10, color: r.is_system_role ? "#7c3aed" : "#1d4ed8" }}>
                  <div>{r.role_name}</div>
                  {r.is_system_role && <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginTop: 1 }}>System</div>}
                  {!r.is_system_role && (
                    <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 4 }}>
                      <button onClick={() => grantAll(r)} disabled={saving === r.id}
                        style={{ padding: "1px 5px", fontSize: 8, borderRadius: 3, border: "1px solid #86efac", background: "#f0fdf4", color: "#16a34a", cursor: "pointer" }}>All ✓</button>
                      <button onClick={() => revokeAll(r)} disabled={saving === r.id}
                        style={{ padding: "1px 5px", fontSize: 8, borderRadius: 3, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", cursor: "pointer" }}>Clear</button>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map(group => (
              <>
                <tr key={`group-${group.label}`} style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
                  <td colSpan={roles.length + 1} style={{ padding: "6px 14px", fontWeight: 800, fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {group.label}
                  </td>
                </tr>
                {group.keys.map((k, i) => (
                  <tr key={k.key} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#334155" }}>{k.label}</td>
                    {roles.map(r => (
                      <td key={r.id} style={{ padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Checkbox
                            checked={!!r.permissions[k.key]}
                            onChange={() => togglePermission(r, k.key)}
                            disabled={r.is_system_role}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 12 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
