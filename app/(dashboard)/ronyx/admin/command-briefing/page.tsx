"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Briefing = {
  date: string;
  dispatch: { import_date: string | null; import_name: string | null; total_rows: number; blocked: number; needs_docs: number; ready: number; missing_driver_truck: number };
  compliance: { open_alerts: number; critical_alerts: number; active_overrides: number; expiring_overrides: number; expiring_override_details: any[] };
  fleet: { trucks_oos: number; oos_trucks: any[] };
  payroll: { holds: number; billing_ready: number };
  staff: { on_shift: number; on_shift_list: any[] };
  activity: { recent_changes: number };
  recommended: { text: string; href: string; icon: string } | null;
};

type ModuleHealth = { label: string; icon: string; value: number; color: string; bg: string; border: string; href: string; unit?: string };

function greeting(date: string) {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HealthDot({ count, max = 1 }: { count: number; max?: number }) {
  if (count === 0)    return <span style={{ width:10, height:10, borderRadius:"50%", background:"#16a34a", display:"inline-block" }} />;
  if (count <= max)   return <span style={{ width:10, height:10, borderRadius:"50%", background:"#ca8a04", display:"inline-block" }} />;
  return <span style={{ width:10, height:10, borderRadius:"50%", background:"#dc2626", display:"inline-block" }} />;
}

function KpiCard({ label, value, color, bg, border, href, icon, unit }: ModuleHealth) {
  return (
    <Link href={href} style={{ textDecoration:"none" }}>
      <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"box-shadow 0.15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 10px rgba(0,0,0,0.08)"}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow="none"}>
        <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
        <div style={{ fontSize:24, fontWeight:900, color }}>{typeof value === "number" ? value.toLocaleString() : value}{unit && <span style={{ fontSize:13, fontWeight:600, marginLeft:2 }}>{unit}</span>}</div>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 }}>{label}</div>
      </div>
    </Link>
  );
}

