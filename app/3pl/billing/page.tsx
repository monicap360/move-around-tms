"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Profile {
  id: string;
  client_name: string;
  client_organization_id: string;
  billing_model: string;
  margin_rate: number;
  fee_rate: number;
  active: boolean;
}

interface Summary {
  client_name: string;
  total_billed: number;
  total_invoices: number;
  estimated_margin: number;
}

export default function ThreePLBillingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [formData, setFormData] = useState({
    client_organization_id: "",
    billing_model: "pass_through",
    margin_rate: "",
    fee_rate: "",
    terms: "",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/3pl/billing", { cache: "no-store" });
      const data = await res.json();
      setProfiles(data.profiles || []);
      setSummaries(data.summaries || []);
    } catch (error) {
      console.error("Failed to load 3PL billing data", error);
    }
  }

  async function handleSave() {
    try {
      const res = await fetch("/api/3pl/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_organization_id: formData.client_organization_id,
          billing_model: formData.billing_model,
          margin_rate: Number(formData.margin_rate) || 0,
          fee_rate: Number(formData.fee_rate) || 0,
          terms: formData.terms,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save billing profile");
      }
      setFormData({
        client_organization_id: "",
        billing_model: "pass_through",
        margin_rate: "",
        fee_rate: "",
        terms: "",
      });
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            3PL Billing
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Configure client billing models and track margin performance.
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
              Billing Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Client Organization ID"
              value={formData.client_organization_id}
              onChange={(e) =>
                setFormData({ ...formData, client_organization_id: e.target.value })
              }
            />
            <select
              className="px-3 py-2 rounded border border-space-border bg-space-surface text-text-primary"
              value={formData.billing_model}
              onChange={(e) => setFormData({ ...formData, billing_model: e.target.value })}
            >
              <option value="pass_through">Pass Through</option>
              <option value="margin">Margin %</option>
              <option value="percent">Fee %</option>
            </select>
            <Input
              placeholder="Margin Rate (%)"
              value={formData.margin_rate}
              onChange={(e) => setFormData({ ...formData, margin_rate: e.target.value })}
            />
            <Input
              placeholder="Fee Rate (%)"
              value={formData.fee_rate}
              onChange={(e) => setFormData({ ...formData, fee_rate: e.target.value })}
            />
            <Input
              placeholder="Billing Terms"
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button
                onClick={handleSave}
                disabled={!formData.client_organization_id || demoMode}
              >
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Client Billing Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {profiles.length === 0 ? (
              <div className="text-text-secondary">No profiles yet.</div>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 rounded border border-space-border bg-space-surface"
                >
                  <div className="text-text-primary font-medium">
                    {profile.client_name}
                  </div>
                  <div className="text-text-secondary text-xs">
                    {profile.billing_model} • Margin {profile.margin_rate || 0}% • Fee {profile.fee_rate || 0}%
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Client Profitability Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {summaries.length === 0 ? (
              <div className="text-text-secondary">No billing activity yet.</div>
            ) : (
              summaries.map((summary) => (
                <div
                  key={summary.client_name}
                  className="p-3 rounded border border-space-border bg-space-surface flex items-center justify-between"
                >
                  <div>
                    <div className="text-text-primary font-medium">
                      {summary.client_name}
                    </div>
                    <div className="text-text-secondary text-xs">
                      {summary.total_invoices} invoices
                    </div>
                  </div>
                  <div className="text-right text-xs text-text-secondary">
                    <div>Total: ${summary.total_billed.toFixed(0)}</div>
                    <div>Margin: ${summary.estimated_margin.toFixed(0)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
