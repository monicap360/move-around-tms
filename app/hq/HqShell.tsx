"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// MoveAround HQ shell — the product company's cockpit, distinct from any tenant.
// Dark, futuristic MoveAround brand (navy/blue/cyan) with an animated starfield.
const NAV = [
  { key: "sales",    label: "TMS Sales",        href: "/hq/sales",         icon: "📈" },
  { key: "saleskit", label: "Sales Kit",        href: "/hq/sales-kit",     icon: "📚" },
  { key: "drivers",  label: "Find Drivers",     href: "/hq/find-drivers",  icon: "🧑‍✈️" },
  { key: "signups",  label: "Signups & Trials", href: "/hq/signups",       icon: "🚀" },
  { key: "billing",  label: "Billing",          href: "/hq/billing",       icon: "💳" },
];

const STARS = `
@keyframes hqTwinkle { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
@keyframes hqDrift  { from { background-position: 0 0, 0 0, 0 0 } to { background-position: 0 -220px, 0 -160px, 0 -300px } }
.hq-stars {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 24px 30px, #ffffff, transparent),
    radial-gradient(1px 1px at 90px 64px, rgba(255,255,255,.85), transparent),
    radial-gradient(1px 1px at 140px 22px, rgba(255,255,255,.6), transparent),
    radial-gradient(1.6px 1.6px at 174px 96px, #7dd3fc, transparent),
    radial-gradient(1px 1px at 46px 128px, rgba(255,255,255,.7), transparent),
    radial-gradient(1px 1px at 12px 92px, rgba(255,255,255,.5), transparent),
    radial-gradient(1.3px 1.3px at 118px 150px, #a5b4fc, transparent),
    radial-gradient(1px 1px at 200px 40px, rgba(255,255,255,.7), transparent),
    radial-gradient(1.4px 1.4px at 64px 190px, #ffffff, transparent),
    radial-gradient(1px 1px at 210px 170px, rgba(255,255,255,.55), transparent);
  background-repeat: repeat;
  background-size: 220px 220px;
  animation: hqTwinkle 4.5s ease-in-out infinite, hqDrift 60s linear infinite;
}
`;

export default function HqShell({ active, children }: { active: string; children: React.ReactNode }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/hq/logo").then(r => r.json()).then(d => setLogo(d.logo_url || null)).catch(() => {}); }, []);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/hq/logo", { method: "POST", body: fd });
      const j = await res.json();
      if (j.logo_url) setLogo(j.logo_url); else alert(j.error || "Upload failed.");
    } finally { setUploading(false); }
  }
  async function logout() {
    try { await fetch("/api/hq/logout", { method: "POST" }); } catch {}
    window.location.href = "/hq/login";
  }
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{STARS}</style>

      {/* Sidebar (starry) */}
      <aside style={{ position: "relative", overflow: "hidden", width: 232, flexShrink: 0, background: "linear-gradient(180deg,#060913 0%,#0a1024 55%,#0b1a33 100%)", color: "#e2e8f0", display: "flex", flexDirection: "column", padding: "20px 14px" }}>
        <div className="hq-stars" />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px" }}>
            <span onClick={() => fileRef.current?.click()} title="Click to upload / replace your logo" style={{ cursor: "pointer", display: "inline-flex" }}>
              {logo
                ? <img src={logo} alt="MoveAround" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "rgba(255,255,255,0.06)", padding: 2 }} />
                : <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#2563eb,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.05rem", color: "#fff", boxShadow: "0 4px 18px rgba(37,99,235,0.6)" }}>MA</div>}
            </span>
            <div>
              <div style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "0.02em", color: "#fff" }}>MoveAround</div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.28em", color: "#5eead4", fontWeight: 700 }}>HQ · TMS</div>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            {NAV.map(n => (
              <Link key={n.key} href={n.href} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                fontWeight: 700, fontSize: "0.86rem",
                color: active === n.key ? "#fff" : "#94a3b8",
                background: active === n.key ? "linear-gradient(90deg,rgba(37,99,235,0.4),rgba(6,182,212,0.14))" : "transparent",
                border: active === n.key ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
                boxShadow: active === n.key ? "0 0 20px rgba(56,189,248,0.15)" : "none",
              }}>
                <span style={{ fontSize: "1rem" }}>{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} style={{ marginTop: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}>⏻ Sign out</button>
          <div style={{ fontSize: "0.6rem", color: "#475569", marginTop: 14, padding: "0 8px" }}>MoveAround TMS — Company HQ. Separate from tenant workspaces.</div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, background: "#f1f5f9" }}>
        {/* Starry top band */}
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(90deg,#060913,#0b1a33)", padding: "13px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="hq-stars" />
          <span style={{ position: "relative", zIndex: 1, fontWeight: 900, color: "#fff", fontSize: "0.95rem" }}>MoveAround <span style={{ color: "#38bdf8" }}>HQ</span></span>
          <span style={{ position: "relative", zIndex: 1, fontSize: "0.72rem", color: "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.2)", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>Product Company Cockpit</span>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ position: "relative", zIndex: 1, marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: uploading ? "default" : "pointer" }}>{uploading ? "Uploading…" : logo ? "🖼 Change logo" : "🖼 Upload logo"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
          <a href="/" style={{ position: "relative", zIndex: 1, fontSize: "0.78rem", color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}>↗ movearoundtms.com</a>
          <button onClick={() => window.location.reload()} title="Refresh" style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>↻ Refresh</button>
          <button onClick={logout} title="Sign out" style={{ position: "relative", zIndex: 1, background: "rgba(239,68,68,0.14)", border: "1px solid rgba(248,113,113,0.35)", color: "#fca5a5", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer" }}>⏻ Logout</button>
        </div>
        {children}
      </main>
    </div>
  );
}
