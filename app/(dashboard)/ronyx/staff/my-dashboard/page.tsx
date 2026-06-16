"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── Quotes seeded by day ── */
const QUOTES = [
  "Progress is built one completed task at a time.",
  "Your work keeps the operation moving.",
  "Every document you clear helps someone else move forward.",
  "Small wins become a strong day.",
  "You are protecting the company, the drivers, and the team.",
  "One task cleared is one less blocker for dispatch.",
  "Stay steady. The next right task is enough.",
  "You are not behind — you are building momentum.",
  "Your attention to detail prevents expensive mistakes.",
  "The office runs stronger because of the work you do.",
];

const BOOST_MESSAGES = [
  "Pause. Breathe. Pick one task. You are doing important work. Every COI reviewed, payroll hold cleared, and document filed helps the whole team move safer and faster.",
  "You do not have to carry the whole day at once. Handle the next task.",
  "Start with the task that removes the biggest blocker.",
  "Your work matters even when nobody sees every detail.",
  "One clean file today can prevent a major problem tomorrow.",
  "Keep going — the system is here to help you, not overwhelm you.",
  "You are helping drivers, dispatch, payroll, and billing stay aligned.",
];

function todaysQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
function greeting(name: string) {
  const h = new Date().getHours();
  const t = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${t}, ${name || "there"}.`;
}

/* ─── Task types ── */
type TaskStatus = "open"|"in_progress"|"completed"|"cancelled"|"waiting"|"blocked";
type TaskPriority = "critical"|"high"|"normal"|"low";

type StaffTask = {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_name: string | null;
  owner_operator_id: string | null;
  owner_operator_name: string | null;
  document_type: string | null;
  coi_document_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  reminder_count: number;
  notes: string | null;
  is_overdue: boolean;
  days_until_due: number | null;
};

const PRIORITY_RANK: Record<string,number> = { critical:4, high:3, normal:2, low:1 };
const PRIORITY_STYLE: Record<string,[string,string]> = {
  critical: ["#fff1f2","#dc2626"],
  high:     ["#fff7ed","#ea580c"],
  normal:   ["#eff6ff","#1d4ed8"],
  low:      ["#f1f5f9","#64748b"],
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}

const TASK_ICONS: Record<string,string> = {
  coi_missing:       "📭",
  coi_expired:       "💀",
  coi_expiring_7d:   "⏰",
  coi_expiring_30d:  "📅",
  coi_needs_review:  "👁",
  coi_rejected:      "❌",
  payroll_hold:      "💵",
  maintenance:       "🔧",
  general:           "📋",
};

/* ═══════════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════════ */
export default function StaffDashboard() {
  const [staffName,   setStaffName]   = useState("Staff");
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [showBoost,   setShowBoost]   = useState(false);
  const [boostIdx,    setBoostIdx]    = useState(0);
  const [toast,       setToast]       = useState("");
  const [tasks,       setTasks]       = useState<StaffTask[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [completingId, setCompletingId] = useState<string|null>(null);
  const [overrideModal, setOverrideModal] = useState<{ taskId:string; message:string }|null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  function flash(m: string) { setToast(m); setTimeout(()=>setToast(""),4000); }

  useEffect(()=>{
    const saved = typeof window !== "undefined" ? localStorage.getItem("missionstart_name") : null;
    if (saved) setStaffName(saved);
    else { setEditingName(true); setNameInput(""); }
  },[]);

  function saveName() {
    const n = nameInput.trim() || "Staff";
    setStaffName(n);
    if (typeof window !== "undefined") localStorage.setItem("missionstart_name",n);
    setEditingName(false);
  }

  const loadTasks = useCallback(async (name: string) => {
    setLoading(true);
    const r = await fetch(`/api/ronyx/staff/tasks?assigned_to_name=${encodeURIComponent(name)}&exclude_status=cancelled&limit=100`);
    const d = await r.json();
    setTasks(d.tasks || []);
    setLoading(false);
  },[]);

  const syncAndLoad = useCallback(async (name: string) => {
    setSyncing(true);
    await fetch("/api/ronyx/staff/tasks/sync-coi", { method:"POST" });
    setSyncing(false);
    await loadTasks(name);
  },[loadTasks]);

  useEffect(()=>{
    if (staffName && staffName !== "Staff") syncAndLoad(staffName);
  },[staffName, syncAndLoad]);

  async function completeTask(task: StaffTask) {
    setCompletingId(task.id);
    const r = await fetch(`/api/ronyx/staff/tasks/${task.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"completed", completed_by: staffName }),
    });
    const d = await r.json();
    setCompletingId(null);

    if (r.status === 422 && d.requires_override) {
      setOverrideModal({ taskId: task.id, message: d.error });
      return;
    }
    if (!r.ok) { flash(`Error: ${d.error}`); return; }

    flash(getWinMessage(task));
    await loadTasks(staffName);
  }

  async function forceCompleteTask(taskId: string, reason: string) {
    setOverrideModal(null);
    await fetch(`/api/ronyx/staff/tasks/${taskId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"completed", completed_by: staffName, manager_override:true, manager_override_reason: reason }),
    });
    flash(`Task force-closed with manager override.`);
    setOverrideReason("");
    await loadTasks(staffName);
  }

  async function sendCOIRequest(task: StaffTask) {
    if (!task.owner_operator_id || !task.document_type) return;
    const r = await fetch(`/api/ronyx/owner-operators/${task.owner_operator_id}/coi/request`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        coi_group: task.document_type.startsWith("ronyx") ? "ronyx" : task.document_type.startsWith("ma_morrison") ? "ma_morrison" : "standard",
        document_types: [task.document_type],
        sent_by: staffName,
      }),
    });
    const d = await r.json();
    if (d.ok) {
      // Open mailto with the generated template
      const et = d.email_template;
      window.open(`mailto:${et.to}?subject=${encodeURIComponent(et.subject)}&body=${encodeURIComponent(et.body)}`);
      flash(`Nice job — request sent and logged. You kept the follow-up moving.`);
      // Reload tasks to update reminder_count
      await loadTasks(staffName);
    } else {
      flash(`Error logging request: ${d.error}`);
    }
  }

  function getWinMessage(task: StaffTask): string {
    const n = staffName;
    if (task.task_type === "coi_needs_review") return `Way to go, ${n} — COI reviewed and filed. You helped move this OO closer to dispatch-ready.`;
    if (task.task_type === "coi_expired")      return `Great work, ${n} — expired insurance handled. That is one less dispatch blocker for the team.`;
    if (task.task_type === "coi_rejected")     return `Nice job, ${n} — rejected COI resolved. The follow-up is moving forward.`;
    if (task.task_type.startsWith("coi_expiring")) return `Smart move, ${n} — expiring COI addressed before it became a blocker.`;
    if (task.task_type === "payroll_hold")     return `Excellent work — one payroll hold moved closer to release.`;
    return `Task complete. Small win, big impact.`;
  }

  // Computed
  const openTasks      = tasks.filter(t => t.status === "open" || t.status === "in_progress");
  const completedToday = tasks.filter(t => t.status === "completed" && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString());
  const criticalTasks  = openTasks.filter(t => t.priority === "critical");
  const overdueTasks   = openTasks.filter(t => t.is_overdue);
  const coiTasks       = openTasks.filter(t => t.task_type.startsWith("coi_"));
  const dispatchBlocks = openTasks.filter(t => ["coi_missing","coi_expired"].includes(t.task_type));

  // Mission logic
  function buildMission() {
    if (criticalTasks.length > 0 && coiTasks.length > 0) {
      return {
        focus:   "Insurance & COI Clearance",
        purpose: "You are protecting dispatch from insurance risk.",
        reason:  "Every expired COI you clear helps keep the fleet legally and safely moving. A cleared document can unblock a truck and keep revenue flowing.",
        action:  `Start with the ${criticalTasks[0].title}.`,
      };
    }
    if (tasks.filter(t=>t.task_type==="payroll_hold"&&t.status==="open").length > 0) {
      return {
        focus:   "Payroll Hold Resolution",
        purpose: "You are helping payroll move forward accurately.",
        reason:  "Every payroll hold you resolve helps someone get paid correctly and on time.",
        action:  "Resolve payroll holds — start with the oldest one first.",
      };
    }
    if (completedToday.length >= 5) {
      return {
        focus:   "Momentum Day",
        purpose: "You have already completed ${completedToday.length} tasks today.",
        reason:  "Consistent follow-through protects the company, drivers, and clients every single day.",
        action:  "Keep going — you are building a strong day.",
      };
    }
    return {
      focus:   "Operations Support",
      purpose: "Your work keeps dispatch, payroll, billing, and compliance running strong.",
      reason:  "Consistent attention to the queue prevents costly issues before they escalate.",
      action:  openTasks.length > 0 ? `Start with: ${openTasks[0].title}` : "All caught up — great work.",
    };
  }
  const mission = buildMission();

  const quote = todaysQuote();

  return (
    <div style={{ padding:"24px 28px", maxWidth:1000, fontFamily:"system-ui,sans-serif" }}>
      {toast && (
        <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"14px 22px", borderRadius:14, fontWeight:700, fontSize:14, lineHeight:1.5, maxWidth:340 }}>
          {toast}
        </div>
      )}

      {/* Override modal */}
      {overrideModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:420 }}>
            <div style={{ fontWeight:800, color:"#dc2626", marginBottom:8 }}>⚠ Warning: Issue Not Resolved</div>
            <p style={{ color:"#475569", fontSize:"0.82rem", marginBottom:16, lineHeight:1.5 }}>{overrideModal.message}</p>
            <textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)}
              placeholder="Manager override reason (required)..."
              rows={3} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontSize:"0.8rem", boxSizing:"border-box", marginBottom:12, resize:"vertical" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button disabled={!overrideReason.trim()} onClick={()=>forceCompleteTask(overrideModal.taskId, overrideReason)}
                style={{ background: overrideReason.trim() ? "#dc2626" : "#e2e8f0", color: overrideReason.trim() ? "#fff":"#94a3b8", border:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.78rem", fontWeight:700, cursor: overrideReason.trim() ? "pointer":"default" }}>
                Force Close with Override
              </button>
              <button onClick={()=>{ setOverrideModal(null); setOverrideReason(""); }}
                style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.78rem", fontWeight:700, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name setup */}
      {editingName && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", width:380, textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:12 }}>👋</div>
            <div style={{ fontWeight:900, fontSize:"1.2rem", color:"#0f172a", marginBottom:4 }}>Welcome to Mission Start™</div>
            <div style={{ fontSize:"0.82rem", color:"#64748b", marginBottom:20 }}>Enter your first name to personalize your task feed and wins.</div>
            <input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveName()}
              placeholder="Your first name..."
              style={{ width:"100%", border:"2px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:"1rem", boxSizing:"border-box", marginBottom:12, textAlign:"center" }} />
            <button onClick={saveName}
              style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", width:"100%" }}>
              Start My Day →
            </button>
          </div>
        </div>
      )}

      {/* ══ Mission Start™ Header ══ */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)", borderRadius:20, padding:"24px 28px", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, background:"rgba(255,255,255,0.03)", borderRadius:"50%" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:5 }}>Mission Start™</div>
              <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:900, color:"#f8fafc", lineHeight:1.2 }}>{greeting(staffName)}</h1>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {syncing && <span style={{ color:"#94a3b8", fontSize:"0.65rem" }}>Syncing tasks...</span>}
              <button onClick={()=>syncAndLoad(staffName)} style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, padding:"4px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>↻ Refresh</button>
              <button onClick={()=>setEditingName(true)} style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, padding:"4px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>✏ Name</button>
            </div>
          </div>

          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 14px", marginBottom:14, borderLeft:"3px solid #3b82f6" }}>
            <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Today&apos;s Mindset</div>
            <p style={{ margin:0, color:"#e2e8f0", fontSize:"0.82rem", lineHeight:1.5, fontStyle:"italic" }}>&ldquo;{quote}&rdquo;</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Focus First: {mission.focus}</div>
              <p style={{ margin:0, color:"#cbd5e1", fontSize:"0.8rem", lineHeight:1.5 }}>{mission.purpose}</p>
            </div>
            <div>
              <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#34d399", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Recommended Next Step</div>
              <p style={{ margin:0, color:"#f0fdf4", fontSize:"0.8rem", lineHeight:1.5, fontWeight:600 }}>{mission.action}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Stats strip ══ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:20 }}>
        {[
          { label:"Open Tasks",       value:openTasks.length,      color:"#0f172a", bg:"#f8fafc" },
          { label:"Critical",         value:criticalTasks.length,  color:"#dc2626", bg:"#fff1f2" },
          { label:"Overdue",          value:overdueTasks.length,   color:"#dc2626", bg:"#fff1f2" },
          { label:"Completed Today",  value:completedToday.length, color:"#15803d", bg:"#f0fdf4" },
          { label:"Dispatch Blocks",  value:dispatchBlocks.length, color:"#dc2626", bg:"#fff1f2" },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:"0.58rem", fontWeight:700, color:s.value>0?s.color:"#94a3b8", marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ Live Task Feed ══ */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.9rem" }}>Your Task Feed</div>
            <div style={{ fontSize:"0.68rem", color:"#64748b" }}>
              {loading ? "Loading tasks..." : openTasks.length === 0 ? "No open tasks — excellent work." : `${openTasks.length} open task${openTasks.length>1?"s":""} assigned to you`}
            </div>
          </div>
          <a href="/ronyx/staff/team-momentum" style={{ background:"#f1f5f9", color:"#475569", textDecoration:"none", borderRadius:7, padding:"5px 12px", fontSize:"0.65rem", fontWeight:700 }}>Team Momentum →</a>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>Loading your tasks...</div>
        ) : openTasks.length === 0 ? (
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:14, padding:"24px 28px", textAlign:"center" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:8 }}>🎯</div>
            <div style={{ fontWeight:800, color:"#15803d", fontSize:"1rem" }}>All clear, {staffName}.</div>
            <div style={{ fontSize:"0.78rem", color:"#166534", marginTop:4 }}>No open tasks. That is a strong day.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {/* Group by priority */}
            {(["critical","high","normal","low"] as const).map(pri => {
              const group = openTasks.filter(t => t.priority === pri);
              if (group.length === 0) return null;
              const [pbg, pc] = PRIORITY_STYLE[pri];
              return (
                <div key={pri}>
                  <div style={{ fontSize:"0.62rem", fontWeight:800, color:pc, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, paddingLeft:4 }}>
                    {pri === "critical" ? "🔴" : pri === "high" ? "🟠" : pri === "normal" ? "🔵" : "⚪"} {pri.toUpperCase()} — {group.length} task{group.length>1?"s":""}
                  </div>
                  {group.map(task => (
                    <div key={task.id} style={{ background:"#fff", border:`1px solid ${task.is_overdue ? "#fecaca":"#e2e8f0"}`, borderLeft:`3px solid ${pc}`, borderRadius:10, padding:"12px 16px", marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:"0.9rem" }}>{TASK_ICONS[task.task_type] || "📋"}</span>
                            <span style={{ fontWeight:800, color:"#0f172a", fontSize:"0.82rem", lineHeight:1.3 }}>{task.title}</span>
                            {task.is_overdue && <span style={{ background:"#fff1f2", color:"#dc2626", fontSize:"0.58rem", fontWeight:800, padding:"1px 6px", borderRadius:20 }}>OVERDUE</span>}
                          </div>
                          <div style={{ display:"flex", gap:10, fontSize:"0.65rem", color:"#64748b" }}>
                            {task.owner_operator_name && <span>🚛 {task.owner_operator_name}</span>}
                            {task.due_date && (
                              <span style={{ color: task.is_overdue ? "#dc2626" : (task.days_until_due !== null && task.days_until_due <= 2) ? "#ea580c" : "#64748b" }}>
                                📅 Due {fmtDate(task.due_date)}
                                {task.days_until_due !== null && ` (${task.days_until_due < 0 ? `${Math.abs(task.days_until_due)}d overdue` : task.days_until_due === 0 ? "today" : `${task.days_until_due}d`})`}
                              </span>
                            )}
                            {task.reminder_count > 0 && <span>📨 {task.reminder_count} reminder{task.reminder_count>1?"s":""} sent</span>}
                          </div>
                          {task.description && <div style={{ fontSize:"0.65rem", color:"#94a3b8", marginTop:4, lineHeight:1.4 }}>{task.description}</div>}
                        </div>

                        <div style={{ display:"flex", flexDirection:"column", gap:4, marginLeft:12, flexShrink:0 }}>
                          <button
                            onClick={()=>completeTask(task)}
                            disabled={completingId === task.id}
                            style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>
                            {completingId===task.id ? "..." : "✓ Complete"}
                          </button>
                          {task.task_type.startsWith("coi_") && task.owner_operator_id && (
                            <>
                              <a href={`/ronyx/owner-operators?id=${task.owner_operator_id}&tab=coi`}
                                style={{ background:"#eff6ff", color:"#1d4ed8", textDecoration:"none", borderRadius:6, padding:"5px 10px", fontSize:"0.62rem", fontWeight:700, textAlign:"center" }}>
                                Open COI Tab
                              </a>
                              {(task.task_type === "coi_missing" || task.task_type === "coi_expired" || task.task_type === "coi_rejected") && (
                                <button onClick={()=>sendCOIRequest(task)}
                                  style={{ background:"#fff7ed", color:"#ea580c", border:"none", borderRadius:6, padding:"5px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>
                                  Email Request
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Completed Today ══ */}
      {completedToday.length > 0 && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:14, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontWeight:800, color:"#15803d", fontSize:"0.82rem", marginBottom:8 }}>✅ Completed Today — {completedToday.length} win{completedToday.length>1?"s":""}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {completedToday.slice(0,5).map(t=>(
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.72rem", color:"#166534" }}>
                <span>{TASK_ICONS[t.task_type]||"✓"}</span>
                <span style={{ flex:1 }}>{t.title}</span>
                <span style={{ color:"#86efac", fontSize:"0.62rem" }}>{t.completed_at ? new Date(t.completed_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : ""}</span>
              </div>
            ))}
            {completedToday.length >= 5 && (
              <div style={{ fontWeight:800, color:"#15803d", fontSize:"0.72rem", marginTop:4 }}>
                Excellent work, {staffName}. All critical tasks are clear. That is a strong day.
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Reason to Keep Going */}
        {openTasks.length > 0 && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.85rem", marginBottom:4 }}>Reason to Keep Going</div>
            <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>The task you finish next may:</div>
            <ul style={{ margin:"0 0 12px", paddingLeft:16 }}>
              {["release a truck back to dispatch","help a driver get paid","prevent an uninsured load","stop a billing mistake","protect the company during an audit"].map(item=>(
                <li key={item} style={{ fontSize:"0.72rem", color:"#475569", marginBottom:4, lineHeight:1.4 }}>{item}</li>
              ))}
            </ul>
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px" }}>
              <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#15803d", textTransform:"uppercase", marginBottom:2 }}>Why This Matters</div>
              <div style={{ fontSize:"0.72rem", color:"#0f172a", fontWeight:600 }}>{mission.reason}</div>
            </div>
          </div>
        )}

        {/* Need a Boost? */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.85rem", marginBottom:4 }}>Need a Boost?</div>
          <div style={{ fontSize:"0.72rem", color:"#64748b", marginBottom:12, lineHeight:1.5 }}>Feeling tired or overwhelmed? It happens.</div>
          {!showBoost ? (
            <button onClick={()=>setShowBoost(true)} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Show Me →</button>
          ) : (
            <div>
              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
                <p style={{ margin:0, color:"#1e40af", fontSize:"0.76rem", lineHeight:1.6, fontWeight:600 }}>{BOOST_MESSAGES[boostIdx]}</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setBoostIdx(i=>(i+1)%BOOST_MESSAGES.length)} style={{ background:"#eff6ff", color:"#1d4ed8", border:"none", borderRadius:7, padding:"5px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>Another →</button>
                <button onClick={()=>{ setShowBoost(false); flash(`Keep going, ${staffName}. One task at a time.`); }} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:7, padding:"5px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>I&apos;m Ready ✓</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
