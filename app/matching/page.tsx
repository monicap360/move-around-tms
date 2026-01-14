"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MatchRecord {
  id: string;
  material_number: string;
  batch_lot?: string | null;
  status: string;
  variance_pct?: number | null;
  price_variance_pct?: number | null;
}

interface MatchException {
  id: string;
  exception_type: string;
  severity: string;
  explanation: string;
}

export default function MatchingPage() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [exceptions, setExceptions] = useState<MatchException[]>([]);
  const [running, setRunning] = useState(false);
  const [thresholds, setThresholds] = useState({
    quantityVariancePct: "2",
    priceVariancePct: "5",
    deliveryWindowDays: "7",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const res = await fetch("/api/matching/results", { cache: "no-store" });
    const data = await res.json();
    setRecords(data.records || []);
    setExceptions(data.exceptions || []);
  }

  async function runMatching() {
    setRunning(true);
    try {
      await fetch("/api/matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityVariancePct: Number(thresholds.quantityVariancePct || 2),
          priceVariancePct: Number(thresholds.priceVariancePct || 5),
          deliveryWindowDays: Number(thresholds.deliveryWindowDays || 7),
        }),
      });
      await loadResults();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Matching & Reconciliation
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Match PIT, receipts, invoices, and POs with exception tracking.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Matching runs are simulated.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Run Matching
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Input
              placeholder="Qty variance %"
              value={thresholds.quantityVariancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, quantityVariancePct: e.target.value })
              }
              className="max-w-[160px]"
            />
            <Input
              placeholder="Price variance %"
              value={thresholds.priceVariancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, priceVariancePct: e.target.value })
              }
              className="max-w-[160px]"
            />
            <Input
              placeholder="Delivery window (days)"
              value={thresholds.deliveryWindowDays}
              onChange={(e) =>
                setThresholds({ ...thresholds, deliveryWindowDays: e.target.value })
              }
              className="max-w-[200px]"
            />
            <Button onClick={runMatching} disabled={running}>
              {running ? "Running..." : "Run Matching"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {records.length === 0 ? (
              <div className="text-text-secondary">No matches yet.</div>
            ) : (
              records.slice(0, 15).map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded border border-space-border bg-space-surface flex items-center justify-between"
                >
                  <div>
                    <div className="text-text-primary font-medium">
                      {record.material_number} {record.batch_lot ? `• ${record.batch_lot}` : ""}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Status: {record.status}
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary text-right">
                    <div>Qty Var: {record.variance_pct?.toFixed(2) ?? "—"}%</div>
                    <div>Price Var: {record.price_variance_pct?.toFixed(2) ?? "—"}%</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {exceptions.length === 0 ? (
              <div className="text-text-secondary">No exceptions detected.</div>
            ) : (
              exceptions.slice(0, 10).map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 rounded border border-space-border bg-space-surface"
                >
                  <div className="text-text-primary font-medium">
                    {ex.exception_type} • {ex.severity}
                  </div>
                  <div className="text-xs text-text-secondary">{ex.explanation}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
