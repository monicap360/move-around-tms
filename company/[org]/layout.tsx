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
        return (
          <main
            className="movearound-grid-bg min-h-screen"
            style={{
              padding: "40px",
            }}
          >
            {children}
          </main>
        );
          style={{
