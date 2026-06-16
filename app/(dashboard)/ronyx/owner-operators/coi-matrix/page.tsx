"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── COI type definitions ─────────────────────────────── */
export const COI_TYPES = [
  { value: "auto_liability_coi",                    label: "Auto Liability COI",                    group: "standard",   blocks: "general_dispatch" },
  { value: "general_liability_coi",                 label: "General Liability COI",                 group: "standard",   blocks: "general_dispatch" },
  { value: "cargo_coi",                             label: "Cargo / Motor Truck Cargo COI",         group: "standard",   blocks: "general_dispatch" },
  { value: "ronyx_contractor_auto_liability_coi",   label: "Ronyx Contractor Auto Liability COI",   group: "ronyx",      blocks: "ronyx_jobs" },
  { value: "ronyx_contractor_general_liability_coi",label: "Ronyx Contractor General Liability COI",group: "ronyx",      blocks: "ronyx_jobs" },
  { value: "ronyx_contractor_cargo_coi",            label: "Ronyx Contractor Cargo COI",            group: "ronyx",      blocks: "ronyx_jobs" },
  { value: "ma_morrison_auto_liability_coi",        label: "MA Morrison Auto Liability COI",        group: "ma_morrison",blocks: "ma_morrison_jobs" },
  { value: "ma_morrison_general_liability_coi",     label: "MA Morrison General Liability COI",     group: "ma_morrison",blocks: "ma_morrison_jobs" },
  { value: "ma_morrison_cargo_coi",                 label: "MA Morrison Cargo COI",                 group: "ma_morrison",blocks: "ma_morrison_jobs" },
] as const;

export const COI_GROUPS = {
  standard:   { label: "Standard Owner Operator COIs",  desc: "Required for all dispatch",          color: "#1e40af", bg: "#eff6ff" },
  ronyx:      { label: "Ronyx Contractor COIs",         desc: "Required for Ronyx contractor jobs", color: "#7c3aed", bg: "#f5f3ff" },
  ma_morrison:{ label: "MA Morrison COIs",              desc: "Required for MA Morrison jobs",      color: "#0891b2", bg: "#f0f9ff" },
} as const;

type COIStatus = "complete" | "missing" | "expired" | "expiring_soon" | "needs_review" | "not_required" | "rejected";

type COIDoc = {
  id: string;
  oo_id: string;
  coi_group: string;
  document_type: string;
  insurance_provider: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  file_name: string | null;
  file_url: string | null;
  status: COIStatus;
  review_status: string;
  dispatch_blocked: boolean;
  settlement_hold: boolean;
  uploaded_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  last_reminder_sent_at: string | null;
  notes: string | null;
};

type OOCompany = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  coi_documents: COIDoc[];
};

const STATUS_COLORS: Record<string, [string, string]> = {
  complete:       ["#f0fdf4", "#15803d"],
  missing:        ["#fff1f2", "#dc2626"],
  expired:        ["#fff1f2", "#dc2626"],
  expiring_soon:  ["#fefce8", "#ca8a04"],
  needs_review:   ["#fff7ed", "#ea580c"],
  not_required:   ["#f1f5f9", "#64748b"],
  rejected:       ["#fff1f2", "#dc2626"],
};

const STATUS_LABELS: Record<string, string> = {
  complete: "Complete", missing: "Missing", expired: "Expired",
  expiring_soon: "Expiring Soon", needs_review: "Needs Review",
  not_required: "Not Required", rejected: "Rejected",
};

