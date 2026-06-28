"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// "Rory — Operations Manager" — staff-facing, read-only AI ops assistant.
// All answers come from /api/ronyx/rory (LLM + org-scoped read-only tools).
// The Morning Brief comes from /api/ronyx/rory/brief (deterministic, no LLM).

type DataUsed = { tool: string; result_count: number | null; status: string };
type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  dataUsed?: DataUsed[];
  org?: string;
  checkedAt?: string;
  error?: boolean;
};

const SUGGESTED = [
  "Who is available to dispatch tomorrow?",
  "Which drivers have documents expiring in the next 30 days?",
  "What is blocking Double F from dispatch?",
  "Which trucks are unavailable and why?",
  "Show tickets ready for billing but missing something.",
  "What payroll items need review?",
  "Which owner operators have compliance issues?",
  "What customer clearance issues need attention?",
  "What's the weight limit in Texas?",
  "Does Colorado have a chain law?",
  "What insurance minimums do I need to run interstate?",
];

const TOOL_LABELS: Record<string, string> = {
  find_dispatch_eligible_drivers: "Dispatch-eligible drivers",
  get_driver_compliance_alerts: "Driver compliance alerts",
  get_driver_or_owner_operator_status: "Driver / owner-operator status",
  get_fleet_readiness: "Fleet readiness",
  get_ticket_exceptions: "Ticket exceptions",
  get_billing_ready_summary: "Billing-ready summary",
  get_payroll_review_summary: "Payroll review",
  get_customer_clearance_status: "Customer clearance",
  get_operations_priority_summary: "Operations priority summary",
  get_state_trucking_rules: "State trucking rules",
  get_trucking_requirements: "Federal trucking requirements",
};

type BriefItem = { issue: string; count: number; severity: string; explanation: string; module?: string };
type Brief = {
  organizationName: string;
  checkedAt: string;
  groups: {
    critical_now: BriefItem[];
    needs_attention_today: BriefItem[];
    this_week: BriefItem[];
    ready_for_next_step: BriefItem[];
  };
};

const SEV_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
};

export default function OperationsManagerPage() {
  const [tab, setTab] = useState<"ask" | "brief">("ask");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId] = useState(() => `c_${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const history: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/rory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.error || "Something went wrong.", error: true }]);
      } else {
        setMessages((m) => [...m, {
          role: "assistant", content: data.answer, dataUsed: data.dataUsed,
          org: data.organizationName, checkedAt: data.checkedAt,
        }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error — please try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 64px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, boxShadow: "0 4px 14px rgba(79,70,229,.35)" }}>🧭</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Rory — Operations Manager</h1>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 13 }}>Ask live questions about dispatch, drivers, compliance, fleet, tickets, payroll, and billing.</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 4px" }}>
        <Badge color="#16a34a" bg="#f0fdf4" border="#bbf7d0">● Live organization data</Badge>
        <Badge color="#475569" bg="#f1f5f9" border="#e2e8f0">🔒 Read-only mode</Badge>
      </div>
      <p style={{ margin: "2px 0 14px", color: "#94a3b8", fontSize: 12 }}>Answers are based on your current MoveAround records.</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
        <TabBtn active={tab === "ask"} onClick={() => setTab("ask")}>💬 Ask Rory</TabBtn>
        <TabBtn active={tab === "brief"} onClick={() => setTab("brief")}>☀️ Morning Operations Brief</TabBtn>
      </div>

      {tab === "ask" ? (
        <AskPanel
          messages={messages} loading={loading} input={input} setInput={setInput}
          ask={ask} scrollRef={scrollRef}
        />
      ) : (
        <BriefPanel />
      )}
    </div>
  );
}

function AskPanel({ messages, loading, input, setInput, ask, scrollRef }: {
  messages: ChatMsg[]; loading: boolean; input: string;
  setInput: (s: string) => void; ask: (q: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div>
      {messages.length === 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: "0 0 8px" }}>Try asking…</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => ask(s)}
                style={{ padding: "8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#1e293b", cursor: "pointer", textAlign: "left" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} style={{ maxHeight: "52vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: messages.length ? "4px 2px" : 0 }}>
        {messages.map((m, idx) => (m.role === "user" ? <UserBubble key={idx} text={m.content} /> : <RoryBubble key={idx} msg={m} />))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13, padding: "6px 2px" }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#4f46e5,#0891b2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🧭</span>
            Rory is checking your records…
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }}
        style={{ display: "flex", gap: 8, marginTop: 14, position: "sticky", bottom: 0 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
          placeholder="Ask about dispatch, drivers, compliance, fleet, tickets, payroll, billing…"
          style={{ flex: 1, padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 14, outline: "none" }} />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ padding: "12px 20px", background: loading || !input.trim() ? "#cbd5e1" : "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? "default" : "pointer" }}>
          Ask
        </button>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#4f46e5", color: "#fff", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", fontSize: 14, whiteSpace: "pre-wrap" }}>
      {text}
    </div>
  );
}

function RoryBubble({ msg }: { msg: ChatMsg }) {
  const [showData, setShowData] = useState(false);
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "92%", background: msg.error ? "#fef2f2" : "#fff", border: `1px solid ${msg.error ? "#fecaca" : "#e2e8f0"}`, padding: "12px 14px", borderRadius: "14px 14px 14px 4px", fontSize: 14, color: "#0f172a" }}>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg.content}</div>

      {msg.dataUsed && msg.dataUsed.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px dashed #e2e8f0", paddingTop: 8 }}>
          <button onClick={() => setShowData((s) => !s)}
            style={{ background: "none", border: "none", color: "#4f46e5", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            {showData ? "▾" : "▸"} Data used for this answer ({msg.dataUsed.length})
          </button>
          {showData && (
            <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {msg.dataUsed.map((d, i) => (
                <li key={i} style={{ fontSize: 12, color: "#475569", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>{TOOL_LABELS[d.tool] ?? d.tool}</span>
                  <span style={{ color: d.status === "ok" ? "#16a34a" : d.status === "no_data_source" ? "#b45309" : "#64748b" }}>
                    {d.status === "no_data_source" ? "no verified source" : d.result_count === null ? d.status : `${d.result_count} record${d.result_count === 1 ? "" : "s"}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {msg.org && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
          Based on live MoveAround records for <strong>{msg.org}</strong> • Checked just now
        </div>
      )}
    </div>
  );
}

