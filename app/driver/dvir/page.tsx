"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Wrench,
  FileText,
  Camera,
  MapPin
} from "lucide-react";

interface InspectionItem {
  id: string;
  category: string;
  item: string;
  status: 'satisfactory' | 'defective' | 'not_inspected';
  notes?: string;
  requiresPhoto?: boolean;
  photoUrl?: string;
}

interface DVIRData {
  id?: string;
  driver_name: string;
  truck_number: string;
  odometer_reading: number;
  inspection_type: 'pre_trip' | 'post_trip';
  location: string;
  inspection_items: InspectionItem[];
  overall_status: 'satisfactory' | 'defects_corrected' | 'defects_need_correction';
  driver_signature?: string;
  mechanic_signature?: string;
  defects_corrected?: boolean;
  created_at?: string;
}

const INSPECTION_CATEGORIES = {
  'Engine Compartment': [
    'Oil level',
    'Coolant level', 
    'Power steering fluid',
    'Windshield washer fluid',
    'Battery and connections',
    'Belts and hoses',
    'Air compressor',
    'Air lines and fittings'
  ],
  'Cab and Controls': [
    'Steering wheel and controls',
    'Horn operation',
    'Windshield and wipers',
    'Mirrors (all)',
    'Seatbelts',
    'Seat condition',
    'Dashboard warning lights',
    'HVAC system'
  ],
  'Lights and Electrical': [
    'Headlights (high/low beam)',
    'Tail lights',
    'Brake lights', 
    'Turn signals',
    'Hazard lights',
    'Marker/clearance lights',
    'License plate light',
    'Interior dome light'
  ],
  'Brakes and Air System': [
    'Air pressure build-up',
    'Air leakage test',
    'Service brake operation',
    'Parking brake operation',
    'Low air warning',
    'Air brake hoses',
    'Slack adjusters',
    'Brake drums/discs'
  ],
  'Tires and Wheels': [
    'Tire condition (tread depth)',
    'Tire pressure', 
    'Wheel condition',
    'Lug nuts',
    'Tire mounting',
    'Valve stems and caps',
    'Spare tire condition',
    'Tire matching'
  ],
  'Coupling and Trailer': [
    'Fifth wheel condition',
    'Coupling securement',
    'Safety chains',
    'Electrical connections',
    'Air lines',
    'Landing gear',
    'Trailer condition',
    'Cargo securement'
  ],
  'Suspension and Steering': [
    'Steering linkage',
    'Suspension components',
    'Shock absorbers',
    'Frame condition',
    'Exhaust system',
    'Fuel tank and lines',
    'Drive shaft',
    'Differential'
  ]
};

