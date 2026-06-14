"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function Sidebar() {
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      const { data: user } = await supabase.auth.getUser();
      const company =
        user?.user?.user_metadata?.company_code ||
        user?.user?.user_metadata?.organization_code ||
        user?.user?.user_metadata?.company;
      if (company) setCompanyCode(company);
    }
    loadCompany();
  }, []);

  if (!companyCode) {
    return (
      <div style={{padding:16, color:'#B0B6BD', fontSize:13}}>
        Loading company navigation…
      </div>
    );
  }

  const base = `/company/${companyCode}`;
  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    fontSize: 14,
    color: '#EDEDED',
    cursor: 'pointer'
  };

  const sectionTitleStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#B0B6BD',
    letterSpacing: 1
  };

  return (
    <aside style={{width:240, backgroundColor:'#121417', height:'100vh', display:'flex', flexDirection:'column', borderRight:'1px solid #343A40'}}>
      <div style={{padding:16, flex:1, overflow:'auto'}}>
        <h1 style={{color:'#EDEDED', fontSize:16, fontWeight:700, marginBottom:12}}>RONYX TMS</h1>

        <div style={{display:'grid', gap:6}}>
          <Link href={`${base}/dashboard`}>
            <div style={itemStyle}>Dashboard</div>
          </Link>
          <Link href={`${base}/dispatch`}>
            <div style={itemStyle}>Dispatch</div>
          </Link>
          <Link href={`${base}/tickets`}>
            <div style={itemStyle}>Tickets</div>
          </Link>
          <Link href={`${base}/fast-scan`}>
            <div style={itemStyle}>FastScan</div>
          </Link>
          <Link href={`${base}/crosscheck`}>
            <div style={itemStyle}>CrossCheck</div>
          </Link>
          <Link href={`${base}/ticket-audit`}>
            <div style={itemStyle}>Ticket Audit</div>
          </Link>
          <Link href={`${base}/scale-reconciliation`}>
            <div style={itemStyle}>Scale Reconciliation</div>
          </Link>
          <Link href={`${base}/exception-center`}>
            <div style={itemStyle}>Exception Center</div>
          </Link>
          <Link href={`${base}/drivers`}>
            <div style={itemStyle}>Drivers</div>
          </Link>
          <Link href={`${base}/fleet`}>
            <div style={itemStyle}>Fleet</div>
          </Link>
          <Link href={`${base}/payroll`}>
            <div style={itemStyle}>Payroll</div>
          </Link>
          <Link href={`${base}/billing`}>
            <div style={itemStyle}>Billing</div>
          </Link>
          <Link href={`${base}/reports`}>
            <div style={itemStyle}>Reports</div>
          </Link>
          <Link href={`${base}/audit-trail`}>
            <div style={itemStyle}>Audit Trail</div>
          </Link>
          <div style={{height:8}} />
        </div>
      </div>

      <div style={{padding:12, borderTop:'1px solid #343A40'}}>
        <Link href={`${base}/settings`}>
          <div style={{...itemStyle, color:'#F5A623', fontWeight:600}}>Settings</div>
        </Link>
      </div>
    </aside>
  );
}
