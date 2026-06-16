"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── Quotes — seeded by day so every staff member sees the same one ── */
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
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name || "there"}.`;
}

type TaskSummary = {
  blockedDispatch: number;
  missingCOIs: number;
  expiredCOIs: number;
  expiringSoon: number;
  needsReview: number;
  payrollHolds: number;
  maintenanceOpen: number;
  category: "coi" | "payroll" | "maintenance" | "billing" | "clear";
  primaryCount: number;
};

type MissionConfig = {
  focus: string;
  purpose: string;
  reason: string;
  recommendation: string;
};

function buildMission(t: TaskSummary): MissionConfig {
  if (t.blockedDispatch > 0 || t.expiredCOIs > 0 || t.missingCOIs > 0) {
    return {
      focus: "Insurance & COI Clearance",
      purpose: "You are protecting dispatch from insurance risk.",
      reason: "Every expired COI you clear helps keep the fleet legally and safely moving. A single cleared document can unblock a truck and keep revenue flowing.",
      recommendation: `Clear the ${t.expiredCOIs > 0 ? "expired COIs" : "missing COIs"} first — ${t.blockedDispatch} OO${t.blockedDispatch !== 1 ? "s are" : " is"} blocked from dispatch.`,
    };
  }
  if (t.payrollHolds > 0) {
    return {
      focus: "Payroll Hold Resolution",
      purpose: "You are helping payroll move forward accurately.",
      reason: "Every payroll hold you resolve helps someone get paid correctly and on time. Drivers are counting on this work.",
      recommendation: `Resolve ${t.payrollHolds} payroll hold${t.payrollHolds !== 1 ? "s" : ""} — start with the oldest one first.`,
    };
  }
  if (t.maintenanceOpen > 0) {
    return {
      focus: "Fleet Maintenance & Availability",
      purpose: "You are keeping trucks ready and reducing downtime.",
      reason: "Every truck status you update helps dispatch make the right call. Cleared maintenance means more available loads.",
      recommendation: `Review ${t.maintenanceOpen} open maintenance item${t.maintenanceOpen !== 1 ? "s" : ""} — reassign trucks where needed.`,
    };
  }
  if (t.expiringSoon > 0) {
    return {
      focus: "Expiring COI Renewals",
      purpose: "You are staying ahead of insurance risk before it becomes a blocker.",
      reason: "Renewing COIs before they expire prevents emergency situations and keeps dispatch running without interruption.",
      recommendation: `${t.expiringSoon} COI${t.expiringSoon !== 1 ? "s are" : " is"} expiring soon — send renewal requests today.`,
    };
  }
  if (t.needsReview > 0) {
    return {
      focus: "COI Document Review",
      purpose: "You are keeping the insurance file accurate and approved.",
      reason: "Uploaded documents waiting for review can hold up dispatch approval. A quick review keeps everything moving.",
      recommendation: `Approve or reject ${t.needsReview} uploaded COI${t.needsReview !== 1 ? "s" : ""} in the review queue.`,
    };
  }
  return {
    focus: "Operational Excellence",
    purpose: "Your work keeps the full operation — dispatch, payroll, billing, compliance — running strong.",
    reason: "Consistent follow-through on all tasks protects the company, drivers, and clients every day.",
    recommendation: "Start with your highest-priority open item and work through the queue.",
  };
}

export default function StaffDashboard() {
  const [staffName,    setStaffName]    = useState("Staff");
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState("");
  const [showBoost,    setShowBoost]    = useState(false);
  const [boostIdx,     setBoostIdx]     = useState(0);
  const [tasks,        setTasks]        = useState<TaskSummary|null>(null);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState("");
  const [showReason,   setShowReason]   = useState(false);

  function flash(m: string) { setToast(m); setTimeout(()=>setToast(""),4000); }

  // Load name from localStorage
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

  // Fetch operational data to build task summary
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ooRes, maintRes] = await Promise.allSettled([
        fetch("/api/ronyx/owner-operators").then(r=>r.json()),
        fetch("/api/ronyx/maintenance/work-orders").then(r=>r.json()),
      ]);

      let blockedDispatch = 0, missingCOIs = 0, expiredCOIs = 0, expiringSoon = 0, needsReview = 0;

      if (ooRes.status === "fulfilled" && ooRes.value?.companies) {
        const companies = ooRes.value.companies;
        for (const c of companies) {
          const docs: any[] = c.coi_documents || [];
          const groups = ["standard","ronyx","ma_morrison"];

          let hasBlock = false;
          for (const g of groups) {
            const types = ["auto_liability_coi","general_liability_coi","cargo_coi"].map(suffix =>
              g==="standard" ? suffix : `${g==="ronyx"?"ronyx_contractor":g}_${suffix}`
            );
            const gDocs = docs.filter((d:any)=>d.coi_group===g);
            const statuses = types.map(t=>{
              const doc = gDocs.find((d:any)=>d.document_type===t);
              return doc?.status||"missing";
            });
            if (statuses.some(s=>s==="missing")) { missingCOIs++; if (!hasBlock) { hasBlock=true; blockedDispatch++; } }
            if (statuses.some(s=>s==="expired"||s==="rejected")) { expiredCOIs++; if (!hasBlock) { hasBlock=true; blockedDispatch++; } }
          }
          if (docs.some((d:any)=>d.status==="expiring_soon")) expiringSoon++;
          if (docs.some((d:any)=>d.status==="needs_review")) needsReview++;
        }
      }

      let maintenanceOpen = 0;
      if (maintRes.status === "fulfilled" && Array.isArray(maintRes.value?.workOrders)) {
        maintenanceOpen = maintRes.value.workOrders.filter((w:any)=>w.status!=="completed"&&w.status!=="closed").length;
      } else if (maintRes.status === "fulfilled" && Array.isArray(maintRes.value?.orders)) {
        maintenanceOpen = maintRes.value.orders.filter((w:any)=>w.status!=="completed"&&w.status!=="closed").length;
      }

      const category: TaskSummary["category"] =
        blockedDispatch > 0 || expiredCOIs > 0 ? "coi" :
        maintenanceOpen > 0 ? "maintenance" : "clear";

      const primaryCount = Math.max(blockedDispatch, maintenanceOpen, expiringSoon);

      setTasks({ blockedDispatch, missingCOIs, expiredCOIs, expiringSoon, needsReview, payrollHolds:0, maintenanceOpen, category, primaryCount });
    } catch {
      setTasks({ blockedDispatch:0, missingCOIs:0, expiredCOIs:0, expiringSoon:0, needsReview:0, payrollHolds:0, maintenanceOpen:0, category:"clear", primaryCount:0 });
    }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  const mission = tasks ? buildMission(tasks) : null;
  const quote   = todaysQuote();
  const isOverloaded = tasks ? (tasks.blockedDispatch + tasks.expiredCOIs + tasks.expiringSoon + tasks.needsReview + tasks.maintenanceOpen) >= 5 : false;

  const KPI_ITEMS = tasks ? [
    { label:"Dispatch Blocked",  value:tasks.blockedDispatch, color:"#dc2626", bg:"#fff1f2", href:"/ronyx/owner-operators/coi-matrix?f=blocked",   icon:"🚫" },
    { label:"Expired COIs",      value:tasks.expiredCOIs,     color:"#dc2626", bg:"#fff1f2", href:"/ronyx/owner-operators/coi-matrix?f=expired",    icon:"💀" },
    { label:"Missing COIs",      value:tasks.missingCOIs,     color:"#b45309", bg:"#fffbeb", href:"/ronyx/owner-operators/coi-matrix?f=missing",    icon:"📭" },
    { label:"Expiring Soon",     value:tasks.expiringSoon,    color:"#ca8a04", bg:"#fefce8", href:"/ronyx/owner-operators/coi-matrix?f=expiring_soon",icon:"📅" },
    { label:"Needs Review",      value:tasks.needsReview,     color:"#ea580c", bg:"#fff7ed", href:"/ronyx/owner-operators/coi-matrix?f=needs_review", icon:"👁" },
    { label:"Maintenance Open",  value:tasks.maintenanceOpen, color:"#7c3aed", bg:"#f5f3ff", href:"/ronyx/maintenance",                             icon:"🔧" },
  ] : [];

  const totalOpen = KPI_ITEMS.reduce((s,k)=>s+k.value,0);

  return (
    <div style={{ padding:"28px 32px", maxWidth:960, fontFamily:"system-ui,sans-serif" }}>
      {toast && (
        <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"14px 22px", borderRadius:14, fontWeight:700, fontSize:14, lineHeight:1.5, maxWidth:320 }}>
          {toast}
        </div>
      )}

      {/* Name setup modal */}
      {editingName && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", width:380, textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:12 }}>👋</div>
            <div style={{ fontWeight:900, fontSize:"1.2rem", color:"#0f172a", marginBottom:4 }}>Welcome to Mission Start™</div>
            <div style={{ fontSize:"0.82rem", color:"#64748b", marginBottom:20 }}>Enter your first name so the dashboard can personalize your experience.</div>
            <input
              autoFocus
              value={nameInput} onChange={e=>setNameInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveName()}
              placeholder="Your first name..."
              style={{ width:"100%", border:"2px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:"1rem", boxSizing:"border-box", marginBottom:12, textAlign:"center" }}
            />
            <button onClick={saveName} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", width:"100%" }}>
              Start My Day →
            </button>
          </div>
        </div>
      )}

      {/* ══ Mission Start™ Header ══ */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)", borderRadius:20, padding:"28px 32px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        {/* Subtle background texture */}
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, background:"rgba(255,255,255,0.03)", borderRadius:"50%" }} />
        <div style={{ position:"absolute", bottom:-60, left:-20, width:160, height:160, background:"rgba(255,255,255,0.02)", borderRadius:"50%" }} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:6 }}>Mission Start™</div>
              <h1 style={{ margin:0, fontSize:"1.6rem", fontWeight:900, color:"#f8fafc", lineHeight:1.2 }}>
                {greeting(staffName)}
              </h1>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=>setEditingName(true)} style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"5px 12px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                ✏ Change Name
              </button>
              <button onClick={loadData} style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"5px 12px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Quote */}
          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 16px", marginBottom:16, borderLeft:"3px solid #3b82f6" }}>
            <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Today&apos;s Mindset</div>
            <p style={{ margin:0, color:"#e2e8f0", fontSize:"0.88rem", lineHeight:1.5, fontStyle:"italic" }}>&ldquo;{quote}&rdquo;</p>
          </div>

          {/* Mission */}
          {mission && !loading && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Today&apos;s Purpose</div>
                <p style={{ margin:0, color:"#cbd5e1", fontSize:"0.82rem", lineHeight:1.5 }}>{mission.purpose}</p>
              </div>
              <div>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#34d399", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Focus First</div>
                <p style={{ margin:0, color:"#f0fdf4", fontSize:"0.82rem", lineHeight:1.5, fontWeight:600 }}>{mission.recommendation}</p>
              </div>
            </div>
          )}
          {loading && <div style={{ color:"#475569", fontSize:"0.8rem" }}>Loading your task summary...</div>}
        </div>
      </div>

      {/* ══ Today's Open Items KPIs ══ */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Today&apos;s Open Items</div>
            <div style={{ fontSize:"0.78rem", color:"#0f172a", fontWeight:700, marginTop:2 }}>
              {loading ? "Counting..." : totalOpen === 0 ? "All clear — no open items." : `${totalOpen} item${totalOpen!==1?"s":""} across ${KPI_ITEMS.filter(k=>k.value>0).length} categor${KPI_ITEMS.filter(k=>k.value>0).length===1?"y":"ies"}`}
            </div>
          </div>
          {totalOpen > 0 && (
            <a href="/ronyx/owner-operators/coi-matrix" style={{ background:"#0f172a", color:"#fff", textDecoration:"none", borderRadius:8, padding:"6px 14px", fontSize:"0.68rem", fontWeight:700 }}>Open COI Matrix →</a>
          )}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
          {KPI_ITEMS.map(k => (
            <a key={k.label} href={k.href} style={{ textDecoration:"none", background:k.bg, border:`1px solid ${k.color}22`, borderRadius:10, padding:"10px 14px", display:"block", transition:"transform 0.1s" }}>
              <div style={{ fontSize:"1rem", marginBottom:2 }}>{k.icon}</div>
              <div style={{ fontSize:"1.5rem", fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:k.value>0?k.color:"#94a3b8", marginTop:3, lineHeight:1.3 }}>{k.label}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* ══ Reason to Keep Going ══ */}
        {(isOverloaded || totalOpen > 0) && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:4 }}>Reason to Keep Going</div>
            <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>The task you finish next may:</div>
            <ul style={{ margin:"0 0 12px", paddingLeft:16 }}>
              {[
                "release a truck back to dispatch",
                "help a driver get paid",
                "prevent an uninsured load",
                "stop a billing mistake",
                "protect the company during an audit",
              ].map(item=>(
                <li key={item} style={{ fontSize:"0.75rem", color:"#475569", marginBottom:4, lineHeight:1.4 }}>{item}</li>
              ))}
            </ul>
            {mission && (
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Recommended Next Step</div>
                <div style={{ fontSize:"0.75rem", color:"#0f172a", fontWeight:600 }}>{mission.recommendation}</div>
              </div>
            )}
          </div>
        )}

        {/* ══ Need a Boost? ══ */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:4 }}>Need a Boost?</div>
          <div style={{ fontSize:"0.75rem", color:"#64748b", marginBottom:12, lineHeight:1.5 }}>
            Feeling tired or overwhelmed? It happens. Here&apos;s a reminder of why this work matters.
          </div>
          {!showBoost ? (
            <button onClick={()=>setShowBoost(true)}
              style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
              Show Me →
            </button>
          ) : (
            <div>
              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                <p style={{ margin:0, color:"#1e40af", fontSize:"0.78rem", lineHeight:1.6, fontWeight:600 }}>
                  {BOOST_MESSAGES[boostIdx]}
                </p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setBoostIdx(i=>(i+1)%BOOST_MESSAGES.length)}
                  style={{ background:"#eff6ff", color:"#1d4ed8", border:"none", borderRadius:7, padding:"5px 12px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                  Another →
                </button>
                <button onClick={()=>{ setShowBoost(false); flash(`Keep going, ${staffName}. One task at a time.`); }}
                  style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:7, padding:"5px 12px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                  I&apos;m Ready ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Reason to Keep Going (impact detail) ══ */}
      {mission && !loading && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Today&apos;s Mission</div>
              <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.95rem", marginTop:2 }}>{mission.focus}</div>
            </div>
            <div style={{ background: tasks?.category==="coi"?"#fff1f2":tasks?.category==="maintenance"?"#f5f3ff":"#f0fdf4", color:tasks?.category==="coi"?"#dc2626":tasks?.category==="maintenance"?"#7c3aed":"#15803d", borderRadius:20, padding:"4px 14px", fontSize:"0.65rem", fontWeight:800 }}>
              {tasks?.category==="coi"?"Insurance Priority":tasks?.category==="maintenance"?"Maintenance Priority":tasks?.category==="payroll"?"Payroll Priority":"On Track"}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Your Purpose Today</div>
              <p style={{ margin:0, color:"#475569", fontSize:"0.8rem", lineHeight:1.6 }}>{mission.purpose}</p>
            </div>
            <div>
              <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Why This Matters</div>
              <p style={{ margin:0, color:"#475569", fontSize:"0.8rem", lineHeight:1.6 }}>{mission.reason}</p>
            </div>
          </div>

          <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #f1f5f9", display:"flex", gap:8 }}>
            <a href="/ronyx/owner-operators/coi-matrix" onClick={()=>flash(`Way to go, ${staffName} — heading to the COI command center.`)}
              style={{ background:"#0f172a", color:"#fff", textDecoration:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.72rem", fontWeight:700 }}>Open COI Matrix →</a>
            <a href="/ronyx/maintenance"
              style={{ background:"#f1f5f9", color:"#475569", textDecoration:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.72rem", fontWeight:700 }}>Maintenance →</a>
            <a href="/ronyx/owner-operators"
              style={{ background:"#f1f5f9", color:"#475569", textDecoration:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.72rem", fontWeight:700 }}>Owner Operators →</a>
          </div>
        </div>
      )}

      {/* ══ Daily Wins — motivational toast triggers ══ */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
        <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.85rem", marginBottom:4 }}>Mark a Win Today</div>
        <div style={{ fontSize:"0.72rem", color:"#64748b", marginBottom:12 }}>Log a completed action to build momentum.</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[
            { label:"COI Cleared",         msg:`Way to go, ${staffName} — COI cleared and filed. You helped move this owner operator closer to dispatch-ready.` },
            { label:"Expired Insurance Fixed", msg:`Great work, ${staffName} — expired insurance handled. That is one less dispatch blocker for the team.` },
            { label:"COI Request Sent",    msg:`Nice job — request sent. You kept the follow-up moving instead of letting it fall through the cracks.` },
            { label:"Payroll Hold Cleared",msg:`Excellent work — one payroll hold moved closer to release.` },
            { label:"Billing Issue Fixed", msg:`Revenue protected. Great catch.` },
            { label:"Task Completed",      msg:`Task complete. Small win, big impact.` },
          ].map(w => (
            <button key={w.label} onClick={()=>flash(w.msg)}
              style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:8, padding:"6px 12px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
              ✓ {w.label}
            </button>
          ))}
        </div>

        {totalOpen === 0 && !loading && (
          <div style={{ marginTop:14, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"12px 16px", textAlign:"center" }}>
            <div style={{ fontSize:"1.2rem", marginBottom:4 }}>🎯</div>
            <div style={{ fontWeight:800, color:"#15803d", fontSize:"0.88rem" }}>Excellent work, {staffName}.</div>
            <div style={{ fontSize:"0.75rem", color:"#166534", marginTop:2 }}>All critical tasks are clear. That is a strong day.</div>
          </div>
        )}
      </div>
    </div>
  );
}