export default function DVIRPage() {
  const [currentDVIR, setCurrentDVIR] = useState<DVIRData>({
    driver_name: '',
    truck_number: '',
    odometer_reading: 0,
    inspection_type: 'pre_trip',
    location: '',
    inspection_items: [],
    overall_status: 'satisfactory'
  });
  
  const [recentDVIRs, setRecentDVIRs] = useState<DVIRData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('Engine Compartment');
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    initializeInspectionItems();
    loadRecentDVIRs();
  }, []);

  const initializeInspectionItems = () => {
    const items: InspectionItem[] = [];
    Object.entries(INSPECTION_CATEGORIES).forEach(([category, itemList]) => {
      itemList.forEach(item => {
        items.push({
          id: `${category}_${item}`.replace(/\s+/g, '_').toLowerCase(),
          category,
          item,
          status: 'not_inspected',
          requiresPhoto: item.includes('condition') || item.includes('damage')
        });
      });
    });
    
    setCurrentDVIR(prev => ({
      ...prev,
      inspection_items: items
    }));
  };

  const loadRecentDVIRs = async () => {
    try {
      const { data, error } = await supabase
        .from('dvir_inspections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentDVIRs(data || []);
    } catch (error) {
      console.error('Error loading recent DVIRs:', error);
    }
  };

  const updateInspectionItem = (itemId: string, updates: Partial<InspectionItem>) => {
    setCurrentDVIR(prev => ({
      ...prev,
      inspection_items: prev.inspection_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const getCurrentCategoryItems = () => {
    return currentDVIR.inspection_items.filter(item => 
      item.category === currentCategory
    );
  };

  const getCategoryStatus = (category: string) => {
    const categoryItems = currentDVIR.inspection_items.filter(item => 
      item.category === category
    );
    
    if (categoryItems.every(item => item.status === 'not_inspected')) {
      return 'not_started';
    }
    
    if (categoryItems.some(item => item.status === 'defective')) {
      return 'has_defects';
    }
    
    if (categoryItems.every(item => item.status !== 'not_inspected')) {
      return 'complete';
    }
    
    return 'in_progress';
  };

  const getOverallInspectionStatus = () => {
    const allItems = currentDVIR.inspection_items;
    const defectiveItems = allItems.filter(item => item.status === 'defective');
    const uninspectedItems = allItems.filter(item => item.status === 'not_inspected');
    
    if (uninspectedItems.length > 0) {
      return 'incomplete';
    }
    
    if (defectiveItems.length > 0) {
      return 'has_defects';
    }
    
    return 'satisfactory';
  };

  const submitDVIR = async () => {
    setLoading(true);
    
    try {
      const overallStatus = getOverallInspectionStatus();
      const defectiveItems = currentDVIR.inspection_items.filter(item => 
        item.status === 'defective'
      );

      const dvirData = {
        ...currentDVIR,
        overall_status: overallStatus === 'has_defects' ? 'defects_need_correction' : 'satisfactory',
        created_at: new Date().toISOString()
      };

      // Save DVIR
      const { data: savedDVIR, error: dvirError } = await supabase
        .from('dvir_inspections')
        .insert([dvirData])
        .select()
        .single();

      if (dvirError) throw dvirError;

      // Create maintenance requests for defective items
      if (defectiveItems.length > 0) {
        const maintenanceRequests = defectiveItems.map(item => ({
          truck_number: currentDVIR.truck_number,
          driver_name: currentDVIR.driver_name,
          issue_type: 'DVIR Defect',
          priority: 'High',
          description: `DVIR Defect - ${item.category}: ${item.item}${item.notes ? '\nNotes: ' + item.notes : ''}`,
          can_drive_safely: false,
          status: 'Pending',
          dvir_id: savedDVIR.id,
          submitted_at: new Date().toISOString()
        }));

        const { error: maintenanceError } = await supabase
          .from('maintenance_requests')
          .insert(maintenanceRequests);

        if (maintenanceError) {
          console.error('Error creating maintenance requests:', maintenanceError);
        }
      }

      alert(`DVIR submitted successfully! ${defectiveItems.length > 0 ? `${defectiveItems.length} maintenance request(s) created.` : ''}`);
      
      // Reset form
      setCurrentDVIR({
        driver_name: currentDVIR.driver_name,
        truck_number: '',
        odometer_reading: 0,
        inspection_type: 'pre_trip',
        location: '',
        inspection_items: [],
        overall_status: 'satisfactory'
      });
      initializeInspectionItems();
      loadRecentDVIRs();
      setShowSummary(false);

    } catch (error) {
      console.error('Error submitting DVIR:', error);
      alert('Error submitting DVIR. Please try again.');
    }
    
    setLoading(false);
  };

  if (showSummary) {
    const defectiveItems = currentDVIR.inspection_items.filter(item => 
      item.status === 'defective'
    );
    
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              DVIR Summary - {currentDVIR.inspection_type.replace('_', '-').toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Driver</label>
                <p className="font-semibold">{currentDVIR.driver_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Truck</label>
                <p className="font-semibold">{currentDVIR.truck_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Odometer</label>
                <p className="font-semibold">{currentDVIR.odometer_reading.toLocaleString()} mi</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="font-semibold">{currentDVIR.location}</p>
              </div>
            </div>

            {/* Defects Summary */}
            {defectiveItems.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {defectiveItems.length} Defect(s) Found
                </h3>
                <div className="space-y-2">
                  {defectiveItems.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded border">
                      <p className="font-medium text-red-700">
                        {item.category} - {item.item}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-red-700 mt-3 font-medium">
                  ⚠️ This vehicle should NOT be operated until defects are corrected!
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  No Defects Found - Vehicle is Safe to Operate
                </h3>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSummary(false)}
                variant="outline"
                className="flex-1"
              >
                Back to Inspection
              </Button>
              <Button
                onClick={submitDVIR}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Submitting...' : 'Submit DVIR'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Driver Vehicle Inspection Report (DVIR)
        </h1>
        <p className="text-gray-600">
          Complete your daily vehicle inspection as required by DOT regulations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(INSPECTION_CATEGORIES).map(category => {
                const status = getCategoryStatus(category);
                return (
                  <button
                    key={category}
                    onClick={() => setCurrentCategory(category)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2 ${
                      currentCategory === category
                        ? 'bg-blue-100 border-2 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    {status === 'not_started' && <Clock className="h-4 w-4 text-gray-400" />}
                    {status === 'in_progress' && <Clock className="h-4 w-4 text-yellow-500" />}
                    {status === 'has_defects' && <XCircle className="h-4 w-4 text-red-500" />}
                    {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    <span className="text-sm font-medium">{category}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Inspection Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Driver Name</label>
                <Input
                  value={currentDVIR.driver_name}
                  onChange={(e) => setCurrentDVIR(prev => ({
                    ...prev,
                    driver_name: e.target.value
                  }))}
                  placeholder="Enter driver name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Truck Number</label>
                <Input
                  value={currentDVIR.truck_number}
                  onChange={(e) => setCurrentDVIR(prev => ({
                    ...prev,
                    truck_number: e.target.value
                  }))}
                  placeholder="Enter truck number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inspection Type</label>
                <select
                  value={currentDVIR.inspection_type}
                  onChange={(e) => setCurrentDVIR(prev => ({
                    ...prev,
                    inspection_type: e.target.value as 'pre_trip' | 'post_trip'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="pre_trip">Pre-Trip</option>
                  <option value="post_trip">Post-Trip</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Odometer Reading</label>
                <Input
                  type="number"
                  value={currentDVIR.odometer_reading}
                  onChange={(e) => setCurrentDVIR(prev => ({
                    ...prev,
                    odometer_reading: parseInt(e.target.value) || 0
                  }))}
                  placeholder="Miles"
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Category Inspection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {currentCategory} Inspection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getCurrentCategoryItems().map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{item.item}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateInspectionItem(item.id, { status: 'satisfactory' })}
                        className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${
                          item.status === 'satisfactory'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Good
                      </button>
                      <button
                        onClick={() => updateInspectionItem(item.id, { status: 'defective' })}
                        className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${
                          item.status === 'defective'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        Defect
                      </button>
                    </div>
                  </div>
                  
                  {item.status === 'defective' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1">
                        Describe the defect:
                      </label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateInspectionItem(item.id, { notes: e.target.value })}
                        placeholder="Describe what's wrong and severity..."
                        rows={3}
                      />
                      {item.requiresPhoto && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Add Photo (Recommended)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowSummary(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!currentDVIR.driver_name || !currentDVIR.truck_number}
            >
              Review & Submit DVIR
            </Button>
          </div>

          {/* Recent DVIRs */}
          {recentDVIRs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent DVIRs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentDVIRs.map((dvir, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Truck className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{dvir.truck_number}</span>
                        <span className="text-sm text-gray-600">
                          {dvir.inspection_type.replace('_', '-').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(dvir.created_at!).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dvir.overall_status === 'satisfactory' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {dvir.overall_status.includes('defects') && (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          dvir.overall_status === 'satisfactory' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {dvir.overall_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
