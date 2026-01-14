"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WorkflowTicket {
  id: string;
  department: string;
  title: string;
  description?: string | null;
  status: string;
  created_at: string;
}

export default function PlantOpsWorkflowPage() {
  const [tickets, setTickets] = useState<WorkflowTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows/plant-ops", { cache: "no-store" });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Failed to load workflow tickets", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/workflows/plant-ops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await loadTickets();
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Plant Ops Workflow
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Departmental tickets generated from matching and Excel exceptions.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Status changes are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Exception Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="text-text-secondary">No workflow tickets found.</div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 rounded border border-space-border bg-space-surface"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-text-primary font-medium">
                        {ticket.title}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {ticket.department} • {ticket.status}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(ticket.id, "in_review")}
                        disabled={demoMode}
                      >
                        In Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(ticket.id, "resolved")}
                        disabled={demoMode}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                  {ticket.description && (
                    <div className="text-xs text-text-secondary mt-2">
                      {ticket.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
