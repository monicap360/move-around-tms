"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ExecutiveReportsPage() {
  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Executive Reports
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            High-level insights for leadership review.
          </p>
        </div>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Key Dashboards
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              className="p-4 rounded border border-space-border bg-space-surface text-text-primary"
              href="/analytics/roi-dashboard"
            >
              ROI Dashboard
            </Link>
            <Link
              className="p-4 rounded border border-space-border bg-space-surface text-text-primary"
              href="/revenue-risk"
            >
              Revenue at Risk
            </Link>
            <Link
              className="p-4 rounded border border-space-border bg-space-surface text-text-primary"
              href="/exceptions"
            >
              Exception Queue
            </Link>
            <Link
              className="p-4 rounded border border-space-border bg-space-surface text-text-primary"
              href="/reports"
            >
              Full Reports Hub
            </Link>
            <Link
              className="p-4 rounded border border-space-border bg-space-surface text-text-primary"
              href="/3pl/billing"
            >
              3PL Billing Summary
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
