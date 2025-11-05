"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type Driver = {
  id: string;
  name: string;
  employee_id: string;
};

export default function NewIncidentPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: "",
    incident_date: "",
    incident_time: "",
    incident_type: "",
    severity: "minor",
    location: "",
    description: "",
    vehicle_number: "",
    was_preventable: "",
    injuries_reported: false,
    police_report_filed: false,
    investigation_status: "under_investigation"
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      const { data, error } = await supabase
        .from("drivers_enhanced")
        .select("id, name, employee_id")
        .eq("employment_status", "active")
        .order("name");

      if (!error && data) {
        setDrivers(data);
      }
    } catch (err) {
      console.error("Error loading drivers:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const incidentData = {
        driver_id: formData.driver_id,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        incident_type: formData.incident_type,
        severity: formData.severity,
        location: formData.location || null,
        description: formData.description,
        vehicle_number: formData.vehicle_number || null,
        was_preventable: formData.was_preventable === "true" ? true : formData.was_preventable === "false" ? false : null,
        injuries_reported: formData.injuries_reported,
        police_report_filed: formData.police_report_filed,
        investigation_status: formData.investigation_status,
        reported_by: "system", // In real app, this would be the current user
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("driver_incidents")
        .insert([incidentData]);

      if (error) {
        alert("Error saving incident: " + error.message);
        return;
      }

      alert("Incident reported successfully!");
      router.push("/hr/performance/incidents");
    } catch (err) {
      console.error("Error saving incident:", err);
      alert("Error saving incident");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: any) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hr/performance/incidents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Report New Incident</h1>
          <p className="text-gray-600 mt-1">Document a driver incident for investigation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver *
                </label>
                <select
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} (ID: {driver.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Incident Date *
                  </label>
                  <Input
                    type="date"
                    name="incident_date"
                    value={formData.incident_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Incident Time
                  </label>
                  <Input
                    type="time"
                    name="incident_time"
                    value={formData.incident_time}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Type *
                </label>
                <select
                  name="incident_type"
                  value={formData.incident_type}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select Type</option>
                  <option value="Accident">Accident</option>
                  <option value="Traffic Violation">Traffic Violation</option>
                  <option value="Equipment Damage">Equipment Damage</option>
                  <option value="Near Miss">Near Miss</option>
                  <option value="Customer Complaint">Customer Complaint</option>
                  <option value="DOT Violation">DOT Violation</option>
                  <option value="Safety Violation">Safety Violation</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity *
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State or specific location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <Input
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleChange}
                  placeholder="Vehicle/Truck number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full border rounded-md px-3 py-2 resize-none"
                  placeholder="Provide detailed description of the incident..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Was this incident preventable?
                </label>
                <select
                  name="was_preventable"
                  value={formData.was_preventable}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">To be determined</option>
                  <option value="true">Yes - Preventable</option>
                  <option value="false">No - Not preventable</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="injuries_reported"
                    checked={formData.injuries_reported}
                    onChange={handleChange}
                    id="injuries_reported"
                    className="rounded"
                  />
                  <label htmlFor="injuries_reported" className="text-sm font-medium text-gray-700">
                    Injuries were reported
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="police_report_filed"
                    checked={formData.police_report_filed}
                    onChange={handleChange}
                    id="police_report_filed"
                    className="rounded"
                  />
                  <label htmlFor="police_report_filed" className="text-sm font-medium text-gray-700">
                    Police report was filed
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investigation Status
                </label>
                <select
                  name="investigation_status"
                  value={formData.investigation_status}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="under_investigation">Under Investigation</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="awaiting_documentation">Awaiting Documentation</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6">
          <Link href="/hr/performance/incidents">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Report Incident"}
          </Button>
        </div>
      </form>
    </div>
  );
}