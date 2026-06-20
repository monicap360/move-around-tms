"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────────────── */

type Webhook = {
  id: string; name: string; url: string; events: string[];
  is_active: boolean; last_triggered: string | null; last_status: string | null; created_at: string;
};
type ApiKey = {
  id: string; name: string; key_prefix: string; scopes: string[];
  is_active: boolean; last_used: string | null; expires_at: string | null; created_at: string;
};
type ImportMapping = {
  id: string; name: string; source_type: string; target_entity: string;
  column_map: Record<string, string>; is_default: boolean; last_used: string | null;
};

type Tab = "connectors" | "webhooks" | "api_keys" | "csv_mapping";

/* ── Constants ──────────────────────────────────────────────────── */

const FONT  = "'Inter','Segoe UI',sans-serif";
const BLUE  = "#1d4ed8";
const DARK  = "#0f172a";
const MED   = "#475569";
const LIGHT = "#64748b";
const BORD  = "#e2e8f0";
const WHITE = "#fff";
const GRN   = "#16a34a";
const RED   = "#dc2626";

const ALL_EVENTS = [
  "ticket.created","ticket.approved","ticket.rejected","ticket.voided",
  "dispatch.job_created","dispatch.job_assigned","dispatch.job_completed",
  "payroll.run_created","payroll.run_approved","payroll.run_released",
  "billing.invoice_created","billing.invoice_sent","billing.invoice_paid",
  "compliance.block_created","compliance.block_resolved","compliance.expiring",
  "driver.added","driver.updated","truck.added","truck.updated",
  "fastscan.batch_complete","fastscan.needs_review",
];

const CONNECTORS = [
  { name: "eRocks", category: "Scale Tickets", icon: "⚖️",  status: "csv",     desc: "Import eRocks ticket exports via CSV mapping." },
  { name: "Fast-Weigh", category: "Scale Tickets", icon: "🏋️", status: "csv",  desc: "Import Fast-Weigh scale ticket reports." },
  { name: "Command Alkon", category: "Scale Tickets", icon: "🧱", status: "csv",desc: "Import Command Alkon delivery reports." },
  { name: "QuickBooks Online", category: "Accounting", icon: "💼", status: "soon", desc: "Sync invoices, payments, and payroll to QuickBooks." },
  { name: "Samsara", category: "GPS / ELD", icon: "📡", status: "soon",         desc: "Live driver and truck location, HOS, and alerts." },
  { name: "Motive (ELD)",  category: "GPS / ELD", icon: "🛰️", status: "soon",  desc: "ELD compliance and GPS tracking integration." },
  { name: "Geotab",        category: "GPS / ELD", icon: "📍", status: "soon",   desc: "Fleet GPS, geofencing, and driver behavior." },
  { name: "Email Inbox",   category: "Documents", icon: "📧", status: "soon",   desc: "Route emailed attachments to Smart Document Inbox." },
  { name: "SMS / Text",    category: "Communication", icon: "💬", status: "soon",desc: "Driver notifications and dispatch confirmations." },
  { name: "Fuel Cards",    category: "Fleet", icon: "⛽", status: "soon",        desc: "Import fuel card transactions for cost tracking." },
];

const SOURCE_LABELS: Record<string, string> = {
  csv: "CSV Import", erocks: "eRocks", fast_weigh: "Fast-Weigh",
  command_alkon: "Command Alkon", scale_ticket: "Scale Ticket",
  payout_sheet: "Payout Sheet", custom: "Custom",
};

/* ── Helpers ────────────────────────────────────────────────────── */

function chip(label: string, color: string, bg: string, border: string) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, color, background: bg, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}

