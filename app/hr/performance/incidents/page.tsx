"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  AlertTriangle,
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Calendar,
  MapPin,
  Clock,
  Car,
  CheckCircle,
  XCircle
} from "lucide-react";

type Incident = {
  id: string;
  driver_id: string;
  driver_name: string;
  employee_id: string;
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  severity: string;
  location: string | null;
  description: string;
  vehicle_number: string | null;
  was_preventable: boolean | null;
  injuries_reported: boolean;
  police_report_filed: boolean;
  investigation_status: string;
  created_at: string;
  updated_at: string;
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadIncidents();
  }, []);

  async function loadIncidents() {
    try {
      const { data, error } = await supabase
        .from("driver_incidents")
        .select(`
          *,
          drivers_enhanced!inner(
            name,
            employee_id
          )
        `)
        .order("incident_date", { ascending: false });

      if (error) {
        console.error("Error loading incidents:", error);
        return;
      }

      const formattedIncidents = (data || []).map((incident: any) => ({
        id: incident.id,
        driver_id: incident.driver_id,
        driver_name: incident.drivers_enhanced?.name || 'Unknown Driver',
        employee_id: incident.drivers_enhanced?.employee_id || 'N/A',
        incident_date: incident.incident_date,
        incident_time: incident.incident_time,
        incident_type: incident.incident_type,
        severity: incident.severity,
        location: incident.location,
        description: incident.description,
        vehicle_number: incident.vehicle_number,
        was_preventable: incident.was_preventable,
        injuries_reported: incident.injuries_reported,
        police_report_filed: incident.police_report_filed,
        investigation_status: incident.investigation_status,
        created_at: incident.created_at,
        updated_at: incident.updated_at
      }));

      setIncidents(formattedIncidents);
    } catch (err) {
      console.error("Error loading incidents:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incident_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (incident.location && incident.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSeverity = filterSeverity === "all" || incident.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || incident.investigation_status === filterStatus;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  function getSeverityColor(severity: string) {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'major': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'minor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'closed': return 'bg-green-100 text-green-800';
      case 'under_investigation': return 'bg-blue-100 text-blue-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'awaiting_documentation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatStatus(status: string) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    major: incidents.filter(i => i.severity === 'major').length,
    minor: incidents.filter(i => i.severity === 'minor').length,
    preventable: incidents.filter(i => i.was_preventable === true).length,
    withInjuries: incidents.filter(i => i.injuries_reported === true).length,
    underInvestigation: incidents.filter(i => i.investigation_status === 'under_investigation').length
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/hr/performance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Incident Management</h1>
            <p className="text-gray-600 mt-1">Track and investigate driver incidents</p>
          </div>
        </div>
        <Link href="/hr/performance/incidents/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Incidents</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.major}</p>
              <p className="text-xs text-gray-500">Major</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.minor}</p>
              <p className="text-xs text-gray-500">Minor</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.preventable}</p>
              <p className="text-xs text-gray-500">Preventable</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.withInjuries}</p>
              <p className="text-xs text-gray-500">With Injuries</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.underInvestigation}</p>
              <p className="text-xs text-gray-500">Investigating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterSeverity}
                onChange={(e: any) => setFilterSeverity(e.target.value)}
                className="border rounded-md px-3 py-2 bg-white text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="border rounded-md px-3 py-2 bg-white text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="pending_review">Pending Review</option>
                <option value="awaiting_documentation">Awaiting Documentation</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Incidents ({filteredIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No incidents found</p>
              <p className="text-gray-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIncidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{incident.driver_name}</h3>
                        <Badge variant="outline" className="text-xs">
                          ID: {incident.employee_id}
                        </Badge>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                        <Badge className={getStatusColor(incident.investigation_status)}>
                          {formatStatus(incident.investigation_status)}
                        </Badge>
                      </div>
                      <p className="text-gray-700 font-medium mb-2">{incident.incident_type}</p>
                      <p className="text-gray-600 text-sm line-clamp-2">{incident.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/hr/performance/incidents/${incident.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(incident.incident_date).toLocaleDateString()}</span>
                      {incident.incident_time && (
                        <span className="text-gray-400">at {incident.incident_time}</span>
                      )}
                    </div>
                    
                    {incident.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{incident.location}</span>
                      </div>
                    )}
                    
                    {incident.vehicle_number && (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        <span>Vehicle {incident.vehicle_number}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      {incident.injuries_reported && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">Injuries</span>
                        </div>
                      )}
                      {incident.police_report_filed && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Police Report</span>
                        </div>
                      )}
                      {incident.was_preventable === true && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">Preventable</span>
                        </div>
                      )}
                    </div>
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
