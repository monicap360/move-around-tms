"use client";

import { useEffect, useState } from "react";

type Connection = {
  id?: string;
  provider: "rmis" | "saferwatch" | "mycarrierportal";
  status: "disconnected" | "connected" | "error" | "paused";
  settings?: any;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
};

const PROVIDER_META = {
  rmis: {
    name: "RMIS",
    full: "Registry Monitoring Insurance Services",
    logo: "🚛",
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#bfdbfe",
    desc: "Carrier monitoring, authority status, insurance verification, FMCSA compliance data. Best first connector for OO and carrier onboarding.",
    priority: 1,
    fields: [
      { key: "client_id",      label: "Client ID",      type: "text",     ph: "Your RMIS client ID" },
      { key: "client_secret",  label: "Client Secret",  type: "password", ph: "Your RMIS client secret" },
      { key: "api_url",        label: "API URL",         type: "text",     ph: "https://ws.rmis.com/carrier (default)" },
      { key: "webhook_secret", label: "Webhook Secret",  type: "password", ph: "Optional — RMIS pushes events here" },
    ],
    webhook: "/api/webhooks/rmis",
    docs: "https://www.rmis.com/integration",
  },
  saferwatch: {
    name: "SaferWatch",
    full: "SaferWatch Carrier Intelligence",
    logo: "🛡",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    desc: "MC/DOT lookup, authority status, safety snapshots, carrier watch list, and alert monitoring. Second connector — focused on safety and authority changes.",
    priority: 2,
    fields: [
      { key: "api_key",        label: "API Key",     type: "password", ph: "Your SaferWatch API key" },
      { key: "user_key",       label: "User Key",    type: "password", ph: "Your SaferWatch user key" },
      { key: "api_url",        label: "API URL",     type: "text",     ph: "https://api.saferwatch.com/api/v1 (default)" },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", ph: "Optional" },
    ],
    webhook: "/api/webhooks/saferwatch",
    docs: "https://www.saferwatch.com",
  },
  mycarrierportal: {
    name: "Descartes MyCarrierPortal",
    full: "Descartes MyCarrierPortal",
    logo: "🏢",
    color: "#7c3aed",
    bg: "#faf5ff",
    border: "#ddd6fe",
    desc: "Carrier onboarding, compliance, identity verification, and fraud prevention. Third connector — broker and 3PL workflows.",
    priority: 3,
    fields: [
      { key: "api_key",         label: "API Key",         type: "password", ph: "Provided by Descartes" },
      { key: "organization_id", label: "Organization ID",  type: "text",     ph: "Your MCP organization ID" },
      { key: "contact_email",   label: "Contact Email",    type: "email",    ph: "Who to notify for updates" },
    ],
    webhook: "/api/webhooks/mycarrierportal",
    docs: "https://www.mycarrierportal.com",
  },
} as const;

