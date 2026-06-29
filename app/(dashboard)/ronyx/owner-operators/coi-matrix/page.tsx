"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── COI type definitions ─────────────────────────────── */
const COI_TYPES = [
  { value:"auto_liability_coi",                     label:"Auto Liability COI",                     shortLabel:"Auto Liab",   group:"standard",    blocks:"general_dispatch" },
  { value:"general_liability_coi",                  label:"General Liability COI",                  shortLabel:"Gen Liab",    group:"standard",    blocks:"general_dispatch" },
  { value:"ronyx_contractor_auto_liability_coi",    label:"Ronyx Contractor Auto Liability COI",    shortLabel:"Ronyx Auto",  group:"ronyx",       blocks:"ronyx_jobs" },
  { value:"ronyx_contractor_general_liability_coi", label:"Ronyx Contractor General Liability COI", shortLabel:"Ronyx Gen",   group:"ronyx",       blocks:"ronyx_jobs" },
  { value:"ma_morrison_auto_liability_coi",         label:"MA Morrison Auto Liability COI",         shortLabel:"MA Auto",     group:"ma_morrison", blocks:"ma_morrison_jobs" },
  { value:"ma_morrison_general_liability_coi",      label:"MA Morrison General Liability COI",      shortLabel:"MA Gen",      group:"ma_morrison", blocks:"ma_morrison_jobs" },
] as const;

const COI_GROUPS = {
  standard:   { label:"Standard Owner Operator COIs",  desc:"Required for all dispatch",          color:"#1e40af", bg:"#eff6ff" },
  ronyx:      { label:"Ronyx Contractor COIs",          desc:"Required for Ronyx contractor jobs", color:"#7c3aed", bg:"#f5f3ff" },
  ma_morrison:{ label:"MA Morrison COIs",               desc:"Required for MA Morrison jobs",      color:"#0891b2", bg:"#f0f9ff" },
} as const;

type COIStatus = "complete"|"missing"|"expired"|"expiring_soon"|"needs_review"|"not_required"|"rejected";

type COIDoc = {
  id:string; oo_id:string; coi_group:string; document_type:string;
  insurance_provider:string|null; policy_number:string|null;
  effective_date:string|null; expiration_date:string|null;
  file_name:string|null; file_url:string|null;
  status:COIStatus; review_status:string;
  dispatch_blocked:boolean; settlement_hold:boolean;
  uploaded_at:string|null; reviewed_by:string|null; reviewed_at:string|null;
  last_reminder_sent_at:string|null; notes:string|null;
};

type OOCompany = {
  id:string; company_name:string;
  contact_name:string|null; contact_email:string|null; contact_phone:string|null;
  business_address?:string|null; dot_number?:string|null; ein?:string|null;
  coi_documents:COIDoc[];
};

const STATUS_COLORS: Record<string,[string,string]> = {
  complete:      ["#f0fdf4","#15803d"],
  missing:       ["#fff1f2","#dc2626"],
  expired:       ["#fff1f2","#dc2626"],
  expiring_soon: ["#fefce8","#ca8a04"],
  needs_review:  ["#fff7ed","#ea580c"],
  not_required:  ["#f1f5f9","#64748b"],
  rejected:      ["#fff1f2","#dc2626"],
};
const STATUS_LABELS: Record<string,string> = {
  complete:"Complete", missing:"Missing", expired:"Expired",
  expiring_soon:"Expiring Soon", needs_review:"Needs Review",
  not_required:"Not Required", rejected:"Rejected",
};

function daysUntil(d?:string|null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?:string|null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}

/* ─── Pure computation functions ─────────────────────────────── */
function groupCOIStatus(oo:OOCompany, group:string): COIStatus {
  const types = COI_TYPES.filter(t => t.group === group);
  const statuses = types.map(t => {
    const doc = oo.coi_documents.find(d => d.document_type === t.value);
    if (!doc) return "missing" as COIStatus;
    return doc.status;
  });
  if (statuses.every(s => s === "complete"))                                   return "complete";
  if (statuses.some(s => s === "missing"))                                     return "missing";
  if (statuses.some(s => s === "expired" || s === "rejected"))                 return "expired";
  if (statuses.some(s => s === "expiring_soon"))                               return "expiring_soon";
  if (statuses.some(s => s === "needs_review"))                                return "needs_review";
  return "complete";
}

function coiScore(oo:OOCompany, group:string) {
  const types = COI_TYPES.filter(t => t.group === group);
  const done  = types.filter(t => oo.coi_documents.find(d => d.document_type === t.value && d.status === "complete")).length;
  return { done, total: types.length };
}

function firstBlocker(oo:OOCompany, group:string): string|null {
  for (const t of COI_TYPES.filter(x => x.group === group)) {
    const doc = oo.coi_documents.find(d => d.document_type === t.value);
    if (!doc || doc.status === "missing") return `Missing ${t.shortLabel}`;
    if (doc.status === "expired")  return `Expired ${t.shortLabel}`;
    if (doc.status === "rejected") return `Rejected ${t.shortLabel}`;
  }
  return null;
}

function jobEligibility(oo:OOCompany) {
  const std = groupCOIStatus(oo,"standard");
  const rx  = groupCOIStatus(oo,"ronyx");
  const mm  = groupCOIStatus(oo,"ma_morrison");
  const stdBad = std==="missing"||std==="expired"||std==="rejected";
  const rxBad  = rx ==="missing"||rx ==="expired"||rx ==="rejected";
  const mmBad  = mm ==="missing"||mm ==="expired"||mm ==="rejected";
  return {
    general:     stdBad ? { ok:false, reason:firstBlocker(oo,"standard")??"Standard COI issue" }       : { ok:true },
    ronyx:       (stdBad||rxBad) ? { ok:false, reason:stdBad ? firstBlocker(oo,"standard")??"Standard COI issue" : firstBlocker(oo,"ronyx")??"Ronyx COI issue" } : { ok:true },
    ma_morrison: (stdBad||mmBad) ? { ok:false, reason:stdBad ? firstBlocker(oo,"standard")??"Standard COI issue" : firstBlocker(oo,"ma_morrison")??"MA Morrison COI issue" } : { ok:true },
  };
}