export default function CommandBriefingPage() {
  const [data,    setData]    = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [name]                = useState("Monica");

  useEffect(() => {
    fetch("/api/ronyx/admin/command-briefing").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding:40, fontFamily:"'Inter','Segoe UI',sans-serif", color:"#64748b", textAlign:"center" }}>
      <div style={{ fontSize:28, marginBottom:12 }}>☕</div>
      Loading today's briefing…
    </div>
  );

  if (!data) return <div style={{ padding:40, color:"#dc2626", fontFamily:"'Inter','Segoe UI',sans-serif" }}>Could not load briefing data.</div>;

  const { dispatch: d, compliance: c, fleet: f, payroll: p, staff: s } = data;

  const modules: ModuleHealth[] = [
    { label:"Dispatch Blocked",   icon:"🚨", value: d.blocked,             color: d.blocked > 0      ? "#dc2626" : "#16a34a", bg: d.blocked > 0      ? "#fee2e2" : "#f0fdf4", border: d.blocked > 0      ? "#fca5a5" : "#86efac", href:"/ronyx/dispatch/daily-import" },
    { label:"Missing Driver/Truck",icon:"👤", value: d.missing_driver_truck, color: d.missing_driver_truck > 0 ? "#ea580c" : "#16a34a", bg: d.missing_driver_truck > 0 ? "#ffedd5" : "#f0fdf4", border: d.missing_driver_truck > 0 ? "#fdba74" : "#86efac", href:"/ronyx/dispatch/daily-import" },
    { label:"Compliance Alerts",  icon:"🛡️", value: c.open_alerts,         color: c.critical_alerts > 0 ? "#dc2626" : c.open_alerts > 0 ? "#ca8a04" : "#16a34a", bg: c.critical_alerts > 0 ? "#fee2e2" : c.open_alerts > 0 ? "#fef9c3" : "#f0fdf4", border: c.critical_alerts > 0 ? "#fca5a5" : c.open_alerts > 0 ? "#fde68a" : "#86efac", href:"/ronyx/compliance" },
    { label:"Expiring Overrides", icon:"⏰", value: c.expiring_overrides,  color: c.expiring_overrides > 0 ? "#ca8a04" : "#16a34a", bg: c.expiring_overrides > 0 ? "#fef9c3" : "#f0fdf4", border: c.expiring_overrides > 0 ? "#fde68a" : "#86efac", href:"/ronyx/compliance" },
    { label:"Payroll Holds",      icon:"💰", value: p.holds,               color: p.holds > 0        ? "#ca8a04" : "#16a34a", bg: p.holds > 0        ? "#fef9c3" : "#f0fdf4", border: p.holds > 0        ? "#fde68a" : "#86efac", href:"/ronyx/payroll" },
    { label:"Billing Ready",      icon:"📄", value: p.billing_ready,       color: p.billing_ready > 0 ? "#1d4ed8" : "#64748b", bg: p.billing_ready > 0 ? "#eff6ff" : "#f8fafc", border: p.billing_ready > 0 ? "#bfdbfe" : "#e2e8f0", href:"/ronyx/payroll?filter=billing" },
    { label:"Trucks Out of Svc",  icon:"🔧", value: f.trucks_oos,          color: f.trucks_oos > 0   ? "#dc2626" : "#16a34a", bg: f.trucks_oos > 0   ? "#fee2e2" : "#f0fdf4", border: f.trucks_oos > 0   ? "#fca5a5" : "#86efac", href:"/ronyx/maintenance" },
    { label:"Staff On Shift",     icon:"👥", value: s.on_shift,            color: s.on_shift > 0     ? "#1d4ed8" : "#94a3b8", bg: "#eff6ff", border:"#bfdbfe", href:"/ronyx/settings/users" },
  ];

  const totalIssues = d.blocked + d.missing_driver_truck + c.critical_alerts + c.expiring_overrides + p.holds + f.trucks_oos;

  const quickActions = [
    { label:"Start Day",            icon:"🚀", href:"/ronyx",                           color:"#1e40af", bg:"#eff6ff" },
    { label:"Dispatch Board",       icon:"📋", href:"/ronyx/dispatch/board",            color:"#2563eb", bg:"#eff6ff" },
    { label:"Review Dispatch Blocks",icon:"🚨",href:"/ronyx/dispatch/daily-import",     color:"#dc2626", bg:"#fee2e2" },
    { label:"Missing Docs",         icon:"📄", href:"/ronyx/compliance",                color:"#ca8a04", bg:"#fef9c3" },
    { label:"Payroll Holds",        icon:"💰", href:"/ronyx/payroll",                   color:"#16a34a", bg:"#f0fdf4" },
    { label:"Admin Control Center", icon:"⚙️", href:"/ronyx/settings",                  color:"#475569", bg:"#f8fafc" },
  ];

  return (
    <div style={{ padding:"28px 32px", fontFamily:"'Inter','Segoe UI',sans-serif", maxWidth:1200, margin:"0 auto" }}>

      {/* Greeting */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:"1.6rem", fontWeight:900, color:"#0f172a", letterSpacing:"-0.6px" }}>
          {greeting(data.date)}, {name}.
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>
          {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
          {d.import_name && <span style={{ marginLeft:10, padding:"2px 10px", background:"#eff6ff", color:"#1d4ed8", borderRadius:6, fontSize:11, fontWeight:700 }}>Latest: {d.import_name}</span>}
        </div>
      </div>

      {/* Recommended First Action */}
      {data.recommended && (
        <div style={{ border:"2px solid " + (totalIssues > 0 ? "#dc2626" : "#16a34a"), borderRadius:14, background: totalIssues > 0 ? "#fff5f5" : "#f0fdf4", padding:"18px 22px", marginBottom:22, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <span style={{ fontSize:28, flexShrink:0 }}>{data.recommended.icon}</span>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:11, fontWeight:800, color: totalIssues > 0 ? "#dc2626" : "#16a34a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>
              Recommended First Action
            </div>
            <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{data.recommended.text}</div>
          </div>
          <Link href={data.recommended.href}>
            <button style={{ padding:"10px 22px", borderRadius:9, border:"none", background: totalIssues > 0 ? "#dc2626" : "#16a34a", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              Go Fix It →
            </button>
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12, marginBottom:24 }}>
        {modules.map(m => <KpiCard key={m.label} {...m} />)}
      </div>

      {/* Dispatch summary */}
      {d.total_rows > 0 && (
        <div style={{ border:"1px solid #e2e8f0", borderRadius:14, background:"#fff", padding:"18px 22px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:"#0f172a" }}>📋 Latest Dispatch Import</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{d.import_name} · {d.import_date}</div>
            </div>
            <Link href="/ronyx/dispatch/daily-import">
              <button style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#0f172a", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Open Import →
              </button>
            </Link>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { label:"Total Rows",          value:d.total_rows,             color:"#0f172a", bg:"#f8fafc", border:"#e2e8f0" },
              { label:"Ready",               value:d.ready,                  color:"#16a34a", bg:"#f0fdf4", border:"#86efac" },
              { label:"Needs Docs",          value:d.needs_docs,             color:"#ca8a04", bg:"#fef9c3", border:"#fde68a" },
              { label:"Blocked",             value:d.blocked,                color:"#dc2626", bg:"#fee2e2", border:"#fca5a5" },
              { label:"Missing Driver/Truck",value:d.missing_driver_truck,   color:"#ea580c", bg:"#ffedd5", border:"#fdba74" },
            ].map(s => (
              <div key={s.label} style={{ flex:"1 1 100px", background:s.bg, border:`1px solid ${s.border}`, borderRadius:9, padding:"10px 12px", textAlign:"center", minWidth:90 }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring overrides warning */}
      {c.expiring_override_details?.length > 0 && (
        <div style={{ border:"1px solid #fde68a", borderRadius:12, background:"#fef9c3", padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#92400e", marginBottom:10 }}>⏰ Overrides Expiring Within 7 Days</div>
          {c.expiring_override_details.map((ov: any) => (
            <div key={ov.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #fde68a", fontSize:12 }}>
              <span style={{ color:"#0f172a", fontWeight:600 }}>{ov.document_type} — {ov.customer_name || "General"}</span>
              <span style={{ color:"#92400e", fontWeight:700 }}>Expires {ov.override_expires_at?.slice(0, 10)}</span>
            </div>
          ))}
          <Link href="/ronyx/compliance">
            <button style={{ marginTop:10, padding:"6px 14px", borderRadius:7, border:"none", background:"#92400e", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              Renew Overrides →
            </button>
          </Link>
        </div>
      )}

      {/* Trucks OOS */}
      {f.oos_trucks?.length > 0 && (
        <div style={{ border:"1px solid #fca5a5", borderRadius:12, background:"#fee2e2", padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#991b1b", marginBottom:10 }}>🔧 Trucks Out of Service</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {f.oos_trucks.map((t: any) => (
              <span key={t.id} style={{ padding:"4px 12px", borderRadius:6, background:"#fff", border:"1px solid #fca5a5", fontSize:12, fontWeight:700, color:"#991b1b" }}>
                Truck {t.truck_number}
              </span>
            ))}
          </div>
          <Link href="/ronyx/maintenance">
            <button style={{ marginTop:10, padding:"6px 14px", borderRadius:7, border:"none", background:"#991b1b", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              View Maintenance →
            </button>
          </Link>
        </div>
      )}

      {/* Staff on shift */}
      {s.on_shift_list?.length > 0 && (
        <div style={{ border:"1px solid #bfdbfe", borderRadius:12, background:"#eff6ff", padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#1e40af", marginBottom:10 }}>👥 Staff On Shift ({s.on_shift})</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {s.on_shift_list.map((u: any) => (
              <span key={u.id} style={{ padding:"4px 12px", borderRadius:6, background:"#fff", border:"1px solid #bfdbfe", fontSize:12, fontWeight:600, color:"#1e40af" }}>
                {u.full_name} <span style={{ fontSize:10, color:"#64748b" }}>{u.role_name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ border:"1px solid #e2e8f0", borderRadius:14, background:"#fff", padding:"18px 22px" }}>
        <div style={{ fontWeight:800, fontSize:13, color:"#0f172a", marginBottom:14 }}>Quick Actions</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10 }}>
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", background:a.bg, border:`1px solid ${a.color}22`, borderRadius:10, cursor:"pointer", transition:"box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow="none"}>
                <span style={{ fontSize:20 }}>{a.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:a.color }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
