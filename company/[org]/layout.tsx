"use client";

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="movearound-grid-bg min-h-screen" style={{ padding: "40px" }}>
      {children}
    </div>
  );
}
