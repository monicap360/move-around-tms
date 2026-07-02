"use client";

// PIN gate / staff switcher. Shows a full-screen lock when no staff is active.
// Staff pick their name and enter a PIN to act as themselves (attribution). Has a
// built-in "Manage staff" panel to add people and set PINs — no separate page.

import { useCallback, useEffect, useState } from "react";
import { safePrompt } from "@/lib/safePrompt";

export type ActiveStaff = { id: string; name: string; role: string };
type StaffLite = { id: string; name: string; role: string; has_pin: boolean };

export default function PinGate({ onUnlock, onSkip, showSignupLinks = false }: { onUnlock: (s: ActiveStaff) => void; onSkip: () => void; showSignupLinks?: boolean }) {
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pick" | "pin" | "manage">("pick");
  const [selected, setSelected] = useState<StaffLite | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ronyx/staff-pins");
      const d = await r.json();
      setStaff(d.staff || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // keyboard entry on the PIN screen
  useEffect(() => {
    if (view !== "pin") return;
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin(p => (p.length < 6 ? p + e.key : p));
      else if (e.key === "Backspace") setPin(p => p.slice(0, -1));
      else if (e.key === "Enter") submitPin();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, pin, selected]); // eslint-disable-line

  async function submitPin() {
    if (!selected || pin.length < 4 || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/ronyx/staff-pins/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, pin }) });
      const d = await r.json();
      if (d.ok) { onUnlock(d.staff); }
      else { setErr(d.error || "Incorrect PIN."); setPin(""); }
    } catch { setErr("Network error."); }
    setBusy(false);
  }

  // Self-service: change your own PIN (verify current first, then set a new one).
  async function changePin() {
    if (!selected) return;
    if (pin.length < 4) { setErr("Enter your current PIN first, then tap Change PIN."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/ronyx/staff-pins/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, pin }) });
      const d = await r.json();
      if (!d.ok) { setErr("Current PIN is incorrect."); setPin(""); setBusy(false); return; }
      const np = safePrompt(`New 4–6 digit PIN for ${selected.name}:`);
      if (np === null) { setBusy(false); return; }
      if (!/^\d{4,6}$/.test(np)) { setErr("New PIN must be 4–6 digits."); setBusy(false); return; }
      const sr = await fetch("/api/ronyx/staff-pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_pin", id: selected.id, pin: np }) });
      const sd = await sr.json().catch(() => ({}));
      if (sr.ok && sd.ok !== false) { setPin(""); setErr("✓ PIN changed — enter your new PIN to continue."); }
      else setErr(sd.error || "Could not change PIN.");
    } catch { setErr("Network error."); }
    setBusy(false);
  }

  const initials = (n: string) => n.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden", background: "radial-gradient(1100px 550px at 15% -10%, #172554 0%, transparent 60%), radial-gradient(900px 500px at 100% 110%, #0e2a3d 0%, transparent 55%), #05070f" }}>
      <div style={{ position: "absolute", top: "-12%", left: "12%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.30), transparent 65%)", filter: "blur(18px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "10%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.22), transparent 65%)", filter: "blur(18px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 460, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(99,179,237,0.22)", borderRadius: 22, padding: "30px 28px 24px", boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <img src="/ronyx_logo.png" alt="Ronyx Logistics" style={{ height: 56, width: "auto", margin: "0 auto 8px", display: "block" }}
            onError={(e) => { const img = e.currentTarget; img.style.display = "none"; const ic = img.parentElement?.querySelector(".pin-fallback-icon"); if (ic) (ic as HTMLElement).style.display = "flex"; }} />
          <div className="pin-fallback-icon" style={{ width: 52, height: 52, margin: "0 auto 8px", borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#0891b2)", display: "none", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🔐</div>
          <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff", letterSpacing: "0.01em" }}>Ronyx Logistics</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
            {view === "manage" ? "Manage staff & PINs" : view === "pin" ? `Enter PIN for ${selected?.name}` : "Who's working? Tap your name."}
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8, fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase" }}>Powered by MoveAround TMS</div>
        </div>

        {view === "pick" && (
          <>
            {loading ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Loading…</div> : staff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
                <div style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>No staff set up yet.</div>
                <button onClick={() => setView("manage")} style={btnPrimary}>+ Add your first staff member</button>
                <div style={{ marginTop: 12 }}><button onClick={onSkip} style={btnGhost}>Continue without a PIN for now</button></div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {staff.map(s => (
                    <button key={s.id} onClick={() => { setSelected(s); setPin(""); setErr(""); setView("pin"); }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, background: "rgba(255,255,255,0.04)", cursor: "pointer" }}>
                      <span style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#06b6d4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, boxShadow: "0 6px 16px rgba(37,99,235,0.45)" }}>{initials(s.name)}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0", textAlign: "center", lineHeight: 1.2 }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{s.role}</span>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center" }}><button onClick={() => setView("manage")} style={btnGhost}>⚙ Manage staff</button></div>
              </>
            )}
            {showSignupLinks && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.15)", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 9, fontWeight: 800 }}>New to Ronyx? Sign up here</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="/owner-operator-signup" style={signupBtn("#1d4ed8")}>🚛 Owner-Operator Sign-Up</a>
                  <a href="/driver-signup" style={signupBtn("#0e7490")}>🧑‍✈️ Driver Sign-Up</a>
                </div>
              </div>
            )}
          </>
        )}

        {view === "pin" && selected && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "6px 0 16px" }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? "linear-gradient(135deg,#2563eb,#06b6d4)" : "rgba(148,163,184,0.2)", boxShadow: i < pin.length ? "0 0 12px rgba(56,189,248,0.7)" : "none", visibility: i < 4 || i < pin.length ? "visible" : "hidden", transition: "all .15s" }} />
              ))}
            </div>
            {err && <div style={{ textAlign: "center", color: err.startsWith("✓") ? "#15803d" : "#dc2626", fontSize: 13, marginBottom: 10, fontWeight: err.startsWith("✓") ? 700 : 400 }}>{err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto" }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(n => (
                <button key={n} onClick={() => setPin(p => (p.length < 6 ? p + n : p))} style={keyBtn}>{n}</button>
              ))}
              <button onClick={() => setPin("")} style={{ ...keyBtn, fontSize: 13, color: "#64748b" }}>Clear</button>
              <button onClick={() => setPin(p => (p.length < 6 ? p + "0" : p))} style={keyBtn}>0</button>
              <button onClick={() => setPin(p => p.slice(0, -1))} style={{ ...keyBtn, fontSize: 18 }}>⌫</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setView("pick"); setPin(""); setErr(""); }} style={{ ...btnGhost, flex: "0 0 auto" }}>← Back</button>
              <button onClick={submitPin} disabled={pin.length < 4 || busy} style={{ ...btnPrimary, flex: 1, opacity: pin.length < 4 || busy ? 0.5 : 1 }}>{busy ? "Checking…" : "Unlock"}</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button onClick={changePin} disabled={busy} style={{ ...btnGhost, fontSize: 12 }}>🔑 Change my PIN</button>
            </div>
          </div>
        )}

        {view === "manage" && <ManagePanel staff={staff} reload={load} onDone={() => setView("pick")} />}
      </div>
    </div>
  );
}

