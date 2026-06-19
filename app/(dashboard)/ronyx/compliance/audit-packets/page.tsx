"use client";

import Link from "next/link";

const PACKET_TYPES = [
  { icon: "👤", label: "Driver Audit Packet",        desc: "CDL, medical, MVR, drug test, background check, employment agreement, W-9", color: "#0891b2" },
  { icon: "🚛", label: "Truck Audit Packet",          desc: "Registration, insurance, inspection, cab card, lease, maintenance records",  color: "#0d9488" },
  { icon: "🏢", label: "Owner Operator Packet",       desc: "Contract, W-9, Auto/GL/Cargo COI, workers comp, truck and driver list",     color: "#7c3aed" },
  { icon: "📋", label: "Customer Job Packet",         desc: "Job details, tickets, driver and truck assignments, delivery confirmation",  color: "#1d4ed8" },
  { icon: "💵", label: "Payroll Packet",              desc: "Approved tickets, pay rates, settlement approvals, deductions, audit trail", color: "#15803d" },
  { icon: "🧾", label: "Billing Packet",              desc: "Invoices, approved tickets, rate sheets, payment history, reconciliation",  color: "#b45309" },
  { icon: "⛽", label: "IFTA Packet",                 desc: "Truck miles, fuel receipts, jurisdiction data, fuel card records",          color: "#ca8a04" },
  { icon: "🏢", label: "Full Company Packet",         desc: "All drivers, trucks, OOs, tickets, payroll, billing, and compliance docs",  color: "#dc2626" },
];

export default function AuditPacketsPage() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.4rem" }}>📦</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>Audit Packets</h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              Build and export compliance packets for auditors, insurers, customers, and owner reviews.
            </p>
          </div>
          <Link href="/ronyx/compliance/audit-ready"
            style={{ background: "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            🛡️ Open Be Audit Ready™
          </Link>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* Info banner */}
        <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.9rem", marginBottom: 4 }}>Be Audit Ready™ includes the full Audit Packet Builder</div>
            <div style={{ color: "#6d28d9", fontSize: "0.82rem" }}>
              Select packet type, choose a date range, and export a complete audit packet — cover sheet, missing items, documents, tickets, payroll proof, billing records, and audit log.
            </div>
          </div>
        </div>

        {/* Packet types */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>Select Packet Type</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {PACKET_TYPES.map(p => (
              <Link key={p.label} href="/ronyx/compliance/audit-ready#packet-builder"
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px",
                  textDecoration: "none", display: "flex", gap: 14, alignItems: "flex-start",
                  transition: "border-color 0.15s, box-shadow 0.15s" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.88rem", marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Date range selector */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>Date Range</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["This Week","This Month","This Quarter","Last Quarter","Custom Range"].map(r => (
              <button key={r}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc",
                  color: "#475569", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
                {r}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "flex", gap: 12 }}>
            <Link href="/ronyx/compliance/audit-ready#packet-builder"
              style={{ background: "#1e293b", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", textDecoration: "none" }}>
              📦 Build Audit Packet
            </Link>
            <Link href="/ronyx/compliance/audit-ready"
              style={{ background: "#f1f5f9", color: "#475569", padding: "12px 28px", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem", textDecoration: "none" }}>
              Open Full Audit Center
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>Quick Access</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {[
              { label: "Compliance Center",    href: "/ronyx/compliance",                icon: "🛡️" },
              { label: "Driver Docs",          href: "/ronyx/compliance/driver-docs",     icon: "📄" },
              { label: "Expiring Docs",        href: "/ronyx/compliance/expiring",        icon: "⏰" },
              { label: "RMIS Monitor",         href: "/ronyx/compliance/rmis-monitor",    icon: "📡" },
              { label: "Owner Operator COIs",  href: "/ronyx/owner-operators/coi-matrix", icon: "📋" },
              { label: "Tickets",              href: "/ronyx/tickets",                    icon: "🎫" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1e293b",
                  fontWeight: 600, fontSize: "0.8rem" }}>
                <span>{l.icon}</span>{l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
