"use client";
import { useState, useEffect } from "react";
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
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  registration_expiry: string;
  insurance_expiry: string;
  dot_inspection_due: string;
  last_maintenance: string;
  next_maintenance_due: string;
  current_mileage: number;
  status: 'active' | 'maintenance' | 'out_of_service';
  driver_assigned?: string;
  location?: string;
};

type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
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

  const loadFleetData = async () => {
    try {
      setLoading(true);

      // Load vehicles from Supabase
      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select('*');
      if (error) throw error;
      setVehicles(vehiclesData || []);

      // Calculate statistics
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

      const totalVehicles = vehiclesData?.length || 0;
      const activeVehicles = vehiclesData?.filter((v: Vehicle) => v.status === 'active').length || 0;
      const maintenanceVehicles = vehiclesData?.filter((v: Vehicle) => v.status === 'maintenance').length || 0;
      const overdueInspections = vehiclesData?.filter((v: Vehicle) => new Date(v.dot_inspection_due) < today).length || 0;
      const expiringRegistrations = vehiclesData?.filter((v: Vehicle) => new Date(v.registration_expiry) < thirtyDaysFromNow).length || 0;
      const maintenanceAlerts = vehiclesData?.filter((v: Vehicle) => new Date(v.next_maintenance_due) < thirtyDaysFromNow).length || 0;

      setStats({
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicles,
        maintenance_vehicles: maintenanceVehicles,
        overdue_inspections: overdueInspections,
        expiring_registrations: expiringRegistrations,
        maintenance_alerts: maintenanceAlerts
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

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Current</Badge>;
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

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
                      <td className="p-3">{vehicle.make} {vehicle.model}</td>
                      <td className="p-3">{vehicle.year}</td>
                      <td className="p-3">{getStatusBadge(vehicle.status)}</td>
                      <td className="p-3">{vehicle.driver_assigned || 'Unassigned'}</td>
                      <td className="p-3">{vehicle.current_mileage?.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.registration_expiry)}
                          <span className="text-sm text-gray-600">
                            {new Date(vehicle.registration_expiry).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.dot_inspection_due)}
                          <span className="text-sm text-gray-600">
                            {new Date(vehicle.dot_inspection_due).toLocaleDateString()}
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
              <Button onClick={() => {
                // Add a new sample record (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 1).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'Oil Change',
                    description: 'Changed oil and filter',
                    cost: 250,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: (vehicles[0]?.current_mileage || 0) + 10000,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Record
              </Button>
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
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
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
              <Button onClick={() => {
                // Add a new sample inspection (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 1001).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'DOT Inspection',
                    description: 'Annual DOT inspection completed',
                    cost: 150,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: undefined,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Inspection
              </Button>
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
                  {maintenanceRecords.filter(r => r.maintenance_type === 'DOT Inspection').length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No inspections yet.</td></tr>
                  ) : maintenanceRecords.filter(r => r.maintenance_type === 'DOT Inspection').map(rec => {
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
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

      {activeTab === 'renewals' && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Renewals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Renewals</div>
              <Button onClick={() => {
                // Add a new sample renewal (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 2001).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'Registration Renewal',
                    description: 'Annual registration renewed',
                    cost: 120,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: undefined,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Renewal
              </Button>
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
                  {maintenanceRecords.filter(r => r.maintenance_type === 'Registration Renewal').length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No renewals yet.</td></tr>
                  ) : maintenanceRecords.filter(r => r.maintenance_type === 'Registration Renewal').map(rec => {
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
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

    </div>
  );
}
