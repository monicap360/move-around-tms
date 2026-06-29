"use client";

import { useEffect, useState, useCallback } from "react";
import { safePrompt } from "@/lib/safePrompt";

type MaintEvent = {
  id: string;
  oo_id: string;
  truck_id: string | null;
  truck_number: string | null;
  oo_company_name: string | null;
  event_type: string;
  severity: string;
  issue_title: string;
  issue_description: string | null;
  status: string;
  out_of_service: boolean;
  out_of_service_at: string | null;
  estimated_return_at: string | null;
  reported_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
};

type ReassignLog = {
  id: string;
  driver_name: string | null;
  old_truck_number: string | null;
  new_truck_number: string | null;
  reason: string | null;
  reassigned_by: string | null;
  manager_override: boolean;
  reassigned_at: string;
};

type OODriver = { id: string; name: string; truck_number?: string };
type OOTruck  = { id: string; truck_number: string; status?: string; type?: string };
type OOTruckAssignment = { id: string; driver_id: string; truck_id: string; priority: number; assignment_type: string; requires_manager_approval: boolean };
type OOCompany = { id: string; company_name: string; drivers: OODriver[]; trucks: OOTruck[]; driver_truck_assignments?: OOTruckAssignment[] };

const SEV_COLORS: Record<string, [string, string]> = {
  critical: ["#fff1f2", "#dc2626"],
  high:     ["#fff7ed", "#ea580c"],
  medium:   ["#fefce8", "#ca8a04"],
  low:      ["#f0fdf4", "#15803d"],
};

