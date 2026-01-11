"use client";

import Link from "next/link";

export default function PlantDetail({ params }: any) {
  const { organization_code, plant_id } = params;

  return (
    <div className="p-10 flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-cyan-300">Plant Details</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Tile href="upload-csv" title="Upload Tickets CSV" emoji="📄" />
        <Tile href="contracts" title="Contracts" emoji="📑" />
        <Tile href="invoices" title="Invoices" emoji="🧾" />
        <Tile href="reconciliation" title="Reconciliation" emoji="⚖️" />
        <Tile href="materials" title="Material Rates" emoji="🏗️" />
      </div>
    </div>
  );
}

function Tile({ href, title, emoji }: any) {
  return (
    <Link
      href={href}
      className="glass-card p-6 rounded-2xl text-center hover:scale-[1.02] transition"
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="font-semibold">{title}</div>
    </Link>
  );
}
