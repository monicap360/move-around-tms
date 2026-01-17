"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AggregateProfile = {
  id?: string;
  material_type: string;
  material_code: string;
  material_description: string;
  supplier_location: string;
  material_category: string;
  stockpile_location: string;
  availability_inventory: string;
  rate_type: string;
  base_rate: string;
  fuel_surcharge: string;
  delivery_charge: string;
  minimum_load_charge: string;
  brokered_load_pct: string;
  customer_specific_rates: string;
  effective_start_date: string;
  effective_end_date: string;
  customer_name: string;
  job_name: string;
  job_site_address: string;
  contact_person: string;
  contact_number: string;
  billing_terms: string;
  customer_notes: string;
  truck_type: string;
  truck_assigned: string;
  driver_assigned: string;
  pickup_location: string;
  delivery_location: string;
  hauling_distance: string;
  estimated_load_time: string;
  estimated_unload_time: string;
  ticket_number: string;
  tare_weight: string;
  gross_weight: string;
  net_weight: string;
  digital_ticket_uploads: boolean;
  gps_tracking: boolean;
  signature_capture: boolean;
  auto_invoice: boolean;
};

const emptyProfile: AggregateProfile = {
  material_type: "",
  material_code: "",
  material_description: "",
  supplier_location: "",
  material_category: "Raw Material",
  stockpile_location: "",
  availability_inventory: "",
  rate_type: "Per Ton",
  base_rate: "",
  fuel_surcharge: "",
  delivery_charge: "",
  minimum_load_charge: "",
  brokered_load_pct: "",
  customer_specific_rates: "",
  effective_start_date: "",
  effective_end_date: "",
  customer_name: "",
  job_name: "",
  job_site_address: "",
  contact_person: "",
  contact_number: "",
  billing_terms: "",
  customer_notes: "",
  truck_type: "",
  truck_assigned: "",
  driver_assigned: "",
  pickup_location: "",
  delivery_location: "",
  hauling_distance: "",
  estimated_load_time: "",
  estimated_unload_time: "",
  ticket_number: "",
  tare_weight: "",
  gross_weight: "",
  net_weight: "",
  digital_ticket_uploads: false,
  gps_tracking: false,
  signature_capture: false,
  auto_invoice: false,
};