function ManagePanel({ staff, reload, onDone }: { staff: StaffLite[]; reload: () => void; onDone: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Dispatcher");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  async function call(body: any) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/ronyx/staff-pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Something went wrong."); return false; }
    await reload();
    return true;
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 180, overflowY: "auto" }}>
        {staff.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>No staff yet — add one below.</div>}
        {staff.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 9 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{s.name}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{s.role}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: s.has_pin ? "#16a34a" : "#dc2626" }}>{s.has_pin ? "PIN set" : "no PIN"}</span>
            <button onClick={async () => { const p = safePrompt(`New 4–6 digit PIN for ${s.name}:`); if (p) await call({ action: "set_pin", id: s.id, pin: p }); }} style={miniBtn}>Set PIN</button>
            <button onClick={async () => { if (confirm(`Remove ${s.name}?`)) await call({ action: "remove", id: s.id }); }} style={{ ...miniBtn, color: "#dc2626", borderColor: "#fecaca" }}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Add staff member</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inp} />
          <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inp} />
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (e.g. Dispatcher)" style={{ ...inp, gridColumn: "1 / -1" }} />
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4–6 digit PIN" inputMode="numeric" style={{ ...inp, gridColumn: "1 / -1" }} />
        </div>
        {msg && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{msg}</div>}
        <button disabled={busy || !firstName.trim() || pin.length < 4} onClick={async () => { if (await call({ action: "add", name: fullName, role, pin })) { setFirstName(""); setLastName(""); setPin(""); setRole("Dispatcher"); } }} style={{ ...btnPrimary, width: "100%", opacity: busy || !firstName.trim() || pin.length < 4 ? 0.5 : 1 }}>+ Add staff</button>
      </div>
      <div style={{ textAlign: "center", marginTop: 12 }}><button onClick={onDone} style={btnGhost}>← Back to sign-in</button></div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "12px 18px", background: "linear-gradient(135deg,#2563eb,#06b6d4)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 26px rgba(37,99,235,0.45)" };
const btnGhost: React.CSSProperties = { padding: "9px 14px", background: "none", color: "#38bdf8", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const keyBtn: React.CSSProperties = { padding: "16px 0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, fontWeight: 800, fontSize: 20, color: "#e2e8f0", cursor: "pointer" };
const signupBtn = (bg: string): React.CSSProperties => ({ display: "inline-block", padding: "9px 13px", background: bg, color: "#fff", borderRadius: 9, fontWeight: 800, fontSize: 12.5, textDecoration: "none", whiteSpace: "nowrap" });
const miniBtn: React.CSSProperties = { padding: "4px 9px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#cbd5e1", cursor: "pointer" };
const inp: React.CSSProperties = { padding: "9px 11px", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", width: "100%", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", outline: "none" };