function BriefPanel() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/ronyx/rory/brief")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!active) return; if (ok) setBrief(d); else setErr(d.error || "Could not load the brief."); })
      .catch(() => active && setErr("Network error loading the brief."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <p style={{ color: "#64748b", fontSize: 14 }}>Building your brief from live records…</p>;
  if (err) return <p style={{ color: "#b91c1c", fontSize: 14 }}>{err}</p>;
  if (!brief) return null;

  const groups: { key: keyof Brief["groups"]; title: string; tone: string }[] = [
    { key: "critical_now", title: "🚨 Critical Now", tone: "#b91c1c" },
    { key: "needs_attention_today", title: "⏰ Needs Attention Today", tone: "#b45309" },
    { key: "this_week", title: "📅 This Week", tone: "#1d4ed8" },
    { key: "ready_for_next_step", title: "✅ Ready for Next Step", tone: "#15803d" },
  ];
  const empty = groups.every((g) => brief.groups[g.key].length === 0);

  return (
    <div>
      {empty && <p style={{ color: "#16a34a", fontSize: 14, fontWeight: 600 }}>Nothing flagged right now — no matching records across compliance, fleet, tickets, payroll, or clearance.</p>}
      <div style={{ display: "grid", gap: 14 }}>
        {groups.map((g) => {
          const items = brief.groups[g.key];
          if (!items.length) return null;
          return (
            <section key={g.key}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: g.tone }}>{g.title}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {items.map((it, i) => {
                  const c = SEV_COLOR[it.severity] ?? SEV_COLOR.info;
                  return (
                    <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{it.issue}</span>
                        <span style={{ fontWeight: 900, color: c.text, fontSize: 16 }}>{it.count}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>{it.explanation}</p>
                      {it.module && (
                        <Link href={it.module} style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 700, color: c.text, textDecoration: "none" }}>
                          Open module →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8" }}>
        Based on live MoveAround records for <strong>{brief.organizationName}</strong> • Checked just now · Read-only — no actions taken.
      </div>
    </div>
  );
}

function Badge({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return <span style={{ padding: "4px 10px", background: bg, border: `1px solid ${border}`, color, borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 14px", background: "none", border: "none", borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent", color: active ? "#4f46e5" : "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: -1 }}>
      {children}
    </button>
  );
}
