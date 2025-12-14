"use client";

import "@/app/theme/GlobalStyles.css";
import "@/app/theme/TeslaNebula.css";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="tesla-nebula min-h-screen"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* HEADER */}
      <header
        className="glass-panel neon-teal"
        style={{
          width: "100%",
          padding: "20px",
          borderRadius: "20px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#00d4b3",
            }}
          >
            Driver HUD
          </h2>
          <p style={{ opacity: 0.7 }}>MoveAround Tesla Experience</p>
        </div>

        <div>
          <p style={{ textAlign: "right", opacity: 0.75 }}>
            Logged in as Driver
          </p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
