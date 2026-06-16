"use client";

import { useEffect, useState } from "react";

type OOTruck  = { id: string; truck_number: string; status?: string; type?: string; year?: string; make?: string };
type OOCompany = { id: string; company_name: string; trucks: OOTruck[] };

const STATUS_ORDER = ["out_of_service","in_maintenance","inspection_due","insurance_expired","registration_expired","needs_review","active","assigned","in_use"];

function truckStatusLabel(s?: string) {
  const map: Record<string, string> = {
    active: "Available", assigned: "Assigned", in_use: "In Use",
    out_of_service: "Out of Service", in_maintenance: "In Maintenance",
    inspection_due: "Inspection Due", insurance_expired: "Insurance Expired",
    registration_expired: "Reg. Expired", needs_review: "Needs Review",
  };
  return map[s || "active"] || "Available";
}

function truckStatusColors(s?: string): [string, string] {
  if (!s || s === "active")                return ["#f0fdf4", "#15803d"];
  if (s === "assigned" || s === "in_use")  return ["#eff6ff", "#1d4ed8"];
  if (s === "out_of_service")              return ["#fff1f2", "#dc2626"];
  if (s === "in_maintenance")              return ["#fff7ed", "#ea580c"];
  if (s === "inspection_due")              return ["#fefce8", "#ca8a04"];
  return ["#f1f5f9", "#64748b"];
}

export default function TruckAvailabilityPage() {
  const [cos, setCOs]       = useState<OOCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState<string>("all");

  useEffect(() => {
    fetch("/api/ronyx/owner-operators").then(r => r.json()).then(d => { setCOs(d.companies || []); setLoading(false); });
  }, []);

  const allTrucks = cos.flatMap(c => c.trucks.map(t => ({ ...t, company: c.company_name })));
  const available   = allTrucks.filter(t => !t.status || t.status === "active").length;
  const unavailable = allTrucks.filter(t => t.status && !["active","assigned"].includes(t.status)).length;

  const filtered = filter === "all" ? allTrucks : allTrucks.filter(t => (t.status || "active") === filter);
  const sorted   = [...filtered].sort((a,b) => STATUS_ORDER.indexOf(a.status || "active") - STATUS_ORDER.indexOf(b.status || "active"));

  return (
    <div style={{ padding:"24px 28px", maxWidth:1100, fontFamily:"system-ui, sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.1em" }}>Maintenance</div>
        <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>Truck Availability</h1>
        <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:"0.85rem" }}>Real-time status of all trucks across every OO company.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Total Trucks",  value:allTrucks.length,  color:"#0f172a", bg:"#fff" },
          { label:"Available",     value:available,          color:"#15803d", bg:"#f0fdf4" },
          { label:"Unavailable",   value:unavailable,        color:"#dc2626", bg:"#fff1f2" },
          { label:"OO Companies",  value:cos.length,         color:"#7c3aed", bg:"#f5f3ff" },
        ].map(k => (
          <div key={k.label} style={{ background:k.bg, border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{k.label}</div>
            <div style={{ fontSize:"1.8rem", fontWeight:900, color:k.color, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["all","active","assigned","out_of_service","in_maintenance","inspection_due","needs_review"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?"#0f172a":"#f1f5f9", color:filter===f?"#fff":"#475569", border:"none", borderRadius:20, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
            {f === "all" ? "All" : truckStatusLabel(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading...</div>
      ) : (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["Truck #","Year / Make","Type","Company","Status"].map(h => (
                  <th key={h} style={{ padding:"8px 16px", fontSize:"0.65rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const [bg, color] = truckStatusColors(t.status);
                return (
                  <tr key={t.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"10px 16px", fontWeight:800, fontSize:"0.9rem", color:"#0f172a" }}>#{t.truck_number}</td>
                    <td style={{ padding:"10px 16px", color:"#475569" }}>{[t.year, t.make].filter(Boolean).join(" ") || "—"}</td>
                    <td style={{ padding:"10px 16px", color:"#64748b", fontSize:"0.78rem" }}>{t.type || "—"}</td>
                    <td style={{ padding:"10px 16px", color:"#475569" }}>{(t as any).company}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontSize:"0.68rem", fontWeight:800 }}>{truckStatusLabel(t.status)}</span>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:"center", padding:"30px", color:"#94a3b8" }}>No trucks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
