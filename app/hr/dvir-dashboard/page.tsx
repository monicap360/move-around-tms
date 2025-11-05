"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  Calendar,
  Truck,
  User,
  FileText,
  Download,
  Eye
} from "lucide-react";

type DVIRInspection = {
  id: string;
  driver_name: string;
  truck_number: string;
  odometer_reading: number;
  inspection_type: 'pre_trip' | 'post_trip';
  location: string;
  overall_status: 'satisfactory' | 'defects_corrected' | 'defects_need_correction';
  created_at: string;
  updated_at: string;
  defects?: Array<{ count: number }>;
};

type DVIRStats = {
  total_inspections: number;
  satisfactory_count: number;
  defects_corrected_count: number;
  defects_need_correction_count: number;
  critical_defects_count: number;
  today_inspections: number;
};

export default function DVIRDashboardPage() {
  const [inspections, setInspections] = useState<DVIRInspection[]>([]);
  const [stats, setStats] = useState<DVIRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    loadDVIRData();
  }, []);

  async function loadDVIRData() {
    try {
      setLoading(true);

      // Load DVIR statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_dvir_stats');

      if (statsError) {
        console.error("Error loading DVIR stats:", statsError);
      } else {
        setStats(statsData);
      }

      // Load DVIR inspections with defect counts
      let query = supabase
        .from('dvir_inspections')
        .select(`
          *,
          defects:dvir_defects(count)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: inspectionsData, error: inspectionsError } = await query;

      if (inspectionsError) {
        console.error("Error loading inspections:", inspectionsError);
      } else {
        setInspections(inspectionsData || []);
      }

    } catch (error) {
      console.error("Error loading DVIR data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'satisfactory':
        return <Badge className="bg-green-100 text-green-800">Satisfactory</Badge>;
      case 'defects_corrected':
        return <Badge className="bg-yellow-100 text-yellow-800">Defects Corrected</Badge>;
      case 'defects_need_correction':
        return <Badge className="bg-red-100 text-red-800">Needs Correction</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'satisfactory':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'defects_corrected':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'defects_need_correction':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = 
      inspection.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.truck_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inspection.overall_status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const inspectionDate = new Date(inspection.created_at);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          matchesDate = inspectionDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = inspectionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = inspectionDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">DVIR Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Driver Vehicle Inspection Reports - Safety & Compliance Management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Inspections</p>
                <p className="text-2xl font-bold">{stats?.total_inspections || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Satisfactory</p>
                <p className="text-2xl font-bold text-green-600">{stats?.satisfactory_count || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Defects Corrected</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.defects_corrected_count || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Need Correction</p>
                <p className="text-2xl font-bold text-red-600">{stats?.defects_need_correction_count || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Inspections</p>
                <p className="text-2xl font-bold">{stats?.today_inspections || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search by driver, truck, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="satisfactory">Satisfactory</option>
              <option value="defects_corrected">Defects Corrected</option>
              <option value="defects_need_correction">Needs Correction</option>
            </select>

            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent DVIR Inspections ({filteredInspections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No DVIR inspections found matching your filters.</p>
              <p className="text-sm mt-2">Drivers can create inspections using the DVIR form.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Truck</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Odometer</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-left p-3">Defects</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((inspection) => (
                    <tr key={inspection.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(inspection.overall_status)}
                          {getStatusBadge(inspection.overall_status)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          {inspection.driver_name}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          {inspection.truck_number}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={inspection.inspection_type === 'pre_trip' ? 'default' : 'secondary'}>
                          {inspection.inspection_type === 'pre_trip' ? 'Pre-Trip' : 'Post-Trip'}
                        </Badge>
                      </td>
                      <td className="p-3">{inspection.odometer_reading.toLocaleString()}</td>
                      <td className="p-3">{inspection.location}</td>
                      <td className="p-3">
                        {(inspection.defects?.[0]?.count || 0) > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-red-600">{inspection.defects?.[0]?.count || 0}</span>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          </div>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="p-3">
                        {new Date(inspection.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
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
  );
}