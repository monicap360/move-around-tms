"use client";

import Link from "next/link";

export default function MarketplaceHome() {
  return (
    <div className="p-10 flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-cyan-300">
        MoveAround Marketplace™
      </h1>
      <p className="opacity-70 max-w-2xl">
        Exchange loads, collaborate with partner fleets, compare rates, and
        streamline material deliveries across your network.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card href="/marketplace/browse" title="Browse Loads" emoji="📦" />
        <Card href="/marketplace/post" title="Post a Load" emoji="➕" />
        <Card href="/marketplace/partners" title="Partner Network" emoji="🤝" />
        <Card
          href="/marketplace/ai-rates"
          title="AI Rate Prediction"
          emoji="🧠"
        />
        <Card href="/marketplace/my-loads" title="My Loads" emoji="📋" />
      </div>
    </div>
  );
}

function Card({ href, title, emoji }: any) {
  return (
    <Link
      href={href}
      className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition flex flex-col gap-2"
    >
      <div className="text-4xl">{emoji}</div>
      <div className="font-semibold text-xl">{title}</div>
    </Link>
  );
}
