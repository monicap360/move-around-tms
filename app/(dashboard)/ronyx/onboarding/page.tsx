"use client";

import { useEffect, useState } from "react";

// Onboarding hub — one place for the office to bring carriers & drivers into the
// system: review self-sign-ups, import the master roster, add one manually, and
// share the public sign-up links.

export default function OnboardingHub() {
  const [pending, setPending] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/ronyx/owner-operators").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : (d.owner_operators || d.companies || d.items || []);
      setPending(list.filter((c: any) => (c.status || "").toLowerCase() === "pending").length);
    }).catch(() => setPending(null));
  }, []);

  const copy = (url: string) => { navigator.clipboard?.writeText(url).then(() => { setCopied(url); setTimeout(() => setCopied(""), 1800); }).catch(() => {}); };

  const Card = ({ href, icon, title, desc, accent, badge }: any) => (
    <a href={href} style={{ display: "block", textDecoration: "none", background: "#fff", border: `1px solid ${accent}33`, borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: "18px 20px", transition: "box-shadow .15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <span style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a" }}>{title}</span>
        {badge != null && badge > 0 && <span style={{ marginLeft: "auto", background: accent, color: "#fff", fontSize: "0.74rem", fontWeight: 900, padding: "2px 10px", borderRadius: 999 }}>{badge}</span>}
      </div>
      <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 6, lineHeight: 1.45 }}>{desc}</div>
    </a>
  );

  return (
    <div style={{ padding: "24px 26px 70px", maxWidth: 1000, margin: "0 auto", color: "#0f172a" }}>
      {copied && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>Link copied ✓</div>}

      <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900 }}>🚀 Onboarding</h1>
      <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 4 }}>Everything for bringing new carriers and drivers into the system — in one place.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginTop: 18 }}>
        <Card href="/ronyx/owner-operators?signups=1" icon="✨" title="New Sign-Ups" accent="#eab308" badge={pending}
          desc="Review owner-operators who registered themselves, check the documents they attached, and activate them." />
        <Card href="/ronyx/owner-operators/roster-import" icon="📋" title="Import Roster" accent="#1e40af"
          desc="Load many carriers + drivers from your master spreadsheet. Auto-maps columns, dedupes by person, fills truck #/CDL/medical, and previews before saving." />
        <Card href="/ronyx/owner-operators" icon="➕" title="Add Owner-Operator" accent="#16a34a"
          desc="Add a single carrier manually — then add their drivers, trucks, and documents." />
        <Card href="/ronyx/drivers/cdl-medical" icon="🪪" title="Fleet CDL & Medical" accent="#0891b2"
          desc="Add or edit every owner-operator's drivers — CDL, medical card, and truck # — in one table." />
      </div>

      {/* Share sign-up links */}
      <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: "1.02rem", fontWeight: 900 }}>🔗 Share sign-up links</div>
        <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 4, marginBottom: 12 }}>Text or email these to a new carrier or driver — they register themselves and upload their documents. They'll need the office sign-up PIN.</div>
        {[["🚛 Owner-Operator sign-up", "/owner-operator-signup"], ["👤 Driver sign-up", "/driver-signup"]].map(([label, path]) => {
          const url = origin + path;
          return (
            <div key={path} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 0", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontWeight: 700, fontSize: "0.86rem", minWidth: 190 }}>{label}</span>
              <code style={{ flex: 1, minWidth: 200, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: "0.78rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
              <button onClick={() => copy(url)} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Copy</button>
              <a href={path} target="_blank" rel="noreferrer" style={{ color: "#1e40af", fontWeight: 700, fontSize: "0.78rem", textDecoration: "none" }}>Open ↗</a>
            </div>
          );
        })}
      </div>

      {/* Advanced */}
      <div style={{ marginTop: 18, fontSize: "0.8rem", color: "#94a3b8" }}>
        Advanced: need to paste from Excel or map columns by hand? Use the <a href="/ronyx/owner-operators/import" style={{ color: "#64748b", fontWeight: 700 }}>manual Bulk Driver Import</a>. Most imports should use <strong>Import Roster</strong> above.
      </div>
    </div>
  );
}
