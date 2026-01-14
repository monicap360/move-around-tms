"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ClientRecord {
  id: string;
  name: string;
  organization_code?: string;
  relationship_type: string;
  active: boolean;
}

export default function ThreePLClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientOrgId, setClientOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/3pl/clients", { cache: "no-store" });
      const data = await res.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to load clients", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient() {
    if (!clientOrgId) return;
    try {
      const res = await fetch("/api/3pl/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_organization_id: clientOrgId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add client");
      }
      setClientOrgId("");
      await loadClients();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            3PL Clients
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage multiple client organizations under your 3PL umbrella.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Changes are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Add Client Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex gap-4 flex-wrap">
            <Input
              placeholder="Client Organization ID"
              value={clientOrgId}
              onChange={(e) => setClientOrgId(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleAddClient} disabled={!clientOrgId || demoMode}>
              Add Client
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Client List
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : clients.length === 0 ? (
              <div className="text-text-secondary">No clients yet.</div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">
                        {client.name || "Unnamed Organization"}
                      </div>
                      <div className="text-text-secondary text-xs">
                        {client.organization_code || "No code"} • {client.relationship_type}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {client.active ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
