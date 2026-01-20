"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supabase } from "../lib/supabaseClient";
import { samsara } from "../../integrations/eld";
import { 
  Truck, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MapPin,
  Fuel,
  FileText,
  Plus,
  Search,
  Filter
} from "lucide-react";

type Vehicle = {
  id: string;
  unit_number: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  license_plate?: string | null;
  registration_expiry?: string | null;
  insurance_expiry?: string | null;
  dot_inspection_due?: string | null;
  last_maintenance?: string | null;
  next_maintenance_due?: string | null;
  current_mileage?: number | null;
  status: 'active' | 'maintenance' | 'out_of_service';
  driver_assigned?: string | null;
  location?: string | null;
};

type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
  vehicle_label?: string;
  maintenance_type: string;
  description: string;
  cost: number;
  date_completed: string;
  mileage_at_service: number;
  next_due_date?: string;
  next_due_mileage?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'maintenance' | 'inspections' | 'renewals' | 'telematics'>('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // ELD/Telematics state
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [truckStatus, setTruckStatus] = useState<any[]>([]);
  const [hos, setHos] = useState<any[]>([]);
  const [eldLoading, setEldLoading] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total_vehicles: 0,
    active_vehicles: 0,
    maintenance_vehicles: 0,
    overdue_inspections: 0,
    expiring_registrations: 0,
    maintenance_alerts: 0
  });

  useEffect(() => {
    loadFleetData();
  }, []);

  // Load ELD/telematics data when tab is selected
  useEffect(() => {
    if (activeTab === 'telematics') {
      setEldLoading(true);
      Promise.all([
        samsara.fetchDriverLocations(),
        samsara.fetchTruckStatus(),
        samsara.fetchHOS()
      ]).then(([drivers, trucks, hosData]) => {
        setDriverLocations(drivers);
        setTruckStatus(trucks);
        setHos(hosData);
      }).finally(() => setEldLoading(false));
    }
  }, [activeTab]);

  const normalizeStatus = (value?: string | null): Vehicle["status"] => {
    const statusValue = (value || "").toLowerCase();
    if (statusValue.includes("maintenance")) return "maintenance";
    if (statusValue.includes("out") || statusValue.includes("inactive") || statusValue.includes("retired")) {
      return "out_of_service";
    }
    return "active";
  };

  const mapVehicleRow = (row: any): Vehicle => ({
    id: row.id,
    unit_number: row.unit_number || row.truck_number || row.unit || row.id,
    make: row.make || null,
    model: row.model || null,
    year: row.year || null,
    vin: row.vin || null,
    license_plate: row.license_plate || row.plate_number || null,
    registration_expiry: row.registration_expiry || row.registration_expiration || null,
    insurance_expiry: row.insurance_expiry || row.insurance_expiration || null,
    dot_inspection_due: row.dot_inspection_due || row.inspection_due || null,
    last_maintenance: row.last_maintenance || row.last_service_date || null,
    next_maintenance_due: row.next_maintenance_due || null,
    current_mileage: row.current_mileage || null,
    status: normalizeStatus(row.status),
    driver_assigned: row.driver_assigned || row.driver_name || null,
    location: row.location || null,
  });

  const mapMaintenanceRow = (row: any): MaintenanceRecord => {
    const completionDate =
      row.completed_at || row.submitted_at || row.created_at || "";
    const statusValue = (row.status || "").toLowerCase();
    const mappedStatus =
      statusValue.includes("completed")
        ? "completed"
        : statusValue.includes("progress") || statusValue.includes("acknowledged")
          ? "in_progress"
          : statusValue.includes("scheduled")
            ? "scheduled"
            : "scheduled";

    return {
      id: row.id,
      vehicle_id: row.truck_id || row.truck_number || "",
      vehicle_label: row.truck_number || row.truck_id || "",
      maintenance_type: row.issue_type || "Maintenance",
      description: row.description || "",
      cost: Number(row.actual_cost || row.estimated_cost || 0),
      date_completed: completionDate
        ? new Date(completionDate).toISOString().slice(0, 10)
        : "",
      mileage_at_service: Number(row.mileage || 0),
      next_due_date: row.scheduled_date || null,
      next_due_mileage: undefined,
      status: mappedStatus,
    };
  };

  const loadFleetData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let organizationId: string | null = null;
      if (user) {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        organizationId = membership?.organization_id || null;
      }

      const loadFromTable = async (table: string) => {
        let query = supabase.from(table).select("*");
        if (organizationId) {
          query = query.eq("organization_id", organizationId);
        }
        return query;
      };

      const vehicleSources = ["vehicles", "trucks", "ronyx_trucks"];
      let vehiclesData: Vehicle[] = [];

      for (const table of vehicleSources) {
        const { data, error } = await loadFromTable(table);
        if (error) {
          const message = error.message?.toLowerCase?.() || "";
          if (error.code === "42P01" || message.includes("does not exist")) {
            continue;
          }
          throw error;
        }
        vehiclesData = (data || []).map(mapVehicleRow);
        break;
      }

      setVehicles(vehiclesData);

      const vehicleIdSet = new Set(vehiclesData.map((vehicle) => vehicle.id));

      const { data: maintenanceData, error: maintenanceError } =
        await supabase
          .from("maintenance_requests")
          .select("*")
          .order("submitted_at", { ascending: false })
          .limit(200);

      if (!maintenanceError) {
        const filtered = (maintenanceData || []).filter((row: any) => {
          if (!row.truck_id) return true;
          if (vehicleIdSet.size === 0) return true;
          return vehicleIdSet.has(row.truck_id);
        });
        setMaintenanceRecords(filtered.map(mapMaintenanceRow));
      }

      // Calculate statistics
      const today = new Date();
      const thirtyDaysFromNow = new Date(
        today.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const totalVehicles = vehiclesData.length;
      const activeVehicles = vehiclesData.filter(
        (vehicle) => vehicle.status === "active",
      ).length;
      const maintenanceVehicles = vehiclesData.filter(
        (vehicle) => vehicle.status === "maintenance",
      ).length;
      const overdueInspections = vehiclesData.filter((vehicle) => {
        if (!vehicle.dot_inspection_due) return false;
        return new Date(vehicle.dot_inspection_due) < today;
      }).length;
      const expiringRegistrations = vehiclesData.filter((vehicle) => {
        if (!vehicle.registration_expiry) return false;
        return new Date(vehicle.registration_expiry) < thirtyDaysFromNow;
      }).length;
      const maintenanceAlerts = vehiclesData.filter((vehicle) => {
        if (!vehicle.next_maintenance_due) return false;
        return new Date(vehicle.next_maintenance_due) < thirtyDaysFromNow;
      }).length;

      setStats({
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicles,
        maintenance_vehicles: maintenanceVehicles,
        overdue_inspections: overdueInspections,
        expiring_registrations: expiringRegistrations,
        maintenance_alerts: maintenanceAlerts,
      });
    } catch (error) {
      console.error("Error loading fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case 'out_of_service':
        return <Badge className="bg-red-100 text-red-800">Out of Service</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return null;
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (expiryDate?: string | null) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);

    if (daysUntil === null) {
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    if (daysUntil <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Current</Badge>;
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const unit = vehicle.unit_number?.toLowerCase() || "";
    const make = vehicle.make?.toLowerCase() || "";
    const model = vehicle.model?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      unit.includes(term) || make.includes(term) || model.includes(term);

    const matchesFilter = filterStatus === "all" || vehicle.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const inspectionRows = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.dot_inspection_due)
        .map((vehicle) => ({
          id: vehicle.id,
          unit_number: vehicle.unit_number,
          due_date: vehicle.dot_inspection_due as string,
          mileage: vehicle.current_mileage || 0,
        })),
    [vehicles],
  );

  const renewalRows = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.registration_expiry)
        .map((vehicle) => ({
          id: vehicle.id,
          unit_number: vehicle.unit_number,
          due_date: vehicle.registration_expiry as string,
          mileage: vehicle.current_mileage || 0,
        })),
    [vehicles],
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading fleet data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Fleet Management</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total_vehicles}</div>
                <div className="text-sm text-gray-600">Total Vehicles</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.active_vehicles}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.maintenance_vehicles}</div>
                <div className="text-sm text-gray-600">In Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overdue_inspections}</div>
                <div className="text-sm text-gray-600">Overdue Inspections</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.expiring_registrations}</div>
                <div className="text-sm text-gray-600">Expiring Registrations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.maintenance_alerts}</div>
                <div className="text-sm text-gray-600">Maintenance Due</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'vehicles', label: 'Vehicles', icon: Truck },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'inspections', label: 'Inspections', icon: CheckCircle },
            { id: 'renewals', label: 'Renewals', icon: Calendar },
            { id: 'telematics', label: 'Telematics', icon: MapPin },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Telematics Tab Content */}
      {activeTab === 'telematics' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Live ELD/Telematics Data (Samsara)</h2>
          {eldLoading ? (
            <div>Loading telematics data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Driver Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driverLocations.length === 0 ? <div className="text-gray-500">No data</div> : (
                      <ul className="text-sm">
                        {driverLocations.map((d) => (
                          <li key={d.id} className="mb-1">{d.name} <span className="text-xs text-gray-500">({d.status})</span><br /><span className="text-xs">{d.lat}, {d.lon}</span></li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Truck Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {truckStatus.length === 0 ? <div className="text-gray-500">No data</div> : (
                      <ul className="text-sm">
                        {truckStatus.map((t) => (
                          <li key={t.id} className="mb-1">{t.name} <span className="text-xs text-gray-500">({t.status})</span><br /><span className="text-xs">{t.lat}, {t.lon}</span></li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>HOS (Hours of Service)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hos.length === 0 ? <div className="text-gray-500">No data</div> : (
                      <ul className="text-sm">
                        {hos.map((h) => (
                          <li key={h.id} className="mb-1">{h.name} <span className="text-xs text-gray-500">({h.hosStatus})</span></li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search vehicles by unit number, make, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">In Maintenance</SelectItem>
            <SelectItem value="out_of_service">Out of Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'vehicles' && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Unit #</th>
                    <th className="text-left p-3 font-semibold">Make/Model</th>
                    <th className="text-left p-3 font-semibold">Year</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Driver</th>
                    <th className="text-left p-3 font-semibold">Mileage</th>
                    <th className="text-left p-3 font-semibold">Registration</th>
                    <th className="text-left p-3 font-semibold">DOT Inspection</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{vehicle.unit_number}</td>
                      <td className="p-3">
                        {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "--"}
                      </td>
                      <td className="p-3">{vehicle.year || "--"}</td>
                      <td className="p-3">{getStatusBadge(vehicle.status)}</td>
                      <td className="p-3">{vehicle.driver_assigned || 'Unassigned'}</td>
                      <td className="p-3">
                        {vehicle.current_mileage !== null && vehicle.current_mileage !== undefined
                          ? vehicle.current_mileage.toLocaleString()
                          : "--"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.registration_expiry)}
                          <span className="text-sm text-gray-600">
                            {vehicle.registration_expiry
                              ? new Date(vehicle.registration_expiry).toLocaleDateString()
                              : "--"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.dot_inspection_due)}
                          <span className="text-sm text-gray-600">
                            {vehicle.dot_inspection_due
                              ? new Date(vehicle.dot_inspection_due).toLocaleDateString()
                              : "--"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Maintenance Records</div>
              <span className="text-sm text-gray-500">
                Updates sync from driver maintenance requests.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Type</th>
                    <th className="px-2 py-1 border">Description</th>
                    <th className="px-2 py-1 border">Date</th>
                    <th className="px-2 py-1 border">Mileage</th>
                    <th className="px-2 py-1 border">Cost</th>
                    <th className="px-2 py-1 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No maintenance records yet.</td></tr>
                  ) : maintenanceRecords.map(rec => {
                    const vehicle = vehicles.find(
                      v => v.id === rec.vehicle_id || v.unit_number === rec.vehicle_id,
                    );
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">
                          {rec.vehicle_label || vehicle?.unit_number || rec.vehicle_id}
                        </td>
                        <td className="px-2 py-1">{rec.maintenance_type}</td>
                        <td className="px-2 py-1">{rec.description}</td>
                        <td className="px-2 py-1">{rec.date_completed}</td>
                        <td className="px-2 py-1">{rec.mileage_at_service}</td>
                        <td className="px-2 py-1">${rec.cost}</td>
                        <td className="px-2 py-1">{rec.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inspections' && (
        <Card>
          <CardHeader>
            <CardTitle>DOT Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Inspections</div>
              <span className="text-sm text-gray-500">
                Upcoming inspections are derived from vehicle records.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Due Date</th>
                    <th className="px-2 py-1 border">Status</th>
                    <th className="px-2 py-1 border">Mileage</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-400">
                        No inspections due yet.
                      </td>
                    </tr>
                  ) : (
                    inspectionRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="px-2 py-1">{row.unit_number}</td>
                        <td className="px-2 py-1">
                          {new Date(row.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1">
                          {getExpiryBadge(row.due_date)}
                        </td>
                        <td className="px-2 py-1">{row.mileage}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'renewals' && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Renewals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Renewals</div>
              <span className="text-sm text-gray-500">
                Registration renewals sync from compliance data.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Due Date</th>
                    <th className="px-2 py-1 border">Status</th>
                    <th className="px-2 py-1 border">Mileage</th>
                  </tr>
                </thead>
                <tbody>
                  {renewalRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-400">
                        No renewals due yet.
                      </td>
                    </tr>
                  ) : (
                    renewalRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="px-2 py-1">{row.unit_number}</td>
                        <td className="px-2 py-1">
                          {new Date(row.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1">
                          {getExpiryBadge(row.due_date)}
                        </td>
                        <td className="px-2 py-1">{row.mileage}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
