"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Carrier {
  id: string;
  name: string;
}

interface CarrierRate {
  id: string;
  carrier_name?: string;
  lane_origin?: string;
  lane_destination?: string;
  unit_type?: string;
  rate: number;
  fuel_surcharge?: number;
}

export default function CarrierRatesPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [rates, setRates] = useState<CarrierRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    carrier_id: "",
    lane_origin: "",
    lane_destination: "",
    unit_type: "Load",
    rate: "",
    fuel_surcharge: "",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [carrierRes, rateRes] = await Promise.all([
        fetch("/api/carriers", { cache: "no-store" }),
        fetch("/api/carrier-rates", { cache: "no-store" }),
      ]);
      const carrierData = await carrierRes.json();
      const rateData = await rateRes.json();
      setCarriers(carrierData.carriers || []);
      setRates(rateData.rates || []);
    } catch (error) {
      console.error("Failed to load carrier rates", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.carrier_id || !formData.rate) return;
    try {
      const res = await fetch("/api/carrier-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rate: Number(formData.rate),
          fuel_surcharge: formData.fuel_surcharge
            ? Number(formData.fuel_surcharge)
            : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rate");
      }
      setFormData({
        carrier_id: "",
        lane_origin: "",
        lane_destination: "",
        unit_type: "Load",
        rate: "",
        fuel_surcharge: "",
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
            Carrier Rate Management
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Store and compare negotiated carrier rates by lane.
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
              Add Carrier Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="px-3 py-2 rounded border border-space-border bg-space-surface text-text-primary"
              value={formData.carrier_id}
              onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
            >
              <option value="">Select Carrier</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Lane Origin"
              value={formData.lane_origin}
              onChange={(e) => setFormData({ ...formData, lane_origin: e.target.value })}
            />
            <Input
              placeholder="Lane Destination"
              value={formData.lane_destination}
              onChange={(e) => setFormData({ ...formData, lane_destination: e.target.value })}
            />
            <select
              className="px-3 py-2 rounded border border-space-border bg-space-surface text-text-primary"
              value={formData.unit_type}
              onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
            >
              {["Load", "Yard", "Ton", "Hour", "Mile"].map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <Input
              placeholder="Rate"
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            />
            <Input
              placeholder="Fuel Surcharge (%)"
              type="number"
              value={formData.fuel_surcharge}
              onChange={(e) => setFormData({ ...formData, fuel_surcharge: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={demoMode}>
                Save Rate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Rate Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : rates.length === 0 ? (
              <div className="text-text-secondary">No rates found.</div>
            ) : (
              <div className="space-y-3">
                {rates.map((rate) => (
                  <div
                    key={rate.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">
                        {rate.carrier_name || "Carrier"}
                      </div>
                      <div className="text-text-secondary text-xs">
                        {rate.lane_origin || "--"} → {rate.lane_destination || "--"}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {rate.unit_type} • ${rate.rate}
                      {rate.fuel_surcharge ? ` • +${rate.fuel_surcharge}% FSC` : ""}
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
