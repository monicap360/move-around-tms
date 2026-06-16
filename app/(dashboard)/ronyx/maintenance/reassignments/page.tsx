"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  driver_name: string | null;
  old_truck_number: string | null;
  new_truck_number: string | null;
  reason: string | null;
  reassigned_by: string | null;
  manager_override: boolean;
  notes: string | null;
  reassigned_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ReassignmentLogPage() {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ronyx/truck-reassignments").then(r => r.json()).then(d => { setLogs(d.logs || []); setLoading(false); });
  }, []);

  return (
    <div style={{ padding:"24px 28px", maxWidth:1100, fontFamily:"system-ui, sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.1em" }}>Maintenance</div>
        <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>Truck Reassignment Log</h1>
        <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:"0.85rem" }}>Full audit trail of every truck reassignment — who, when, why, and whether a manager override was used.</p>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>No reassignments logged yet.</div>
      ) : (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["Date","Driver","From Truck","To Truck","Reason","By","Override","Notes"].map(h => (
                  <th key={h} style={{ padding:"8px 16px", fontSize:"0.65rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"10px 16px", color:"#64748b", whiteSpace:"nowrap" }}>{fmt(l.reassigned_at)}</td>
                  <td style={{ padding:"10px 16px", fontWeight:700, color:"#0f172a" }}>{l.driver_name || "—"}</td>
                  <td style={{ padding:"10px 16px", color:"#dc2626", fontWeight:600 }}>#{l.old_truck_number || "—"}</td>
                  <td style={{ padding:"10px 16px", color:"#15803d", fontWeight:700 }}>#{l.new_truck_number || "—"}</td>
                  <td style={{ padding:"10px 16px", color:"#475569" }}>{l.reason || "—"}</td>
                  <td style={{ padding:"10px 16px" }}>{l.reassigned_by || "—"}</td>
                  <td style={{ padding:"10px 16px" }}>
                    {l.manager_override
                      ? <span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 8px", borderRadius:6, fontSize:"0.65rem", fontWeight:700 }}>Yes</span>
                      : <span style={{ color:"#94a3b8" }}>No</span>
                    }
                  </td>
                  <td style={{ padding:"10px 16px", color:"#64748b", fontSize:"0.75rem" }}>{l.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
