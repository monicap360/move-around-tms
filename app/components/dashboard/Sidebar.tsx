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
      <div className="p-4 text-gray-400 text-sm">
        Loading company navigation…
      </div>
    );
  }

  const base = `/company/${companyCode}`;
  // Helper for active link styling (optional: can add usePathname for highlight)
  const linkClass =
    "flex items-center px-3 py-2 text-sm rounded transition-colors text-slate-700 hover:bg-gray-100 hover:text-black";

  return (
    <aside className="w-60 bg-white shadow h-screen flex flex-col border-r border-slate-200">
      <div className="p-4 space-y-6 flex-1">
        <h1 className="text-xl font-bold mb-6">MoveAround TMS</h1>
        {/* PRIMARY */}
        <div className="space-y-1">
          <Link href={`${base}/fast-scan`}>
            <div className={linkClass}>Fast Scan</div>
          </Link>
          <Link href={`${base}/dashboards`}>
            <div className={linkClass}>Dashboard</div>
          </Link>
          <Link href={`${base}/alerts`}>
            <div className={linkClass}>Alerts</div>
          </Link>
        </div>

        {/* ANALYTICS */}
        <div>
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className="w-full text-left px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400"
          >
            Analytics
          </button>
          {showAnalytics && (
            <div className="mt-1 space-y-1">
              <Link href={`${base}/dashboards/trends`}>
                <div className={linkClass}>Trends</div>
              </Link>
              <Link href={`${base}/dashboards/sla`}>
                <div className={linkClass}>SLA</div>
              </Link>
              <Link href={`${base}/dashboards/risk`}>
                <div className={linkClass}>Risk</div>
              </Link>
            </div>
          )}
        </div>

        {/* COMPLIANCE */}
        <div>
          <button
            onClick={() => setShowCompliance((v) => !v)}
            className="w-full text-left px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400"
          >
            Compliance
          </button>
          {showCompliance && (
            <div className="mt-1 space-y-1">
              <Link href={`${base}/compliance`}>
                <div className={linkClass}>Compliance</div>
              </Link>
              <Link href={`${base}/documents`}>
                <div className={linkClass}>Documents</div>
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* FOOTER */}
      <div className="p-4 border-t border-slate-200">
        <Link href={`${base}/settings`}>
          <div className={linkClass}>Settings</div>
        </Link>
      </div>
    </aside>
  );
}
