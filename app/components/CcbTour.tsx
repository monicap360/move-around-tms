"use client";

import { useEffect, useState } from "react";

// Lightweight guided tour for the Carrier Clearance Bureau console. Shows once on
// first visit (localStorage), and can be reopened with the "❔ Tour" button.
const STEPS: { icon: string; title: string; body: string }[] = [
  { icon: "👋", title: "Welcome to Clearance Command", body: "This is your CCB home. You keep every company's carriers cleared to dispatch — only cleared carriers roll." },
  { icon: "📊", title: "Your clearance at a glance", body: "The top cards show clearance across ALL companies: how many carriers are Cleared, Need Review, have Warnings, or are a Dispatch Block." },
  { icon: "✅", title: "What to do next", body: "Work the checklist top to bottom — review waiting carriers, clear the blocks, follow up on warnings. When everything reads zero, every company is clear." },
  { icon: "🏢", title: "Companies you clear for", body: "Every company is listed with its carrier counts. New companies that sign up appear here automatically — nothing to set up." },
  { icon: "🚨", title: "Carriers needing attention", body: "Carriers with an expired COI, expiring authority, or a pending review show up here so nothing slips past you." },
  { icon: "🤖", title: "Your office assistant", body: "Tap the 🤖 button (bottom-right) any time. Ask 'how does clearance look today?' or give a command like 'add a task to re-check their insurance.'" },
  { icon: "🔑", title: "You're all set!", body: "Change your PIN any time with the 🔑 button up top. Reopen this tour with ❔ Tour. Cleared to Move, Trusted to Deliver!" },
];

export default function CcbTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try { if (!localStorage.getItem("ccb_tour_done")) setOpen(true); } catch {}
    const handler = () => { setI(0); setOpen(true); };
    window.addEventListener("ccb-open-tour", handler);
    return () => window.removeEventListener("ccb-open-tour", handler);
  }, []);

  function close() { setOpen(false); try { localStorage.setItem("ccb_tour_done", "1"); } catch {} }
  if (!open) return null;
  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9800, background: "rgba(6,12,24,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "linear-gradient(160deg,#0f2039,#0a1428)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, padding: "28px 26px", color: "#fff", boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: "2.6rem", textAlign: "center", marginBottom: 6 }}>{s.icon}</div>
        <h2 style={{ margin: "0 0 10px", fontSize: "1.25rem", fontWeight: 900, textAlign: "center" }}>{s.title}</h2>
        <p style={{ margin: "0 0 20px", fontSize: "0.9rem", color: "#aebfd6", lineHeight: 1.65, textAlign: "center" }}>{s.body}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {STEPS.map((_, k) => <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k === i ? "#22c55e" : "rgba(148,163,184,0.35)", transition: "all .2s" }} />)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={close} style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>Skip</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {i > 0 && <button onClick={() => setI(i - 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Back</button>}
            <button onClick={() => last ? close() : setI(i + 1)} style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 22px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>{last ? "Get started" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
