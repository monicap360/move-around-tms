"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function SalesDemoPage() {
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
        <Link
          href="/login"
          style={{
            background: "#F7931E",
            color: "black",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          Staff Login
        </Link>
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
              Sales Demo
            </h2>
            <p style={{ color: "#ccc", marginBottom: "1.5rem" }}>
              This is a public demo experience for sales — no login required.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <NavButton href="/aggregates" label="Aggregates Home" />
              <NavButton href="/exceptions" label="Exceptions (Top 5)" />
              <NavButton href="/revenue-risk" label="Revenue At Risk" />
              <NavButton href="/demo-redirect" label="Demo Script Flow" />
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
              What You Can Show
            </h3>
            <div style={{ color: "#ccc", lineHeight: 1.8 }}>
              <p style={{ marginBottom: 12 }}>
                ✅ Confidence indicator on a real-looking ticket
              </p>
              <p style={{ marginBottom: 12 }}>
                ✅ Exceptions list with impact ranking
              </p>
              <p style={{ marginBottom: 12 }}>
                ✅ Revenue at risk estimate
              </p>
              <p>
                ✅ Audit packet generator for dispute support
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

function NavButton({ href, label }: { href: string; label: string }) {
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
