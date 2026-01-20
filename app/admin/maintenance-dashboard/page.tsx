"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Calendar,
  XCircle,
} from "lucide-react";

type MaintenanceRequest = {
  id: string;
  truck_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  issue_type: string;
  priority: string;
  description: string;
  can_drive_safely: boolean;
  status: string;
  submitted_at: string;
  scheduled_date: string | null;
  driver_name: string;
  driver_phone: string | null;
  location: string | null;
  mileage: number | null;
  photos: string[];
  hours_pending: number;
};

const directImageLoader = ({ src }: { src: string }) => src;

export default function MaintenanceDashboard() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from("maintenance_dashboard")
        .select("*")
        .order("hours_pending", { ascending: false });

      if (error) {
        console.error("Error loading maintenance requests:", error);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    requestId: string,
    newStatus: string,
    scheduledDate?: string,
  ) {
    try {
      setProcessingId(requestId);

      const updateData: any = {
        status: newStatus,
        acknowledged_at: new Date().toISOString(),
      };

      if (scheduledDate) {
        updateData.scheduled_date = scheduledDate;
      }

      if (newStatus === "Completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("maintenance_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert(`✅ Status updated to: ${newStatus}`);
        loadRequests();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (filter === "all") return true;
    if (filter === "critical") return req.priority === "Critical";
    if (filter === "unsafe") return !req.can_drive_safely;
    if (filter === "pending") return req.status === "Pending";
    return true;
  });

  const stats = {
    total: requests.length,
    critical: requests.filter((r) => r.priority === "Critical").length,
    unsafe: requests.filter((r) => !r.can_drive_safely).length,
    pending: requests.filter((r) => r.status === "Pending").length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading maintenance dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Wrench className="w-8 h-8 text-blue-600" />
          Maintenance Dashboard
        </h1>
        <p className="text-gray-600">
          Active maintenance requests from drivers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="cursor-pointer" onClick={() => setFilter("all")}>
          <Card className={`${filter === "all" ? "ring-2 ring-blue-500" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Active</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Wrench className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setFilter("critical")}>
          <Card
            className={`${filter === "critical" ? "ring-2 ring-red-500" : ""}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.critical}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setFilter("unsafe")}>
          <Card
            className={`${filter === "unsafe" ? "ring-2 ring-orange-500" : ""}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Unsafe to Drive</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.unsafe}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setFilter("pending")}>
          <Card
            className={`${
              filter === "pending" ? "ring-2 ring-yellow-500" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No maintenance requests match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              className={`border-2 ${
                req.priority === "Critical"
                  ? "border-red-300 bg-red-50"
                  : !req.can_drive_safely
                    ? "border-orange-300 bg-orange-50"
                    : "border-gray-200"
              }`}
            >
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Request Details */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {req.issue_type}
                          </h3>
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
                          {!req.can_drive_safely && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              UNSAFE TO DRIVE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3">
                          {req.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Driver:</span>
                        <p className="font-medium">{req.driver_name}</p>
                        {req.driver_phone && (
                          <p className="text-xs text-gray-500">
                            {req.driver_phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Truck:</span>
                        <p className="font-medium">{req.truck_number}</p>
                        {req.make && (
                          <p className="text-xs text-gray-500">
                            {req.year} {req.make} {req.model}
                          </p>
                        )}
                      </div>
                      {req.location && (
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <p className="font-medium">{req.location}</p>
                        </div>
                      )}
                      {req.mileage && (
                        <div>
                          <span className="text-gray-600">Mileage:</span>
                          <p className="font-medium">
                            {req.mileage.toLocaleString()} mi
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p>
                        Submitted: {new Date(req.submitted_at).toLocaleString()}{" "}
                        ({Math.floor(req.hours_pending)} hours ago)
                      </p>
                      {req.scheduled_date && (
                        <p className="text-blue-600 font-medium">
                          Scheduled:{" "}
                          {new Date(req.scheduled_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {req.photos && req.photos.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Photos:</p>
                        <div className="flex gap-2">
                          {req.photos.map((photo, idx) => (
                            <a
                              key={idx}
                              href={photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border rounded overflow-hidden"
                            >
                              <Image
                                src={photo}
                                alt={`Issue ${idx + 1}`}
                                width={80}
                                height={80}
                                className="w-20 h-20 object-cover"
                                loader={directImageLoader}
                                unoptimized
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Current Status:
                      </p>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          req.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : req.status === "In Progress"
                              ? "bg-blue-100 text-blue-800"
                              : req.status === "Scheduled"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Actions:
                      </p>

                      {req.status === "Pending" && (
                        <Button
                          onClick={() => updateStatus(req.id, "Acknowledged")}
                          disabled={processingId === req.id}
                          variant="outline"
                          className="w-full text-sm"
                        >
                          Acknowledge
                        </Button>
                      )}

                      <Button
                        onClick={() => {
                          const date = prompt(
                            "Enter scheduled date (YYYY-MM-DD):",
                          );
                          if (date) updateStatus(req.id, "Scheduled", date);
                        }}
                        disabled={processingId === req.id}
                        variant="outline"
                        className="w-full text-sm"
                      >
                        Schedule
                      </Button>

                      <Button
                        onClick={() => updateStatus(req.id, "In Progress")}
                        disabled={processingId === req.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                      >
                        Start Work
                      </Button>

                      <Button
                        onClick={() => updateStatus(req.id, "Completed")}
                        disabled={processingId === req.id}
                        className="w-full bg-green-600 hover:bg-green-700 text-sm"
                      >
                        Mark Complete
                      </Button>

                      <Button
                        onClick={() => updateStatus(req.id, "Cancelled")}
                        disabled={processingId === req.id}
                        variant="outline"
                        className="w-full text-red-600 border-red-300 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
