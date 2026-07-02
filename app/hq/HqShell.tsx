"use client";

import Link from "next/link";

// MoveAround HQ shell — the product company's cockpit, distinct from any tenant.
// Dark, futuristic MoveAround brand (navy/blue/cyan). Not tied to Ronyx.
const NAV = [
  { key: "sales",   label: "TMS Sales",        href: "/hq/sales",   icon: "📈" },
  { key: "signups", label: "Signups & Trials", href: "/hq/signups", icon: "🚀" },
];

export default function HqShell({ active, children }: { active: string; children: React.ReactNode }) {
  async function logout() {
    try { await fetch("/api/hq/logout", { method: "POST" }); } catch {}
    window.location.href = "/hq/login";
  }
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 232, flexShrink: 0, background: "linear-gradient(180deg,#0a1024 0%,#0f1e3d 100%)", color: "#e2e8f0", display: "flex", flexDirection: "column", padding: "20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#2563eb,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.05rem", color: "#fff", boxShadow: "0 4px 14px rgba(37,99,235,0.5)" }}>MA</div>
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
              background: active === n.key ? "linear-gradient(90deg,rgba(37,99,235,0.35),rgba(6,182,212,0.12))" : "transparent",
              border: active === n.key ? "1px solid rgba(56,189,248,0.35)" : "1px solid transparent",
            }}>
              <span style={{ fontSize: "1rem" }}>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} style={{ marginTop: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}>⏻ Sign out</button>
        <div style={{ fontSize: "0.6rem", color: "#475569", marginTop: 14, padding: "0 8px" }}>MoveAround TMS — Company HQ. Separate from tenant workspaces.</div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, background: "#f1f5f9" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 900, color: "#0f172a", fontSize: "0.95rem" }}>MoveAround HQ</span>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8", background: "#f1f5f9", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>Product Company Cockpit</span>
          <a href="/" style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#2563eb", textDecoration: "none", fontWeight: 700 }}>↗ movearoundtms.com</a>
        </div>
        {children}
      </main>
    </div>
  );
}