function daysUntil(d?: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupCOIStatus(oo: OOCompany, group: string): COIStatus {
  const types = COI_TYPES.filter(t => t.group === group);
  const docs  = oo.coi_documents.filter(d => d.coi_group === group);
  let worst: COIStatus = "missing";
  let allComplete = true;
  for (const t of types) {
    const doc = docs.find(d => d.document_type === t.value);
    if (!doc) { allComplete = false; worst = "missing"; continue; }
    if (doc.status === "expired" || doc.status === "rejected") { allComplete = false; if (worst !== "missing") worst = "expired"; }
    else if (doc.status === "expiring_soon") { allComplete = false; if (worst === "complete" || worst === "needs_review") worst = "expiring_soon"; }
    else if (doc.status === "needs_review") { if (worst === "complete") worst = "needs_review"; }
    else if (doc.status === "complete") { /* ok */ }
  }
  if (allComplete && docs.length === types.length && docs.every(d => d.status === "complete")) return "complete";
  return worst;
}

function dispatchStatus(oo: OOCompany): { label: string; color: string; bg: string } {
  const std = groupCOIStatus(oo, "standard");
  if (std === "expired" || std === "missing") return { label: "Blocked — All Jobs", color: "#dc2626", bg: "#fff1f2" };
  const rx = groupCOIStatus(oo, "ronyx");
  if (rx === "expired" || rx === "missing")   return { label: "Blocked — Ronyx Jobs", color: "#ea580c", bg: "#fff7ed" };
  const mm = groupCOIStatus(oo, "ma_morrison");
  if (mm === "expired" || mm === "missing")   return { label: "Blocked — MA Morrison", color: "#d97706", bg: "#fefce8" };
  if (std === "expiring_soon")                return { label: "Expiring Soon", color: "#ca8a04", bg: "#fefce8" };
  return { label: "Clear", color: "#15803d", bg: "#f0fdf4" };
}

function nextAction(oo: OOCompany): string {
  const std = groupCOIStatus(oo, "standard");
  if (std === "missing") return "Upload Standard Owner Operator COIs";
  if (std === "expired") return "Replace expired Standard COIs";
  const rx = groupCOIStatus(oo, "ronyx");
  if (rx === "missing")  return "Request Ronyx Contractor COIs";
  if (rx === "expired")  return "Replace expired Ronyx COIs";
  const mm = groupCOIStatus(oo, "ma_morrison");
  if (mm === "missing")  return "Request MA Morrison COIs";
  if (mm === "expired")  return "Replace expired MA Morrison COIs";
  if (std === "expiring_soon") return "Renew Standard COIs before expiration";
  if (std === "needs_review")  return "Review and approve uploaded COIs";
  return "—";
}

type FilterKey = "all" | "complete" | "missing" | "expired" | "expiring_soon" | "dispatch_blocked" | "settlement_hold" | "standard" | "ronyx" | "ma_morrison";

export default function COIMatrixPage() {
  const [cos,     setCOs]     = useState<OOCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");
  const [search,  setSearch]  = useState("");
  const [toast,   setToast]   = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/ronyx/owner-operators");
    const d = await r.json();
    setCOs((d.companies || []).map((c: any) => ({ ...c, coi_documents: c.coi_documents || [] })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPIs ──
  const total      = cos.length;
  const complete   = cos.filter(c => ["standard","ronyx","ma_morrison"].every(g => ["complete","not_required"].includes(groupCOIStatus(c,g)))).length;
  const missingStd = cos.filter(c => groupCOIStatus(c,"standard") === "missing").length;
  const missingRx  = cos.filter(c => groupCOIStatus(c,"ronyx")    === "missing").length;
  const missingMM  = cos.filter(c => groupCOIStatus(c,"ma_morrison") === "missing").length;
  const expired    = cos.filter(c => cos.flatMap(x => x.coi_documents).some(d => d.oo_id === c.id && d.status === "expired")).length;
  const expiring   = cos.filter(c => c.coi_documents.some(d => d.status === "expiring_soon")).length;
  const blocked    = cos.filter(c => dispatchStatus(c).label.startsWith("Blocked")).length;
  const holds      = cos.filter(c => c.coi_documents.some(d => d.settlement_hold)).length;

  // ── Filtered list ──
  let filtered = cos;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.company_name.toLowerCase().includes(q) ||
      c.contact_name?.toLowerCase().includes(q) ||
      c.coi_documents.some(d => (d.insurance_provider||"").toLowerCase().includes(q) || (d.policy_number||"").toLowerCase().includes(q))
    );
  }
  if (filter === "complete")        filtered = filtered.filter(c => ["standard","ronyx","ma_morrison"].every(g => ["complete","not_required"].includes(groupCOIStatus(c,g))));
  else if (filter === "missing")    filtered = filtered.filter(c => ["standard","ronyx","ma_morrison"].some(g => groupCOIStatus(c,g) === "missing"));
  else if (filter === "expired")    filtered = filtered.filter(c => c.coi_documents.some(d => d.status === "expired"));
  else if (filter === "expiring_soon") filtered = filtered.filter(c => c.coi_documents.some(d => d.status === "expiring_soon"));
  else if (filter === "dispatch_blocked") filtered = filtered.filter(c => dispatchStatus(c).label.startsWith("Blocked"));
  else if (filter === "settlement_hold")  filtered = filtered.filter(c => c.coi_documents.some(d => d.settlement_hold));
  else if (filter === "standard")   filtered = filtered.filter(c => groupCOIStatus(c,"standard") !== "complete");
  else if (filter === "ronyx")      filtered = filtered.filter(c => groupCOIStatus(c,"ronyx") !== "complete");
  else if (filter === "ma_morrison")filtered = filtered.filter(c => groupCOIStatus(c,"ma_morrison") !== "complete");

  async function sendCOIRequest(oo: OOCompany, group: string) {
    const missingTypes = COI_TYPES.filter(t => t.group === group && !oo.coi_documents.find(d => d.document_type === t.value && d.status === "complete"));
    const docList = missingTypes.map(t => `• ${t.label}`).join("\n");
    const subject = `Updated COI Needed — ${oo.company_name}`;
    const body    = `Hi ${oo.contact_name || oo.company_name},\n\nWe need the following updated insurance documents for your file:\n\n${docList}\n\nPlease send the updated Certificates of Insurance as soon as possible. Dispatch and/or settlement may remain on hold until documents are received and verified.\n\nThank you.`;
    window.open(`mailto:${oo.contact_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    flash(`COI request email opened for ${oo.company_name}.`);
  }

  const FILTERS: { key: FilterKey; label: string; count?: number }[] = [
    { key:"all",             label:`All (${total})` },
    { key:"complete",        label:`Complete (${complete})` },
    { key:"missing",         label:`Missing`, count: missingStd + missingRx + missingMM },
    { key:"expired",         label:`Expired (${expired})` },
    { key:"expiring_soon",   label:`Expiring Soon (${expiring})` },
    { key:"dispatch_blocked",label:`Dispatch Blocked (${blocked})` },
    { key:"settlement_hold", label:`Settlement Hold (${holds})` },
  ];

  return (
    <div style={{ padding:"24px 28px", maxWidth:1200, fontFamily:"system-ui, sans-serif" }}>
      {toast && <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 22px", borderRadius:14, fontWeight:700, fontSize:14 }}>{toast}</div>}

      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
        {/* Main content */}
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#1e40af", textTransform:"uppercase", letterSpacing:"0.1em" }}>Owner Operators</div>
            <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:900, color:"#0f172a" }}>COI Matrix</h1>
            <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:"0.85rem" }}>
              Track Standard, Ronyx Contractor, and MA Morrison COIs across all owner operators. Missing or expired COIs block dispatch and hold settlement.
            </p>
          </div>

          {/* KPI cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:8, marginBottom:20 }}>
            {[
              { label:"Total OOs",       value:total,      color:"#0f172a", bg:"#fff"     },
              { label:"COI Complete",    value:complete,   color:"#15803d", bg:"#f0fdf4"  },
              { label:"Missing Std",     value:missingStd, color:"#dc2626", bg:"#fff1f2"  },
              { label:"Missing Ronyx",   value:missingRx,  color:"#7c3aed", bg:"#f5f3ff"  },
              { label:"Missing Morrison",value:missingMM,  color:"#0891b2", bg:"#f0f9ff"  },
              { label:"Expired COIs",    value:expired,    color:"#dc2626", bg:"#fff1f2"  },
              { label:"Expiring ≤30d",   value:expiring,   color:"#ca8a04", bg:"#fefce8"  },
              { label:"Dispatch Blocked",value:blocked,    color:"#dc2626", bg:"#fff1f2"  },
              { label:"Settlement Holds",value:holds,      color:"#ea580c", bg:"#fff7ed"  },
            ].map(k => (
              <div key={k.label} style={{ background:k.bg, border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px" }}>
                <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1.2 }}>{k.label}</div>
                <div style={{ fontSize:"1.6rem", fontWeight:900, color:k.color, marginTop:4 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, provider, policy #..."
            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, padding:"9px 14px", fontSize:"0.85rem", marginBottom:12, boxSizing:"border-box" }}
          />

          {/* Filter tabs */}
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ background:filter===f.key?"#0f172a":"#f1f5f9", color:filter===f.key?"#fff":"#475569", border:"none", borderRadius:20, padding:"5px 12px", fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Matrix table */}
          {loading ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>No owner operators found.</div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Owner Operator","Standard COIs","Ronyx COIs","MA Morrison COIs","Dispatch","Settlement","Next Action","Actions"].map(h => (
                      <th key={h} style={{ padding:"8px 14px", fontSize:"0.62rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(oo => {
                    const stdSt  = groupCOIStatus(oo, "standard");
                    const rxSt   = groupCOIStatus(oo, "ronyx");
                    const mmSt   = groupCOIStatus(oo, "ma_morrison");
                    const disp   = dispatchStatus(oo);
                    const action = nextAction(oo);
                    const hasHold = oo.coi_documents.some(d => d.settlement_hold);

                    return (
                      <tr key={oo.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.85rem" }}>{oo.company_name}</div>
                          {oo.contact_name && <div style={{ fontSize:"0.7rem", color:"#64748b" }}>{oo.contact_name}</div>}
                        </td>
                        {([["standard",stdSt],["ronyx",rxSt],["ma_morrison",mmSt]] as [string,COIStatus][]).map(([g,st]) => {
                          const [bg,color] = STATUS_COLORS[st] || STATUS_COLORS.missing;
                          const types = COI_TYPES.filter(t => t.group === g);
                          const done  = types.filter(t => oo.coi_documents.find(d => d.document_type === t.value && d.status === "complete")).length;
                          return (
                            <td key={g} style={{ padding:"12px 14px" }}>
                              <span style={{ background:bg, color, padding:"3px 9px", borderRadius:20, fontSize:"0.65rem", fontWeight:800, display:"inline-block", marginBottom:4 }}>{STATUS_LABELS[st] || st}</span>
                              <div style={{ fontSize:"0.65rem", color:"#94a3b8" }}>{done}/{types.length} docs</div>
                            </td>
                          );
                        })}
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ background:disp.bg, color:disp.color, padding:"3px 9px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>{disp.label}</span>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          {hasHold
                            ? <span style={{ background:"#fff7ed", color:"#ea580c", padding:"3px 9px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>Hold</span>
                            : <span style={{ background:"#f0fdf4", color:"#15803d", padding:"3px 9px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>Clear</span>
                          }
                        </td>
                        <td style={{ padding:"12px 14px", fontSize:"0.72rem", color:"#475569", maxWidth:160 }}>{action}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                            <a href={`/ronyx/owner-operators?id=${oo.id}&tab=coi`} style={{ background:"#eff6ff", color:"#1d4ed8", padding:"4px 10px", borderRadius:6, fontSize:"0.65rem", fontWeight:700, textDecoration:"none", display:"inline-block" }}>Open COI Tab</a>
                            {stdSt !== "complete" && (
                              <button onClick={() => sendCOIRequest(oo, "standard")} style={{ background:"#fff1f2", color:"#dc2626", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Request Std COI</button>
                            )}
                            {rxSt !== "complete" && (
                              <button onClick={() => sendCOIRequest(oo, "ronyx")} style={{ background:"#f5f3ff", color:"#7c3aed", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Request Ronyx COI</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Guidance Panel */}
        <div style={{ width:260, flexShrink:0 }}>
          <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"16px 20px", position:"sticky", top:20 }}>
            <div style={{ fontWeight:800, color:"#f8fafc", marginBottom:4, fontSize:"0.9rem" }}>Staff Guidance</div>
            <div style={{ fontSize:"0.65rem", color:"#64748b", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Today&apos;s Priorities</div>
            {[
              { n:1, text:"Fix expired Standard COIs first — they block ALL dispatch.", color:"#dc2626" },
              { n:2, text:"Fix Ronyx Contractor COIs for OOs scheduled on Ronyx jobs.", color:"#7c3aed" },
              { n:3, text:"Fix MA Morrison COIs only when the OO is on MA Morrison work.", color:"#0891b2" },
              { n:4, text:"Print or email COI packets before granting dispatch approval.", color:"#15803d" },
            ].map(p => (
              <div key={p.n} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"flex-start" }}>
                <span style={{ background:p.color, color:"#fff", borderRadius:"50%", minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.6rem", fontWeight:900, flexShrink:0 }}>{p.n}</span>
                <span style={{ color:"#e2e8f0", fontSize:"0.75rem", lineHeight:1.4 }}>{p.text}</span>
              </div>
            ))}

            <div style={{ borderTop:"1px solid #1e293b", marginTop:14, paddingTop:14 }}>
              <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>COI Groups</div>
              {Object.entries(COI_GROUPS).map(([key, g]) => (
                <div key={key} style={{ marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:"0.72rem", color:g.color }}>{g.label}</div>
                  <div style={{ fontSize:"0.65rem", color:"#64748b" }}>{g.desc}</div>
                </div>
              ))}
            </div>

            {blocked > 0 && (
              <div style={{ background:"#fff1f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 12px", marginTop:12 }}>
                <div style={{ fontWeight:800, fontSize:"0.72rem", color:"#dc2626", marginBottom:4 }}>DISPATCH BLOCKED</div>
                <div style={{ fontSize:"0.7rem", color:"#dc2626" }}>{blocked} OO{blocked !== 1 ? "s" : ""} cannot be dispatched due to missing or expired COIs.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