function nextBestAction(oo:OOCompany): { issue:string; impact:string; action:string } {
  const std = groupCOIStatus(oo,"standard");
  const rx  = groupCOIStatus(oo,"ronyx");
  const mm  = groupCOIStatus(oo,"ma_morrison");
  if (std==="missing"||std==="expired"||std==="rejected")
    return { issue:firstBlocker(oo,"standard")??"Standard COIs incomplete", impact:"Blocked from all dispatch",       action:"Request Standard COI immediately" };
  if (rx==="missing"||rx==="expired"||rx==="rejected")
    return { issue:firstBlocker(oo,"ronyx")??"Ronyx COIs incomplete",       impact:"Blocked from Ronyx jobs only",    action:"Request Ronyx Contractor COI" };
  if (mm==="missing"||mm==="expired"||mm==="rejected")
    return { issue:firstBlocker(oo,"ma_morrison")??"MA Morrison incomplete", impact:"Blocked from MA Morrison jobs", action:"Request MA Morrison COI" };
  const soon = oo.coi_documents.filter(d => d.status==="expiring_soon")
    .sort((a,b) => (daysUntil(a.expiration_date)??999)-(daysUntil(b.expiration_date)??999));
  if (soon.length > 0) {
    const d = daysUntil(soon[0].expiration_date);
    return { issue:`${soon.length} COI(s) expiring — soonest in ${d}d`, impact:"Will block dispatch on expiration", action:"Renew before expiration date" };
  }
  const rev = oo.coi_documents.filter(d => d.status==="needs_review");
  if (rev.length > 0)
    return { issue:`${rev.length} COI(s) awaiting review`, impact:"Dispatch approval pending", action:"Review and approve uploaded COIs" };
  return { issue:"All COIs current", impact:"Eligible for all dispatch", action:"—" };
}

function dispatchStatus(oo:OOCompany) {
  const std = groupCOIStatus(oo,"standard");
  if (std==="expired"||std==="missing"||std==="rejected") return { label:"Blocked — All Jobs",    color:"#dc2626", bg:"#fff1f2" };
  const rx  = groupCOIStatus(oo,"ronyx");
  if (rx ==="expired"||rx ==="missing"||rx ==="rejected") return { label:"Blocked — Ronyx Jobs",  color:"#ea580c", bg:"#fff7ed" };
  const mm  = groupCOIStatus(oo,"ma_morrison");
  if (mm ==="expired"||mm ==="missing"||mm ==="rejected") return { label:"Blocked — MA Morrison", color:"#d97706", bg:"#fefce8" };
  if (std==="expiring_soon")                               return { label:"Expiring Soon",          color:"#ca8a04", bg:"#fefce8" };
  return { label:"Clear", color:"#15803d", bg:"#f0fdf4" };
}

type FilterKey = "all"|"needs_action"|"blocked"|"missing"|"expired"|"expiring_soon"|"exp7"|"needs_review"|"ronyx_required"|"ma_morrison_required"|"standard_incomplete"|"ready_to_dispatch"|"settlement_hold"|"complete";

function applyFilter(cos:OOCompany[], f:FilterKey):OOCompany[] {
  switch(f){
    case "needs_action":         return cos.filter(c=>{ const ds=dispatchStatus(c); return ds.label.startsWith("Blocked")||c.coi_documents.some(d=>d.status==="expiring_soon"||d.status==="needs_review"); });
    case "blocked":              return cos.filter(c=>dispatchStatus(c).label.startsWith("Blocked"));
    case "missing":              return cos.filter(c=>["standard","ronyx","ma_morrison"].some(g=>groupCOIStatus(c,g)==="missing"));
    case "expired":              return cos.filter(c=>c.coi_documents.some(d=>d.status==="expired"||d.status==="rejected"));
    case "expiring_soon":        return cos.filter(c=>c.coi_documents.some(d=>d.status==="expiring_soon"));
    case "exp7":                 return cos.filter(c=>c.coi_documents.some(d=>{ const n=daysUntil(d.expiration_date); return n!==null&&n>=0&&n<=7; }));
    case "needs_review":         return cos.filter(c=>c.coi_documents.some(d=>d.status==="needs_review"));
    case "ronyx_required":       return cos.filter(c=>groupCOIStatus(c,"ronyx")!=="complete");
    case "ma_morrison_required": return cos.filter(c=>groupCOIStatus(c,"ma_morrison")!=="complete");
    case "standard_incomplete":  return cos.filter(c=>groupCOIStatus(c,"standard")!=="complete");
    case "ready_to_dispatch":    return cos.filter(c=>dispatchStatus(c).label==="Clear");
    case "settlement_hold":      return cos.filter(c=>c.coi_documents.some(d=>d.settlement_hold));
    case "complete":             return cos.filter(c=>["standard","ronyx","ma_morrison"].every(g=>groupCOIStatus(c,g)==="complete"));
    default:                     return cos;
  }
}

/* ─── Score bar component ─────────────────────────────── */
function ScoreBar({ done, total, color }:{ done:number; total:number; color:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ width:14, height:6, borderRadius:3, background: i < done ? color : "#e2e8f0" }} />
      ))}
      <span style={{ fontSize:"0.6rem", color:"#64748b", fontWeight:700 }}>{done}/{total}</span>
    </div>
  );
}

/* ─── Eligibility badge ─────────────────────────────── */
function EligBadge({ ok, reason }:{ ok:boolean; reason?:string }) {
  return (
    <div title={reason} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:2 }}>
      <span style={{ fontSize:"0.6rem", fontWeight:900, color: ok?"#15803d":"#dc2626" }}>{ok ? "✓" : "✗"}</span>
      {!ok && reason && <span style={{ fontSize:"0.58rem", color:"#dc2626", lineHeight:1.2 }}>{reason}</span>}
      {ok && <span style={{ fontSize:"0.58rem", color:"#15803d" }}>Eligible</span>}
    </div>
  );
}

/* ─── ISSUE_REASONS ─────────────────────────────── */
const ISSUE_REASONS = [
  "Never Uploaded","Expired","Rejected","Unreadable",
  "Wrong COI Type","Wrong Company Name","Wrong Certificate Holder",
  "Missing Endorsement","Needs Review",
];

