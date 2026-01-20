import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function AggregatesPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demoMode) {
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

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      redirect("/login");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #000000 70%, #F7931E 100%)",
        color: "white",
        fontFamily: "Poppins, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          background: "rgba(0, 0, 0, 0.9)",
          padding: "1rem 2rem",
          borderBottom: "2px solid #F7931E",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/ronyx_logo.png"
            alt="Ronyx Logo"
            style={{ height: "60px", marginRight: "1rem" }}
          />
          <div>
            <h1 style={{ margin: 0, color: "#F7931E", fontSize: "1.8rem" }}>
              Ronyx Fleet Portal
            </h1>
            <p style={{ margin: 0, color: "#ccc", fontSize: "0.9rem" }}>
              Powered by Move Around TMS™
            </p>
          </div>
        </div>
      </header>

      <main style={{ padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              padding: "2rem",
              borderRadius: "15px",
              boxShadow: "0 0 25px rgba(247, 147, 30, 0.3)",
              marginBottom: "2rem",
              border: "1px solid #F7931E",
            }}
          >
            <h2 style={{ color: "#F7931E", marginBottom: "0.75rem" }}>
              Aggregates Demo
            </h2>
            <p style={{ color: "#ccc", marginBottom: "1.5rem" }}>
              Manage tickets, quotes, invoices, material rates, and profit reports
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <NavButton href="/aggregates/upload" label="Upload Ticket" />
              <NavButton href="/admin/review-tickets" label="Review Tickets" />
              <NavButton href="/aggregates/profit-reports" label="Profit Reports" />
              <NavButton href="/aggregates/quotes" label="Quote Management" />
              <NavButton href="/admin/material-rates" label="Material & Rates" />
              <NavButton href="/aggregates/quote-requests" label="Quote Requests" />
              <NavButton href="/aggregates/invoices" label="Invoices" />
              <NavButton href="/aggregates/tickets" label="Tickets" />
            </div>
          </div>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              padding: "1.5rem",
              borderRadius: "10px",
              border: "1px solid #F7931E",
            }}
          >
            <h3 style={{ color: "#F7931E", marginBottom: "1rem" }}>
              Automatic Ticket Processing
            </h3>
            <div style={{ color: "#ccc", lineHeight: 1.8 }}>
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
                ✅ <strong>Manager review:</strong> All tickets go to &quot;Pending
                Manager Review&quot; for approval before payroll
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer
        style={{
          background: "rgba(0, 0, 0, 0.9)",
          padding: "1rem",
          textAlign: "center",
          borderTop: "1px solid #F7931E",
          marginTop: "auto",
        }}
      >
        <p style={{ margin: 0, color: "#ccc" }}>
          Ronyx Fleet Management Portal • Powered by Move Around TMS™
        </p>
      </footer>
    </div>
  );
}

function NavButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 60,
        background: "transparent",
        color: "#F7931E",
        borderRadius: 8,
        fontSize: 18,
        fontWeight: 600,
        textDecoration: "none",
        border: "1px solid #F7931E",
        boxShadow: "0 0 12px rgba(247, 147, 30, 0.25)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F7931E";
        e.currentTarget.style.color = "black";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#F7931E";
      }}
    >
      {label}
    </Link>
  );
}
