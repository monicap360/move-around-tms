"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TrackingUpdate {
  id: string;
  status: string;
  location?: string;
  notes?: string;
  created_at: string;
}

export default function TrackingPage() {
  const [updates, setUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const simpleMode = process.env.NEXT_PUBLIC_SIMPLE_MODE === "true";

  useEffect(() => {
    loadUpdates();
  }, []);

  async function loadUpdates() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracking/updates", { cache: "no-store" });
      const data = await res.json();
      setUpdates(data.updates || []);
    } catch (error) {
      console.error("Failed to load tracking updates", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUpdate() {
    if (!status || !location) return;
    try {
      const res = await fetch("/api/tracking/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, location }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add update");
      }
      setStatus("");
      setLocation("");
      await loadUpdates();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Tracking Updates
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Batch status updates across active loads.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Updates are not saved.
          </div>
        )}
        {simpleMode && (
          <div className="p-4 rounded border border-blue-300 bg-blue-50 text-blue-700 text-sm">
            Simple mode is enabled. Tracking is refresh-on-demand.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Post Update
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Input
              placeholder="Status (e.g., In Transit)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="max-w-sm"
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleAddUpdate} disabled={demoMode}>
              Add Update
            </Button>
            <Button variant="outline" onClick={loadUpdates}>
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : updates.length === 0 ? (
              <div className="text-text-secondary">No updates yet.</div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">{update.status}</div>
                      <div className="text-text-secondary text-xs">
                        {update.location || "Unknown location"}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(update.created_at).toLocaleString()}
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
