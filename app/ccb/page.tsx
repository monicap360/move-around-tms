"use client";

import { useEffect, useState } from "react";
import AssistantWidget from "@/app/components/ronyx/AssistantWidget";
import { CcbShield } from "@/app/components/CcbLogo";

// Carrier Clearance Bureau™ — Norma's own universal (cross-company) clearance console.
// Its own portal (/ccb, separate login) — she works for CCB, not any tenant.

type Roll = { org_id: string; name: string; clear: number; low: number; warning: number; critical: number; review: number; carriers: number; attention: number; import_date: string | null };
type Att = { company: string; carrier: string; truck: string | null; severity: string; note: string | null };
type Data = { companies_managed: number; companies_with_data: number; totals: { clear: number; low: number; warning: number; critical: number; review: number; carriers: number }; companies: Roll[]; attention: Att[] };

const SEVMETA: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#dc2626", bg: "#fee2e2", label: "Dispatch Block" },
  warning:  { color: "#ea580c", bg: "#ffedd5", label: "Warning" },
  review:   { color: "#0891b2", bg: "#ecfeff", label: "Needs Review" },
};

export default function CcbHome() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [learn, setLearn] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<{ should_change: boolean; pin_age_days: number } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ current: "", next: "", confirm: "" });
  const [pinErr, setPinErr] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinDone, setPinDone] = useState("");

  function loadPinStatus() { fetch("/api/ccb/change-pin").then(r => r.ok ? r.json() : null).then(d => d && setPinStatus(d)).catch(() => {}); }
  useEffect(() => {
    try { setName((localStorage.getItem("ccb_user") || "").split(" ")[0] || ""); } catch {}
    fetch("/api/ccb/universal").then(r => r.status === 401 ? (window.location.href = "/ccb/login?next=/ccb", null) : r.json()).then(d => d && setData(d)).catch(() => {}).finally(() => setLoading(false));
    loadPinStatus();
  }, []);

  async function changePin() {
    setPinErr("");
    if (!/^\d{4,6}$/.test(pinForm.next)) { setPinErr("New PIN must be 4–6 digits."); return; }
    if (pinForm.next !== pinForm.confirm) { setPinErr("New PIN and confirmation don't match."); return; }
    setPinBusy(true);
    try {
      const res = await fetch("/api/ccb/change-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_pin: pinForm.current, new_pin: pinForm.next }) });
      const j = await res.json();
      if (j.ok) { setPinDone("✓ PIN updated. Use it next time you sign in."); setPinForm({ current: "", next: "", confirm: "" }); setPinOpen(false); loadPinStatus(); setTimeout(() => setPinDone(""), 5000); }
      else setPinErr(j.error || "Could not change PIN.");
    } catch { setPinErr("Network error — try again."); }
    finally { setPinBusy(false); }
  }

  async function logout() { try { await fetch("/api/ccb/logout", { method: "POST" }); } catch {} window.location.href = "/ccb/login"; }

  const t = data?.totals;
  const kpi = (label: string, value: number, color: string, bg: string) => (
    <div style={{ background: bg, borderRadius: 12, padding: "16px 18px", flex: "1 1 150px", border: `1px solid ${color}22` }}>
      <div style={{ fontSize: "2rem", fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: "0.76rem", fontWeight: 800, color, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(90deg,#0a1428,#12294d)", padding: "10px 22px", display: "flex", alignItems: "center", gap: 11 }}>
        <CcbShield size={30} />
        <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.95rem" }}>Carrier Clearance <span style={{ color: "#4ade80" }}>Bureau</span><span style={{ color: "#cbd5e1", fontSize: "0.7em", verticalAlign: "super" }}>™</span></span>
        <span style={{ fontSize: "0.68rem", color: "#86efac", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>All Companies</span>
        <button onClick={() => { setPinErr(""); setPinOpen(true); }} style={{ marginLeft: "auto", background: pinStatus?.should_change ? "rgba(250,204,21,0.18)" : "rgba(255,255,255,0.08)", border: `1px solid ${pinStatus?.should_change ? "rgba(250,204,21,0.5)" : "rgba(148,163,184,0.25)"}`, color: pinStatus?.should_change ? "#fde68a" : "#e2e8f0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>🔑 Change PIN</button>
        <button onClick={() => window.location.reload()} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>↻ Refresh</button>
        <button onClick={logout} style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(248,113,113,0.35)", color: "#fca5a5", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer" }}>⏻ Logout</button>
      </div>

      {pinStatus?.should_change && (
        <div style={{ background: "#fef9c3", borderBottom: "1px solid #fde68a", color: "#854d0e", padding: "9px 26px", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
          <span>🔐 Your temporary PIN is {pinStatus.pin_age_days} days old — please set your own PIN now.</span>
          <button onClick={() => { setPinErr(""); setPinOpen(true); }} style={{ background: "#854d0e", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontWeight: 800, fontSize: "0.74rem", cursor: "pointer" }}>Change PIN</button>
        </div>
      )}
      {pinDone && <div style={{ background: "#dcfce7", borderBottom: "1px solid #bbf7d0", color: "#166534", padding: "9px 26px", fontSize: "0.82rem", fontWeight: 700 }}>{pinDone}</div>}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0d1d38 0%,#12294d 55%,#0a1428 100%)", padding: "24px 32px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: "#fff" }}>Clearance Command</h1>
          <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#86efac", letterSpacing: "0.14em", textTransform: "uppercase" }}>Cleared to Move · Trusted to Deliver</span>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: "0.9rem" }}>
          {name ? `Hi ${name}! ` : ""}You keep <strong>every company's</strong> carriers cleared to dispatch. Your job: make sure only cleared carriers roll.
        </p>
      </div>

      <div style={{ padding: "22px 32px 90px", maxWidth: 1100 }}>
        {loading ? <div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Loading clearance across all companies…</div> : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            {kpi("Cleared", t?.clear || 0, "#15803d", "#dcfce7")}
            {kpi("Needs Review", t?.review || 0, "#0891b2", "#ecfeff")}
            {kpi("Warnings", t?.warning || 0, "#ea580c", "#ffedd5")}
            {kpi("Dispatch Blocks", t?.critical || 0, "#dc2626", "#fee2e2")}
            {kpi("Companies", data?.companies_managed || 0, "#1e40af", "#dbeafe")}
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", marginBottom: 22 }}>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a", marginBottom: 4 }}>✅ What to do next</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 14 }}>Work top to bottom. When everything reads zero, every company is clear to dispatch.</div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: 1, title: "Review carriers waiting on clearance", count: t?.review || 0, cta: "These have a compliance note but no decision yet. Clear them or place a hold.", done: "No carriers waiting — nice." },
                { n: 2, title: "Clear the Dispatch Blocks", count: t?.critical || 0, cta: "Critical issues. These carriers must NOT roll until resolved.", done: "Nothing blocked right now." },
                { n: 3, title: "Follow up on Warnings", count: t?.warning || 0, cta: "Expiring authority/insurance. Ask the 🤖 assistant to add a follow-up task.", done: "No warnings to chase." },
              ].map(step => (
                <li key={step.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: step.count > 0 ? "#f8fafc" : "#f0fdf4", border: `1px solid ${step.count > 0 ? "#e2e8f0" : "#dcfce7"}` }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: step.count > 0 ? "#0891b2" : "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.82rem" }}>{step.count > 0 ? step.n : "✓"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{step.title} {step.count > 0 && <span style={{ color: "#0891b2" }}>· {step.count}</span>}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{step.count > 0 ? step.cta : step.done}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 22 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: "0.95rem" }}>🏢 Companies you clear for</div>
            {(!data?.companies?.length) ? (
              <div style={{ padding: "26px 18px", color: "#64748b", fontSize: "0.85rem" }}>No dispatch imported for any company yet. Once a company runs a dispatch with compliance notes, its clearance shows up here.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Company", "Carriers", "Cleared", "Needs Review", "Warnings", "Blocks", "Last Dispatch"].map(h => <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: "0.68rem", textTransform: "uppercase", color: "#64748b", fontWeight: 800 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.companies.map(c => (
                    <tr key={c.org_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "9px 14px", fontWeight: 700, color: "#0f172a" }}>{c.name}</td>
                      <td style={{ padding: "9px 14px", color: "#475569" }}>{c.carriers}</td>
                      <td style={{ padding: "9px 14px", color: "#15803d", fontWeight: 700 }}>{c.clear}</td>
                      <td style={{ padding: "9px 14px", color: c.review ? "#0891b2" : "#94a3b8", fontWeight: 700 }}>{c.review}</td>
                      <td style={{ padding: "9px 14px", color: c.warning ? "#ea580c" : "#94a3b8", fontWeight: 700 }}>{c.warning}</td>
                      <td style={{ padding: "9px 14px", color: c.critical ? "#dc2626" : "#94a3b8", fontWeight: 800 }}>{c.critical}</td>
                      <td style={{ padding: "9px 14px", color: "#94a3b8" }}>{c.import_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!!data?.attention?.length && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 22 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: "0.95rem" }}>🚨 Carriers needing your attention</div>
              <div>
                {data.attention.map((a, i) => {
                  const m = SEVMETA[a.severity] || SEVMETA.review;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid #f8fafc" }}>
                      <span style={{ background: m.bg, color: m.color, padding: "3px 10px", borderRadius: 20, fontWeight: 800, fontSize: "0.68rem", flexShrink: 0 }}>{m.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0f172a" }}>{a.carrier} <span style={{ color: "#94a3b8", fontWeight: 500 }}>· {a.company}</span></div>
                        {a.note && <div style={{ fontSize: "0.76rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note}</div>}
                      </div>
                      {a.truck && <span style={{ fontSize: "0.76rem", color: "#475569" }}>Truck {a.truck}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { key: "about", icon: "📖", title: "About CCB Sentinel™", blurb: "What it is & why it matters" },
              { key: "howto", icon: "🎓", title: "Training Portal · How-to", blurb: "Step-by-step: how to clear a carrier" },
              { key: "assistant", icon: "🤖", title: "Your Office Assistant", blurb: "Ask it anything — or tell it what to do" },
            ].map(card => (
              <button key={card.key} onClick={() => setLearn(learn === card.key ? null : card.key)}
                style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${learn === card.key ? "#0891b2" : "#e2e8f0"}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: "1.6rem" }}>{card.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", marginTop: 6 }}>{card.title}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{card.blurb}</div>
              </button>
            ))}
          </div>

          {learn === "about" && (
            <div style={panel}>
              <h3 style={ph}>📖 About CCB Sentinel™</h3>
              <p style={pp}>CCB Sentinel™ is MoveAround's <strong>Carrier Clearance Bureau</strong>. It watches every carrier's authority, insurance, and safety so a company only ever dispatches cleared trucks. You run it across <strong>all companies</strong> — one place, one standard.</p>
              <p style={pp}><strong>Why it matters:</strong> dispatching a carrier with lapsed authority or insurance is a claim and a failed audit waiting to happen. When you keep this board clean, every company you serve is protected.</p>
            </div>
          )}
          {learn === "howto" && (
            <div style={panel}>
              <h3 style={ph}>🎓 How to clear a carrier — step by step</h3>
              <ol style={{ ...pp, paddingLeft: 18, lineHeight: 1.9 }}>
                <li>Open the company with carriers <strong>Needs Review</strong> in the table above.</li>
                <li>Read the carrier's clearance note (authority, insurance, safety).</li>
                <li>If everything is current → it's <strong>Clear</strong>. The truck is good to roll.</li>
                <li>If something's expired or missing → it's a <strong>Dispatch Block</strong>; note why.</li>
                <li>If it expires soon → it's a <strong>Warning</strong>; ask the assistant to add a follow-up task.</li>
                <li>Re-check anything on Warning before its date passes.</li>
              </ol>
              <p style={pp}>Golden rule: <strong>when in doubt, hold it.</strong> A blocked load is cheaper than a claim.</p>
            </div>
          )}
          {learn === "assistant" && (
            <div style={panel}>
              <h3 style={ph}>🤖 Your Office Assistant</h3>
              <p style={pp}>Tap the <strong>🤖 button (bottom-right)</strong> any time. It knows clearance across every company and can take actions. Try:</p>
              <ul style={{ ...pp, paddingLeft: 18, lineHeight: 1.9 }}>
                <li>“How does clearance look today?”</li>
                <li>“Check clearance for ABC Trucking.”</li>
                <li>“Add a task to re-check their insurance next week.”</li>
                <li>“Which carriers are blocked right now?”</li>
              </ul>
            </div>
          )}
        </>
        )}
      </div>

      {pinOpen && (
        <div onClick={() => setPinOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9700, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "24px 26px", width: "100%", maxWidth: 400 }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 4 }}>🔑 Change your PIN</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 16 }}>4–6 digits. You'll use the new PIN next time you sign in.</div>
            <div style={{ display: "grid", gap: 11 }}>
              {[
                { k: "current", label: "Current PIN" },
                { k: "next", label: "New PIN" },
                { k: "confirm", label: "Confirm New PIN" },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{f.label}</label>
                  <input type="password" inputMode="numeric" maxLength={6} value={(pinForm as any)[f.k]}
                    onChange={e => setPinForm({ ...pinForm, [f.k]: e.target.value.replace(/\D/g, "") })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "1.1rem", letterSpacing: "0.3em", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            {pinErr && <div style={{ color: "#dc2626", fontSize: "0.78rem", marginTop: 10, fontWeight: 600 }}>{pinErr}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={changePin} disabled={pinBusy} style={{ flex: 1, background: pinBusy ? "#94a3b8" : "linear-gradient(135deg,#0891b2,#2563eb)", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: "0.88rem", cursor: pinBusy ? "default" : "pointer" }}>{pinBusy ? "Saving…" : "Update PIN"}</button>
              <button onClick={() => setPinOpen(false)} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 16px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <AssistantWidget staffName={name || "Norma"} endpoint="/api/ccb/assistant" lockHref="/ccb/login?next=/ccb" />
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", marginBottom: 20 };
const ph: React.CSSProperties = { margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" };
const pp: React.CSSProperties = { margin: "0 0 10px", fontSize: "0.86rem", color: "#334155", lineHeight: 1.6 };
