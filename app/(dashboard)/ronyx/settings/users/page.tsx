"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Role = { id: string; role_name: string };
type User = {
  id: string; full_name: string; email: string; phone: string;
  role_name: string; department: string; status: string; on_shift: boolean;
  last_login_at: string | null; notes: string;
};

const DEPTS = ["Dispatch","Compliance","Fleet","Payroll","Billing","Maintenance","Fast Scan","Management",""];
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  active:     { color: "#166534", bg: "#dcfce7" },
  inactive:   { color: "#dc2626", bg: "#fee2e2" },
  on_leave:   { color: "#d97706", bg: "#fef9c3" },
};

const EMPTY_FORM = { full_name:"", email:"", phone:"", role_id:"", role_name:"", department:"", status:"active", on_shift:false, notes:"" };

export default function UsersPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [roles, setRoles]   = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/ronyx/settings/users").then(r => r.json()),
      fetch("/api/ronyx/settings/roles").then(r => r.json()),
    ]).then(([u, r]) => { setUsers(u.users ?? []); setRoles(r.roles ?? []); }).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.role_name?.toLowerCase().includes(search.toLowerCase()));

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name) { setToast("Full name required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(p => [data.user, ...p]);
      setToast("User added.");
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setToast(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  async function toggleShift(user: User) {
    const res = await fetch("/api/ronyx/settings/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, on_shift: !user.on_shift }),
    });
    if (res.ok) setUsers(p => p.map(u => u.id === user.id ? { ...u, on_shift: !u.on_shift } : u));
  }

  async function setStatus(user: User, status: string) {
    const res = await fetch("/api/ronyx/settings/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, status }),
    });
    if (res.ok) setUsers(p => p.map(u => u.id === user.id ? { ...u, status } : u));
  }

  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Users & Staff</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Users & Staff</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{users.length} staff members · {users.filter(u => u.on_shift).length} on shift</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…"
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, width: 200 }} />
          <button onClick={() => setShowForm(true)}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Add Staff
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Add Staff Member</div>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <form onSubmit={saveUser}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
              <div><label style={lbl}>Full Name *</label><input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} style={inp} placeholder="Monica Peña" /></div>
              <div><label style={lbl}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp} placeholder="staff@example.com" /></div>
              <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inp} placeholder="+1 (832) 000-0000" /></div>
              <div>
                <label style={lbl}>Role</label>
                <select value={form.role_id} onChange={e => {
                  const r = roles.find(r => r.id === e.target.value);
                  setForm(p => ({ ...p, role_id: e.target.value, role_name: r?.role_name ?? "" }));
                }} style={inp}>
                  <option value="">Select role…</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Department</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} style={inp}>
                  {DEPTS.map(d => <option key={d} value={d}>{d || "—"}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inp}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" disabled={saving}
                style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving…" : "Add Staff Member"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No staff members yet</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Add staff so they can log in and be assigned tasks and roles.</div>
          <button onClick={() => setShowForm(true)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Add First Staff Member
          </button>
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Name","Role","Department","Status","On Shift","Last Login","Actions"].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const sc = STATUS_COLORS[u.status] ?? STATUS_COLORS.active;
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.full_name}</div>
                      {u.email && <div style={{ fontSize: 10, color: "#64748b" }}>{u.email}</div>}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{u.role_name || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{u.department || "—"}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, background: sc.bg, borderRadius: 5, padding: "2px 7px" }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <button onClick={() => toggleShift(u)}
                        style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: u.on_shift ? "#dcfce7" : "#f1f5f9", color: u.on_shift ? "#166534" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        {u.on_shift ? "On Shift" : "Off"}
                      </button>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 10, color: "#94a3b8" }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setStatus(u, u.status === "active" ? "inactive" : "active")}
                          style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                          {u.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <Link href="/ronyx/settings/roles">
                          <button style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                            Change Role
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
