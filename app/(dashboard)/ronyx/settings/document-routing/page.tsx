"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Rule = {
  id: string; document_type: string; document_label: string; applies_to: string;
  default_route: string; requires_expiration_date: boolean;
  blocks_dispatch: boolean; blocks_payroll: boolean;
  assigned_role: string | null; is_active: boolean;
};

const ROUTES = [
  "Driver Documents","Owner Operator COI Matrix","Fleet Documents",
  "Maintenance Work Order","Parts Dispatch","Driver Agreements",
  "Owner Operator Agreements","Fast Scan","Fast Scan / Billing","Compliance",
];
const APPLIES = ["driver","truck","owner_operator","job","company"];
const ROLES = ["Compliance Admin","Fleet Admin","Fleet Manager","Payroll Admin","Billing Admin","Fast Scan Staff","Parts Runner","Maintenance Manager"];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
      background: on ? "#1d4ed8" : "#e2e8f0", position: "relative", flexShrink: 0, transition: "background 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

export default function DocumentRoutingPage() {
  const [rules, setRules]   = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast]   = useState("");
  const [filterApplies, setFilterApplies] = useState("all");

  useEffect(() => {
    fetch("/api/ronyx/settings/document-routing").then(r => r.json()).then(d => setRules(d.rules ?? [])).finally(() => setLoading(false));
  }, []);

  async function patch(id: string, updates: Partial<Rule>) {
    setSaving(id);
    try {
      const res = await fetch("/api/ronyx/settings/document-routing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setRules(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
      setToast("Saved.");
    } catch (err: any) {
      setToast(err.message ?? "Save failed.");
    } finally {
      setSaving(null);
      setTimeout(() => setToast(""), 2000);
    }
  }

  const displayed = filterApplies === "all" ? rules : rules.filter(r => r.applies_to === filterApplies);
  const grouped: Record<string, Rule[]> = {};
  for (const r of displayed) (grouped[r.applies_to] ??= []).push(r);

  const APPLIES_LABELS: Record<string, string> = {
    driver: "🧑‍✈️ Driver Documents", truck: "🚛 Truck / Fleet Documents",
    owner_operator: "🏢 Owner Operator Documents", job: "📋 Job / Ticket Documents", company: "🏗️ Company Documents",
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Document Routing</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Document Types & Upload Routing</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Control where each document type routes, what it blocks, and who is responsible.</div>
      </div>

      {/* AI Guidance */}
      <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#f0f9ff", padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#1e40af" }}>
        <strong>AI Guidance:</strong> Each document type here is what staff sees when they upload. The route controls where the file is stored. Blocks Dispatch and Blocks Payroll control what Dispatch Guard and Payroll Review enforce.
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", ...APPLIES].map(a => (
          <button key={a} onClick={() => setFilterApplies(a)}
            style={{ padding: "4px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: filterApplies === a ? "#1e40af" : "#fff", color: filterApplies === a ? "#fff" : "#475569" }}>
            {a === "all" ? "All" : a.replace("_"," ")}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([appliesTo, rs]) => (
        <div key={appliesTo} style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 10 }}>
            {APPLIES_LABELS[appliesTo] ?? appliesTo}
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Document","Default Route","Exp. Date","Blocks Dispatch","Blocks Payroll","Assigned Role"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rs.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{r.document_label}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <select value={r.default_route} onChange={e => patch(r.id, { default_route: e.target.value })}
                        style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, maxWidth: 200 }}>
                        {ROUTES.map(rt => <option key={rt}>{rt}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <Toggle on={r.requires_expiration_date} onChange={() => patch(r.id, { requires_expiration_date: !r.requires_expiration_date })} />
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <Toggle on={r.blocks_dispatch} onChange={() => patch(r.id, { blocks_dispatch: !r.blocks_dispatch })} />
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <Toggle on={r.blocks_payroll} onChange={() => patch(r.id, { blocks_payroll: !r.blocks_payroll })} />
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <select value={r.assigned_role ?? ""} onChange={e => patch(r.id, { assigned_role: e.target.value || null })}
                        style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, maxWidth: 180 }}>
                        <option value="">—</option>
                        {ROLES.map(rl => <option key={rl}>{rl}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {rules.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No routing rules yet</div>
          <div style={{ fontSize: 13 }}>Run migration 142 to seed the default document routing rules.</div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 12 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
