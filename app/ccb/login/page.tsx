"use client";

import { useState, useEffect } from "react";

type CcbUser = { id: string; name: string; role: string };

export default function CcbLogin() {
  const [users, setUsers] = useState<CcbUser[]>([]);
  const [picked, setPicked] = useState<CcbUser | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/ccb/verify").then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}); }, []);

  async function submit() {
    if (!picked || pin.length < 4) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/ccb/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: picked.id, pin }) });
      const j = await res.json();
      if (j.ok) { try { localStorage.setItem("ccb_user", picked.name); } catch {} window.location.href = new URLSearchParams(window.location.search).get("next") || "/ccb"; }
      else { setErr(j.error || "Incorrect PIN."); setPin(""); }
    } catch { setErr("Network error — try again."); }
    finally { setBusy(false); }
  }
  const key = (d: string) => { if (d === "del") setPin(p => p.slice(0, -1)); else if (pin.length < 6) setPin(p => p + d); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden", background: "radial-gradient(1200px 600px at 20% -10%, #2e1065 0%, transparent 60%), radial-gradient(1000px 500px at 100% 100%, #0b2b3a 0%, transparent 55%), #070510" }}>
      <div style={{ position: "absolute", top: "-10%", left: "10%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.35), transparent 65%)", filter: "blur(20px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "8%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.28), transparent 65%)", filter: "blur(20px)" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 400, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(139,92,246,0.24)", borderRadius: 22, padding: "34px 30px 30px", boxShadow: "0 30px 90px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.4rem", color: "#fff", boxShadow: "0 10px 30px rgba(124,58,237,0.55)" }}>📡</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#fff" }}>Carrier Clearance <span style={{ color: "#a78bfa" }}>Board</span></div>
            <div style={{ fontSize: "0.66rem", letterSpacing: "0.3em", color: "#64748b", fontWeight: 700, marginTop: 3 }}>CCB SENTINEL™ · ALL COMPANIES</div>
          </div>
        </div>

        {!picked ? (
          <>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", marginBottom: 14 }}>Who's signing in?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {users.length === 0 && <div style={{ color: "#475569", fontSize: "0.8rem", textAlign: "center", padding: "10px 0" }}>Loading…</div>}
              {users.map(u => (
                <button key={u.id} onClick={() => { setPicked(u); setPin(""); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", textAlign: "left" }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", color: "#fff" }}>{u.name.charAt(0)}</span>
                  <span style={{ flex: 1 }}><span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{u.name}</span><span style={{ display: "block", fontSize: "0.68rem", color: "#64748b" }}>{u.role}</span></span>
                  <span style={{ color: "#a78bfa" }}>→</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>Hi {picked.name} 👋</div>
              <button onClick={() => { setPicked(null); setPin(""); setErr(""); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.72rem", cursor: "pointer", marginTop: 2 }}>← not you?</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "8px 0 6px" }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < pin.length ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(148,163,184,0.2)", boxShadow: i < pin.length ? "0 0 12px rgba(139,92,246,0.7)" : "none", visibility: i < 4 || i < pin.length ? "visible" : "hidden" }} />
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#64748b", marginBottom: 12 }}>Enter your PIN</div>
            {err && <div style={{ textAlign: "center", color: "#fca5a5", fontSize: "0.78rem", marginBottom: 10 }}>{err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (<button key={d} onClick={() => key(d)} style={keyBtn}>{d}</button>))}
              <button onClick={() => setPin("")} style={{ ...keyBtn, fontSize: "0.75rem", color: "#94a3b8" }}>clear</button>
              <button onClick={() => key("0")} style={keyBtn}>0</button>
              <button onClick={() => key("del")} style={{ ...keyBtn, fontSize: "1.1rem", color: "#94a3b8" }}>⌫</button>
            </div>
            <button onClick={submit} disabled={busy || pin.length < 4} style={{ width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, border: "none", cursor: busy || pin.length < 4 ? "default" : "pointer", fontWeight: 800, fontSize: "0.92rem", color: "#fff", background: busy || pin.length < 4 ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: pin.length >= 4 ? "0 10px 26px rgba(124,58,237,0.5)" : "none" }}>{busy ? "Signing in…" : "Sign in"}</button>
          </>
        )}
      </div>
    </div>
  );
}

const keyBtn: React.CSSProperties = {
  padding: "15px 0", borderRadius: 12, border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontWeight: 800, fontSize: "1.15rem", cursor: "pointer",
};
