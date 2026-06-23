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

  useEffect(() => {
    async function loadCompany() {
      const { data: user } = await supabase.auth.getUser();
      const company =
        user?.user?.user_metadata?.company_code ||
        user?.user?.user_metadata?.company;
      if (company) setCompanyCode(company);
    }
    loadCompany();
  }, []);

  if (!companyCode) {
    return (
      <div style={{padding:16, color:'#B0B6BD'}}>Loading company navigation…</div>
    );
  }

  const base = `/company/${companyCode}`;
  const items = [
    'Dashboard','Dispatch','Tickets','FastScan','CrossCheck','Ticket Audit','Scale Reconciliation','Exception Center','Drivers','Fleet','Payroll','Billing','Reports','Audit Trail','Settings'
  ];

  return (
    <aside style={{width:240, backgroundColor:'#121417', color:'#EDEDED', height:'100vh', padding:16, borderRight:'1px solid #343A40'}}>
      <h1 style={{fontSize:16, fontWeight:800, marginBottom:12}}>RONYX TMS</h1>
      <nav style={{display:'flex', flexDirection:'column', gap:6}}>
        {items.map((name) => (
          <Link key={name} href={`${base}/${name.toLowerCase().replace(/\s+/g,'-')}`}>
            <div style={{padding:'8px 10px', cursor:'pointer', color:'#EDEDED'}}>{name}</div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
