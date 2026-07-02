"use client";

// Floating office assistant — available on every Ronyx page (mounted in RonyxShell).
// Staff can ask questions ("how many drivers are missing a truck?") or give commands
// ("Patrick Hendrick is duplicated, fix it"). Backed by /api/ronyx/assistant.

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

function greetingFor(name?: string): string {
  const first = (name || "").trim().split(/\s+/)[0];
  const f = first.toLowerCase();
  const hi = first ? `Hi ${first}!` : "Hi!";
  if (f === "tabitha")
    return `${hi} I'm your accounting assistant. Ask me about settlements, unpaid tickets, invoices, payroll, or the dispatch-to-pay list — or tell me what to do. Try:\n• "What's pending settlement?"\n• "How much revenue and margin so far?"\n• "How's today's dispatch list?"`;
  if (f === "sylvia")
    return `${hi} I'm your compliance assistant. Ask about drivers, CDL/medical, COIs — or tell me what to do. Try:\n• "Patrick Hendrick is duplicated, fix it"\n• "How many drivers are missing a truck?"\n• "Find drivers for Grit Logistics"`;
  if (f === "norma")
    return `${hi} I'm your CCB assistant. Ask about carrier clearance — who's cleared, who's blocked, who needs review — or tell me what to do. Try:\n• "How does clearance look today?"\n• "Check clearance for ABC Trucking"\n• "Add a task to re-check their insurance"`;
  return `${hi} I'm your office assistant. Ask me anything about your drivers, trucks, dispatch, or compliance — or tell me what to do.`;
}

export default function AssistantWidget({ staffName }: { staffName?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [msgs, open, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ronyx/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, staff: staffName || "" }) });
      if (res.status === 401) { window.location.href = `/ronyx-lock?next=${encodeURIComponent(location.pathname)}`; return; }
      const data = await res.json();
      setMsgs(m => [...m, { role: "assistant", content: data.reply || "Done." }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", content: "Sorry — I couldn't reach the server. Try again." }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={() => setOpen(true)} title="Office Assistant"
          style={{ position: "fixed", bottom: 84, right: 22, zIndex: 9600, width: 58, height: 58, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#1e40af,#0891b2)", color: "#fff", fontSize: "1.5rem", boxShadow: "0 8px 24px rgba(30,64,175,0.4)" }}>
          🤖
        </button>
      )}

      {/* Panel */}
      {open && (
        <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 9600, width: "min(400px, calc(100vw - 32px))", height: "min(600px, calc(100vh - 60px))", background: "#fff", borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,0.28)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e2d45)", color: "#fff", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.25rem" }}>🤖</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Office Assistant</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.6)" }}>Ask a question or give a command</div>
            </div>
            {msgs.length > 0 && <button onClick={() => setMsgs([])} title="Clear" style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#e2e8f0", borderRadius: 7, padding: "5px 9px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>}
            <button onClick={() => setOpen(false)} title="Close" style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 7, width: 28, height: 28, fontSize: "1rem", fontWeight: 800, cursor: "pointer" }}>✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", fontSize: "0.82rem", color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{greetingFor(staffName)}</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ background: m.role === "user" ? "#1e40af" : "#fff", color: m.role === "user" ? "#fff" : "#0f172a", border: m.role === "user" ? "none" : "1px solid #e2e8f0", borderRadius: 12, padding: "9px 13px", fontSize: "0.83rem", whiteSpace: "pre-wrap", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div style={{ alignSelf: "flex-start", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "9px 13px", fontSize: "0.83rem", color: "#64748b" }}>Working on it…</div>}
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #e2e8f0", padding: 10, display: "flex", gap: 8, background: "#fff" }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask or tell me what to do…" rows={1}
              style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: "0.85rem", outline: "none", maxHeight: 90, fontFamily: "inherit" }} />
            <button onClick={send} disabled={busy || !input.trim()} style={{ background: busy || !input.trim() ? "#cbd5e1" : "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 800, fontSize: "0.85rem", cursor: busy || !input.trim() ? "default" : "pointer" }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
