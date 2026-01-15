"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReconResult {
  id: string;
  ticket_number: string;
  status: string;
  quantity_variance_pct?: number | null;
  price_variance_pct?: number | null;
}

interface ReconException {
  id: string;
  exception_type: string;
  severity: string;
  explanation: string;
}

export default function AggregateReconciliationPage() {
  const [results, setResults] = useState<ReconResult[]>([]);
  const [exceptions, setExceptions] = useState<ReconException[]>([]);
  const [running, setRunning] = useState(false);
  const [thresholds, setThresholds] = useState({
    scaleTolerancePct: "2",
    moistureTolerancePct: "1",
    finesTolerancePct: "1",
    priceVariancePct: "5",
    deliveryWindowHours: "12",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const res = await fetch("/api/aggregates/reconciliation/results", {
      cache: "no-store",
    });
    const data = await res.json();
    setResults(data.results || []);
    setExceptions(data.exceptions || []);
  }

  async function runReconciliation() {
    setRunning(true);
    try {
      await fetch("/api/aggregates/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleTolerancePct: Number(thresholds.scaleTolerancePct || 2),
          moistureTolerancePct: Number(thresholds.moistureTolerancePct || 1),
          finesTolerancePct: Number(thresholds.finesTolerancePct || 1),
          priceVariancePct: Number(thresholds.priceVariancePct || 5),
          deliveryWindowHours: Number(thresholds.deliveryWindowHours || 12),
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
            Aggregate Reconciliation
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Match scale tickets, lab results, delivery proofs, and invoices.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Runs are simulated.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Run Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Input
              placeholder="Scale tolerance %"
              value={thresholds.scaleTolerancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, scaleTolerancePct: e.target.value })
              }
              className="max-w-[180px]"
            />
            <Input
              placeholder="Moisture tolerance %"
              value={thresholds.moistureTolerancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, moistureTolerancePct: e.target.value })
              }
              className="max-w-[200px]"
            />
            <Input
              placeholder="Fines tolerance %"
              value={thresholds.finesTolerancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, finesTolerancePct: e.target.value })
              }
              className="max-w-[180px]"
            />
            <Input
              placeholder="Price variance %"
              value={thresholds.priceVariancePct}
              onChange={(e) =>
                setThresholds({ ...thresholds, priceVariancePct: e.target.value })
              }
              className="max-w-[180px]"
            />
            <Input
              placeholder="Delivery window (hours)"
              value={thresholds.deliveryWindowHours}
              onChange={(e) =>
                setThresholds({ ...thresholds, deliveryWindowHours: e.target.value })
              }
              className="max-w-[220px]"
            />
            <Button onClick={runReconciliation} disabled={running}>
              {running ? "Running..." : "Run Reconciliation"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {results.length === 0 ? (
              <div className="text-text-secondary">No reconciliation results yet.</div>
            ) : (
              results.slice(0, 15).map((result) => (
                <div
                  key={result.id}
                  className="p-3 rounded border border-space-border bg-space-surface flex items-center justify-between"
                >
                  <div>
                    <div className="text-text-primary font-medium">
                      Ticket {result.ticket_number}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Status: {result.status}
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary text-right">
                    <div>Qty Var: {result.quantity_variance_pct?.toFixed(2) ?? "—"}%</div>
                    <div>Price Var: {result.price_variance_pct?.toFixed(2) ?? "—"}%</div>
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
