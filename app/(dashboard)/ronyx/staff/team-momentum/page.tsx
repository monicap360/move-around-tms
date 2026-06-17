"use client";

import { useCallback, useEffect, useState } from "react";

type StaffTask = {
  id: string;
  task_type: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  owner_operator_name: string | null;
  owner_operator_id?: string | null;
  is_overdue: boolean;
  days_until_due: number | null;
};

type StaffMember = {
  name: string;
  open:           number;
  critical:       number;
  overdue:        number;
  completedToday: number;
  remindersSent:  number;
  needsReview:    number;
  dispatchBlocks: number;
  tasks:          StaffTask[];
  workload:       "Crushing It" | "Strong Day" | "Needs Support" | "Overloaded" | "All Clear";
};

const WORKLOAD_STYLE: Record<string,[string,string,string]> = {
  "Crushing It":    ["#f0fdf4","#15803d","↑"],
  "Strong Day":     ["#eff6ff","#1d4ed8","→"],
  "Needs Support":  ["#fefce8","#ca8a04","!"],
  "Overloaded":     ["#fff1f2","#dc2626","⚠"],
  "All Clear":      ["#f0fdf4","#15803d","✓"],
};

const PRIORITY_COLORS: Record<string,[string,string]> = {
  critical: ["#fff1f2","#dc2626"],
  high:     ["#fff7ed","#ea580c"],
  normal:   ["#eff6ff","#1d4ed8"],
  low:      ["#f1f5f9","#64748b"],
};

const TASK_ICONS: Record<string,string> = {
  coi_missing:"📭", coi_expired:"💀", coi_expiring_7d:"⏰", coi_expiring_30d:"📅",
  coi_needs_review:"👁", coi_rejected:"❌", payroll_hold:"💵", maintenance:"🔧", general:"📋",
};

function computeWorkload(open:number, critical:number, overdue:number, completedToday:number): StaffMember["workload"] {
  if (open === 0)                                   return "All Clear";
  if (critical > 5 || overdue > 8)                  return "Overloaded";
  if (critical > 2 || overdue > 4)                  return "Needs Support";
  if (completedToday >= 5 && open < 5)              return "Crushing It";
  return "Strong Day";
}

