"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, AlertTriangle, Upload, CheckCircle, Clock } from "lucide-react";

type MaintenanceRequest = {
  id: string;
  truck_number: string;
  issue_type: string;
  priority: string;
  description: string;
  can_drive_safely: boolean;
  status: string;
  submitted_at: string;
  scheduled_date: string | null;
};

const ISSUE_TYPES = [
  'Engine/Mechanical',
  'Brakes',
  'Tires',
  'Lights/Electrical',
  'HVAC/Climate',
  'Transmission',
  'Suspension',
  'Body/Exterior',
  'Interior',
  'Safety Equipment',
  'Other',
];

const PRIORITIES = [
  { value: 'Low', label: 'Low - Can wait', color: 'text-blue-600' },
  { value: 'Medium', label: 'Medium - Soon', color: 'text-yellow-600' },
  { value: 'High', label: 'High - This week', color: 'text-orange-600' },
  { value: 'Critical', label: 'Critical - Immediate', color: 'text-red-600' },
];

export default function DriverMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [driverId, setDriverId] = useState<string>("");
  const [currentTruck, setCurrentTruck] = useState<string>("");

  // Form state
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [mileage, setMileage] = useState("");
  const [canDrive, setCanDrive] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDriverAndRequests();
  }, []);

  async function loadDriverAndRequests() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("id, current_truck_id, trucks(truck_number)")
          .eq("email", user.email)
          .single();

        if (driver) {
          setDriverId(driver.id);
          setCurrentTruck((driver as any).trucks?.truck_number || "");

          // Load driver's maintenance requests
          const { data: requestsData } = await supabase
            .from("maintenance_requests")
            .select("*")
            .eq("driver_id", driver.id)
            .order("submitted_at", { ascending: false })
            .limit(20);

          if (requestsData) {
            setRequests(requestsData);
          }
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!issueType || !description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);

      // Upload photos if any
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const path = `maintenance/${driverId}/${Date.now()}-${photo.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("hr_docs")
          .upload(path, photo);

        if (uploadErr) {
          console.error("Photo upload error:", uploadErr);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("hr_docs")
            .getPublicUrl(uploadData.path);
          photoUrls.push(publicUrl);
        }
      }

      // Insert maintenance request
      const { error } = await supabase.from("maintenance_requests").insert({
        driver_id: driverId,
        truck_number: currentTruck,
        issue_type: issueType,
        priority,
        description,
        location: location || null,
        mileage: mileage ? parseInt(mileage) : null,
        can_drive_safely: canDrive,
        photos: photoUrls,
        status: "Pending",
      });

      if (error) {
        alert("Error submitting request: " + error.message);
      } else {
        alert("✅ Maintenance request submitted! Shop will review shortly.");
        // Reset form
        setShowForm(false);
        setIssueType("");
        setDescription("");
        setLocation("");
        setMileage("");
        setPhotos([]);
        setCanDrive(true);
        loadDriverAndRequests();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Wrench className="w-8 h-8 text-blue-600" />
            Truck Maintenance
          </h1>
          <p className="text-gray-600">
            Current Truck: <strong>{currentTruck || "Not assigned"}</strong>
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          {showForm ? "Cancel" : "Report Issue"}
        </Button>
      </div>

      {/* Report Form */}
      {showForm && (
        <Card className="mb-6 border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle>Report Maintenance Issue</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Type *
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                    required
                  >
                    <option value="">Select issue type...</option>
                    {ISSUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                    required
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail (sounds, when it happens, severity, etc.)"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where is the truck now?"
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Mileage
                  </label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="Odometer reading"
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Photos
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload photos of the issue (optional)
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={!canDrive}
                  onChange={(e) => setCanDrive(!e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium text-red-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Truck is NOT safe to drive (will be taken out of service)
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit Maintenance Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Maintenance Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No maintenance requests yet. Report an issue above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-800">
                          {req.issue_type}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            req.priority === "Critical"
                              ? "bg-red-100 text-red-800"
                              : req.priority === "High"
                              ? "bg-orange-100 text-orange-800"
                              : req.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {req.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            req.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : req.status === "In Progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {req.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Truck: {req.truck_number}</span>
                        <span>
                          Submitted: {new Date(req.submitted_at).toLocaleString()}
                        </span>
                        {req.scheduled_date && (
                          <span className="text-blue-600 font-medium">
                            Scheduled: {new Date(req.scheduled_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {req.status === "Pending" && (
                        <Clock className="w-6 h-6 text-gray-400" />
                      )}
                      {req.status === "Completed" && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {req.status === "In Progress" && (
                        <Wrench className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            📋 When to Report:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Any unusual sounds, smells, or vibrations</li>
            <li>Warning lights on dashboard</li>
            <li>Brake issues or steering problems</li>
            <li>Tire damage or low pressure</li>
            <li>Fluid leaks (oil, coolant, transmission)</li>
            <li>Lights not working properly</li>
            <li>HVAC not functioning</li>
            <li>Safety equipment issues (seat belts, wipers, etc.)</li>
          </ul>
          <p className="text-sm text-blue-800 mt-3 font-medium">
            ⚠️ If truck is unsafe to drive, check the box and DO NOT operate the
            vehicle. Shop will be notified immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
