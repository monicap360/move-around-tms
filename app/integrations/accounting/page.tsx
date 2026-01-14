"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface IntegrationStatus {
  provider: string;
  status: string;
}

const providers = [
  { id: "quickbooks", label: "QuickBooks Online" },
  { id: "xero", label: "Xero" },
];

export default function AccountingIntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    const res = await fetch("/api/integrations/connections", { cache: "no-store" });
    const data = await res.json();
    const map: Record<string, IntegrationStatus> = {};
    (data.connections || []).forEach((connection: IntegrationStatus) => {
      map[connection.provider] = connection;
    });
    setStatuses(map);
  }

  async function markPending(provider: string) {
    await fetch("/api/integrations/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, status: "pending" }),
    });
    await loadStatuses();
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Accounting Integrations
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Sync invoices, payments, and customer data to your accounting system.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Connections are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {providers.map((provider) => {
              const status = statuses[provider.id]?.status || "not_configured";
              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-3 rounded border border-space-border bg-space-surface"
                >
                  <div className="text-text-primary font-medium">{provider.label}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">
                      {status.replace("_", " ")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markPending(provider.id)}
                      disabled={demoMode}
                    >
                      Request Connect
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
