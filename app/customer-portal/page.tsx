"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Package, 
  MapPin, 
  Calendar,
  DollarSign,
  Truck,
  Clock,
  FileText,
  Eye,
  Download,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  PlusCircle,
  Search
} from "lucide-react";
// import LoadRequestForm from './components/LoadRequestForm';

interface LoadRequest {
  id: string;
  status: 'pending' | 'quoted' | 'booked' | 'in_transit' | 'delivered' | 'invoiced';
  origin: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  destination: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  pickupDate: string;
  deliveryDate?: string;
  commodity: string;
  weight: number;
  equipment: 'van' | 'flatbed' | 'reefer' | 'tanker';
  specialRequirements?: string;
  estimatedRate?: number;
  finalRate?: number;
  createdAt: string;
  tracking?: {
    currentLocation?: string;
    estimatedDelivery?: string;
    updates: Array<{
      timestamp: string;
      status: string;
      location: string;
      notes?: string;
    }>;
  };
}

interface Invoice {
  id: string;
  loadRequestId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  paidDate?: string;
  downloadUrl?: string;
}


import dynamic from "next/dynamic";
const ChatWidget = dynamic(() => import("./components/ChatWidget"), { ssr: false });
const DocumentCenter = dynamic(() => import("./components/DocumentCenter"), { ssr: false });
const RoleManager = dynamic(() => import("./components/RoleManager"), { ssr: false });
const WhiteLabelSettings = dynamic(() => import("./components/WhiteLabelSettings"), { ssr: false });
const PartnerAPI = dynamic(() => import("./components/PartnerAPI"), { ssr: false });
const AnalyticsDashboard = dynamic(() => import("./components/AnalyticsDashboard"), { ssr: false });
const AIInsights = dynamic(() => import("./components/AIInsights"), { ssr: false });

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState("loads");
  const [loadRequests, setLoadRequests] = useState<LoadRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoadRequestForm, setShowLoadRequestForm] = useState(false);
  const [features, setFeatures] = useState<{ [key: string]: boolean }>({});
  const [selectedLoad, setSelectedLoad] = useState<LoadRequest | null>(null);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const [accountInfo, setAccountInfo] = useState({ primaryContact: 'John Smith', phone: '(555) 123-4567', email: 'john.smith@abcmfg.com' });

  // Mock data
  useEffect(() => {
    // If not onboarded, redirect to onboarding
    if (typeof window !== 'undefined' && !localStorage.getItem('onboarded')) {
      window.location.href = '/onboarding';
      return;
    }
    // Feature gating: check user's approved payments for upgrades
    (async () => {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      if (!user) return;
      const { data } = await supabase.from("payments").select("addons, status").eq("user_id", user.id).eq("status", "active");
      const unlocked: { [key: string]: boolean } = {};
      (data || []).forEach((p: any) => {
        (p.addons || []).forEach((a: string) => { unlocked[a] = true; });
      });
      setFeatures(unlocked);
    })();
    // Initialize with sample data
    const mockLoadRequests: LoadRequest[] = [
      {
        id: 'LR-2024-001',
        status: 'in_transit',
        origin: {
          address: '1234 Industrial Blvd',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        destination: {
          address: '5678 Commerce St',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30301'
        },
        pickupDate: '2025-11-01',
        deliveryDate: '2025-11-03',
        commodity: 'Electronics Equipment',
        weight: 45000,
        equipment: 'van',
        estimatedRate: 2800,
        finalRate: 2850,
        createdAt: '2025-10-28T10:00:00Z',
        tracking: {
          currentLocation: 'Birmingham, AL',
          estimatedDelivery: '2025-11-03T14:00:00Z',
          updates: [
            {
              timestamp: '2025-11-01T08:00:00Z',
              status: 'Picked up',
              location: 'Houston, TX',
              notes: 'Loaded and secured, departed on schedule'
            },
            {
              timestamp: '2025-11-01T18:30:00Z',
              status: 'In transit',
              location: 'Shreveport, LA',
              notes: 'Completed required rest break'
            },
            {
              timestamp: '2025-11-02T14:15:00Z',
              status: 'In transit',
              location: 'Birmingham, AL',
              notes: 'On schedule for delivery tomorrow'
            }
          ]
        }
      },
      {
        id: 'LR-2024-002',
        status: 'quoted',
        origin: {
          address: '9876 Manufacturing Way',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201'
        },
        destination: {
          address: '4321 Distribution Dr',
          city: 'Phoenix',
          state: 'AZ',
          zipCode: '85001'
        },
        pickupDate: '2025-11-05',
        commodity: 'Industrial Machinery',
        weight: 52000,
        equipment: 'flatbed',
        specialRequirements: 'Tarps required, oversize permits needed',
        estimatedRate: 3200,
        createdAt: '2025-10-30T15:30:00Z'
      }
    ];

    const mockInvoices: Invoice[] = [
      {
        id: 'INV-2024-156',
        loadRequestId: 'LR-2024-001',
        amount: 2850,
        status: 'sent',
        dueDate: '2025-11-15',
        downloadUrl: '#'
      }
    ];

    setLoadRequests(mockLoadRequests);
    setInvoices(mockInvoices);
  }, []);

  const handleLoadRequestSubmit = async (formData: any) => {
    try {
      setLoading(true);
      // Here you would make an API call to submit the load request
      console.log('Submitting load request:', formData);
      
      // For demo purposes, add to local state
      const newLoadRequest: LoadRequest = {
        id: `LR-2024-${String(loadRequests.length + 1).padStart(3, '0')}`,
        status: 'pending',
        origin: formData.origin,
        destination: formData.destination,
        pickupDate: formData.pickupDate,
        deliveryDate: formData.deliveryDate,
        commodity: formData.commodity,
        weight: formData.weight,
        equipment: formData.equipment as 'van' | 'flatbed' | 'reefer' | 'tanker',
        specialRequirements: formData.specialRequirements,
        createdAt: new Date().toISOString()
      };
      
      setLoadRequests(prev => [newLoadRequest, ...prev]);
      setShowLoadRequestForm(false);
    } catch (error) {
      console.error('Error submitting load request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLoadDetails = (load: LoadRequest) => {
    setSelectedLoad(load);
    setShowLoadDetails(true);
  };

  const handleTrackShipment = (load: LoadRequest) => {
    setActiveTab('tracking');
    // Scroll to the tracking section for this load if needed
    setTimeout(() => {
      const element = document.getElementById(`tracking-${load.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      if (invoice.downloadUrl && invoice.downloadUrl !== '#') {
        window.open(invoice.downloadUrl, '_blank');
      } else {
        // Generate or fetch invoice PDF
        const response = await fetch(`/api/invoices/${invoice.id}/download`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoice.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          alert('Invoice PDF not available yet. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const handleDownloadAllInvoices = async () => {
    try {
      const response = await fetch('/api/invoices/download-all');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Unable to download all invoices. Please contact support.');
      }
    } catch (error) {
      console.error('Error downloading all invoices:', error);
      alert('Failed to download invoices. Please try again.');
    }
  };

  const handlePayInvoice = async (invoice: Invoice) => {
    try {
      // Redirect to payment page or open payment modal
      const confirmPay = confirm(`Pay invoice ${invoice.id} for $${invoice.amount.toLocaleString()}?`);
      if (confirmPay) {
        // Here you would integrate with payment gateway
        // For now, update status locally
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, status: 'paid' as const, paidDate: new Date().toISOString() }
            : inv
        ));
        alert('Payment processed successfully! (This is a demo - no actual payment was processed)');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const handleUpdateAccountInfo = async () => {
    try {
      setLoading(true);
      // Update account information
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      if (user) {
        // Update user metadata or customer profile
        const { error } = await supabase
          .from('customer_profiles')
          .upsert({
            user_id: user.id,
            primary_contact: accountInfo.primaryContact,
            phone: accountInfo.phone,
            email: accountInfo.email,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
        alert('Account information updated successfully!');
      }
    } catch (error) {
      console.error('Error updating account info:', error);
      alert('Failed to update account information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'quoted': return 'bg-blue-100 text-blue-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'quoted': return <FileText className="w-4 h-4" />;
      case 'booked': return <CheckCircle className="w-4 h-4" />;
      case 'in_transit': return <Truck className="w-4 h-4" />;
      case 'delivered': return <Package className="w-4 h-4" />;
      case 'invoiced': return <DollarSign className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-gray-600">Welcome back! Manage your shipments and account.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-medium">ABC Manufacturing Corp</p>
                <p className="text-gray-500">Customer #12345</p>
              </div>
              <Button onClick={() => setShowLoadRequestForm(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                New Load Request
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="loads">Loads</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="analytics" disabled={!features["advanced_reports"]}>Analytics</TabsTrigger>
              <TabsTrigger value="ai" disabled={!features["ai"]}>AI Insights</TabsTrigger>
              <TabsTrigger value="account">
                <FileText className="w-4 h-4" />
                Account
              </TabsTrigger>
            </TabsList>

            {/* Load Requests Tab */}
          <TabsContent value="loads" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Load Requests</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search loads..." className="pl-10 w-64" />
                </div>
                <Button onClick={() => setShowLoadRequestForm(true)}>Request New Load</Button>
              </div>
            </div>

            <div className="grid gap-4">
              {loadRequests.map((load) => (
                <Card key={load.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{load.id}</h3>
                          <p className="text-gray-600">{load.commodity}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(load.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(load.status)}
                          {load.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </Badge>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{load.origin.city}, {load.origin.state}</span>
                      </div>
                      <div className="flex-1 border-t border-dashed border-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{load.destination.city}, {load.destination.state}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500">Pickup Date</p>
                        <p className="font-medium">{new Date(load.pickupDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Weight</p>
                        <p className="font-medium">{load.weight.toLocaleString()} lbs</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Equipment</p>
                        <p className="font-medium capitalize">{load.equipment}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Rate</p>
                        <p className="font-medium text-green-600">
                          ${(load.finalRate || load.estimatedRate || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-xs text-gray-500">
                        Created {new Date(load.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewLoadDetails(load)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        {load.tracking && (
                          <Button size="sm" onClick={() => handleTrackShipment(load)}>
                            <Truck className="w-4 h-4 mr-1" />
                            Track Shipment
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <Button variant="outline" onClick={handleDownloadAllInvoices}>Download All</Button>
            </div>

            <div className="grid gap-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{invoice.id}</h3>
                          <p className="text-gray-600">Load: {invoice.loadRequestId}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">${invoice.amount.toLocaleString()}</p>
                        <Badge className={
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                          <Download className="w-4 h-4 mr-1" />
                          Download PDF
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button size="sm" onClick={() => handlePayInvoice(invoice)}>Pay Now</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <h2 className="text-lg font-semibold">Live Tracking</h2>
            
            {loadRequests
              .filter(load => load.tracking && load.status === 'in_transit')
              .map((load) => (
                <Card key={load.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      {load.id} - {load.commodity}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Status */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Current Location</p>
                          <p className="text-lg">{load.tracking?.currentLocation}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Estimated Delivery</p>
                          <p className="font-medium">
                            {load.tracking?.estimatedDelivery && 
                              new Date(load.tracking.estimatedDelivery).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tracking Updates */}
                    <div>
                      <h4 className="font-medium mb-3">Tracking Updates</h4>
                      <div className="space-y-3">
                        {load.tracking?.updates.map((update, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{update.status}</p>
                                  <p className="text-sm text-gray-600">{update.location}</p>
                                  {update.notes && (
                                    <p className="text-sm text-gray-500 mt-1">{update.notes}</p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {new Date(update.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <DocumentCenter />
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <RoleManager />
            <WhiteLabelSettings />
            <PartnerAPI />
            <h2 className="text-lg font-semibold">Account Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input value="ABC Manufacturing Corp" readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer ID</label>
                    <Input value="12345" readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Manager</label>
                    <Input value="Sarah Johnson" readOnly />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Primary Contact</label>
                    <Input 
                      value={accountInfo.primaryContact}
                      onChange={(e) => setAccountInfo(prev => ({ ...prev, primaryContact: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      value={accountInfo.phone}
                      onChange={(e) => setAccountInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      value={accountInfo.email}
                      onChange={(e) => setAccountInfo(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleUpdateAccountInfo} disabled={loading}>
                    {loading ? 'Updating...' : 'Update Information'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Load Request Form Modal - Temporarily Disabled */}
        {showLoadRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md">
              <h2 className="text-lg font-bold mb-4">Load Request Form</h2>
              <p className="mb-4">Load request form temporarily disabled during build optimization.</p>
              <Button onClick={() => setShowLoadRequestForm(false)}>Close</Button>
            </div>
          </div>
        )}

        {/* Load Details Modal */}
        {showLoadDetails && selectedLoad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLoadDetails(false)}>
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Load Details: {selectedLoad.id}</h2>
                <Button variant="outline" onClick={() => setShowLoadDetails(false)}>Close</Button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Status</h3>
                  <p className="text-lg">{selectedLoad.status.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Origin</h3>
                    <p>{selectedLoad.origin.address}</p>
                    <p>{selectedLoad.origin.city}, {selectedLoad.origin.state} {selectedLoad.origin.zipCode}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Destination</h3>
                    <p>{selectedLoad.destination.address}</p>
                    <p>{selectedLoad.destination.city}, {selectedLoad.destination.state} {selectedLoad.destination.zipCode}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Commodity</h3>
                  <p>{selectedLoad.commodity}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Weight</h3>
                    <p>{selectedLoad.weight.toLocaleString()} lbs</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Equipment</h3>
                    <p>{selectedLoad.equipment}</p>
                  </div>
                </div>
                {selectedLoad.finalRate && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Final Rate</h3>
                    <p className="text-lg font-bold">${selectedLoad.finalRate.toLocaleString()}</p>
                  </div>
                )}
                {selectedLoad.specialRequirements && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Special Requirements</h3>
                    <p>{selectedLoad.specialRequirements}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
