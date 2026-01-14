"use client";

import Link from "next/link";

const actions = [
  { label: "Upload Ticket", href: "/aggregates/upload" },
  { label: "View Exceptions", href: "/exceptions" },
  { label: "Revenue at Risk", href: "/revenue-risk" },
  { label: "Tracking Updates", href: "/tracking" },
  { label: "Driver Documents", href: "/documents" },
];

export default function MobileQuickActions() {
  return (
    <div className="min-h-screen bg-space-deep p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary uppercase tracking-wider">
        Mobile Quick Actions
      </h1>
      <p className="text-text-secondary text-sm">
        Tap a card to jump directly to the task.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-lg border border-space-border bg-space-panel p-4 text-text-primary font-medium"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
