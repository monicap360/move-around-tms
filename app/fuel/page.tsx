"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Fuel, TrendingUp, DollarSign, Calendar, MapPin, RefreshCw } from "lucide-react";

const supabase = createClient();

interface FuelPurchase {
  id: string;
  transaction_id: string;
  card_number: string | null;
  driver_id: string | null;
  truck_id: string | null;
  location: string;
  gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  fuel_type: string;
  transaction_date: string;
  odometer: number | null;
  provider: string;
  source: string;
}

export default function FuelManagementPage() {
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    location: "",
    gallons: "",
    cost_per_gallon: "",
    total_cost: "",
    fuel_type: "Diesel",
    transaction_date: new Date().toISOString().split('T')[0],
    driver_id: "",
    truck_id: "",
    odometer: "",
    card_number: "",
  });

  useEffect(() => {
    loadFuelPurchases();
  }, []);

  async function loadFuelPurchases() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      if (orgData) {
        setOrganizationId(orgData.id);

        const response = await fetch(`/api/fuel/purchases?organization_id=${orgData.id}`);
        if (!response.ok) throw new Error('Failed to fetch purchases');
        const result = await response.json();
        setPurchases(result.purchases || []);
      }
    } catch (error: any) {
      console.error("Error loading fuel purchases:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;

    try {
      const response = await fetch('/api/fuel/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          location: formData.location,
          gallons: parseFloat(formData.gallons),
          cost_per_gallon: formData.cost_per_gallon ? parseFloat(formData.cost_per_gallon) : undefined,
          total_cost: parseFloat(formData.total_cost),
          fuel_type: formData.fuel_type,
          transaction_date: formData.transaction_date,
          driver_id: formData.driver_id || null,
          truck_id: formData.truck_id || null,
          odometer: formData.odometer ? parseInt(formData.odometer) : null,
          card_number: formData.card_number || null,
          provider: 'manual',
          source: 'manual',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create fuel purchase');
      }

      // Reset form and reload
      setFormData({
        location: "",
        gallons: "",
        cost_per_gallon: "",
        total_cost: "",
        fuel_type: "Diesel",
        transaction_date: new Date().toISOString().split('T')[0],
        driver_id: "",
        truck_id: "",
        odometer: "",
        card_number: "",
      });
      setShowForm(false);
      await loadFuelPurchases();
      alert('Fuel purchase recorded successfully!');
    } catch (error: any) {
      console.error("Error creating fuel purchase:", error);
      alert("Error: " + error.message);
    }
  }

  // Calculate totals
  const totalGallons = purchases.reduce((sum, p) => sum + (p.gallons || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const avgCostPerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)", padding: "2rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
              Fuel Management
            </h1>
            <p style={{ fontSize: "1.125rem", color: "#475569" }}>
              Track fuel purchases, costs, and allocations
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus width={20} height={20} />
            Add Fuel Purchase
          </Button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <Fuel style={{ color: "#2563eb", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Total Gallons</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                {totalGallons.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <DollarSign style={{ color: "#059669", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Total Cost</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <TrendingUp style={{ color: "#f59e42", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Avg Cost/Gallon</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                ${avgCostPerGallon.toFixed(3)}
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <Calendar style={{ color: "#a21caf", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Total Purchases</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                {purchases.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Fuel Purchase Form */}
        {showForm && (
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", marginBottom: "2rem" }}>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b" }}>Add Fuel Purchase</CardTitle>
              <CardDescription style={{ color: "#64748b" }}>Record a new fuel purchase manually</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                <div>
                  <Label htmlFor="location" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Location <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="location"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Fuel station location"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="transaction_date" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Date <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="gallons" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Gallons <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="gallons"
                    type="number"
                    step="0.01"
                    required
                    value={formData.gallons}
                    onChange={(e) => {
                      const gallons = e.target.value;
                      const costPerGallon = formData.cost_per_gallon ? parseFloat(formData.cost_per_gallon) : 0;
                      const total = gallons && costPerGallon ? (parseFloat(gallons) * costPerGallon).toFixed(2) : formData.total_cost;
                      setFormData({ ...formData, gallons, total_cost: total });
                    }}
                    placeholder="0.00"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="cost_per_gallon" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Cost per Gallon
                  </Label>
                  <Input
                    id="cost_per_gallon"
                    type="number"
                    step="0.001"
                    value={formData.cost_per_gallon}
                    onChange={(e) => {
                      const costPerGallon = e.target.value;
                      const gallons = formData.gallons ? parseFloat(formData.gallons) : 0;
                      const total = costPerGallon && gallons ? (parseFloat(costPerGallon) * gallons).toFixed(2) : formData.total_cost;
                      setFormData({ ...formData, cost_per_gallon: costPerGallon, total_cost: total });
                    }}
                    placeholder="0.000"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="total_cost" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Total Cost <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="total_cost"
                    type="number"
                    step="0.01"
                    required
                    value={formData.total_cost}
                    onChange={(e) => {
                      const total = e.target.value;
                      const gallons = formData.gallons ? parseFloat(formData.gallons) : 0;
                      const costPerGallon = total && gallons ? (parseFloat(total) / gallons).toFixed(3) : formData.cost_per_gallon;
                      setFormData({ ...formData, total_cost: total, cost_per_gallon: costPerGallon });
                    }}
                    placeholder="0.00"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="fuel_type" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Fuel Type
                  </Label>
                  <select
                    id="fuel_type"
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white" }}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Gasoline">Gasoline</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="odometer" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Odometer
                  </Label>
                  <Input
                    id="odometer"
                    type="number"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    placeholder="Optional"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div>
                  <Label htmlFor="card_number" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Card Number
                  </Label>
                  <Input
                    id="card_number"
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    placeholder="Fuel card number (optional)"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    style={{ borderColor: "#cbd5e1", color: "#64748b" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Save Purchase
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Fuel Purchases List */}
        <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
          <CardHeader>
            <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b" }}>Recent Fuel Purchases</CardTitle>
            <CardDescription style={{ color: "#64748b" }}>All fuel purchase records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading...</div>
            ) : purchases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                No fuel purchases recorded yet. Click "Add Fuel Purchase" to get started.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Location</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Gallons</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Cost/Gal</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Total</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Type</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem", color: "#1e293b" }}>
                          {new Date(purchase.transaction_date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.75rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <MapPin width={16} height={16} style={{ color: "#64748b" }} />
                          {purchase.location}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#1e293b", fontWeight: 600 }}>
                          {purchase.gallons.toFixed(2)}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#1e293b" }}>
                          ${purchase.cost_per_gallon.toFixed(3)}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#1e293b", fontWeight: 700 }}>
                          ${purchase.total_cost.toFixed(2)}
                        </td>
                        <td style={{ padding: "0.75rem", color: "#64748b" }}>{purchase.fuel_type}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{ 
                            padding: "0.25rem 0.75rem", 
                            borderRadius: "9999px", 
                            fontSize: "0.875rem", 
                            fontWeight: 600,
                            background: purchase.source === 'import' ? "#dbeafe" : "#f1f5f9",
                            color: purchase.source === 'import' ? "#2563eb" : "#64748b"
                          }}>
                            {purchase.source === 'import' ? 'Import' : 'Manual'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