export default function RonyxAggregatesPage() {
  const [profile, setProfile] = useState<AggregateProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/aggregates/profile");
      const data = await res.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
    } catch (err) {
      console.error("Failed to load aggregates profile", err);
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/ronyx/aggregates/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
      setStatusMessage("Saved");
    } catch (err) {
      console.error("Failed to save aggregates profile", err);
      setStatusMessage("Save failed. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  }

  const updateField = (field: keyof AggregateProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-success: #16a34a;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-input:focus,
        .ronyx-input:focus-visible {
          outline: none;
          border-color: rgba(29, 78, 216, 0.6);
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-textarea {
          width: 100%;
          min-height: 90px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          resize: vertical;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Aggregates — Material & Rate Management</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Manage materials, pricing, customer job sites, dispatch details, and profitability in one hub.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="ronyx-action" onClick={saveProfile} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{statusMessage}</span>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Material Information</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Material Type</label>
              <input
                className="ronyx-input"
                placeholder="Gravel, Sand, Limestone, Topsoil..."
                value={profile.material_type}
                onChange={(e) => updateField("material_type", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Material Code / ID</label>
              <input
                className="ronyx-input"
                placeholder="MAT-001"
                value={profile.material_code}
                onChange={(e) => updateField("material_code", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Material Description</label>
              <textarea
                className="ronyx-textarea"
                placeholder="Washed gravel, 3/4 inch..."
                value={profile.material_description}
                onChange={(e) => updateField("material_description", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Supplier / Source Location</label>
              <input
                className="ronyx-input"
                placeholder="Pit 7, Plant 3..."
                value={profile.supplier_location}
                onChange={(e) => updateField("supplier_location", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Material Category</label>
              <select
                className="ronyx-input"
                value={profile.material_category}
                onChange={(e) => updateField("material_category", e.target.value)}
              >
                <option>Raw Material</option>
                <option>Processed</option>
                <option>Recycled</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Stockpile Location / Yard</label>
              <input
                className="ronyx-input"
                placeholder="Yard A / Stockpile 4"
                value={profile.stockpile_location}
                onChange={(e) => updateField("stockpile_location", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Availability / Inventory</label>
              <input
                className="ronyx-input"
                placeholder="Available tons / yards"
                value={profile.availability_inventory}
                onChange={(e) => updateField("availability_inventory", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Rate Management</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Rate Type</label>
              <select
                className="ronyx-input"
                value={profile.rate_type}
                onChange={(e) => updateField("rate_type", e.target.value)}
              >
                <option>Per Ton</option>
                <option>Per Yard</option>
                <option>Per Load</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Base Rate</label>
              <input
                className="ronyx-input"
                placeholder="$10.50 per ton"
                value={profile.base_rate}
                onChange={(e) => updateField("base_rate", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Fuel Surcharge</label>
              <input
                className="ronyx-input"
                placeholder="$ / % surcharge"
                value={profile.fuel_surcharge}
                onChange={(e) => updateField("fuel_surcharge", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery Charge / Hauling Fee</label>
              <input
                className="ronyx-input"
                placeholder="$ per load"
                value={profile.delivery_charge}
                onChange={(e) => updateField("delivery_charge", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Minimum Load Charge</label>
              <input
                className="ronyx-input"
                placeholder="$ minimum"
                value={profile.minimum_load_charge}
                onChange={(e) => updateField("minimum_load_charge", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Brokered Load %</label>
              <input
                className="ronyx-input"
                placeholder="%"
                value={profile.brokered_load_pct}
                onChange={(e) => updateField("brokered_load_pct", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Customer-Specific Rates</label>
              <textarea
                className="ronyx-textarea"
                placeholder="Overrides by account"
                value={profile.customer_specific_rates}
                onChange={(e) => updateField("customer_specific_rates", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Effective Date Range</label>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  type="date"
                  className="ronyx-input"
                  value={profile.effective_start_date}
                  onChange={(e) => updateField("effective_start_date", e.target.value)}
                />
                <input
                  type="date"
                  className="ronyx-input"
                  value={profile.effective_end_date}
                  onChange={(e) => updateField("effective_end_date", e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Customer & Job Site Details</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Customer Name / Company</label>
              <input
                className="ronyx-input"
                value={profile.customer_name}
                onChange={(e) => updateField("customer_name", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Job Name / Project ID</label>
              <input
                className="ronyx-input"
                value={profile.job_name}
                onChange={(e) => updateField("job_name", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Job Site Address</label>
              <textarea
                className="ronyx-textarea"
                value={profile.job_site_address}
                onChange={(e) => updateField("job_site_address", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Contact Person & Number</label>
              <input
                className="ronyx-input"
                value={profile.contact_person}
                onChange={(e) => updateField("contact_person", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Contact Number</label>
              <input
                className="ronyx-input"
                value={profile.contact_number}
                onChange={(e) => updateField("contact_number", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Billing Account / Payment Terms</label>
              <input
                className="ronyx-input"
                value={profile.billing_terms}
                onChange={(e) => updateField("billing_terms", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Notes / Special Instructions</label>
              <textarea
                className="ronyx-textarea"
                value={profile.customer_notes}
                onChange={(e) => updateField("customer_notes", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Trucking / Dispatch Info</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Truck Type</label>
              <input
                className="ronyx-input"
                placeholder="End dump, belly dump, tandem..."
                value={profile.truck_type}
                onChange={(e) => updateField("truck_type", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Truck Assigned</label>
              <input
                className="ronyx-input"
                value={profile.truck_assigned}
                onChange={(e) => updateField("truck_assigned", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Driver Assigned</label>
              <input
                className="ronyx-input"
                value={profile.driver_assigned}
                onChange={(e) => updateField("driver_assigned", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Pickup Location / Scale Site</label>
              <input
                className="ronyx-input"
                value={profile.pickup_location}
                onChange={(e) => updateField("pickup_location", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery Location</label>
              <input
                className="ronyx-input"
                value={profile.delivery_location}
                onChange={(e) => updateField("delivery_location", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Hauling Distance</label>
              <input
                className="ronyx-input"
                placeholder="mi / km"
                value={profile.hauling_distance}
                onChange={(e) => updateField("hauling_distance", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Estimated Load / Unload Time</label>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  type="time"
                  className="ronyx-input"
                  value={profile.estimated_load_time}
                  onChange={(e) => updateField("estimated_load_time", e.target.value)}
                />
                <input
                  type="time"
                  className="ronyx-input"
                  value={profile.estimated_unload_time}
                  onChange={(e) => updateField("estimated_unload_time", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="ronyx-label">Ticket or Scale Number</label>
              <input
                className="ronyx-input"
                value={profile.ticket_number}
                onChange={(e) => updateField("ticket_number", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Tare / Gross / Net Weight</label>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  className="ronyx-input"
                  placeholder="Tare"
                  value={profile.tare_weight}
                  onChange={(e) => updateField("tare_weight", e.target.value)}
                />
                <input
                  className="ronyx-input"
                  placeholder="Gross"
                  value={profile.gross_weight}
                  onChange={(e) => updateField("gross_weight", e.target.value)}
                />
                <input
                  className="ronyx-input"
                  placeholder="Net"
                  value={profile.net_weight}
                  onChange={(e) => updateField("net_weight", e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Reports & Tracking</h2>
          <div className="ronyx-grid">
            {[
              "Daily Tonnage / Yardage Report",
              "Load Summary by Material, Customer, or Driver",
              "Revenue by Material Type",
              "Rate History / Adjustments Log",
              "Profit per Load / Job / Material",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">View</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Optional Add-ons</h2>
          <div className="ronyx-grid">
            <div className="ronyx-row">
              <span>Digital Ticket Uploads (photo or scan)</span>
              <input
                type="checkbox"
                checked={profile.digital_ticket_uploads}
                onChange={(e) => updateField("digital_ticket_uploads", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>GPS Tracking for Load Verification</span>
              <input
                type="checkbox"
                checked={profile.gps_tracking}
                onChange={(e) => updateField("gps_tracking", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Signature Capture for Delivery Confirmation</span>
              <input
                type="checkbox"
                checked={profile.signature_capture}
                onChange={(e) => updateField("signature_capture", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Automated Invoice Generation</span>
              <input
                type="checkbox"
                checked={profile.auto_invoice}
                onChange={(e) => updateField("auto_invoice", e.target.checked)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
