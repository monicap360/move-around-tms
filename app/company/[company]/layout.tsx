import React from "react";
import Link from "next/link";

const navItems = [
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}`, label: "Overview" },
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}/dashboards`, label: "Dashboards" },
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}/fast-scan`, label: "Fast Scan" },
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}/compliance`, label: "Compliance" },
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}/drivers`, label: "Drivers" },
  { href: `/company/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '[company]'}/settings`, label: "Settings" },
];

export default function CompanyLayout({ children, params }: { children: React.ReactNode; params: { company: string } }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#f8f9fa", padding: 24, borderRight: "1px solid #eee" }}>
        <h2 style={{ fontWeight: 700, marginBottom: 32 }}>Company</h2>
        <nav>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {navItems.map((item) => (
              <li key={item.href} style={{ marginBottom: 18 }}>
                <Link href={item.href.replace('[company]', params.company)} style={{ textDecoration: "none", color: "#333", fontWeight: 500 }}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 40 }}>
        {children}
      </main>
    </div>
  );
}
