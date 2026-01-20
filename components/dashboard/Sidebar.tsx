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
      <div className="p-4 text-gray-400 text-sm">
        Loading company navigation…
      </div>
    );
  }

  const base = `/company/${companyCode}`;

  const links = [
    { name: "Dashboard", href: `${base}/dashboard`, icon: "🏠" },
    { name: "Drivers", href: `${base}/drivers`, icon: "🚚" },
    { name: "Dispatch", href: `${base}/dispatch`, icon: "🗂️" },
    { name: "Tickets", href: `${base}/tickets`, icon: "🎫" },
    { name: "Fleet", href: `${base}/fleet`, icon: "🚛" },
    { name: "Payroll", href: `${base}/payroll`, icon: "💵" },
    { name: "Compliance", href: `${base}/compliance`, icon: "📋" },
    { name: "Settings", href: `${base}/settings`, icon: "⚙️" },
    { name: "FastScan", href: `/driver/fastscan`, icon: "📲" },
  ];

  return (
    <div className="w-64 bg-white shadow h-screen p-5">
      <h1 className="text-xl font-bold mb-6">MoveAround TMS</h1>
      <nav className="space-y-2">
        {links.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className="p-3 rounded hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <span>{item.icon}</span> {item.name}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