const STATUS_COLORS: Record<string, [string, string]> = {
  open:        ["#fff1f2", "#dc2626"],
  in_progress: ["#fff7ed", "#ea580c"],
  resolved:    ["#f0fdf4", "#15803d"],
  closed:      ["#f1f5f9", "#64748b"],
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isTruckAvailable(s?: string) {
  return !s || s === "active" || s === "assigned";
}

const PRIORITY_LABELS: Record<number, string> = { 1: "Primary", 2: "Backup 1", 3: "Backup 2", 4: "Backup 3" };

export default function BreakdownsPage() {
  const [events, setEvents]       = useState<MaintEvent[]>([]);
  const [logs,   setLogs]         = useState<ReassignLog[]>([]);
  const [cos,    setCOs]          = useState<OOCompany[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"all" | "open" | "in_progress" | "resolved">("open");
  const [toast,  setToast]        = useState("");

  // Reassign modal state
  const [reassignModal, setReassignModal] = useState<{ event: MaintEvent; driver: OODriver; oo: OOCompany } | null>(null);
  const [reassignForm,  setReassignForm]  = useState({ new_truck_id:"", reason:"", reassigned_by:"", manager_override:false, notes:"" });

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, logRes, coRes] = await Promise.all([
      fetch("/api/ronyx/maintenance-events?status=all").then(r => r.json()),
      fetch("/api/ronyx/truck-reassignments").then(r => r.json()),
      fetch("/api/ronyx/owner-operators").then(r => r.json()),
    ]);
    setEvents(evRes.events || []);
    setLogs(logRes.logs || []);
    setCOs(coRes.companies || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => filter === "all" || e.status === filter);
  const open  = events.filter(e => e.status === "open").length;
  const inPrg = events.filter(e => e.status === "in_progress").length;

  async function resolveEvent(id: string) {
    const ev = events.find(e => e.id === id);
    const by = safePrompt("Resolved by (staff name):", "") || "Staff";
    const r = await fetch(`/api/ronyx/maintenance-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", resolved_by: by }),
    });
    if (!r.ok) { flash("Failed to resolve."); return; }
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: "resolved", resolved_by: by, resolved_at: new Date().toISOString() } : e));
    flash(`Truck ${ev?.truck_number || ""} restored — event resolved.`);
  }

  async function doReassign() {
    if (!reassignModal || !reassignForm.new_truck_id) { flash("Select a backup truck."); return; }
    const { event, driver, oo } = reassignModal;
    const newTruck = oo.trucks.find(t => t.id === reassignForm.new_truck_id);
    if (!newTruck) return;
    const r = await fetch("/api/ronyx/truck-reassignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oo_id: oo.id,
        driver_id: driver.id,
        old_truck_id: oo.trucks.find(t => t.truck_number === driver.truck_number)?.id || null,
        new_truck_id: newTruck.id,
        driver_name: driver.name,
        old_truck_number: driver.truck_number || null,
        new_truck_number: newTruck.truck_number,
        reason: reassignForm.reason,
        reassigned_by: reassignForm.reassigned_by,
        manager_override: reassignForm.manager_override,
        notes: reassignForm.notes,
      }),
    });
    if (!r.ok) {
      const d = await r.json();
      flash(d.error || "Reassignment failed."); return;
    }
    flash(`${driver.name} reassigned to Truck #${newTruck.truck_number}.`);
    setCOs(prev => prev.map(c => c.id === oo.id ? {
      ...c,
      drivers: c.drivers.map(d2 => d2.id === driver.id ? { ...d2, truck_number: newTruck.truck_number } : d2),
    } : c));
    setReassignModal(null);
    setReassignForm({ new_truck_id:"", reason:"", reassigned_by:"", manager_override:false, notes:"" });
    load(); // refresh logs
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, fontFamily: "system-ui, sans-serif" }}>
      {toast && <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 22px", borderRadius:14, fontWeight:700, fontSize:14 }}>{toast}</div>}

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#ea580c", textTransform:"uppercase", letterSpacing:"0.1em" }}>Maintenance</div>
        <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>Breakdowns & Out of Service</h1>
        <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:"0.85rem" }}>Track truck outages, guided driver reassignment, and compliance-aware backup selection.</p>
      </div>

      {/* KPI Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Open Events",    value:open,  color:"#dc2626", bg:"#fff1f2" },
          { label:"In Progress",    value:inPrg, color:"#ea580c", bg:"#fff7ed" },
          { label:"Total Events",   value:events.length, color:"#0f172a", bg:"#fff" },
          { label:"Reassignments",  value:logs.length,   color:"#7c3aed", bg:"#f5f3ff" },
        ].map(k => (
          <div key={k.label} style={{ background:k.bg, border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{k.label}</div>
            <div style={{ fontSize:"1.8rem", fontWeight:900, color:k.color, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {(["open","in_progress","resolved","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?"#0f172a":"#f1f5f9", color:filter===f?"#fff":"#475569", border:"none", borderRadius:20, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
            {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "open"        && open  > 0 ? ` (${open})` : ""}
            {f === "in_progress" && inPrg > 0 ? ` (${inPrg})` : ""}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft:"auto", background:"#fff", border:"1px solid #e2e8f0", borderRadius:20, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", color:"#475569" }}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8", fontSize:"0.88rem" }}>
          {filter === "open" ? "No open maintenance events." : "No events found."}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map(ev => {
            const oo = cos.find(c => c.id === ev.oo_id);
            const affectedDrivers = oo?.drivers.filter(d => d.truck_number === ev.truck_number) || [];
            const [sevBg, sevColor] = SEV_COLORS[ev.severity] || SEV_COLORS.medium;
            const [stBg, stColor]  = STATUS_COLORS[ev.status] || STATUS_COLORS.open;

            return (
              <div key={ev.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:"1.4rem" }}>🚨</span>
                    <div>
                      <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a" }}>Truck #{ev.truck_number || "—"}</div>
                      <div style={{ fontSize:"0.78rem", color:"#64748b" }}>{ev.oo_company_name || "—"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <span style={{ background:sevBg, color:sevColor, padding:"3px 10px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>{ev.severity.toUpperCase()}</span>
                    <span style={{ background:stBg, color:stColor, padding:"3px 10px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>{ev.status.replace("_"," ").toUpperCase()}</span>
                    <span style={{ background:"#f1f5f9", color:"#475569", padding:"3px 10px", borderRadius:20, fontSize:"0.65rem", fontWeight:700 }}>{ev.event_type.replace(/_/g," ")}</span>
                  </div>
                </div>

                <div style={{ marginTop:12, fontWeight:700, fontSize:"0.9rem", color:"#0f172a" }}>{ev.issue_title}</div>
                {ev.issue_description && <div style={{ fontSize:"0.78rem", color:"#64748b", marginTop:4 }}>{ev.issue_description}</div>}

                <div style={{ display:"flex", gap:18, marginTop:10, flexWrap:"wrap", fontSize:"0.72rem", color:"#94a3b8" }}>
                  {ev.out_of_service_at && <span>Out of service: <strong style={{ color:"#dc2626" }}>{fmt(ev.out_of_service_at)}</strong></span>}
                  {ev.estimated_return_at && <span>Est. return: <strong>{fmt(ev.estimated_return_at)}</strong></span>}
                  {ev.reported_by && <span>Reported by: <strong style={{ color:"#475569" }}>{ev.reported_by}</strong></span>}
                  {ev.resolved_at && <span>Resolved: <strong style={{ color:"#15803d" }}>{fmt(ev.resolved_at)} by {ev.resolved_by}</strong></span>}
                </div>

                {/* Affected drivers + backup options */}
                {affectedDrivers.length > 0 && ev.status !== "resolved" && (
                  <div style={{ marginTop:14, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#ea580c", marginBottom:8 }}>AFFECTED DRIVERS</div>
                    {affectedDrivers.map(d => {
                      const assignments = (oo?.driver_truck_assignments || [])
                        .filter(a => a.driver_id === d.id)
                        .sort((a,b) => a.priority - b.priority);
                      const backups = assignments
                        .filter(a => a.assignment_type === "backup")
                        .map(a => ({ ...a, truck: oo?.trucks.find(t => t.id === a.truck_id) }))
                        .filter(a => a.truck);
                      const available = backups.filter(a => isTruckAvailable(a.truck!.status));

                      return (
                        <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, padding:"8px 0", borderBottom:"1px solid #fed7aa" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:"0.85rem", color:"#0f172a" }}>{d.name}</div>
                            <div style={{ fontSize:"0.72rem", color:"#64748b" }}>Current truck: #{d.truck_number || "—"}</div>
                            {available.length > 0 ? (
                              <div style={{ fontSize:"0.72rem", color:"#15803d", fontWeight:600, marginTop:3 }}>
                                Recommended backup: Truck #{available[0].truck!.truck_number} ({PRIORITY_LABELS[available[0].priority]})
                              </div>
                            ) : (
                              <div style={{ fontSize:"0.72rem", color:"#dc2626", fontWeight:600, marginTop:3 }}>No available backup trucks in approved pool</div>
                            )}
                          </div>
                          {oo && (
                            <button
                              onClick={() => { setReassignModal({ event: ev, driver: d, oo }); setReassignForm({ new_truck_id: available[0]?.truck?.id || "", reason:"breakdown", reassigned_by:"", manager_override:false, notes:"" }); }}
                              style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}
                            >
                              Reassign Truck
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                {ev.status !== "resolved" && ev.status !== "closed" && (
                  <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                    <button onClick={() => resolveEvent(ev.id)} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:8, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
                      Mark Resolved
                    </button>
                    <button
                      onClick={async () => {
                        const r = await fetch(`/api/ronyx/maintenance-events/${ev.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"in_progress" }) });
                        if (r.ok) setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status:"in_progress" } : e));
                      }}
                      style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}
                    >
                      Mark In Progress
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Reassignment Log */}
      {logs.length > 0 && (
        <div style={{ marginTop:32 }}>
          <div style={{ fontWeight:800, fontSize:"0.75rem", color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Recent Reassignments</div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Driver","From Truck","To Truck","Reason","By","Date","Override"].map(h => (
                    <th key={h} style={{ padding:"8px 14px", fontSize:"0.65rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0,20).map(l => (
                  <tr key={l.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"8px 14px", fontWeight:600 }}>{l.driver_name || "—"}</td>
                    <td style={{ padding:"8px 14px", color:"#dc2626" }}>#{l.old_truck_number || "—"}</td>
                    <td style={{ padding:"8px 14px", color:"#15803d", fontWeight:700 }}>#{l.new_truck_number || "—"}</td>
                    <td style={{ padding:"8px 14px", color:"#64748b" }}>{l.reason || "—"}</td>
                    <td style={{ padding:"8px 14px" }}>{l.reassigned_by || "—"}</td>
                    <td style={{ padding:"8px 14px", color:"#64748b" }}>{fmt(l.reassigned_at)}</td>
                    <td style={{ padding:"8px 14px" }}>{l.manager_override ? <span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 6px", borderRadius:6, fontSize:"0.62rem", fontWeight:700 }}>Yes</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:500, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a", marginBottom:4 }}>Reassign Truck</div>
            <div style={{ fontSize:"0.78rem", color:"#64748b", marginBottom:16 }}>
              Driver: <strong>{reassignModal.driver.name}</strong> — Current truck: <strong>#{reassignModal.driver.truck_number || "—"}</strong>
            </div>

            {/* Approved backups */}
            {(() => {
              const { oo, driver } = reassignModal;
              const assignments = (oo.driver_truck_assignments || [])
                .filter(a => a.driver_id === driver.id)
                .sort((a,b) => a.priority - b.priority);
              const backups = assignments.map(a => ({ ...a, truck: oo.trucks.find(t => t.id === a.truck_id) })).filter(a => a.truck);
              return (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#64748b", marginBottom:8 }}>APPROVED TRUCKS</div>
                  {backups.map(a => {
                    const available = isTruckAvailable(a.truck!.status);
                    return (
                      <div
                        key={a.id}
                        onClick={() => available && setReassignForm(f => ({ ...f, new_truck_id: a.truck!.id }))}
                        style={{
                          display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding:"10px 12px", borderRadius:8, marginBottom:6, cursor:available?"pointer":"default",
                          border: reassignForm.new_truck_id === a.truck!.id ? "2px solid #1e40af" : "1px solid #e2e8f0",
                          background: reassignForm.new_truck_id === a.truck!.id ? "#eff6ff" : available ? "#fff" : "#f8fafc",
                          opacity: available ? 1 : 0.55,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight:700, fontSize:"0.85rem" }}>
                            Truck #{a.truck!.truck_number}
                            {a.truck!.type ? ` · ${a.truck!.type}` : ""}
                          </div>
                          <div style={{ fontSize:"0.65rem", color:"#64748b" }}>{PRIORITY_LABELS[a.priority]}</div>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          {available
                            ? <span style={{ background:"#f0fdf4", color:"#15803d", padding:"2px 8px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>Available</span>
                            : <span style={{ background:"#fff1f2", color:"#dc2626", padding:"2px 8px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>Unavailable</span>
                          }
                          {a.requires_manager_approval && <span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 6px", borderRadius:6, fontSize:"0.62rem", fontWeight:700 }}>Mgr req.</span>}
                        </div>
                      </div>
                    );
                  })}
                  {backups.length === 0 && <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No trucks in approved pool.</div>}
                </div>
              );
            })()}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px" }}>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Reason</label>
                <input value={reassignForm.reason} onChange={e=>setReassignForm(f=>({...f,reason:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontSize:"0.8rem", boxSizing:"border-box" }} placeholder="breakdown, flat tire…" />
              </div>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Reassigned By</label>
                <input value={reassignForm.reassigned_by} onChange={e=>setReassignForm(f=>({...f,reassigned_by:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontSize:"0.8rem", boxSizing:"border-box" }} placeholder="Staff name" />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Notes</label>
                <input value={reassignForm.notes} onChange={e=>setReassignForm(f=>({...f,notes:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontSize:"0.8rem", boxSizing:"border-box" }} />
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, fontSize:"0.72rem", color:"#64748b", cursor:"pointer" }}>
              <input type="checkbox" checked={reassignForm.manager_override} onChange={e=>setReassignForm(f=>({...f,manager_override:e.target.checked}))} />
              Manager override (use if truck status blocks assignment)
            </label>

            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={doReassign} disabled={!reassignForm.new_truck_id} style={{ background:reassignForm.new_truck_id?"#1e40af":"#cbd5e1", color:"#fff", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:"0.82rem", cursor:reassignForm.new_truck_id?"pointer":"not-allowed" }}>
                Confirm Reassignment
              </button>
              <button onClick={() => setReassignModal(null)} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
