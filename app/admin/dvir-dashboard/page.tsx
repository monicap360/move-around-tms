"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Truck,
  Filter,
  Download,
  Eye,
  Wrench,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";

interface DVIRInspection {
  id: string;
  driver_name: string;
  truck_number: string;
  odometer_reading: number;
  inspection_type: "pre_trip" | "post_trip";
  location: string;
  inspection_items: any[];
  overall_status:
    | "satisfactory"
    | "defects_corrected"
    | "defects_need_correction";
  driver_signature?: string;
  mechanic_signature?: string;
  defects_corrected: boolean;
  created_at: string;
}

interface DVIRStats {
  totalInspections: number;
  satisfactoryInspections: number;
  defectiveInspections: number;
  pendingCorrections: number;
  complianceRate: number;
  trucksInspectedToday: number;
}

export default function DVIRAdminDashboard() {
  const [dvirs, setDvirs] = useState<DVIRInspection[]>([]);
  const [stats, setStats] = useState<DVIRStats>({
    totalInspections: 0,
    satisfactoryInspections: 0,
    defectiveInspections: 0,
    pendingCorrections: 0,
    complianceRate: 0,
    trucksInspectedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTruck, setSearchTruck] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [selectedDVIR, setSelectedDVIR] = useState<DVIRInspection | null>(null);

  useEffect(() => {
    loadDVIRData();
  }, [filterStatus, searchTruck, dateRange]);

  const loadDVIRData = async () => {
    setLoading(true);

    try {
      // Build query with filters
      let query = supabase
        .from("dvir_inspections")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filterStatus !== "all") {
        query = query.eq("overall_status", filterStatus);
      }

      if (searchTruck) {
        query = query.ilike("truck_number", `%${searchTruck}%`);
      }

      // Apply date filter
      const now = new Date();
      if (dateRange === "today") {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte("created_at", startOfDay.toISOString());
      } else if (dateRange === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        query = query.gte("created_at", startOfWeek.toISOString());
      } else if (dateRange === "month") {
        const startOfMonth = new Date(now);
        startOfMonth.setMonth(now.getMonth() - 1);
        query = query.gte("created_at", startOfMonth.toISOString());
      }

      const { data: dvirData, error } = await query.limit(100);

      if (error) throw error;

      setDvirs(dvirData || []);

      // Calculate statistics
      calculateStats(dvirData || []);
    } catch (error) {
      console.error("Error loading DVIR data:", error);
    }

    setLoading(false);
  };

  const calculateStats = (dvirData: DVIRInspection[]) => {
    const total = dvirData.length;
    const satisfactory = dvirData.filter(
      (d) => d.overall_status === "satisfactory",
    ).length;
    const defective = dvirData.filter((d) =>
      d.overall_status.includes("defects"),
    ).length;
    const pending = dvirData.filter(
      (d) =>
        d.overall_status === "defects_need_correction" && !d.defects_corrected,
    ).length;

    // Get unique trucks inspected today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trucksToday = new Set(
      dvirData
        .filter((d) => new Date(d.created_at) >= today)
        .map((d) => d.truck_number),
    ).size;

    setStats({
      totalInspections: total,
      satisfactoryInspections: satisfactory,
      defectiveInspections: defective,
      pendingCorrections: pending,
      complianceRate: total > 0 ? Math.round((satisfactory / total) * 100) : 0,
      trucksInspectedToday: trucksToday,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "satisfactory":
        return "text-green-600 bg-green-50 border-green-200";
      case "defects_corrected":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "defects_need_correction":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "satisfactory":
        return <CheckCircle className="h-4 w-4" />;
      case "defects_corrected":
        return <Wrench className="h-4 w-4" />;
      case "defects_need_correction":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const markDefectsCorrected = async (dvirId: string) => {
    try {
      const { error } = await supabase
        .from("dvir_inspections")
        .update({
          defects_corrected: true,
          overall_status: "defects_corrected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dvirId);

      if (error) throw error;

      alert("DVIR marked as defects corrected!");
      loadDVIRData();
    } catch (error) {
      console.error("Error updating DVIR:", error);
      alert("Error updating DVIR status");
    }
  };

  const exportDVIRs = () => {
    // Create CSV content
    const headers = [
      "Date",
      "Time",
      "Driver",
      "Truck",
      "Type",
      "Status",
      "Odometer",
      "Location",
      "Defects Corrected",
    ];

    const csvContent = [
      headers.join(","),
      ...dvirs.map((dvir) =>
        [
          new Date(dvir.created_at).toLocaleDateString(),
          new Date(dvir.created_at).toLocaleTimeString(),
          `"${dvir.driver_name}"`,
          dvir.truck_number,
          dvir.inspection_type.replace("_", "-").toUpperCase(),
          dvir.overall_status.replace(/_/g, " ").toUpperCase(),
          dvir.odometer_reading,
          `"${dvir.location || ""}"`,
          dvir.defects_corrected ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dvir-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (selectedDVIR) {
    const defectiveItems = selectedDVIR.inspection_items.filter(
      (item) => item.status === "defective",
    );

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6" />
                DVIR Details - {selectedDVIR.truck_number}
              </CardTitle>
              <Button variant="outline" onClick={() => setSelectedDVIR(null)}>
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Driver
                </label>
                <p className="font-semibold">{selectedDVIR.driver_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Truck
                </label>
                <p className="font-semibold">{selectedDVIR.truck_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Type
                </label>
                <p className="font-semibold">
                  {selectedDVIR.inspection_type.replace("_", "-").toUpperCase()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Date
                </label>
                <p className="font-semibold">
                  {new Date(selectedDVIR.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedDVIR.overall_status)}`}
                >
                  {getStatusIcon(selectedDVIR.overall_status)}
                  <span className="ml-2">
                    {selectedDVIR.overall_status
                      .replace(/_/g, " ")
                      .toUpperCase()}
                  </span>
                </span>
              </div>
              {selectedDVIR.overall_status === "defects_need_correction" &&
                !selectedDVIR.defects_corrected && (
                  <Button
                    onClick={() => markDefectsCorrected(selectedDVIR.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Mark Defects Corrected
                  </Button>
                )}
            </div>

            {/* Defects List */}
            {defectiveItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {defectiveItems.length} Defect(s) Found
                </h3>
                <div className="space-y-3">
                  {defectiveItems.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="font-medium text-red-700">
                        {item.category} - {item.item}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Inspection Items Summary */}
            <div>
              <h3 className="font-semibold mb-3">Inspection Summary</h3>
              <div className="space-y-3">
                {Object.entries(
                  selectedDVIR.inspection_items.reduce(
                    (acc: any, item: any) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    },
                    {},
                  ),
                ).map(([category, items]) => {
                  const categoryItems = items as any[];
                  const defects = categoryItems.filter(
                    (item: any) => item.status === "defective",
                  ).length;
                  return (
                    <div key={category} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{category}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {categoryItems.length} items
                          </span>
                          {defects > 0 && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-medium">
                              {defects} defect{defects > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          DVIR Management Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor vehicle inspections, track defects, and ensure DOT compliance
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Inspections</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalInspections}
                </p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.complianceRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Corrections</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.pendingCorrections}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trucks Inspected Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.trucksInspectedToday}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="satisfactory">Satisfactory</option>
                <option value="defects_need_correction">
                  Needs Correction
                </option>
                <option value="defects_corrected">Defects Corrected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <Input
              placeholder="Search by truck number..."
              value={searchTruck}
              onChange={(e) => setSearchTruck(e.target.value)}
              className="w-64"
            />

            <Button
              onClick={exportDVIRs}
              variant="outline"
              className="ml-auto flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DVIR List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent DVIRs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : dvirs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No DVIRs found for the selected criteria
            </div>
          ) : (
            <div className="space-y-2">
              {dvirs.map((dvir) => (
                <div
                  key={dvir.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedDVIR(dvir)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">
                        {dvir.truck_number}
                      </span>
                      <span className="text-sm text-gray-600">
                        {dvir.driver_name}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {dvir.inspection_type.replace("_", "-").toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(dvir.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Odometer</span>
                      <span className="text-sm font-medium">
                        {dvir.odometer_reading.toLocaleString()} mi
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusColor(dvir.overall_status)}`}
                    >
                      {getStatusIcon(dvir.overall_status)}
                      {dvir.overall_status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
