"use client";

import Link from "next/link";

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tesla-nebula min-h-screen flex">
      {/* SIDEBAR */}
      <aside
        className="glass-panel"
        style={{
          width: "260px",
          borderRight: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#00d4b3",
            textShadow: "0 0 12px rgba(0,212,179,0.7)",
            marginBottom: "32px",
          }}
        >
          MoveAround TMS
        </h1>

        <nav style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link className="glass-card lift" href="./dashboard">
            Dashboard
          </Link>
          <Link className="glass-card lift" href="./drivers">
            Drivers
          </Link>
          <Link className="glass-card lift" href="./fleet">
            Fleet
          </Link>
          <Link className="glass-card lift" href="./tickets">
            Tickets
          </Link>
          <Link className="glass-card lift" href="./payroll">
            Payroll
          </Link>
          <Link className="glass-card lift" href="./yard">
            Yard Ops
          </Link>
          <Link className="glass-card lift" href="./dispatch">
            Dispatch
          </Link>
          <Link className="glass-card lift" href="./settings">
            Settings
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className="movearound-grid-bg"
        style={{
          flexGrow: 1,
          padding: "40px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
