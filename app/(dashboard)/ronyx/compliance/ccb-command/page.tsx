"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Norma's universal CCB Sentinel™ console — simple + guided. Tells her what to do
// next, aggregates carrier clearance across EVERY company, and links to About /
// How-to / Training. The floating 🤖 Office Assistant (RonyxShell) answers + acts.

type Roll = { org_id: string; name: string; clear: number; low: number; warning: number; critical: number; review: number; carriers: number; attention: number; import_date: string | null };
type Att = { company: string; carrier: string; truck: string | null; severity: string; note: string | null };
type Data = { companies_managed: number; companies_with_data: number; totals: { clear: number; low: number; warning: number; critical: number; review: number; carriers: number }; companies: Roll[]; attention: Att[] };

const SEVMETA: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#dc2626", bg: "#fee2e2", label: "Dispatch Block" },
  warning:  { color: "#ea580c", bg: "#ffedd5", label: "Warning" },
  review:   { color: "#7c3aed", bg: "#f3e8ff", label: "Needs Review" },
};

export default function CcbCommandPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [learn, setLearn] = useState<string | null>(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("ronyx_active_staff") || "{}"); setName((s?.name || "").split(" ")[0] || ""); } catch {}
    fetch("/api/ronyx/ccb-universal").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const t = data?.totals;
  const needsReview = (t?.critical || 0) + (t?.warning || 0) + (t?.review || 0);

  const kpi = (label: string, value: number, color: string, bg: string) => (
    <div style={{ background: bg, borderRadius: 12, padding: "16px 18px", flex: "1 1 150px", border: `1px solid ${color}22` }}>
      <div style={{ fontSize: "2rem", fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: "0.76rem", fontWeight: 800, color, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#7c3aed 0%,#1d4ed8 100%)", padding: "26px 32px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: "1.5rem" }}>📡</span>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>CCB Sentinel™ · Clearance Command</h1>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: "0.9rem" }}>
          {name ? `Hi ${name}! ` : ""}You keep <strong>every company's</strong> carriers cleared to dispatch. Your job: make sure only cleared carriers roll.
        </p>
      </div>

      <div style={{ padding: "22px 32px 60px", maxWidth: 1100 }}>

        {loading ? <div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Loading clearance across all companies…</div> : (
        <>
          {/* Cross-company snapshot */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            {kpi("Cleared", t?.clear || 0, "#15803d", "#dcfce7")}
            {kpi("Needs Review", t?.review || 0, "#7c3aed", "#f3e8ff")}
            {kpi("Warnings", t?.warning || 0, "#ea580c", "#ffedd5")}
            {kpi("Dispatch Blocks", t?.critical || 0, "#dc2626", "#fee2e2")}
            {kpi("Companies", data?.companies_managed || 0, "#1e40af", "#dbeafe")}
          </div>

          {/* Guided: what to do next */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", marginBottom: 22 }}>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a", marginBottom: 4 }}>✅ What to do next</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 14 }}>Work top to bottom. When everything reads zero, every company is clear to dispatch.</div>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: 1, title: "Review carriers waiting on clearance", count: t?.review || 0, cta: "These have a compliance note but no decision yet. Clear them or place a hold.", done: "No carriers waiting — nice." },
                { n: 2, title: "Clear the Dispatch Blocks", count: t?.critical || 0, cta: "Critical issues. These carriers must NOT roll until resolved.", done: "Nothing blocked right now." },
                { n: 3, title: "Follow up on Warnings", count: t?.warning || 0, cta: "Expiring authority/insurance. Ask the 🤖 assistant to add a follow-up task.", done: "No warnings to chase." },
              ].map(step => (
                <li key={step.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: step.count > 0 ? "#f8fafc" : "#f0fdf4", border: `1px solid ${step.count > 0 ? "#e2e8f0" : "#dcfce7"}` }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: step.count > 0 ? "#7c3aed" : "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.82rem" }}>{step.count > 0 ? step.n : "✓"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{step.title} {step.count > 0 && <span style={{ color: "#7c3aed" }}>· {step.count}</span>}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{step.count > 0 ? step.cta : step.done}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Companies rollup */}
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
                      <td style={{ padding: "9px 14px", color: c.review ? "#7c3aed" : "#94a3b8", fontWeight: 700 }}>{c.review}</td>
                      <td style={{ padding: "9px 14px", color: c.warning ? "#ea580c" : "#94a3b8", fontWeight: 700 }}>{c.warning}</td>
                      <td style={{ padding: "9px 14px", color: c.critical ? "#dc2626" : "#94a3b8", fontWeight: 800 }}>{c.critical}</td>
                      <td style={{ padding: "9px 14px", color: "#94a3b8" }}>{c.import_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Attention list */}
          {!!data?.attention?.length && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 22 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: "0.95rem" }}>🚨 Carriers needing your attention</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
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

          {/* Learn / About / Training */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { key: "about", icon: "📖", title: "About CCB Sentinel™", blurb: "What it is & why it matters" },
              { key: "howto", icon: "🎓", title: "Training Portal · How-to", blurb: "Step-by-step: how to clear a carrier" },
              { key: "assistant", icon: "🤖", title: "Your Office Assistant", blurb: "Ask it anything — or tell it what to do" },
            ].map(card => (
              <button key={card.key} onClick={() => setLearn(learn === card.key ? null : card.key)}
                style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${learn === card.key ? "#7c3aed" : "#e2e8f0"}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: "1.6rem" }}>{card.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", marginTop: 6 }}>{card.title}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{card.blurb}</div>
              </button>
            ))}
          </div>

          {learn === "about" && (
            <div style={panel}>
              <h3 style={ph}>📖 About CCB Sentinel™</h3>
              <p style={pp}>CCB Sentinel™ is MoveAround's <strong>Carrier Clearance Board</strong>. It watches every carrier's authority, insurance, and safety so a company only ever dispatches cleared trucks. You run it across <strong>all companies</strong> — one place, one standard.</p>
              <p style={pp}><strong>Why it matters:</strong> dispatching a carrier with lapsed authority or insurance is a claim and a failed audit waiting to happen. When you keep this board clean, every company you serve is protected.</p>
            </div>
          )}
          {learn === "howto" && (
            <div style={panel}>
              <h3 style={ph}>🎓 How to clear a carrier — step by step</h3>
              <ol style={{ ...pp, paddingLeft: 18, lineHeight: 1.9 }}>
                <li>Open the company's dispatch in <Link href="/ronyx/compliance/ccb-sentinel" style={link}>CCB Sentinel detail</Link>.</li>
                <li>Read the carrier's clearance note (authority, insurance, safety).</li>
                <li>If everything is current → mark <strong>Clear</strong>. The truck is good to roll.</li>
                <li>If something's expired or missing → place a <strong>Dispatch Block</strong> and note why.</li>
                <li>If it expires soon → leave a <strong>Warning</strong> and ask the assistant to add a follow-up task.</li>
                <li>Re-check anything on Warning before its date passes.</li>
              </ol>
              <p style={pp}>Golden rule: <strong>when in doubt, hold it.</strong> A blocked load is cheaper than a claim.</p>
            </div>
          )}
          {learn === "assistant" && (
            <div style={panel}>
              <h3 style={ph}>🤖 Your Office Assistant</h3>
              <p style={pp}>Tap the <strong>🤖 button (bottom-right)</strong> any time. It knows your clearance data and can take actions. Try:</p>
              <ul style={{ ...pp, paddingLeft: 18, lineHeight: 1.9 }}>
                <li>“How does clearance look today?”</li>
                <li>“Check clearance for ABC Trucking.”</li>
                <li>“Add a task to re-check their insurance next week.”</li>
                <li>“Which carriers are blocked right now?”</li>
              </ul>
            </div>
          )}

          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e2d45)", color: "#fff", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.6rem" }}>🤖</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Need a hand? Ask your assistant.</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>It's the 🤖 button in the bottom-right corner — ask a question or tell it what to do.</div>
            </div>
            <Link href="/ronyx/compliance/ccb-sentinel" style={{ background: "#7c3aed", color: "#fff", padding: "9px 18px", borderRadius: 8, fontWeight: 800, fontSize: "0.82rem", textDecoration: "none" }}>Open CCB Sentinel detail →</Link>
          </div>
        </>
        )}
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", marginBottom: 20 };
const ph: React.CSSProperties = { margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" };
const pp: React.CSSProperties = { margin: "0 0 10px", fontSize: "0.86rem", color: "#334155", lineHeight: 1.6 };
const link: React.CSSProperties = { color: "#7c3aed", fontWeight: 700, textDecoration: "none" };
