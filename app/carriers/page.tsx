"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Carrier {
  id: string;
  name: string;
  mc_number?: string;
  dot_number?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
}

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    mc_number: "",
    dot_number: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadCarriers();
  }, []);

  async function loadCarriers() {
    setLoading(true);
    try {
      const res = await fetch("/api/carriers", { cache: "no-store" });
      const data = await res.json();
      setCarriers(data.carriers || []);
    } catch (error) {
      console.error("Failed to load carriers", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name) return;
    try {
      const res = await fetch("/api/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create carrier");
      }
      setFormData({
        name: "",
        mc_number: "",
        dot_number: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
      });
      await loadCarriers();
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`/api/carriers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate carrier");
      }
      await loadCarriers();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Carrier Management
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Maintain carrier profiles, compliance IDs, and contacts.
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
              Add Carrier
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Carrier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              placeholder="MC Number"
              value={formData.mc_number}
              onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })}
            />
            <Input
              placeholder="DOT Number"
              value={formData.dot_number}
              onChange={(e) => setFormData({ ...formData, dot_number: e.target.value })}
            />
            <Input
              placeholder="Contact Name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            />
            <Input
              placeholder="Contact Email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
            <Input
              placeholder="Contact Phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={!formData.name || demoMode}>
                Create Carrier
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Carrier Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : carriers.length === 0 ? (
              <div className="text-text-secondary">No carriers added yet.</div>
            ) : (
              <div className="space-y-3">
                {carriers.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">{carrier.name}</div>
                      <div className="text-text-secondary text-xs">
                        MC: {carrier.mc_number || "--"} • DOT: {carrier.dot_number || "--"}
                      </div>
                      <div className="text-text-secondary text-xs">
                        {carrier.contact_name || "No contact"} • {carrier.contact_email || "no email"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">
                        {carrier.status || "active"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(carrier.id)}
                        disabled={demoMode}
                      >
                        Deactivate
                      </Button>
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