/* ══════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════ */
export default function COIMatrixPage() {
  const [cos,          setCOs]          = useState<OOCompany[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<FilterKey>("all");
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState("");
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());
  const [officeNotes,  setOfficeNotes]  = useState<Record<string,string>>({});
  const [editNote,     setEditNote]     = useState<string|null>(null);
  const [noteText,     setNoteText]     = useState("");
  const [savingDoc,    setSavingDoc]    = useState<string|null>(null);

  function flash(m:string) { setToast(m); setTimeout(()=>setToast(""),3500); }

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/ronyx/owner-operators");
    const d = await r.json();
    setCOs((d.companies||[]).map((c:any)=>({ ...c, coi_documents: c.coi_documents||[] })));
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  /* ── KPIs ── */
  const total         = cos.length;
  const complete      = cos.filter(c=>["standard","ronyx","ma_morrison"].every(g=>["complete","not_required"].includes(groupCOIStatus(c,g)))).length;
  const blockedAll    = cos.filter(c=>{ const s=groupCOIStatus(c,"standard"); return s==="missing"||s==="expired"||s==="rejected"; });
  const blockedRonyx  = cos.filter(c=>{ const std=groupCOIStatus(c,"standard"); const rx=groupCOIStatus(c,"ronyx"); return (std==="complete"||std==="expiring_soon"||std==="needs_review")&&(rx==="missing"||rx==="expired"||rx==="rejected"); });
  const blockedMM     = cos.filter(c=>{ const std=groupCOIStatus(c,"standard"); const mm=groupCOIStatus(c,"ma_morrison"); return (std==="complete"||std==="expiring_soon"||std==="needs_review")&&(mm==="missing"||mm==="expired"||mm==="rejected"); });
  const totalBlocked  = cos.filter(c=>dispatchStatus(c).label.startsWith("Blocked")).length;
  const missingAny    = cos.filter(c=>["standard","ronyx","ma_morrison"].some(g=>groupCOIStatus(c,g)==="missing")).length;
  const expiredAny    = cos.filter(c=>c.coi_documents.some(d=>d.status==="expired"||d.status==="rejected")).length;
  const exp7          = cos.filter(c=>c.coi_documents.some(d=>{ const n=daysUntil(d.expiration_date); return n!==null&&n>=0&&n<=7; })).length;
  const exp30         = cos.filter(c=>c.coi_documents.some(d=>d.status==="expiring_soon")).length;
  const needsRev      = cos.filter(c=>c.coi_documents.some(d=>d.status==="needs_review")).length;
  const holds         = cos.filter(c=>c.coi_documents.some(d=>d.settlement_hold)).length;
  const packetsReady  = cos.filter(c=>dispatchStatus(c).label==="Clear").length;
  const needsAction   = cos.filter(c=>{ const ds=dispatchStatus(c); return ds.label.startsWith("Blocked")||c.coi_documents.some(d=>d.status==="expiring_soon"||d.status==="needs_review"); }).length;

  /* ── Recently uploaded / needs review ── */
  const recentUploads = cos.flatMap(c =>
    c.coi_documents
      .filter(d => d.uploaded_at && d.review_status !== "approved")
      .map(d => ({ ...d, company_name: c.company_name, oo: c }))
  ).sort((a,b) => new Date(b.uploaded_at!).getTime() - new Date(a.uploaded_at!).getTime()).slice(0,8);

  /* ── Today's Priority List ── */
  const priorities: { n:number; text:string; count:number; fkey:FilterKey; color:string; bg:string; sendable?:boolean }[] = [];
  let pn = 1;
  if (blockedAll.length  > 0) priorities.push({ n:pn++, text:`${blockedAll.length} OO${blockedAll.length>1?"s":""}  blocked from ALL dispatch — standard COIs missing or expired.`,        count:blockedAll.length,   fkey:"blocked",              color:"#dc2626", bg:"#fff1f2", sendable:true });
  if (blockedRonyx.length> 0) priorities.push({ n:pn++, text:`${blockedRonyx.length} OO${blockedRonyx.length>1?"s":""} blocked from Ronyx jobs — Ronyx Contractor COIs missing or expired.`, count:blockedRonyx.length, fkey:"ronyx_required",       color:"#7c3aed", bg:"#f5f3ff", sendable:true });
  if (blockedMM.length   > 0) priorities.push({ n:pn++, text:`${blockedMM.length} OO${blockedMM.length>1?"s":""} blocked from MA Morrison jobs — MA Morrison COIs missing or expired.`,       count:blockedMM.length,    fkey:"ma_morrison_required", color:"#0891b2", bg:"#f0f9ff", sendable:true });
  if (exp30              > 0) priorities.push({ n:pn++, text:`${exp30} OO${exp30>1?"s":""} have COIs expiring within 30 days.`,                                                              count:exp30,               fkey:"expiring_soon",        color:"#ca8a04", bg:"#fefce8" });
  if (needsRev           > 0) priorities.push({ n:pn++, text:`${needsRev} uploaded COI${needsRev>1?"s":""} are waiting for admin review.`,                                                   count:needsRev,            fkey:"needs_review",         color:"#ea580c", bg:"#fff7ed" });

  /* ── Search + filter ── */
  const SEARCH_KEYWORDS: Record<string,FilterKey> = {
    "blocked":"blocked","missing":"missing","expired":"expired","expiring":"expiring_soon",
    "review":"needs_review","ronyx":"ronyx_required","morrison":"ma_morrison_required",
    "hold":"settlement_hold","complete":"complete","clear":"ready_to_dispatch",
  };

  let filtered = cos;
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    const kwFilter = Object.entries(SEARCH_KEYWORDS).find(([k]) => q === k)?.[1];
    if (kwFilter) {
      filtered = applyFilter(cos, kwFilter);
    } else {
      filtered = filtered.filter(c =>
        c.company_name.toLowerCase().includes(q) ||
        (c.contact_name||"").toLowerCase().includes(q) ||
        (c.contact_email||"").toLowerCase().includes(q) ||
        c.coi_documents.some(d =>
          (d.insurance_provider||"").toLowerCase().includes(q) ||
          (d.policy_number||"").toLowerCase().includes(q) ||
          (d.document_type||"").replace(/_/g," ").includes(q) ||
          (d.coi_group||"").includes(q)
        )
      );
    }
  }
  filtered = applyFilter(filtered, filter);

  /* ── Actions ── */
  function sendCOIRequest(oo:OOCompany, group?:string) {
    const groups = group ? [group] : ["standard","ronyx","ma_morrison"];
    const missing = COI_TYPES.filter(t => groups.includes(t.group) && !oo.coi_documents.find(d => d.document_type===t.value && d.status==="complete"));
    if (missing.length === 0) { flash("No missing COIs to request."); return; }
    const docList = missing.map(t=>`• ${t.label}`).join("\n");
    const subj = `Updated COI Needed — ${oo.company_name}`;
    const body = `Hi ${oo.contact_name||oo.company_name},\n\nWe need the following updated insurance documents for your file:\n\n${docList}\n\nPlease send updated Certificates of Insurance as soon as possible. Dispatch and/or settlement may remain on hold until documents are received and verified.\n\nThank you.`;
    window.open(`mailto:${oo.contact_email||""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
    flash(`COI request email opened for ${oo.company_name}.`);
  }

  function sendBulkRequests() {
    const targets = filtered.filter(c => selected.has(c.id));
    if (targets.length === 0) { flash("No OOs selected."); return; }
    targets.forEach((oo,i) => setTimeout(()=>sendCOIRequest(oo), i*300));
    flash(`Opening ${targets.length} email request windows...`);
  }

  function exportCSV() {
    const targets = selected.size > 0 ? cos.filter(c=>selected.has(c.id)) : filtered;
    const rows = [
      ["Company","Contact","Email","Phone","Standard","Ronyx","MA Morrison","Dispatch","Settlement","Next Action"],
      ...targets.map(c => {
        const nba = nextBestAction(c);
        return [
          c.company_name, c.contact_name||"", c.contact_email||"", c.contact_phone||"",
          groupCOIStatus(c,"standard"), groupCOIStatus(c,"ronyx"), groupCOIStatus(c,"ma_morrison"),
          dispatchStatus(c).label,
          c.coi_documents.some(d=>d.settlement_hold) ? "Hold" : "Clear",
          nba.action,
        ];
      }),
    ];
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download="coi-matrix.csv"; a.click();
    URL.revokeObjectURL(url);
    flash("COI report exported.");
  }

  async function approveCOI(ooId:string, docId:string) {
    setSavingDoc(docId);
    await fetch(`/api/ronyx/owner-operators/${ooId}/coi/${docId}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ review_status:"approved" }),
    });
    setSavingDoc(null);
    flash("COI approved.");
    load();
  }

  async function rejectCOI(ooId:string, docId:string) {
    setSavingDoc(docId);
    await fetch(`/api/ronyx/owner-operators/${ooId}/coi/${docId}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ review_status:"rejected", status:"rejected" }),
    });
    setSavingDoc(null);
    flash("COI rejected.");
    load();
  }

  async function saveDocNote(ooId:string, docId:string, notes:string) {
    await fetch(`/api/ronyx/owner-operators/${ooId}/coi/${docId}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ notes }),
    });
    flash("Note saved.");
    load();
  }

  function toggleSelect(id:string) {
    setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(filtered.map(c=>c.id))); }
  function clearSel()  { setSelected(new Set()); }
  function toggleRow(id:string) { setExpanded(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); }

  const ACTION_CARDS = [
    { key:"needs_action"      as FilterKey, icon:"🚨", label:"Needs Action Today",    value:needsAction,  color:"#dc2626", bg:"#fff1f2", border:"#fecaca" },
    { key:"expired"           as FilterKey, icon:"💀", label:"Expired COIs",          value:expiredAny,   color:"#dc2626", bg:"#fff1f2", border:"#fecaca" },
    { key:"missing"           as FilterKey, icon:"📭", label:"Missing COIs",          value:missingAny,   color:"#b45309", bg:"#fffbeb", border:"#fde68a" },
    { key:"blocked"           as FilterKey, icon:"🚫", label:"Dispatch Blocked",      value:totalBlocked, color:"#dc2626", bg:"#fff1f2", border:"#fecaca" },
    { key:"ronyx_required"    as FilterKey, icon:"🔮", label:"Ronyx Job Blocked",     value:blockedRonyx.length, color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe" },
    { key:"ma_morrison_required" as FilterKey, icon:"💼", label:"MA Morrison Blocked",value:blockedMM.length,    color:"#0891b2", bg:"#f0f9ff", border:"#bae6fd" },
    { key:"exp7"              as FilterKey, icon:"⏰", label:"Expiring in 7 Days",    value:exp7,         color:"#dc2626", bg:"#fff7ed", border:"#fed7aa" },
    { key:"expiring_soon"     as FilterKey, icon:"📅", label:"Expiring in 30 Days",   value:exp30,        color:"#ca8a04", bg:"#fefce8", border:"#fde68a" },
    { key:"ready_to_dispatch" as FilterKey, icon:"✅", label:"Ready to Dispatch",     value:packetsReady, color:"#15803d", bg:"#f0fdf4", border:"#bbf7d0" },
    { key:"needs_review"      as FilterKey, icon:"👁", label:"Needs Review",          value:needsRev,     color:"#ea580c", bg:"#fff7ed", border:"#fed7aa" },
  ];

  const SMART_FILTERS: { key:FilterKey; label:string }[] = [
    { key:"all",                label:`All (${total})` },
    { key:"needs_action",       label:`Needs Action (${needsAction})` },
    { key:"blocked",            label:`Blocked (${totalBlocked})` },
    { key:"missing",            label:`Missing (${missingAny})` },
    { key:"expired",            label:`Expired (${expiredAny})` },
    { key:"expiring_soon",      label:`Expiring Soon (${exp30})` },
    { key:"needs_review",       label:`Needs Review (${needsRev})` },
    { key:"ronyx_required",     label:"Ronyx Required" },
    { key:"ma_morrison_required",label:"MA Morrison Required" },
    { key:"standard_incomplete",label:"Standard Incomplete" },
    { key:"ready_to_dispatch",  label:`Ready to Dispatch (${packetsReady})` },
    { key:"settlement_hold",    label:`Settlement Hold (${holds})` },
    { key:"complete",           label:`Complete (${complete})` },
  ];

  return (
    <div style={{ padding:"24px 28px", maxWidth:1400, fontFamily:"system-ui,sans-serif" }}>
      {toast && (
        <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 22px", borderRadius:14, fontWeight:700, fontSize:14 }}>
          {toast}
        </div>
      )}

      {/* Floating bulk bar */}
      {selected.size > 0 && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:9000, background:"#0f172a", borderRadius:14, padding:"10px 20px", display:"flex", gap:10, alignItems:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <span style={{ color:"#f8fafc", fontWeight:800, fontSize:"0.8rem" }}>{selected.size} selected</span>
          <button onClick={sendBulkRequests} style={bulkBtn("#dc2626")}>Send COI Requests</button>
          <button onClick={exportCSV}        style={bulkBtn("#1e40af")}>Export CSV</button>
          <button onClick={clearSel}         style={bulkBtn("#475569")}>Clear</button>
        </div>
      )}

      <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
        {/* ── Main ── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Header */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#1e40af", textTransform:"uppercase", letterSpacing:"0.1em" }}>Owner Operators</div>
            <h1 style={{ margin:"2px 0 4px", fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>COI Matrix</h1>
            <p style={{ margin:0, color:"#64748b", fontSize:"0.82rem" }}>
              Insurance command center — track Standard, Ronyx, and MA Morrison COIs. Find who is blocked, what is missing, and what needs action today.
            </p>
          </div>

          {/* ── Admin Action Center ── */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Admin Action Center</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
              {ACTION_CARDS.map(c => (
                <button key={c.key} onClick={()=>setFilter(c.key)}
                  style={{ background:filter===c.key ? c.color : c.bg, color:filter===c.key?"#fff":c.color, border:`1.5px solid ${filter===c.key?c.color:c.border}`, borderRadius:10, padding:"10px 12px", textAlign:"left", cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ fontSize:"1.1rem", marginBottom:4 }}>{c.icon}</div>
                  <div style={{ fontSize:"1.4rem", fontWeight:900, lineHeight:1 }}>{c.value}</div>
                  <div style={{ fontSize:"0.58rem", fontWeight:700, marginTop:2, lineHeight:1.3, opacity:filter===c.key?1:0.8 }}>{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Search ── */}
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search owner operator, policy #, insurance provider, COI type, status keyword (e.g. blocked, missing, expired, ronyx)..."
            style={{ width:"100%", border:"2px solid #e2e8f0", borderRadius:10, padding:"10px 16px", fontSize:"0.85rem", marginBottom:10, boxSizing:"border-box", outline:"none" }}
          />

          {/* ── Smart Filters ── */}
          <div style={{ display:"flex", gap:5, marginBottom:16, flexWrap:"wrap" }}>
            {SMART_FILTERS.map(f => (
              <button key={f.key} onClick={()=>setFilter(f.key)}
                style={{ background:filter===f.key?"#0f172a":"#f1f5f9", color:filter===f.key?"#fff":"#475569", border:"none", borderRadius:20, padding:"5px 11px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Today's Priority List ── */}
          {priorities.length > 0 && (
            <div style={{ background:"#0f172a", borderRadius:14, padding:"14px 18px", marginBottom:20 }}>
              <div style={{ fontWeight:800, color:"#f8fafc", fontSize:"0.82rem", marginBottom:10 }}>Today&apos;s COI Priorities</div>
              {priorities.map(p => (
                <div key={p.n} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8, padding:"8px 12px", background:p.bg, borderRadius:8, border:`1px solid ${p.color}22` }}>
                  <span style={{ background:p.color, color:"#fff", borderRadius:"50%", minWidth:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.62rem", fontWeight:900, flexShrink:0 }}>{p.n}</span>
                  <span style={{ color:"#0f172a", fontSize:"0.75rem", lineHeight:1.4, flex:1 }}>{p.text}</span>
                  <button onClick={()=>setFilter(p.fkey)} style={{ background:p.color, color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", flexShrink:0 }}>View List</button>
                  {p.sendable && (
                    <button onClick={()=>{ setFilter(p.fkey); setTimeout(sendBulkRequests,200); }} style={{ background:"#fff", color:p.color, border:`1px solid ${p.color}`, borderRadius:6, padding:"4px 10px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", flexShrink:0 }}>Send Requests</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Recently Uploaded / Needs Review ── */}
          {recentUploads.length > 0 && (
            <div style={{ background:"#fff", border:"1.5px solid #fed7aa", borderRadius:14, marginBottom:20, overflow:"hidden" }}>
              <div style={{ background:"#fff7ed", padding:"10px 16px", borderBottom:"1px solid #fed7aa", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, color:"#ea580c", fontSize:"0.82rem" }}>Recently Uploaded — Needs Review</div>
                  <div style={{ fontSize:"0.65rem", color:"#9a3412" }}>{recentUploads.length} COI document{recentUploads.length>1?"s":""} uploaded but not yet approved</div>
                </div>
                <button onClick={()=>setFilter("needs_review")} style={{ background:"#ea580c", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>View All</button>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                  <thead>
                    <tr style={{ background:"#fff7ed" }}>
                      {["Owner Operator","COI Type","Provider","Uploaded","Expires","Status","Actions"].map(h=>(
                        <th key={h} style={{ padding:"7px 12px", fontSize:"0.6rem", fontWeight:700, color:"#9a3412", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentUploads.map(d => {
                      const [sbg,sc] = STATUS_COLORS[d.status]||STATUS_COLORS.missing;
                      return (
                        <tr key={d.id} style={{ borderTop:"1px solid #fde68a" }}>
                          <td style={{ padding:"8px 12px", fontWeight:700, color:"#0f172a" }}>{(d as any).company_name}</td>
                          <td style={{ padding:"8px 12px", color:"#475569" }}>{COI_TYPES.find(t=>t.value===d.document_type)?.shortLabel||d.document_type}</td>
                          <td style={{ padding:"8px 12px", color:"#475569" }}>{d.insurance_provider||"—"}</td>
                          <td style={{ padding:"8px 12px", color:"#475569" }}>{d.uploaded_at ? fmtDate(d.uploaded_at) : "—"}</td>
                          <td style={{ padding:"8px 12px", color:"#475569" }}>
                            {fmtDate(d.expiration_date)}
                            {daysUntil(d.expiration_date) !== null && (
                              <div style={{ fontSize:"0.6rem", color: (daysUntil(d.expiration_date)||0) < 0 ? "#dc2626" : (daysUntil(d.expiration_date)||0) <= 30 ? "#ca8a04" : "#64748b" }}>
                                {daysUntil(d.expiration_date)! < 0 ? `${Math.abs(daysUntil(d.expiration_date)!)}d ago` : `${daysUntil(d.expiration_date)}d left`}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:"8px 12px" }}>
                            <span style={{ background:sbg, color:sc, padding:"2px 8px", borderRadius:20, fontSize:"0.6rem", fontWeight:800 }}>{STATUS_LABELS[d.status]||d.status}</span>
                          </td>
                          <td style={{ padding:"8px 12px" }}>
                            <div style={{ display:"flex", gap:4 }}>
                              <button onClick={()=>approveCOI(d.oo_id,d.id)} disabled={savingDoc===d.id} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:5, padding:"3px 8px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>Approve</button>
                              <button onClick={()=>rejectCOI(d.oo_id,d.id)}  disabled={savingDoc===d.id} style={{ background:"#fff1f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:5, padding:"3px 8px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" }}>Reject</button>
                              <a href={`/ronyx/owner-operators?id=${d.oo_id}&tab=coi`} style={{ background:"#eff6ff", color:"#1d4ed8", borderRadius:5, padding:"3px 8px", fontSize:"0.62rem", fontWeight:700, textDecoration:"none" }}>Open</a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── COI Matrix Table ── */}
          {loading ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>No owner operators match the current filter.</div>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:"0.72rem", color:"#64748b" }}>
                  Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> owner operators
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={selectAll} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Select All</button>
                  {selected.size > 0 && <button onClick={clearSel} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Clear ({selected.size})</button>}
                  <button onClick={exportCSV} style={{ background:"#eff6ff", color:"#1d4ed8", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Export CSV</button>
                </div>
              </div>

              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        <th style={{ padding:"8px 12px", width:32 }}>
                          <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0} onChange={e=>e.target.checked?selectAll():clearSel()} />
                        </th>
                        {["Owner Operator","Job Eligibility","Standard COIs","Ronyx COIs","MA Morrison COIs","Next Best Action","Actions"].map(h=>(
                          <th key={h} style={{ padding:"8px 12px", fontSize:"0.6rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(oo => {
                        const stdSt = groupCOIStatus(oo,"standard");
                        const rxSt  = groupCOIStatus(oo,"ronyx");
                        const mmSt  = groupCOIStatus(oo,"ma_morrison");
                        const disp  = dispatchStatus(oo);
                        const elig  = jobEligibility(oo);
                        const nba   = nextBestAction(oo);
                        const isExp = expanded.has(oo.id);
                        const isSel = selected.has(oo.id);
                        const hasHold = oo.coi_documents.some(d=>d.settlement_hold);
                        const stdScore = coiScore(oo,"standard");
                        const rxScore  = coiScore(oo,"ronyx");
                        const mmScore  = coiScore(oo,"ma_morrison");

                        return (
                          <>
                            <tr key={oo.id} style={{ borderTop:"1px solid #f1f5f9", background: isSel ? "#f0f9ff" : undefined }}>
                              <td style={{ padding:"10px 12px" }}>
                                <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(oo.id)} />
                              </td>

                              {/* OO Name + completeness */}
                              <td style={{ padding:"10px 12px", minWidth:180 }}>
                                <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.85rem" }}>{oo.company_name}</div>
                                {oo.contact_name  && <div style={{ fontSize:"0.68rem", color:"#64748b" }}>{oo.contact_name}</div>}
                                {oo.contact_phone && <div style={{ fontSize:"0.65rem", color:"#94a3b8" }}>{oo.contact_phone}</div>}
                                <div style={{ marginTop:5 }}>
                                  <div style={{ fontSize:"0.58rem", color:"#94a3b8", marginBottom:2 }}>COI Score</div>
                                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                                    <ScoreBar done={stdScore.done} total={stdScore.total} color="#1e40af" />
                                    <span style={{ fontSize:"0.55rem", color:"#94a3b8" }}>·</span>
                                    <ScoreBar done={rxScore.done}  total={rxScore.total}  color="#7c3aed" />
                                    <span style={{ fontSize:"0.55rem", color:"#94a3b8" }}>·</span>
                                    <ScoreBar done={mmScore.done}  total={mmScore.total}  color="#0891b2" />
                                  </div>
                                  <div style={{ fontSize:"0.55rem", color:"#94a3b8", marginTop:2 }}>
                                    {stdScore.done+rxScore.done+mmScore.done}/9 total COIs
                                  </div>
                                </div>
                              </td>

                              {/* Job eligibility */}
                              <td style={{ padding:"10px 12px", minWidth:160 }}>
                                <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" }}>Dispatch Eligibility</div>
                                <div style={{ marginBottom:2 }}>
                                  <div style={{ fontSize:"0.6rem", color:"#94a3b8", fontWeight:600 }}>General Jobs</div>
                                  <EligBadge ok={elig.general.ok} reason={elig.general.ok?undefined:(elig.general as any).reason} />
                                </div>
                                <div style={{ marginBottom:2 }}>
                                  <div style={{ fontSize:"0.6rem", color:"#94a3b8", fontWeight:600 }}>Ronyx Jobs</div>
                                  <EligBadge ok={elig.ronyx.ok} reason={elig.ronyx.ok?undefined:(elig.ronyx as any).reason} />
                                </div>
                                <div>
                                  <div style={{ fontSize:"0.6rem", color:"#94a3b8", fontWeight:600 }}>MA Morrison Jobs</div>
                                  <EligBadge ok={elig.ma_morrison.ok} reason={elig.ma_morrison.ok?undefined:(elig.ma_morrison as any).reason} />
                                </div>
                                <div style={{ marginTop:5 }}>
                                  <span style={{ background:disp.bg, color:disp.color, padding:"2px 8px", borderRadius:20, fontSize:"0.58rem", fontWeight:800 }}>{disp.label}</span>
                                  {hasHold && <span style={{ background:"#fff7ed", color:"#ea580c", padding:"2px 8px", borderRadius:20, fontSize:"0.58rem", fontWeight:800, marginLeft:4 }}>Settlement Hold</span>}
                                </div>
                              </td>

                              {/* Standard COIs */}
                              {([["standard",stdSt,stdScore,"#1e40af"],["ronyx",rxSt,rxScore,"#7c3aed"],["ma_morrison",mmSt,mmScore,"#0891b2"]] as [string,COIStatus,{done:number,total:number},string][]).map(([g,st,sc,color]) => {
                                const [bg,tc] = STATUS_COLORS[st]||STATUS_COLORS.missing;
                                const missingDocs = COI_TYPES.filter(t=>t.group===g&&!oo.coi_documents.find(d=>d.document_type===t.value&&d.status==="complete"));
                                return (
                                  <td key={g} style={{ padding:"10px 12px", minWidth:120 }}>
                                    <span style={{ background:bg, color:tc, padding:"3px 8px", borderRadius:20, fontSize:"0.62rem", fontWeight:800, display:"inline-block", marginBottom:4 }}>{STATUS_LABELS[st]||st}</span>
                                    <ScoreBar done={sc.done} total={sc.total} color={color} />
                                    {missingDocs.length > 0 && (
                                      <div style={{ marginTop:4 }}>
                                        {missingDocs.slice(0,2).map(t=>(
                                          <div key={t.value} style={{ fontSize:"0.58rem", color:"#dc2626" }}>✗ {t.shortLabel}</div>
                                        ))}
                                        {missingDocs.length > 2 && <div style={{ fontSize:"0.58rem", color:"#94a3b8" }}>+{missingDocs.length-2} more</div>}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Next Best Action */}
                              <td style={{ padding:"10px 12px", minWidth:200 }}>
                                {nba.action !== "—" ? (
                                  <>
                                    <div style={{ fontSize:"0.68rem", fontWeight:800, color:"#0f172a", marginBottom:2 }}>{nba.issue}</div>
                                    <div style={{ fontSize:"0.62rem", color:"#ea580c", marginBottom:3 }}>Impact: {nba.impact}</div>
                                    <div style={{ background:"#f0fdf4", color:"#15803d", borderRadius:6, padding:"3px 8px", fontSize:"0.62rem", fontWeight:700, display:"inline-block" }}>→ {nba.action}</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize:"0.68rem", color:"#15803d", fontWeight:700 }}>✓ All COIs current</div>
                                )}
                              </td>

                              {/* Actions */}
                              <td style={{ padding:"10px 12px", minWidth:140 }}>
                                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                  {stdSt !== "complete" && (
                                    <button onClick={()=>sendCOIRequest(oo,"standard")} style={rowBtn("#dc2626","#fff1f2")}>Request Std COI</button>
                                  )}
                                  {rxSt !== "complete" && (
                                    <button onClick={()=>sendCOIRequest(oo,"ronyx")} style={rowBtn("#7c3aed","#f5f3ff")}>Request Ronyx COI</button>
                                  )}
                                  {mmSt !== "complete" && (
                                    <button onClick={()=>sendCOIRequest(oo,"ma_morrison")} style={rowBtn("#0891b2","#f0f9ff")}>Request MA COI</button>
                                  )}
                                  <button onClick={()=>sendCOIRequest(oo)} style={rowBtn("#ea580c","#fff7ed")}>Email Packet</button>
                                  <a href={`/ronyx/owner-operators?id=${oo.id}&tab=coi`} style={{ ...rowBtn("#1d4ed8","#eff6ff"), textDecoration:"none", textAlign:"center" as const }}>Open Profile</a>
                                  <button onClick={()=>toggleRow(oo.id)} style={rowBtn("#475569","#f1f5f9")}>{isExp?"▲ Collapse":"▼ Details"}</button>
                                </div>
                              </td>
                            </tr>

                            {/* ── Expanded detail row ── */}
                            {isExp && (
                              <tr key={`${oo.id}-exp`}>
                                <td colSpan={8} style={{ padding:0, background:"#f8fafc", borderTop:"1px solid #e2e8f0" }}>
                                  <div style={{ padding:"16px 20px" }}>
                                    <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.82rem", marginBottom:12 }}>All 9 COI Documents — {oo.company_name}</div>

                                    {(["standard","ronyx","ma_morrison"] as const).map(g => {
                                      const gdef = COI_GROUPS[g];
                                      return (
                                        <div key={g} style={{ marginBottom:16 }}>
                                          <div style={{ fontSize:"0.65rem", fontWeight:800, color:gdef.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, background:gdef.bg, padding:"4px 10px", borderRadius:6, display:"inline-block" }}>
                                            {gdef.label}
                                          </div>
                                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:8 }}>
                                            {COI_TYPES.filter(t=>t.group===g).map(t => {
                                              const doc = oo.coi_documents.find(d=>d.document_type===t.value);
                                              const st  = doc?.status||"missing";
                                              const [sbg,sc] = STATUS_COLORS[st]||STATUS_COLORS.missing;
                                              const days = daysUntil(doc?.expiration_date);
                                              return (
                                                <div key={t.value} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px" }}>
                                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                                                    <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.72rem" }}>{t.label}</div>
                                                    <span style={{ background:sbg, color:sc, padding:"2px 7px", borderRadius:20, fontSize:"0.58rem", fontWeight:800, flexShrink:0 }}>{STATUS_LABELS[st]||st}</span>
                                                  </div>
                                                  {doc ? (
                                                    <div style={{ fontSize:"0.65rem", color:"#64748b" }}>
                                                      {doc.insurance_provider && <div><strong>Provider:</strong> {doc.insurance_provider}</div>}
                                                      {doc.policy_number      && <div><strong>Policy:</strong> {doc.policy_number}</div>}
                                                      {doc.effective_date     && <div><strong>Effective:</strong> {fmtDate(doc.effective_date)}</div>}
                                                      {doc.expiration_date    && (
                                                        <div style={{ color: days!==null&&days<0?"#dc2626":days!==null&&days<=30?"#ca8a04":"#475569" }}>
                                                          <strong>Expires:</strong> {fmtDate(doc.expiration_date)} {days!==null&&`(${days<0?`${Math.abs(days)}d overdue`:`${days}d left`})`}
                                                        </div>
                                                      )}
                                                      {doc.review_status && <div style={{ marginTop:4 }}><strong>Review:</strong> <span style={{ color: doc.review_status==="approved"?"#15803d":doc.review_status==="rejected"?"#dc2626":"#ea580c" }}>{doc.review_status}</span></div>}
                                                      {doc.notes && <div style={{ marginTop:4, fontStyle:"italic", color:"#64748b" }}>Note: {doc.notes}</div>}
                                                      <div style={{ display:"flex", gap:4, marginTop:6 }}>
                                                        {doc.review_status !== "approved" && (
                                                          <button onClick={()=>approveCOI(oo.id,doc.id)} disabled={savingDoc===doc.id} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:5, padding:"3px 8px", fontSize:"0.6rem", fontWeight:700, cursor:"pointer" }}>Approve</button>
                                                        )}
                                                        {doc.review_status !== "rejected" && (
                                                          <button onClick={()=>rejectCOI(oo.id,doc.id)} disabled={savingDoc===doc.id} style={{ background:"#fff1f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:5, padding:"3px 8px", fontSize:"0.6rem", fontWeight:700, cursor:"pointer" }}>Reject</button>
                                                        )}
                                                        <select defaultValue="" onChange={e=>{ if(e.target.value) saveDocNote(oo.id,doc.id,`Issue: ${e.target.value}`); }} style={{ fontSize:"0.58rem", borderRadius:5, border:"1px solid #e2e8f0", padding:"2px 4px", color:"#475569", cursor:"pointer" }}>
                                                          <option value="">Mark issue...</option>
                                                          {ISSUE_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div style={{ fontSize:"0.65rem", color:"#dc2626" }}>
                                                      Not uploaded
                                                      <select defaultValue="" onChange={e=>{ /* no doc to save to */ }} style={{ display:"block", marginTop:4, fontSize:"0.58rem", borderRadius:5, border:"1px solid #e2e8f0", padding:"2px 4px", color:"#475569", cursor:"pointer" }}>
                                                        <option value="">Mark reason...</option>
                                                        {ISSUE_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                                                      </select>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Office notes */}
                                    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", marginTop:4 }}>
                                      <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.72rem", marginBottom:8 }}>Office Notes</div>
                                      {editNote === oo.id ? (
                                        <div>
                                          <textarea
                                            value={noteText} onChange={e=>setNoteText(e.target.value)}
                                            rows={3} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 10px", fontSize:"0.72rem", boxSizing:"border-box", resize:"vertical" }}
                                            placeholder="Add office note for this OO..."
                                          />
                                          <div style={{ display:"flex", gap:6, marginTop:4 }}>
                                            <button onClick={()=>{ setOfficeNotes(p=>({...p,[oo.id]:noteText})); setEditNote(null); flash("Note saved."); }} style={{ background:"#0f172a", color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Save</button>
                                            <button onClick={()=>setEditNote(null)} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          {officeNotes[oo.id]
                                            ? <p style={{ margin:"0 0 8px", fontSize:"0.72rem", color:"#0f172a", fontStyle:"italic" }}>{officeNotes[oo.id]}</p>
                                            : <p style={{ margin:"0 0 8px", fontSize:"0.72rem", color:"#94a3b8" }}>No office notes yet.</p>
                                          }
                                          <button onClick={()=>{ setNoteText(officeNotes[oo.id]||""); setEditNote(oo.id); }} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                                            {officeNotes[oo.id] ? "Edit Note" : "+ Add Note"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width:240, flexShrink:0 }}>

          {/* COI Packet Center */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.82rem", marginBottom:4 }}>COI Packet Center</div>
            <div style={{ fontSize:"0.62rem", color:"#64748b", marginBottom:12 }}>
              {selected.size > 0 ? `${selected.size} OO${selected.size>1?"s":""} selected` : "Select OOs or use bulk actions"}
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#1e40af", textTransform:"uppercase", marginBottom:5 }}>Standard Packets</div>
              <button onClick={()=>{ const t=selected.size>0?cos.filter(c=>selected.has(c.id)):filtered; t.forEach(oo=>sendCOIRequest(oo,"standard")); flash(`Opened ${t.length} standard COI email(s).`); }} style={packetBtn("#1e40af","#eff6ff")}>Email Standard COI Requests</button>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#7c3aed", textTransform:"uppercase", marginBottom:5 }}>Ronyx Packets</div>
              <button onClick={()=>{ const t=selected.size>0?cos.filter(c=>selected.has(c.id)):filtered; t.forEach(oo=>sendCOIRequest(oo,"ronyx")); flash(`Opened ${t.length} Ronyx COI email(s).`); }} style={packetBtn("#7c3aed","#f5f3ff")}>Email Ronyx COI Requests</button>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#0891b2", textTransform:"uppercase", marginBottom:5 }}>MA Morrison Packets</div>
              <button onClick={()=>{ const t=selected.size>0?cos.filter(c=>selected.has(c.id)):filtered; t.forEach(oo=>sendCOIRequest(oo,"ma_morrison")); flash(`Opened ${t.length} MA Morrison COI email(s).`); }} style={packetBtn("#0891b2","#f0f9ff")}>Email MA Morrison Requests</button>
            </div>
            <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:10, marginTop:4 }}>
              <button onClick={exportCSV} style={packetBtn("#0f172a","#f1f5f9")}>Download Full COI Report (CSV)</button>
            </div>
          </div>

          {/* Staff Guidance */}
          <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontWeight:800, color:"#f8fafc", marginBottom:4, fontSize:"0.82rem" }}>Staff Guidance</div>
            <div style={{ fontSize:"0.58rem", color:"#64748b", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Priority Order</div>
            {[
              { n:1, text:"Fix expired Standard COIs first — they block ALL dispatch.", color:"#dc2626" },
              { n:2, text:"Fix Ronyx Contractor COIs for OOs on Ronyx jobs.", color:"#7c3aed" },
              { n:3, text:"Fix MA Morrison COIs when OO is on MA Morrison work.", color:"#0891b2" },
              { n:4, text:"Review uploaded COIs within 24 hours of upload.", color:"#ea580c" },
              { n:5, text:"Renew expiring COIs ≥2 weeks before expiration date.", color:"#ca8a04" },
            ].map(p=>(
              <div key={p.n} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
                <span style={{ background:p.color, color:"#fff", borderRadius:"50%", minWidth:17, height:17, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.58rem", fontWeight:900, flexShrink:0 }}>{p.n}</span>
                <span style={{ color:"#e2e8f0", fontSize:"0.68rem", lineHeight:1.4 }}>{p.text}</span>
              </div>
            ))}

            <div style={{ borderTop:"1px solid #1e293b", marginTop:12, paddingTop:12 }}>
              <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>COI Groups</div>
              {Object.entries(COI_GROUPS).map(([k,g])=>(
                <div key={k} style={{ marginBottom:7 }}>
                  <div style={{ fontWeight:700, fontSize:"0.68rem", color:g.color }}>{g.label}</div>
                  <div style={{ fontSize:"0.62rem", color:"#64748b" }}>{g.desc}</div>
                </div>
              ))}
            </div>

            {totalBlocked > 0 && (
              <div style={{ background:"#fff1f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 10px", marginTop:10 }}>
                <div style={{ fontWeight:800, fontSize:"0.68rem", color:"#dc2626", marginBottom:2 }}>DISPATCH BLOCKED</div>
                <div style={{ fontSize:"0.65rem", color:"#dc2626" }}>{totalBlocked} OO{totalBlocked!==1?"s":""} cannot be dispatched.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Style helpers ─────────────────────────────── */
function bulkBtn(bg:string) {
  return { background:bg, color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" } as const;
}
function rowBtn(color:string, bg:string) {
  return { background:bg, color, border:"none", borderRadius:6, padding:"4px 9px", fontSize:"0.62rem", fontWeight:700, cursor:"pointer" } as const;
}
function packetBtn(color:string, bg:string) {
  return { background:bg, color, border:"none", borderRadius:7, padding:"6px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer", width:"100%" as const, textAlign:"left" as const, marginBottom:4 } as const;
}