function fmtDate(d?: string|null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

const TODAY = new Date().toDateString();

export default function TeamMomentumPage() {
  const [allTasks, setAllTasks]   = useState<StaffTask[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [syncing,  setSyncing]    = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [toast,    setToast]      = useState("");

  function flash(m:string) { setToast(m); setTimeout(()=>setToast(""),3500); }

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/ronyx/staff/tasks?limit=500");
    const d = await r.json();
    setAllTasks(d.tasks || []);
    setLoading(false);
  },[]);

  async function syncCOI() {
    setSyncing(true);
    const r = await fetch("/api/ronyx/staff/tasks/sync-coi", { method:"POST" });
    const d = await r.json();
    setSyncing(false);
    flash(`Sync complete — ${d.created} created, ${d.closed} closed, ${d.skipped} already current.`);
    await load();
  }

  useEffect(()=>{ load(); },[load]);

  function toggleExpand(name:string) {
    setExpanded(prev=>{ const n=new Set(prev); n.has(name)?n.delete(name):n.add(name); return n; });
  }

  // Group by staff member
  const staffMap = new Map<string, StaffTask[]>();
  for (const t of allTasks) {
    const name = t.assigned_to_name || "Unassigned";
    if (!staffMap.has(name)) staffMap.set(name, []);
    staffMap.get(name)!.push(t);
  }

  const staff: StaffMember[] = Array.from(staffMap.entries()).map(([name, tasks]) => {
    const open           = tasks.filter(t=>t.status==="open"||t.status==="in_progress").length;
    const critical       = tasks.filter(t=>t.priority==="critical"&&(t.status==="open"||t.status==="in_progress")).length;
    const overdue        = tasks.filter(t=>t.is_overdue&&(t.status==="open"||t.status==="in_progress")).length;
    const completedToday = tasks.filter(t=>t.status==="completed"&&t.completed_at&&new Date(t.completed_at).toDateString()===TODAY).length;
    const remindersSent  = tasks.reduce((s,t)=>{
      // last_reminder_sent_at not in the returned type, use reminder_count as proxy
      return s;
    },0);
    const needsReview    = tasks.filter(t=>t.task_type==="coi_needs_review"&&t.status==="open").length;
    const dispatchBlocks = tasks.filter(t=>["coi_missing","coi_expired"].includes(t.task_type)&&t.status==="open").length;
    return {
      name, tasks,
      open, critical, overdue, completedToday, remindersSent, needsReview, dispatchBlocks,
      workload: computeWorkload(open, critical, overdue, completedToday),
    };
  }).sort((a,b) => {
    const wRank: Record<string,number> = {"Overloaded":4,"Needs Support":3,"Crushing It":2,"Strong Day":1,"All Clear":0};
    return (wRank[b.workload]||0) - (wRank[a.workload]||0);
  });

  // Global KPIs
  const totalOpen     = allTasks.filter(t=>t.status==="open"||t.status==="in_progress").length;
  const totalCritical = allTasks.filter(t=>t.priority==="critical"&&(t.status==="open"||t.status==="in_progress")).length;
  const totalOverdue  = allTasks.filter(t=>t.is_overdue&&(t.status==="open"||t.status==="in_progress")).length;
  const totalDoneToday= allTasks.filter(t=>t.status==="completed"&&t.completed_at&&new Date(t.completed_at).toDateString()===TODAY).length;
  const totalBlocks   = allTasks.filter(t=>["coi_missing","coi_expired"].includes(t.task_type)&&t.status==="open").length;

  return (
    <div style={{ padding:"24px 28px", maxWidth:1200, fontFamily:"system-ui,sans-serif" }}>
      {toast && <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 20px", borderRadius:12, fontWeight:700, fontSize:13 }}>{toast}</div>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#1e40af", textTransform:"uppercase", letterSpacing:"0.1em" }}>Staff</div>
          <h1 style={{ margin:"2px 0 4px", fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>Team Momentum</h1>
          <p style={{ margin:0, color:"#64748b", fontSize:"0.82rem" }}>Real-time task load, dispatch blocks, and completed work across all staff.</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={load} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8, padding:"7px 14px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>↻ Refresh</button>
          <button onClick={syncCOI} disabled={syncing} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>
            {syncing ? "Syncing..." : "⟳ Sync COI Tasks"}
          </button>
          <a href="/ronyx/owner-operators/coi-matrix" style={{ background:"#eff6ff", color:"#1d4ed8", textDecoration:"none", borderRadius:8, padding:"7px 14px", fontSize:"0.68rem", fontWeight:700 }}>COI Matrix →</a>
        </div>
      </div>

      {/* Global KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:24 }}>
        {[
          { label:"Open Tasks",      value:totalOpen,     color:"#0f172a", bg:"#f8fafc" },
          { label:"Critical",        value:totalCritical, color:"#dc2626", bg:"#fff1f2" },
          { label:"Overdue",         value:totalOverdue,  color:"#dc2626", bg:"#fff1f2" },
          { label:"Completed Today", value:totalDoneToday,color:"#15803d", bg:"#f0fdf4" },
          { label:"Dispatch Blocks", value:totalBlocks,   color:"#dc2626", bg:"#fff1f2" },
        ].map(k=>(
          <div key={k.label} style={{ background:k.bg, border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:k.value>0?k.color:"#94a3b8", marginTop:3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading team data...</div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>No tasks found. Run "Sync COI Tasks" to create tasks from current COI status.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {staff.map(sm => {
            const [wbg, wc, wIcon] = WORKLOAD_STYLE[sm.workload];
            const isOpen = expanded.has(sm.name);
            const openTaskList = sm.tasks.filter(t=>t.status==="open"||t.status==="in_progress")
              .sort((a,b)=>{ const r: Record<string,number>={critical:4,high:3,normal:2,low:1}; return (r[b.priority]||0)-(r[a.priority]||0); });

            return (
              <div key={sm.name} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                {/* Staff header row */}
                <div style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 20px", cursor:"pointer" }} onClick={()=>toggleExpand(sm.name)}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#0f172a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"0.82rem", flexShrink:0 }}>
                    {sm.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.9rem" }}>{sm.name}</div>
                    <div style={{ fontSize:"0.65rem", color:"#64748b" }}>
                      {sm.open} open · {sm.critical} critical · {sm.overdue} overdue · {sm.completedToday} completed today
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {sm.dispatchBlocks > 0 && (
                      <span style={{ background:"#fff1f2", color:"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:"0.62rem", fontWeight:800 }}>
                        🚫 {sm.dispatchBlocks} dispatch block{sm.dispatchBlocks>1?"s":""}
                      </span>
                    )}
                    {sm.needsReview > 0 && (
                      <span style={{ background:"#fff7ed", color:"#ea580c", padding:"3px 10px", borderRadius:20, fontSize:"0.62rem", fontWeight:800 }}>
                        👁 {sm.needsReview} to review
                      </span>
                    )}
                    <span style={{ background:wbg, color:wc, padding:"4px 12px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>
                      {wIcon} {sm.workload}
                    </span>
                    {sm.workload === "Overloaded" && (
                      <span style={{ background:"#fff1f2", color:"#dc2626", padding:"3px 8px", borderRadius:6, fontSize:"0.58rem", fontWeight:700 }}>⚠ Suggest Reassign</span>
                    )}
                    <span style={{ color:"#94a3b8", fontSize:"0.8rem" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Task list */}
                {isOpen && (
                  <div style={{ borderTop:"1px solid #f1f5f9", padding:"12px 20px" }}>
                    {openTaskList.length === 0 ? (
                      <div style={{ color:"#94a3b8", fontSize:"0.75rem", padding:"8px 0" }}>No open tasks — {sm.completedToday > 0 ? `${sm.completedToday} completed today. Excellent work.` : "all clear."}</div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {openTaskList.slice(0,10).map(t => {
                          const [pbg,pc] = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.normal;
                          return (
                            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:pbg, borderRadius:8, borderLeft:`3px solid ${pc}` }}>
                              <span style={{ fontSize:"0.85rem", flexShrink:0 }}>{TASK_ICONS[t.task_type]||"📋"}</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#0f172a", lineHeight:1.3 }}>{t.title}</div>
                                {t.owner_operator_name && <div style={{ fontSize:"0.62rem", color:"#64748b" }}>🚛 {t.owner_operator_name}</div>}
                              </div>
                              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                                <span style={{ background:pbg, color:pc, fontSize:"0.58rem", fontWeight:800, padding:"2px 7px", borderRadius:20 }}>{t.priority}</span>
                                {t.is_overdue && <span style={{ background:"#fff1f2", color:"#dc2626", fontSize:"0.58rem", fontWeight:800, padding:"2px 7px", borderRadius:20 }}>OVERDUE</span>}
                                {t.due_date && !t.is_overdue && <span style={{ fontSize:"0.6rem", color:"#64748b" }}>Due {fmtDate(t.due_date)}</span>}
                                {t.owner_operator_id && (
                                  <a href={`/ronyx/owner-operators?id=${t.owner_operator_id}&tab=coi`}
                                    style={{ background:"#f1f5f9", color:"#475569", textDecoration:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.58rem", fontWeight:700 }}>
                                    Open →
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {openTaskList.length > 10 && (
                          <div style={{ fontSize:"0.65rem", color:"#94a3b8", textAlign:"center", padding:"4px 0" }}>
                            +{openTaskList.length - 10} more tasks
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed today section */}
                    {sm.completedToday > 0 && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f1f5f9" }}>
                        <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>✅ Completed Today</div>
                        {sm.tasks.filter(t=>t.status==="completed"&&t.completed_at&&new Date(t.completed_at).toDateString()===TODAY).map(t=>(
                          <div key={t.id} style={{ fontSize:"0.68rem", color:"#166534", padding:"2px 0" }}>
                            {TASK_ICONS[t.task_type]||"✓"} {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reassignment suggestion */}
      {staff.filter(s=>s.workload==="Overloaded").length > 0 && (
        <div style={{ background:"#fff1f2", border:"1px solid #fecaca", borderRadius:14, padding:"14px 18px", marginTop:20 }}>
          <div style={{ fontWeight:800, color:"#dc2626", marginBottom:4 }}>⚠ Reassignment Needed</div>
          <div style={{ fontSize:"0.78rem", color:"#9b1c1c", lineHeight:1.5 }}>
            {staff.filter(s=>s.workload==="Overloaded").map(s=>s.name).join(", ")} {staff.filter(s=>s.workload==="Overloaded").length===1?"is":"are"} overloaded. Consider reassigning critical tasks to other staff.
            To reassign: open a task and update the <code>assigned_to_name</code> field.
          </div>
        </div>
      )}
    </div>
  );
}
