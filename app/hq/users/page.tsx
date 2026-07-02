"use client";

import { useEffect, useState } from "react";
import HqShell from "../HqShell";

type User = { id: string; name: string; role: string | null; email: string | null; active: boolean; portal: "HQ" | "CCB"; login: string };

const PORTAL_META = {
  HQ: { label: "MoveAround HQ", color: "#2563eb", icon: "🖥️" },
  CCB: { label: "Carrier Clearance Bureau", color: "#16a34a", icon: "📡" },
} as const;

export default function HqUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 5000); };

  function load() {
    setLoading(true);
    fetch("/api/hq/users").then(r => r.status === 401 ? (window.location.href = "/hq/login?next=/hq/users", null) : r.json())
      .then(d => d && setUsers(d.users || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name?.trim()) { flash("Name required."); return; }
    if (!/^\d{4,6}$/.test(form.pin || "")) { flash("PIN must be 4–6 digits."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/hq/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form }) });
      const j = await r.json();
      if (j.error) { flash(j.error); return; }
      setForm(null); flash(`Added ${j.user.name} to ${PORTAL_META[j.user.portal as "HQ" | "CCB"].label}.`); load();
    } finally { setSaving(false); }
  }
  async function sendAccess(u: User) {
    const r = await fetch("/api/hq/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_access", portal: u.portal, id: u.id }) });
    const j = await r.json();
    if (j.notified) flash(`✉ Access email sent to ${u.email}.`);
    else if (j.link) { try { await navigator.clipboard.writeText(j.link); } catch {} flash(`${j.note || "Email not set up yet."} Link copied: ${j.link}`); }
    else flash(j.error || "Could not send.");
  }
  async function deactivate(u: User) {
    if (!confirm(`Remove ${u.name}'s access to ${PORTAL_META[u.portal].label}?`)) return;
    await fetch(`/api/hq/users?portal=${u.portal}&id=${u.id}`, { method: "DELETE" });
    flash(`${u.name} deactivated.`); load();
  }

  return (
    <HqShell active="users">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700, maxWidth: 420 }}>{toast}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>👥 Users & Access</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Add people to a portal, set their PIN, and send them their login.</p>
          </div>
          <button onClick={() => setForm({ name: "", role: "", email: "", portal: "CCB", pin: "" })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer" }}>+ Add User</button>
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading…</div> : (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
            {(["HQ", "CCB"] as const).map(portal => {
              const list = users.filter(u => u.portal === portal && u.active !== false);
              const m = PORTAL_META[portal];
              return (
                <div key={portal}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span>{m.icon}</span>
                    <span style={{ fontWeight: 900, fontSize: "0.95rem", color: m.color }}>{m.label}</span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>· {list.length} {list.length === 1 ? "user" : "users"} · login {LOGIN(portal)}</span>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                    {list.length === 0 ? <div style={{ padding: "18px", color: "#94a3b8", fontSize: "0.84rem" }}>No users yet.</div> : list.map(u => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ width: 34, height: 34, borderRadius: "50%", background: m.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>{u.name.charAt(0)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{u.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{u.role || m.label}{u.email ? ` · ${u.email}` : " · no email on file"}</div>
                        </div>
                        <button onClick={() => sendAccess(u)} style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 7, padding: "6px 12px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}>✉ Send access</button>
                        <button onClick={() => deactivate(u)} style={{ background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 10px", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, zIndex: 9300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 460 }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 16 }}>Add User</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={lbl}>Portal</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["CCB", "HQ"] as const).map(p => (
                    <button key={p} onClick={() => setForm({ ...form, portal: p })} style={{ flex: 1, cursor: "pointer", padding: "10px", borderRadius: 9, fontWeight: 800, fontSize: "0.82rem", background: form.portal === p ? PORTAL_META[p].color : "#fff", color: form.portal === p ? "#fff" : "#475569", border: "1px solid " + (form.portal === p ? PORTAL_META[p].color : "#e2e8f0") }}>{PORTAL_META[p].icon} {p === "CCB" ? "Carrier Clearance Bureau" : "MoveAround HQ"}</button>
                  ))}
                </div>
              </div>
              <div><label style={lbl}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} placeholder="Norma Loera" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Role</label><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inp} placeholder="Clearance" /></div>
                <div><label style={lbl}>PIN (4–6 digits) *</label><input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} maxLength={6} style={inp} placeholder="e.g. 1033" /></div>
              </div>
              <div><label style={lbl}>Email (to send access)</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} placeholder="them@company.com" /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={create} disabled={saving} style={{ background: saving ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>{saving ? "Adding…" : "Add User"}</button>
              <button onClick={() => setForm(null)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </HqShell>
  );
}

const LOGIN = (p: "HQ" | "CCB") => p === "HQ" ? "/hq/login" : "/ccb/login";
const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 3 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
