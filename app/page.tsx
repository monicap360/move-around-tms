import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        Move Around TMS
      </h1>
      <p style={{ fontSize: 20, color: "#475569", marginBottom: 40 }}>
        Welcome! Choose a section to get started:
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          width: "100%",
          maxWidth: 800,
          marginBottom: 40,
        }}
      >
        <NavButton href="/dashboard" label="Dashboard" color="#2563eb" />
        <NavButton href="/tickets" label="Tickets" color="#059669" />
        <NavButton href="/drivers" label="Drivers" color="#f59e42" />
        <NavButton href="/fleet" label="Fleet" color="#a21caf" />
        <NavButton href="/payroll" label="Payroll" color="#dc2626" />
        <NavButton href="/finance" label="Finance" color="#0ea5e9" />
        <NavButton href="/dispatch" label="Dispatch" color="#0ea5e9" />
        <NavButton
          href="/reports/excel-tab"
          label="Reports & Excel"
          color="#0f766e"
        />
        <NavButton href="/settings" label="Settings" color="#64748b" />
      </div>
      <footer style={{ color: "#94a3b8", fontSize: 14 }}>
        © {new Date().getFullYear()} Move Around TMS
      </footer>
    </div>
  );
}

function NavButton({
  href,
  label,
  color,
}: {
  href: string;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 80,
        background: color,
        color: "white",
        borderRadius: 14,
        fontSize: 22,
        fontWeight: 600,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
        transition: "background 0.2s",
      }}
    >
      {label}
    </Link>
  );
}
