"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  FileText,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Users
} from "lucide-react";

type Driver = {
  id: string;
  name: string;
  employee_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hire_date: string;
  cdl_number: string;
  cdl_class: string;
  cdl_expiration: string;
  medical_cert_expiration: string;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
  emergency_contact_name: string;
  emergency_contact_phone: string;
  date_of_birth: string;
  driver_license_state: string;
  endorsements: string[];
  safety_score: number;
  total_miles: number;
  years_experience: number;
  last_violation_date: string | null;
  document_count: number;
  expiring_docs: number;
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    expiringDocs: 0,
    lowSafetyScore: 0
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      // Get drivers with document counts
      const { data: driversData, error } = await supabase
        .from("drivers_enhanced")
        .select(`
          *,
          driver_documents (count),
          driver_documents_expiring (count)
        `)
        .order("name");

      if (error) {
        console.error("Error loading drivers:", error);
        return;
      }

      const driversWithCounts = (driversData || []).map((driver: any) => ({
        ...driver,
        document_count: driver.driver_documents?.length || 0,
        expiring_docs: driver.driver_documents_expiring?.length || 0,
        endorsements: driver.endorsements ? JSON.parse(driver.endorsements) : []
      }));

      setDrivers(driversWithCounts);

      // Calculate stats
      const activeDrivers = driversWithCounts.filter(d => d.status === 'Active').length;
      const totalExpiringDocs = driversWithCounts.reduce((sum, d) => sum + d.expiring_docs, 0);
      const lowSafetyDrivers = driversWithCounts.filter(d => d.safety_score < 70).length;

      setStats({
        totalDrivers: driversWithCounts.length,
        activeDrivers,
        expiringDocs: totalExpiringDocs,
        lowSafetyScore: lowSafetyDrivers
      });

    } catch (err) {
      console.error("Error loading drivers:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  function getStatusColor(status: string) {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800';
      case 'Terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getSafetyScoreColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Driver Management</h1>
          <p className="text-gray-600 mt-1">Manage driver profiles, certifications, and performance</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/drivers/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Driver
            </Button>
          </Link>
          <Link href="/hr">
            <Button variant="outline">
              Back to HR
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Drivers</p>
                <p className="text-2xl font-bold">{stats.totalDrivers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Drivers</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDrivers}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Documents</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringDocs}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Safety Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowSafetyScore}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search drivers by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 bg-white"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Driver Directory ({filteredDrivers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No drivers found</p>
              <p className="text-gray-400">Try adjusting your search criteria or add a new driver</p>
              <Link href="/hr/drivers/new">
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Driver
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">CDL Info</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Safety Score</th>
                    <th className="text-left p-3">Documents</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-gray-500 text-xs">ID: {driver.employee_id}</div>
                          {driver.years_experience && (
                            <div className="text-gray-500 text-xs">{driver.years_experience} years exp.</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" />
                            {driver.phone}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="w-3 h-3" />
                            {driver.email}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {driver.city}, {driver.state}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">Class {driver.cdl_class}</div>
                          <div className="text-xs text-gray-500"># {driver.cdl_number}</div>
                          {driver.cdl_expiration && (
                            <div className="text-xs text-gray-500">
                              Exp: {new Date(driver.cdl_expiration).toLocaleDateString()}
                            </div>
                          )}
                          {driver.endorsements && driver.endorsements.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {driver.endorsements.slice(0, 3).map((endorsement, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {endorsement}
                                </Badge>
                              ))}
                              {driver.endorsements.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{driver.endorsements.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(driver.status)}>
                          {driver.status}
                        </Badge>
                        {driver.hire_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Hired: {new Date(driver.hire_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className={`text-2xl font-bold ${getSafetyScoreColor(driver.safety_score)}`}>
                          {driver.safety_score || 'N/A'}
                        </div>
                        {driver.safety_score && (
                          <div className="text-xs text-gray-500">
                            {driver.total_miles ? `${(driver.total_miles / 1000).toFixed(0)}k miles` : 'No miles logged'}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-green-500" />
                            <span className="text-sm">{driver.document_count} docs</span>
                          </div>
                          {driver.expiring_docs > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-orange-500" />
                              <span className="text-sm text-orange-600">{driver.expiring_docs} expiring</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Link href={`/hr/drivers/${driver.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/hr/drivers/${driver.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </div>
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