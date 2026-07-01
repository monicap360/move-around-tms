"use client";

import { useEffect, useMemo, useState } from "react";

type Truck = {
  id: string; oo_id: string; company: string; truck_number: string; year: string;
  make: string; model: string; vin: string; plate: string; driver: string;
  last_inspection: string; inspection_result: string; status: string;
};

const inp: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.84rem", outline: "none", background: "#fff", color: "#0f172a" };
const cell: React.CSSProperties = { padding: "8px 12px", color: "#334155", whiteSpace: "nowrap" };

export default function FleetTrucks() {
  const [rows, setRows] = useState<Truck[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [oo, setOo] = useState("all");

  function load() {
    setLoading(true);
    fetch("/api/ronyx/owner-operators/trucks").then(r => r.json()).then(d => { setRows(d.trucks || []); setCompanies(d.companies || []); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => rows.filter(t => {
    if (oo !== "all" && t.oo_id !== oo) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return t.truck_number.toLowerCase().includes(s) || t.company.toLowerCase().includes(s) || t.vin.toLowerCase().includes(s) || t.plate.toLowerCase().includes(s) || t.driver.toLowerCase().includes(s) || `${t.make} ${t.model}`.toLowerCase().includes(s);
  }), [rows, q, oo]);

  // Group the visible trucks by owner-operator.
  const groups = useMemo(() => {
    const m = new Map<string, Truck[]>();
    for (const t of shown) { const k = t.company; if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const insBadge = (r: string) => {
    const ok = !r || /pass/i.test(r);
    return <span style={{ background: ok ? "#f0fdf4" : "#fef2f2", color: ok ? "#15803d" : "#dc2626", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.72rem" }}>{r || "—"}</span>;
  };

  return (
    <div style={{ padding: "22px 26px 70px", maxWidth: 1400, margin: "0 auto", color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🚛 Fleet Trucks</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Every owner-operator's trucks in one place. Filter to any owner-operator to pull up just their fleet.</p>
        </div>
        <button onClick={load} style={{ ...inp, cursor: "pointer", fontWeight: 700, color: "#475569" }}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "14px 0 16px" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search truck #, company, VIN, plate, driver…" style={{ ...inp, width: 300 }} />
        <select value={oo} onChange={e => setOo(e.target.value)} style={{ ...inp, minWidth: 220 }}>
          <option value="all">All owner-operators ({companies.length})</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{shown.length} truck{shown.length === 1 ? "" : "s"}{oo === "all" ? ` · ${groups.length} owner-operators` : ""}</span>
      </div>

      {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading trucks…</div>
        : shown.length === 0 ? <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 30, textAlign: "center", color: "#94a3b8" }}>No trucks in this view.</div>
        : groups.map(([company, list]) => (
          <div key={company} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>{company}</span>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 800 }}>{list.length} truck{list.length === 1 ? "" : "s"}</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 900 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Truck #", "Year", "Make", "Model", "VIN", "Plate", "Assigned Driver", "Inspection"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontSize: "0.66rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {list.map(t => (
                    <tr key={t.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ ...cell, fontWeight: 800, color: "#0f172a" }}>{t.truck_number || "—"}</td>
                      <td style={cell}>{t.year || "—"}</td>
                      <td style={cell}>{t.make || "—"}</td>
                      <td style={cell}>{t.model || "—"}</td>
                      <td style={{ ...cell, fontFamily: "monospace", fontSize: "0.76rem" }}>{t.vin || "—"}</td>
                      <td style={cell}>{t.plate || "—"}</td>
                      <td style={cell}>{t.driver || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={cell}>{insBadge(t.inspection_result)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
