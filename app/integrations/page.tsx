import MarketingShell from "../components/MarketingShell";

export default function IntegrationsPage() {
  return (
    <MarketingShell
      eyebrow="Integration Hub"
      title="We Connect to Your Existing Tools"
      subtitle="MoveAround plugs into your accounting, telematics, scale house, and load board stack."
      ctaText="Request an Integration Review"
      ctaHref="mailto:sales@movearoundtms.com?subject=Integration%20Review"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Accounting",
            body: "QuickBooks, Xero, Sage",
            flow: "Load Data → MoveAround → Invoice Sync",
          },
          {
            title: "Telematics",
            body: "Samsara, Geotab, Motive",
            flow: "GPS + ELD → MoveAround → Live Status",
          },
          {
            title: "Scale House",
            body: "Command Alkon, TicketSys, Custom",
            flow: "Scale Ticket → MoveAround → AccuriScale",
          },
          {
            title: "Load Boards",
            body: "DAT, Truckstop, Private Boards",
            flow: "Available Loads → MoveAround → Dispatch",
          },
          {
            title: "ELD Providers",
            body: "Omnitracs, KeepTruckin",
            flow: "Hours of Service → MoveAround → Scheduling",
          },
        ].map((item) => (
          <div key={item.title} className="marketing-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <p>
              <strong>Data flow:</strong> {item.flow}
            </p>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface IntegrationStatus {
  provider: string;
  status: string;
  last_synced_at?: string | null;
}

const providers = [
  { id: "motive", label: "Motive (KeepTruckin)", path: "/integrations/eld" },
  { id: "geotab", label: "Geotab", path: "/integrations/eld" },
  { id: "quickbooks", label: "QuickBooks", path: "/integrations/accounting" },
  { id: "xero", label: "Xero", path: "/integrations/accounting" },
  { id: "dat", label: "DAT Load Board", path: "/integrations/marketplaces" },
  { id: "truckstop", label: "Truckstop", path: "/integrations/marketplaces" },
];

export default function IntegrationsHub() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/connections", { cache: "no-store" });
      const data = await res.json();
      const map: Record<string, IntegrationStatus> = {};
      (data.connections || []).forEach((connection: IntegrationStatus) => {
        map[connection.provider] = connection;
      });
      setStatuses(map);
    } catch (error) {
      console.error("Failed to load integration statuses", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Integrations
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Connect critical systems for ELD, accounting, and carrier marketplaces.
          </p>
        </div>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => {
                  const status = statuses[provider.id]?.status || "not_configured";
                  return (
                    <Link
                      key={provider.id}
                      href={provider.path}
                      className="p-4 rounded border border-space-border bg-space-surface text-text-primary flex items-center justify-between"
                    >
                      <div>{provider.label}</div>
                      <span className="text-xs text-text-secondary">
                        {status.replace("_", " ")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