function fmt(ts: string | null) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function IntegrationsPage() {
  const [tab, setTab]               = useState<Tab>("connectors");
  const [webhooks, setWebhooks]     = useState<Webhook[]>([]);
  const [apiKeys, setApiKeys]       = useState<ApiKey[]>([]);
  const [mappings, setMappings]     = useState<ImportMapping[]>([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  // Webhook form
  const [whName, setWhName]         = useState("");
  const [whUrl, setWhUrl]           = useState("");
  const [whEvents, setWhEvents]     = useState<string[]>([]);
  const [whSaving, setWhSaving]     = useState(false);
  const [newSecret, setNewSecret]   = useState<string | null>(null);

  // API key form
  const [akName, setAkName]         = useState("");
  const [akSaving, setAkSaving]     = useState(false);
  const [newKey, setNewKey]         = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function loadData() {
    try {
      const res = await fetch("/api/ronyx/settings/integrations");
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setWebhooks(d.webhooks || []);
      setApiKeys(d.api_keys || []);
      setMappings(d.import_mappings || []);
    } catch (e: any) {
      showToast(e.message || "Load failed.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function post(action: string, body: Record<string, any>) {
    const res = await fetch("/api/ronyx/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Request failed");
    return d;
  }

  async function createWebhook() {
    if (!whName.trim() || !whUrl.trim()) { showToast("Name and URL are required.", false); return; }
    setWhSaving(true);
    try {
      const d = await post("create_webhook", { name: whName.trim(), url: whUrl.trim(), events: whEvents });
      setNewSecret(d.signing_secret);
      setWhName(""); setWhUrl(""); setWhEvents([]);
      showToast("Webhook created. Save the signing secret now — it won't be shown again.");
      await loadData();
    } catch (e: any) {
      showToast(e.message, false);
    } finally {
      setWhSaving(false);
    }
  }

  async function toggleWebhook(id: string, is_active: boolean) {
    try {
      await post("toggle_webhook", { id, is_active });
      showToast(is_active ? "Webhook enabled." : "Webhook paused.");
      await loadData();
    } catch (e: any) { showToast(e.message, false); }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    try {
      await post("delete_webhook", { id });
      showToast("Webhook deleted.");
      await loadData();
    } catch (e: any) { showToast(e.message, false); }
  }

  async function createApiKey() {
    if (!akName.trim()) { showToast("Name is required.", false); return; }
    setAkSaving(true);
    try {
      const d = await post("create_api_key", { name: akName.trim(), scopes: [] });
      setNewKey(d.full_key);
      setAkName("");
      showToast("API key created. Copy it now — it won't be shown again.");
      await loadData();
    } catch (e: any) {
      showToast(e.message, false);
    } finally {
      setAkSaving(false);
    }
  }

  async function revokeApiKey(id: string) {
    if (!confirm("Revoke this API key? Any system using it will stop working.")) return;
    try {
      await post("revoke_api_key", { id });
      showToast("API key revoked.");
      await loadData();
    } catch (e: any) { showToast(e.message, false); }
  }

  async function deleteMapping(id: string) {
    if (!confirm("Delete this import mapping?")) return;
    try {
      await post("delete_import_mapping", { id });
      showToast("Import mapping deleted.");
      await loadData();
    } catch (e: any) { showToast(e.message, false); }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "connectors", label: "Connectors",    icon: "🔌" },
    { id: "webhooks",   label: "Webhooks",       icon: "🔗" },
    { id: "api_keys",   label: "API Keys",       icon: "🔑" },
    { id: "csv_mapping",label: "Import Mappings",icon: "📥" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, maxWidth: 1100, margin: "0 auto", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/ronyx/settings" style={{ fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>
          ← Admin Control Center
        </Link>
        <span style={{ color: "#cbd5e1" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Integration Hub</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: "1.45rem", fontWeight: 900, color: DARK, letterSpacing: "-0.5px", marginBottom: 4 }}>
          Integration Hub
        </div>
        <div style={{ fontSize: 13, color: LIGHT }}>
          Connect data sources, configure webhooks, manage API keys, and set up import mappings.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${BORD}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? BLUE : LIGHT,
              borderBottom: tab === t.id ? `2px solid ${BLUE}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: LIGHT }}>Loading…</div>
      ) : (
        <>
          {/* ── Connectors tab ── */}
          {tab === "connectors" && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 14 }}>Available Connectors</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {CONNECTORS.map(c => (
                  <div key={c.name} style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{c.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: DARK }}>{c.name}</div>
                        <div style={{ fontSize: 10.5, color: LIGHT }}>{c.category}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        {c.status === "csv"
                          ? chip("CSV Ready", GRN, "#f0fdf4", "#86efac")
                          : chip("Coming Soon", LIGHT, "#f1f5f9", BORD)}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: LIGHT, lineHeight: 1.5, marginBottom: 12 }}>{c.desc}</div>
                    {c.status === "csv" && (
                      <button
                        onClick={() => setTab("csv_mapping")}
                        style={{ width: "100%", padding: "7px 0", borderRadius: 7, border: `1px solid ${BLUE}`, background: "#eff6ff", color: BLUE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                      >
                        Configure CSV Mapping →
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 6 }}>Request an Integration</div>
                <div style={{ fontSize: 12.5, color: LIGHT, lineHeight: 1.6 }}>
                  Need a connector that isn't listed? Use the{" "}
                  <Link href="/ronyx/settings" style={{ color: BLUE, fontWeight: 600 }}>Admin Control Center</Link>{" "}
                  customization request feature to submit a request. GPS/ELD, accounting, fuel card, and scale system integrations are on the roadmap.
                </div>
              </div>
            </div>
          )}

          {/* ── Webhooks tab ── */}
          {tab === "webhooks" && (
            <div>
              {/* New secret banner */}
              {newSecret && (
                <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                    ⚠️ Save your signing secret now — it will not be shown again.
                  </div>
                  <code style={{ fontSize: 12, background: WHITE, padding: "8px 12px", borderRadius: 6, display: "block", wordBreak: "break-all", color: DARK, border: `1px solid ${BORD}` }}>
                    {newSecret}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(newSecret); showToast("Copied!"); }}
                    style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, border: `1px solid #fde047`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, color: "#92400e" }}>
                    Copy Secret
                  </button>
                </div>
              )}

              {/* Create form */}
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "18px 22px", marginBottom: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 14 }}>Add Webhook Endpoint</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Name</label>
                    <input value={whName} onChange={e => setWhName(e.target.value)} placeholder="e.g. Ticket Webhook"
                      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Endpoint URL</label>
                    <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://your-app.com/webhook"
                      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 7 }}>Events</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_EVENTS.map(ev => {
                      const sel = whEvents.includes(ev);
                      return (
                        <button key={ev}
                          onClick={() => setWhEvents(sel ? whEvents.filter(e => e !== ev) : [...whEvents, ev])}
                          style={{
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: sel ? 700 : 400,
                            border: sel ? `1.5px solid ${BLUE}` : `1px solid ${BORD}`,
                            background: sel ? "#eff6ff" : WHITE, color: sel ? BLUE : MED, fontFamily: FONT,
                          }}>
                          {ev}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={createWebhook} disabled={whSaving}
                  style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: whSaving ? "#93c5fd" : BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: whSaving ? "default" : "pointer", fontFamily: FONT }}>
                  {whSaving ? "Creating…" : "Create Webhook"}
                </button>
              </div>

              {/* Existing webhooks */}
              {webhooks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: LIGHT, fontSize: 13 }}>No webhooks configured yet.</div>
              ) : (
                <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
                  {webhooks.map((wh, i) => (
                    <div key={wh.id} style={{ padding: "14px 20px", borderBottom: i < webhooks.length - 1 ? `1px solid ${BORD}` : "none", display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>{wh.name}</span>
                          {wh.is_active ? chip("Active", GRN, "#f0fdf4", "#86efac") : chip("Paused", LIGHT, "#f1f5f9", BORD)}
                        </div>
                        <div style={{ fontSize: 11.5, color: LIGHT, marginTop: 3, wordBreak: "break-all" }}>{wh.url}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {wh.events.map(ev => (
                            <span key={ev} style={{ fontSize: 10, background: "#f1f5f9", border: `1px solid ${BORD}`, borderRadius: 4, padding: "1px 7px", color: MED }}>{ev}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: LIGHT, marginTop: 6 }}>Last triggered: {fmt(wh.last_triggered)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => toggleWebhook(wh.id, !wh.is_active)}
                          style={{ fontSize: 11.5, fontWeight: 600, color: BLUE, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          {wh.is_active ? "Pause" : "Enable"}
                        </button>
                        <button onClick={() => deleteWebhook(wh.id)}
                          style={{ fontSize: 11.5, fontWeight: 600, color: RED, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── API Keys tab ── */}
          {tab === "api_keys" && (
            <div>
              {newKey && (
                <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                    ⚠️ Copy your API key now — it will not be shown again.
                  </div>
                  <code style={{ fontSize: 12, background: WHITE, padding: "8px 12px", borderRadius: 6, display: "block", wordBreak: "break-all", color: DARK, border: `1px solid ${BORD}` }}>
                    {newKey}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(newKey); showToast("Copied!"); }}
                    style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, border: `1px solid #fde047`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, color: "#92400e" }}>
                    Copy Key
                  </button>
                </div>
              )}

              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "18px 22px", marginBottom: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 14 }}>Generate API Key</div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Key Name</label>
                    <input value={akName} onChange={e => setAkName(e.target.value)} placeholder="e.g. Billing Export Integration"
                      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }} />
                  </div>
                  <button onClick={createApiKey} disabled={akSaving}
                    style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: akSaving ? "#93c5fd" : BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: akSaving ? "default" : "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                    {akSaving ? "Generating…" : "Generate Key"}
                  </button>
                </div>
              </div>

              {apiKeys.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: LIGHT, fontSize: 13 }}>No API keys yet.</div>
              ) : (
                <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
                  {apiKeys.map((k, i) => (
                    <div key={k.id} style={{ padding: "14px 20px", borderBottom: i < apiKeys.length - 1 ? `1px solid ${BORD}` : "none", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>{k.name}</span>
                          {k.is_active ? chip("Active", GRN, "#f0fdf4", "#86efac") : chip("Revoked", RED, "#fef2f2", "#fca5a5")}
                        </div>
                        <code style={{ fontSize: 11.5, color: LIGHT, marginTop: 4, display: "block" }}>{k.key_prefix}_••••••••••••••••</code>
                        <div style={{ fontSize: 11, color: LIGHT, marginTop: 4 }}>Last used: {fmt(k.last_used)} · Created: {fmt(k.created_at)}</div>
                      </div>
                      {k.is_active && (
                        <button onClick={() => revokeApiKey(k.id)}
                          style={{ fontSize: 11.5, fontWeight: 600, color: RED, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CSV Mapping tab ── */}
          {tab === "csv_mapping" && (
            <div>
              <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0f9ff)", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1e3a8a", marginBottom: 4 }}>CSV Import Mappings</div>
                <div style={{ fontSize: 12.5, color: "#1e40af", lineHeight: 1.6 }}>
                  Save column mapping profiles so your team doesn't need to re-map every import.
                  Upload a CSV on the Dispatch page or Customer Launch Center and select a saved mapping to apply it instantly.
                </div>
              </div>

              {mappings.length === 0 ? (
                <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 6 }}>No import mappings saved yet</div>
                  <div style={{ fontSize: 12.5, color: LIGHT, maxWidth: 380, margin: "0 auto 20px" }}>
                    Import mappings are saved automatically when you use the Daily Dispatch import in the Customer Launch Center.
                    They'll appear here so you can reuse and manage them.
                  </div>
                  <Link href="/ronyx/implementation">
                    <button style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                      Go to Customer Launch Center →
                    </button>
                  </Link>
                </div>
              ) : (
                <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
                  {mappings.map((m, i) => (
                    <div key={m.id} style={{ padding: "14px 20px", borderBottom: i < mappings.length - 1 ? `1px solid ${BORD}` : "none", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>{m.name}</span>
                          {m.is_default && chip("Default", BLUE, "#eff6ff", "#bfdbfe")}
                        </div>
                        <div style={{ fontSize: 11.5, color: LIGHT, marginTop: 3 }}>
                          {SOURCE_LABELS[m.source_type] || m.source_type} → {m.target_entity}
                          {" · "}
                          {Object.keys(m.column_map).length} column{Object.keys(m.column_map).length !== 1 ? "s" : ""} mapped
                        </div>
                        <div style={{ fontSize: 11, color: LIGHT, marginTop: 2 }}>Last used: {fmt(m.last_used)}</div>
                      </div>
                      <button onClick={() => deleteMapping(m.id)}
                        style={{ fontSize: 11.5, fontWeight: 600, color: RED, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? DARK : RED, color: WHITE, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", fontFamily: FONT, maxWidth: 380 }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
