"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CrossBorderAutomationPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/cross-border/status", { cache: "no-store" });
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
    } catch (error) {
      console.error("Failed to load cross-border status", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await fetch("/api/cross-border/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Cross-Border Automation
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Streamline US–Mexico documentation and compliance workflows.
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
              Mexico Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-text-primary font-medium">
                CFDI 4.0 + Carta Porte 3.0
              </div>
              <div className="text-text-secondary text-xs">
                Enable automation for cross-border document readiness.
              </div>
            </div>
            <Button onClick={toggleEnabled} disabled={demoMode || loading}>
              {enabled ? "Enabled" : "Enable"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Cross-Border Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 text-text-secondary text-sm">
            <div>✅ Validate carrier DOT/MC for cross-border lanes</div>
            <div>✅ Ensure Carta Porte fields are complete</div>
            <div>✅ Confirm CFDI receiver and tax regime</div>
            <div>✅ Track customs handoff timestamps</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