type ProviderKey = keyof typeof PROVIDER_META;
type ModalState = { provider: ProviderKey; form: Record<string, string>; saving: boolean; result: string | null };

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<ModalState | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<ProviderKey | null>(null);
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([]);

  useEffect(() => {
    loadConnections();
    loadRecentSnaps();
  }, []);

  async function loadConnections() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/connections");
      const d = await res.json();
      setConnections(d.connections ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadRecentSnaps() {
    try {
      const res = await fetch("/api/integrations/snapshots?limit=10");
      const d = await res.json();
      setRecentSnapshots(d.snapshots ?? []);
    } catch {}
  }

  function openModal(provider: ProviderKey) {
    setModal({ provider, form: {}, saving: false, result: null });
  }

  async function saveCredentials() {
    if (!modal) return;
    setModal(m => m && { ...m, saving: true, result: null });
    try {
      const endpoint = `/api/integrations/${modal.provider}/connect`;
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.form) });
      const d = await res.json();
      setModal(m => m && { ...m, saving: false, result: d.note ?? (res.ok ? "Saved." : d.error) });
      if (res.ok) loadConnections();
    } catch (e: any) {
      setModal(m => m && { ...m, saving: false, result: e.message });
    }
  }

  async function disconnect(provider: ProviderKey) {
    await fetch(`/api/integrations/${provider}/connect`, { method: "DELETE" });
    setDisconnectConfirm(null);
    loadConnections();
  }

  const conn = (p: ProviderKey) => connections.find(c => c.provider === p);
  const statusColor = (s: string) => s === "connected" ? "#15803d" : s === "error" ? "#dc2626" : "#64748b";
  const statusBg    = (s: string) => s === "connected" ? "#dcfce7" : s === "error" ? "#fef2f2" : "#f1f5f9";
  const statusLabel = (s: string) => s === "connected" ? "Connected" : s === "error" ? "Error" : s === "paused" ? "Paused" : "Not Connected";

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "24px 28px 20px", borderRadius: 14, marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Admin Control Center → Integrations</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Carrier Compliance Providers</h1>
        <p style={{ margin: "0 0 16px", fontSize: "0.8rem", color: "#94a3b8", maxWidth: 560 }}>
          Connect external compliance data sources. MoveAround CCB™ reads normalized fields — not vendor-specific data. RMIS/SaferWatch/MyCarrierPortal supply verification data. CCB decides what it means operationally.
        </p>
        {/* Architecture note */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {["Provider API / Webhook", "→", "Integration Hub", "→", "CCB™ Carrier Record", "→", "Dispatch Eligibility + Tasks + Audit"].map((label, i) => (
            label === "→"
              ? <span key={i} style={{ color: "#475569", fontSize: "0.65rem" }}>→</span>
              : <span key={i} style={{ padding: "3px 8px", background: "rgba(255,255,255,0.08)", borderRadius: 5, fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8" }}>{label}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        {/* Provider cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(Object.keys(PROVIDER_META) as ProviderKey[]).map(p => {
            const meta = PROVIDER_META[p];
            const c = conn(p);
            const status = c?.status ?? "disconnected";
            const isFuture = p === "mycarrierportal" && status === "disconnected";

            return (
              <div key={p} style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${status === "connected" ? meta.border : "#e2e8f0"}`, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.8rem", lineHeight: 1, marginTop: 2 }}>{meta.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: "0.92rem", color: "#0f172a" }}>{meta.name}</div>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.62rem", fontWeight: 800, background: statusBg(status), color: statusColor(status) }}>
                        {isFuture ? "Future Connector" : statusLabel(status)}
                      </span>
                      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.58rem", fontWeight: 700, background: "#f1f5f9", color: "#94a3b8" }}>Priority {meta.priority}</span>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: 4 }}>{meta.full}</div>
                    <div style={{ fontSize: "0.7rem", color: "#475569", lineHeight: 1.5, maxWidth: 500 }}>{meta.desc}</div>
                    {c?.last_sync_at && (
                      <div style={{ marginTop: 4, fontSize: "0.6rem", color: "#94a3b8" }}>
                        Last sync: {new Date(c.last_sync_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {c.last_sync_status}
                        {c.last_sync_error && <span style={{ color: "#dc2626" }}> — {c.last_sync_error}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    {status === "connected" ? (
                      <button onClick={() => setDisconnectConfirm(p)} style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Disconnect</button>
                    ) : isFuture ? (
                      <button onClick={() => openModal(p)} style={{ padding: "6px 12px", background: "#faf5ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 8, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Request Integration</button>
                    ) : (
                      <button onClick={() => openModal(p)} style={{ padding: "6px 14px", background: meta.color, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>Connect {meta.name}</button>
                    )}
                  </div>
                </div>

                {/* Webhook URL row */}
                <div style={{ padding: "8px 18px", background: "#f8fafc", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Webhook URL</span>
                  <code style={{ fontSize: "0.65rem", color: "#475569", background: "#fff", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {typeof window !== "undefined" ? window.location.origin : "[your-domain]"}{meta.webhook}
                  </code>
                  <a href={meta.docs} target="_blank" rel="noopener" style={{ fontSize: "0.62rem", color: "#1e40af", fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none" }}>Docs ↗</a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel: recent syncs */}
        <div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 12 }}>Recent Verifications</div>
            {recentSnapshots.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: "0.75rem" }}>No verifications yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentSnapshots.map((s: any) => {
                  const colorMap: Record<string, string> = { clear: "#15803d", needs_attention: "#a16207", blocked: "#dc2626", error: "#64748b" };
                  const bgMap: Record<string, string>    = { clear: "#f0fdf4", needs_attention: "#fffbeb", blocked: "#fef2f2", error: "#f1f5f9" };
                  return (
                    <div key={s.id} style={{ padding: "8px 10px", background: bgMap[s.verification_status] ?? "#f8fafc", borderRadius: 8, border: `1px solid ${s.verification_status === "clear" ? "#bbf7d0" : s.verification_status === "blocked" ? "#fecaca" : "#e2e8f0"}` }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#fff", color: colorMap[s.verification_status] ?? "#64748b", border: "1px solid currentColor" }}>{s.verification_status}</span>
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{s.provider}</span>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#0f172a", fontWeight: 600 }}>MC {s.mc_number ?? "—"} · DOT {s.dot_number ?? "—"}</div>
                      <div style={{ fontSize: "0.6rem", color: "#94a3b8" }}>{new Date(s.retrieved_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Key notes */}
          <div style={{ background: "#0f172a", borderRadius: 12, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Architecture Notes</div>
            {[
              "API keys never leave the server — never sent to browser",
              "CCB rules evaluate requirements independently of provider response",
              "All syncs logged to carrier_verification_snapshots",
              "CCB tasks auto-created from material compliance changes",
              "Webhooks receive real-time alerts from connected providers",
            ].map((note, i) => (
              <div key={i} style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: 4, display: "flex", gap: 6 }}>
                <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> {note}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect modal */}
      {modal && (() => {
        const meta = PROVIDER_META[modal.provider];
        const isFuture = modal.provider === "mycarrierportal";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: "1.6rem" }}>{meta.logo}</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#0f172a" }}>
                    {isFuture ? "Request Integration" : `Connect ${meta.name}`}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{meta.full}</div>
                </div>
              </div>

              {isFuture && (
                <div style={{ padding: "10px 14px", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 9, fontSize: "0.72rem", color: "#7c3aed", marginBottom: 14, lineHeight: 1.5 }}>
                  MyCarrierPortal API access is provided by Descartes. Fill in your contact info and we will record the request. Contact Descartes directly to obtain API credentials.
                </div>
              )}

              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {meta.fields.map((f) => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                    <input type={f.type} value={modal.form[f.key] ?? ""} onChange={e => setModal(m => m && { ...m, form: { ...m.form, [f.key]: e.target.value } })} placeholder={f.ph}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {modal.result && (
                <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.72rem", background: modal.result.includes("failed") || modal.result.includes("error") ? "#fef2f2" : "#f0fdf4", color: modal.result.includes("failed") || modal.result.includes("error") ? "#dc2626" : "#15803d", border: `1px solid ${modal.result.includes("failed") || modal.result.includes("error") ? "#fecaca" : "#bbf7d0"}` }}>
                  {modal.result}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveCredentials} disabled={modal.saving}
                  style={{ flex: 1, padding: "10px 0", background: meta.color, color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", opacity: modal.saving ? 0.7 : 1 }}>
                  {modal.saving ? "Saving…" : isFuture ? "Submit Request" : `Connect ${meta.name}`}
                </button>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
              </div>
              <div style={{ marginTop: 10, fontSize: "0.62rem", color: "#94a3b8", textAlign: "center" }}>
                Credentials are stored server-side only — never sent to the browser.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Disconnect confirm */}
      {disconnectConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠</div>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Disconnect {PROVIDER_META[disconnectConfirm].name}?</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>Stored credentials will be deleted. Historical snapshots are kept for audit. You can reconnect at any time.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => disconnect(disconnectConfirm)} style={{ flex: 1, padding: "11px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Yes, Disconnect</button>
              <button onClick={() => setDisconnectConfirm(null)} style={{ flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
