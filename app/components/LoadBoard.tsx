"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { MapPin, Search, Filter, RefreshCw, Star, Package } from "lucide-react";

type Filters = {
  equipmentType: string;
  minRate: number;
  maxWeight: number;
  excludeHazmat: boolean;
  teamDriverOnly: boolean;
};

const LoadBoard = () => {
  const [filters, setFilters] = useState<Filters>({
    equipmentType: "all",
    minRate: 0,
    maxWeight: 80000,
    excludeHazmat: false,
    teamDriverOnly: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [loads, setLoads] = useState<any[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAvailableLoads();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line
  }, [loads, searchTerm, filters]);

  const loadAvailableLoads = async () => {
    setLoading(true);
    try {
      // Simulate API call with sample data
      const sampleLoads = [
        {
          id: 'LD001',
          origin: { city: 'Dallas', state: 'TX', zipCode: '75201' },
          destination: { city: 'Houston', state: 'TX', zipCode: '77001' },
          pickupDate: '2025-11-01',
          deliveryDate: '2025-11-02',
          equipment: 'van',
          weight: 42000,
          rate: 2800,
          rateType: 'flat_rate',
          miles: 789,
          ratePerMile: 3.55,
          commodity: 'Electronics',
          broker: {
    minRate: 0,
            name: 'Prime Logistics',
            mcNumber: 'MC-123456',
            rating: 4.5,
            paymentTerms: 'Quick Pay 1-2 days'
          },
          requirements: ['TWIC Card', 'No touch freight'],
          hazmat: false,
          teamDriver: false,
          expedite: false,
          status: 'available',
          createdAt: '2025-10-31T10:00:00Z',
          expires: '2025-11-01T18:00:00Z'
        },
        {
          id: 'LD002',
          origin: { city: 'Los Angeles', state: 'CA', zipCode: '90001' },
          destination: { city: 'Denver', state: 'CO', zipCode: '80201' },
          pickupDate: '2025-11-03',
          deliveryDate: '2025-11-05',
          equipment: 'flatbed',
          weight: 48000,
          rate: 2200,
          rateType: 'flat_rate',
          miles: 1016,
          ratePerMile: 2.17,
          commodity: 'Building Materials',
          broker: {
            name: 'Western Freight Solutions',
            mcNumber: 'MC-789012',
            rating: 4.2,
            paymentTerms: 'NET 30'
          },
          requirements: ['Tarps', 'Straps provided'],
          hazmat: false,
          teamDriver: false,
          expedite: true,
          status: 'available',
          createdAt: '2025-10-31T08:30:00Z',
          expires: '2025-11-01T20:00:00Z'
        },
        {
          id: 'LD003',
          origin: { city: 'Chicago', state: 'IL', zipCode: '60601' },
          destination: { city: 'Miami', state: 'FL', zipCode: '33101' },
          pickupDate: '2025-11-04',
          equipment: 'reefer',
          weight: 40000,
          rate: 3500,
          rateType: 'flat_rate',
          miles: 1377,
          ratePerMile: 2.54,
          commodity: 'Frozen Foods',
          broker: {
            name: 'Cold Chain Logistics',
            mcNumber: 'MC-345678',
            rating: 4.8,
            paymentTerms: 'Factor Friendly'
          },
          requirements: ['Temperature controlled', 'HACCP certified'],
          hazmat: false,
          teamDriver: true,
          expedite: false,
          status: 'available',
          createdAt: '2025-10-31T12:15:00Z'
        }
      ];
      setLoads(sampleLoads);
    } catch (error) {
      setError('Failed to load loads');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = loads;
    if (searchTerm) {
      filtered = filtered.filter(load => 
        load.origin.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.destination.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.broker.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filters.equipmentType !== 'all') {
      filtered = filtered.filter(load => load.equipment === filters.equipmentType);
    }
    if (filters.minRate > 0) {
      filtered = filtered.filter(load => load.ratePerMile >= filters.minRate);
    }
    filtered = filtered.filter(load => load.weight <= filters.maxWeight);
    if (filters.excludeHazmat) {
      filtered = filtered.filter(load => !load.hazmat);
    }
    if (filters.teamDriverOnly) {
      filtered = filtered.filter(load => load.teamDriver);
    }
    setFilteredLoads(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableLoads();
    setRefreshing(false);
  };

  const bookLoad = async (loadId: string) => {
    try {
      setLoads(prev => prev.map(load => 
        load.id === loadId ? { ...load, status: 'booked' as const } : load
      ));
      alert('Load booking request sent successfully!');
    } catch (error) {
      alert('Failed to book load. Please try again.');
    }
  };

  const getEquipmentIcon = (equipment: string) => {
    switch (equipment) {
      case 'van': return '🚚';
      case 'flatbed': return '🚛';
      case 'reefer': return '🧊';
      case 'tanker': return '🛢️';
      default: return '📦';
    }
  };

  const getRateColor = (ratePerMile: number) => {
    if (ratePerMile >= 3.0) return 'text-green-600';
    if (ratePerMile >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Load Board</h1>
          <p className="text-gray-600">Find available loads and manage bookings</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Loads
        </Button>
      </div>
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by city, commodity, or broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Equipment Type</label>
                <select
                  value={filters.equipmentType}
                  onChange={(e) => setFilters((prev: Filters) => ({ ...prev, equipmentType: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Equipment</option>
                  <option value="van">Dry Van</option>
                  <option value="flatbed">Flatbed</option>
                  <option value="reefer">Refrigerated</option>
                  <option value="tanker">Tanker</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Rate/Mile</label>
                <Input
                  type="number"
                  step="0.25"
                    value={filters.minRate}
                    onChange={(e) => setFilters((prev: Filters) => ({ ...prev, minRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="$0.00"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.excludeHazmat}
                      onChange={(e) => setFilters((prev: Filters) => ({ ...prev, excludeHazmat: e.target.checked }))}
                  />
                  <span className="text-sm">No Hazmat</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.teamDriverOnly}
                      onChange={(e) => setFilters((prev: Filters) => ({ ...prev, teamDriverOnly: e.target.checked }))}
                  />
                  <span className="text-sm">Team Only</span>
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredLoads.length} of {loads.length} available loads
        </p>
      </div>
      {/* Load List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLoads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No loads found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLoads.map((load) => (
            <Card key={load.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEquipmentIcon(load.equipment)}</span>
                    <div>
                      <h3 className="font-semibold text-lg">Load {load.id}</h3>
                      <p className="text-gray-600">{load.commodity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${load.rate.toLocaleString()}
                    </p>
                    <p className={`text-sm ${getRateColor(load.ratePerMile)}`}>
                      ${load.ratePerMile.toFixed(2)}/mile
                    </p>
                  </div>
                </div>
                {/* Route */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{load.origin.city}, {load.origin.state}</span>
                  </div>
                  {/* Replace with a route icon if available */}
                  <span className="mx-2">→</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{load.destination.city}, {load.destination.state}</span>
                  </div>
                  <Badge variant="outline">{load.miles} miles</Badge>
                </div>
                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Pickup Date</p>
                    <p className="font-medium">{new Date(load.pickupDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="font-medium">{load.weight.toLocaleString()} lbs</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Equipment</p>
                    <p className="font-medium capitalize">{load.equipment}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Broker</p>
                    <div className="flex items-center gap-1">
                      <p className="font-medium">{load.broker.name}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(load.broker.rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {load.hazmat && <Badge variant="destructive">Hazmat</Badge>}
                  {load.teamDriver && <Badge variant="secondary">Team Driver</Badge>}
                  {load.expedite && <Badge variant="default">Expedite</Badge>}
                  <Badge variant="outline">{load.broker.paymentTerms}</Badge>
                </div>
                {/* Requirements */}
                {load.requirements && load.requirements.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Requirements:</p>
                    <p className="text-sm">{load.requirements.join(', ')}</p>
                  </div>
                )}
                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Posted {new Date(load.createdAt).toLocaleString()}
                    {load.expires && (
                      <span className="ml-2">
                        • Expires {new Date(load.expires).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button 
                      onClick={() => bookLoad(load.id)}
                      disabled={load.status !== 'available'}
                      size="sm"
                    >
                      {load.status === 'available' ? 'Book Load' : 'Booked'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadBoard;
