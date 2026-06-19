"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ExpiringItem = {
  id: string;
  entity_type: "driver" | "truck" | "owner_operator";
  entity_id: string;
  entity_name: string;
  doc_type: string;
  expiration_date: string;
  days_until_expiry: number;
  status: "expiring_soon" | "expired" | "warning";
  assigned_to?: string;
  action_href?: string;
};

function urgencyStyle(days: number) {
  if (days < 0)  return { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", label: "Expired" };
  if (days <= 7) return { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", label: `${days}d left` };
  if (days <= 30) return { color: "#ea580c", bg: "#ffedd5", border: "#fdba74", label: `${days}d left` };
  return { color: "#b45309", bg: "#fef9c3", border: "#fde68a", label: `${days}d left` };
}

export default function ExpiringDocsPage() {
  const [items, setItems]       = useState<ExpiringItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setType]   = useState("all");
  const [rangeFilter, setRange] = useState("90");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const days = parseInt(rangeFilter, 10);
    Promise.all([
      fetch(`/api/ronyx/drivers/profiles`).then(r => r.json()).catch(() => ({ drivers: [] })),
      fetch(`/api/ronyx/trucks`).then(r => r.json()).catch(() => ({ trucks: [] })),
      fetch(`/api/ronyx/owner-operators`).then(r => r.json()).catch(() => ({ operators: [] })),
    ]).then(([driverData, truckData, ooData]) => {
      const now    = new Date();
      const cutoff = new Date(now.getTime() + days * 86400000);
      const results: ExpiringItem[] = [];

      (driverData.drivers ?? []).forEach((d: Record<string, string>) => {
        const expiryFields: Array<[string, string]> = [
          [d.cdl_expiration,           "CDL"],
          [d.medical_card_expiration,  "Medical Card"],
          [d.mvr_expiration,           "MVR"],
          [d.drug_test_expiration,     "Drug Test"],
        ];
        expiryFields.forEach(([exp, label]) => {
          if (!exp) return;
          const expDate = new Date(exp);
          if (expDate <= cutoff) {
            const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / 86400000);
            results.push({ id: `${d.id}-${label}`, entity_type: "driver", entity_id: d.id, entity_name: d.full_name,
              doc_type: label, expiration_date: exp, days_until_expiry: daysLeft,
              status: daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "warning",
              action_href: `/ronyx/drivers/${d.id}` });
          }
        });
      });

      (truckData.trucks ?? []).forEach((t: Record<string, string>) => {
        const expiryFields: Array<[string, string]> = [
          [t.registration_expiration,  "Registration"],
          [t.insurance_expiration,     "Insurance"],
          [t.inspection_expiration,    "Inspection"],
          [t.ifta_decal_expiration,    "IFTA Decal"],
        ];
        expiryFields.forEach(([exp, label]) => {
          if (!exp) return;
          const expDate = new Date(exp);
          if (expDate <= cutoff) {
            const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / 86400000);
            results.push({ id: `${t.id}-${label}`, entity_type: "truck", entity_id: t.id, entity_name: t.truck_number ?? t.id,
              doc_type: label, expiration_date: exp, days_until_expiry: daysLeft,
              status: daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "warning",
              action_href: `/ronyx/fleet` });
          }
        });
      });

      (ooData.operators ?? ooData.owner_operators ?? []).forEach((o: Record<string, string>) => {
        const expiryFields: Array<[string, string]> = [
          [o.auto_liability_expiration, "Auto Liability COI"],
          [o.general_liability_expiration, "General Liability COI"],
          [o.cargo_expiration,          "Cargo COI"],
          [o.workers_comp_expiration,   "Workers Comp"],
        ];
        expiryFields.forEach(([exp, label]) => {
          if (!exp) return;
          const expDate = new Date(exp);
          if (expDate <= cutoff) {
            const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / 86400000);
            results.push({ id: `${o.id}-${label}`, entity_type: "owner_operator", entity_id: o.id, entity_name: o.company_name ?? o.id,
              doc_type: label, expiration_date: exp, days_until_expiry: daysLeft,
              status: daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "warning",
              action_href: `/ronyx/owner-operators` });
          }
        });
      });

      results.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
      setItems(results);
    }).finally(() => setLoading(false));
  }, [rangeFilter]);

  const filtered = items.filter(it => {
    const matchType = typeFilter === "all" || it.entity_type === typeFilter;
    const matchSearch = !search || [it.entity_name, it.doc_type].some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const expired        = items.filter(i => i.days_until_expiry < 0).length;
  const criticalSoon   = items.filter(i => i.days_until_expiry >= 0 && i.days_until_expiry <= 7).length;
  const warningSoon    = items.filter(i => i.days_until_expiry > 7 && i.days_until_expiry <= 30).length;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      <div style={{ background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)", padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.4rem" }}>⏰</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>Expiring Documents</h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
              Drivers · Trucks · Owner Operators · Insurance · Registrations · Inspections
            </p>
          </div>
          <Link href="/ronyx/compliance/audit-ready"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "10px 20px", borderRadius: 8,
              fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
            🛡️ Be Audit Ready™
          </Link>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Expiring",  value: items.length,    color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" },
            { label: "Already Expired", value: expired,         color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
            { label: "Expires ≤ 7 days",value: criticalSoon,   color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
            { label: "Expires ≤ 30 days",value: warningSoon,   color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search name, document type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 220 }}
          />
          {[["all","All"],["driver","Drivers"],["truck","Trucks"],["owner_operator","Owner Ops"]].map(([f, l]) => (
            <button key={f} onClick={() => setType(f)}
              style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                border: `1px solid ${typeFilter === f ? "#ea580c" : "#e2e8f0"}`,
                background: typeFilter === f ? "#ea580c" : "#fff",
                color: typeFilter === f ? "#fff" : "#475569" }}>
              {l}
            </button>
          ))}
          <select value={rangeFilter} onChange={e => setRange(e.target.value)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", cursor: "pointer" }}>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
            <option value="180">Next 180 days</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} items</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Scanning for expiring documents...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, color: "#15803d", fontSize: "1rem" }}>All documents are current within the selected range</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Entity","Type","Document","Expiration","Status",""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.72rem", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((it, i) => {
                  const urg = urgencyStyle(it.days_until_expiry);
                  return (
                    <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{it.entity_name}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>
                          {it.entity_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{it.doc_type}</td>
                      <td style={{ padding: "10px 14px", color: it.days_until_expiry < 0 ? "#dc2626" : "#475569", fontWeight: it.days_until_expiry < 0 ? 700 : 400 }}>
                        {new Date(it.expiration_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: urg.bg, color: urg.color, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.72rem" }}>
                          {urg.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {it.action_href && (
                          <Link href={it.action_href}
                            style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none" }}>
                            Fix →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
