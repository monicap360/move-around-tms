
"use client";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* HEADER */}
      <header
        className="glass-panel"
        style={{
          width:  "100%",
          padding:  "20px",
          borderRadius: "20px",

        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight:  600,
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
