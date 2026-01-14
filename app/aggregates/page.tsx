import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AggregatesPage() {
  // Create Supabase client for server-side authentication
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  // Check authentication
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    redirect("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: "2rem",
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
        Aggregates
      </h1>
      <p style={{ fontSize: 20, color: "#475569", marginBottom: 40 }}>
        Manage tickets, quotes, invoices, material rates, and profit reports
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          width: "100%",
          maxWidth: 1000,
          marginBottom: 40,
        }}
      >
        <NavButton href="/aggregates/upload" label="Upload Ticket" color="#2563eb" />
        <NavButton href="/admin/review-tickets" label="Review Tickets" color="#059669" />
        <NavButton href="/aggregates/profit-reports" label="Profit Reports" color="#f59e42" />
        <NavButton href="/aggregates/quotes" label="Quote Management" color="#a21caf" />
        <NavButton href="/admin/material-rates" label="Material & Rates" color="#dc2626" />
        <NavButton href="/aggregates/quote-requests" label="Quote Requests" color="#0ea5e9" />
        <NavButton href="/aggregates/invoices" label="Invoices" color="#0f766e" />
        <NavButton href="/aggregates/tickets" label="Tickets" color="#64748b" />
      </div>
      <div
        style={{
          maxWidth: 800,
          width: "100%",
          padding: "2rem",
          background: "white",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: "#1e293b" }}>
          Automatic Ticket Processing
        </h2>
        <div style={{ color: "#475569", lineHeight: 1.8 }}>
          <p style={{ marginBottom: 12 }}>
            📸 <strong>Upload any scanner output:</strong> Take photos with your
            phone or upload PDFs from document scanners
          </p>
          <p style={{ marginBottom: 12 }}>
            🤖 <strong>AI-powered OCR:</strong> Automatically extracts partner,
            material, quantity, ticket number, and driver
          </p>
          <p style={{ marginBottom: 12 }}>
            💰 <strong>Auto-calculation:</strong> System calculates pay based on
            partner rates and material types
          </p>
          <p>
            ✅ <strong>Manager review:</strong> All tickets go to "Pending
            Manager Review" for approval before payroll
          </p>
        </div>
      </div>
      <footer style={{ color: "#94a3b8", fontSize: 14, marginTop: 40 }}>
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
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
    >
      {label}
    </Link>
  );
}
