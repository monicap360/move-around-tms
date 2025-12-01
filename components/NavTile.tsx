import React from "react";

export default function NavTile({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="glass-card lift"
      style={{
        padding: "16px",
        textAlign: "center",
        fontSize: "18px",
        fontWeight: 500,
        color: "white",
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}
