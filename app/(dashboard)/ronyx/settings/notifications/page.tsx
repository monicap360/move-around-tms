"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotifRule = {
  id: string; event_type: string; event_label: string;
  in_app_enabled: boolean; email_enabled: boolean;
  sms_enabled: boolean; staff_dashboard_enabled: boolean;
  assigned_role: string | null; days_before: number | null; is_active: boolean;
};

const ROLES = ["Compliance Admin","Fleet Admin","Fleet Manager","Payroll Admin","Billing Admin","Fast Scan Staff","Parts Runner","Maintenance Manager","Dispatcher","Owner / Admin"];

function Toggle({ on, onChange, color = "#1d4ed8" }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button onClick={onChange} title={on ? "On" : "Off"} style={{
      width: 34, height: 18, borderRadius: 9, border: "none", cursor: "pointer",
      background: on ? color : "#e2e8f0", position: "relative", flexShrink: 0, transition: "background 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

export default function NotificationsPage() {
  const [rules, setRules]   = useState<NotifRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState("");

  useEffect(() => {
    fetch("/api/ronyx/settings/notifications").then(r => r.json()).then(d => setRules(d.rules ?? [])).finally(() => setLoading(false));
  }, []);

  async function patch(id: string, updates: Partial<NotifRule>) {
    const res = await fetch("/api/ronyx/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setRules(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
      setToast("Saved.");
      setTimeout(() => setToast(""), 1500);
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Notification Rules</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Notification Rules</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Control which events trigger alerts, which channels, and who gets notified.</div>
      </div>

      <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#f0f9ff", padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#1e40af" }}>
        <strong>AI Guidance:</strong> Start with in-app and Staff Dashboard enabled for all events. Only enable Email when a role needs off-system alerts. SMS will be available in a future update.
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No notification rules</div>
          <div style={{ fontSize: 13 }}>Run migration 142 to seed default notification rules.</div>
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Event","Active","In-App","Email","Dashboard","Days Before","Assigned Role"].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa", opacity: r.is_active ? 1 : 0.55 }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{r.event_label}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <Toggle on={r.is_active} onChange={() => patch(r.id, { is_active: !r.is_active })} color="#16a34a" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <Toggle on={r.in_app_enabled} onChange={() => patch(r.id, { in_app_enabled: !r.in_app_enabled })} />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <Toggle on={r.email_enabled} onChange={() => patch(r.id, { email_enabled: !r.email_enabled })} color="#7c3aed" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <Toggle on={r.staff_dashboard_enabled} onChange={() => patch(r.id, { staff_dashboard_enabled: !r.staff_dashboard_enabled })} color="#d97706" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <input type="number" min={1} max={365}
                      value={r.days_before ?? ""}
                      onChange={e => patch(r.id, { days_before: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="—"
                      style={{ width: 60, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <select value={r.assigned_role ?? ""}
                      onChange={e => patch(r.id, { assigned_role: e.target.value || null })}
                      style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, maxWidth: 180 }}>
                      <option value="">—</option>
                      {ROLES.map(rl => <option key={rl}>{rl}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 12 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
