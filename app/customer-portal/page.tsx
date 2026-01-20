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
import LoadRequestForm from "./components/LoadRequestForm";

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
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showLoadRequestForm, setShowLoadRequestForm] = useState(false);
  const [features, setFeatures] = useState<{ [key: string]: boolean }>({});
  const [selectedLoad, setSelectedLoad] = useState<LoadRequest | null>(null);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    primaryContact: "",
    phone: "",
    email: "",
  });

  const normalizeStatus = (status: string) => {
    const value = status?.toLowerCase?.() || "pending";
    if (value.includes("in_transit")) return "in_transit";
    if (value.includes("delivered")) return "delivered";
    if (value.includes("invoiced")) return "invoiced";
    if (value.includes("quoted")) return "quoted";
    if (value.includes("booked")) return "booked";
    return value as LoadRequest["status"];
  };

  const mapTrackingUpdates = (updates: any[]) => {
    const sorted = [...updates].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return sorted.map((update) => ({
      timestamp: update.timestamp || update.created_at,
      status: update.status,
      location: update.location,
      notes: update.notes,
    }));
  };

  const mapLoadRequest = (row: any): LoadRequest => {
    const updates = mapTrackingUpdates(row.tracking_updates || []);
    return {
      id: row.id,
      status: normalizeStatus(row.status || "pending"),
      origin: {
        address: row.origin_address || "",
        city: row.origin_city || "",
        state: row.origin_state || "",
        zipCode: row.origin_zip_code || "",
      },
      destination: {
        address: row.destination_address || "",
        city: row.destination_city || "",
        state: row.destination_state || "",
        zipCode: row.destination_zip_code || "",
      },
      pickupDate: row.pickup_date,
      deliveryDate: row.delivery_date || undefined,
      commodity: row.commodity || "",
      weight: Number(row.weight || 0),
      equipment: row.equipment_type || row.equipment || "van",
      specialRequirements: row.special_requirements || undefined,
      estimatedRate: row.estimated_rate || undefined,
      finalRate: row.final_rate || row.actual_rate || undefined,
      createdAt: row.created_at,
      tracking:
        updates.length > 0
          ? {
              currentLocation: updates[0]?.location || "Unknown",
              estimatedDelivery: row.delivery_date || undefined,
              updates,
            }
          : undefined,
    };
  };

  async function fetchLoadRequests(id: string) {
    const res = await fetch(`/api/customer/load-requests?customerId=${id}`);
    if (!res.ok) {
      throw new Error("Failed to load load requests");
    }
    const data = await res.json();
    const mapped = Array.isArray(data) ? data.map(mapLoadRequest) : [];
    setLoadRequests(mapped);
  }

  async function fetchInvoices(id: string) {
    const res = await fetch(`/api/customer/invoices?customerId=${id}`);
    if (!res.ok) {
      throw new Error("Failed to load invoices");
    }
    const data = await res.json();
    const mapped = Array.isArray(data)
      ? data.map((invoice: any) => ({
          id: invoice.id,
          loadRequestId: invoice.loadRequestId,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          downloadUrl: invoice.downloadUrl,
        }))
      : [];
    setInvoices(mapped);
  }

  useEffect(() => {
    let ignore = false;

    async function initialize() {
      if (typeof window !== "undefined" && !localStorage.getItem("onboarded")) {
        window.location.href = "/onboarding";
        return;
      }

      setDataLoading(true);
      setDataError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDataLoading(false);
        return;
      }

      if (!ignore) {
        setCustomerId(user.id);
        setAccountInfo({
          primaryContact: user.user_metadata?.full_name || user.email || "",
          phone: user.user_metadata?.phone || "",
          email: user.email || "",
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (!ignore && profile) {
        setAccountInfo({
          primaryContact:
            profile.full_name || user.user_metadata?.full_name || user.email || "",
          phone: profile.phone || user.user_metadata?.phone || "",
          email: user.email || "",
        });
      }

      const { data: payments } = await supabase
        .from("payments")
        .select("addons, status")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!ignore) {
        const unlocked: { [key: string]: boolean } = {};
        (payments || []).forEach((payment: any) => {
          (payment.addons || []).forEach((addon: string) => {
            unlocked[addon] = true;
          });
        });
        setFeatures(unlocked);
      }

      try {
        await Promise.all([fetchLoadRequests(user.id), fetchInvoices(user.id)]);
      } catch (err: any) {
        if (!ignore) {
          setDataError(err.message || "Failed to load portal data");
        }
      } finally {
        if (!ignore) {
          setDataLoading(false);
        }
      }
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLoadRequestSubmit = async (formData: any) => {
    try {
      setLoading(true);
      if (!customerId) {
        throw new Error("Customer account not found.");
      }

      const response = await fetch("/api/customer/load-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit load request.");
      }

      const data = await response.json();
      const mapped = mapLoadRequest(data);
      setLoadRequests((prev) => [mapped, ...prev]);
      setShowLoadRequestForm(false);
      alert("Load request submitted successfully!");
    } catch (error) {
      console.error('Error submitting load request:', error);
      alert('Failed to submit load request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLoadDetails = (load: LoadRequest) => {
    setSelectedLoad(load);
    setShowLoadDetails(true);
  };

  const handleTrackShipment = async (load: LoadRequest) => {
    setActiveTab("tracking");

    try {
      const response = await fetch(
        `/api/customer/tracking?loadRequestId=${load.id}`,
      );
      if (response.ok) {
        const trackingData = await response.json();
        setLoadRequests((prev) =>
          prev.map((item) =>
            item.id === load.id
              ? {
                  ...item,
                  tracking: {
                    currentLocation: trackingData.currentLocation,
                    estimatedDelivery: trackingData.estimatedDelivery,
                    updates: trackingData.updates || [],
                  },
                }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error("Error loading tracking data:", error);
    }

    setTimeout(() => {
      const element = document.getElementById(`tracking-${load.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        const response = await fetch("/api/customer/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: invoice.id,
            status: "paid",
            paidDate: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update invoice status");
        }

        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id
              ? { ...inv, status: "paid", paidDate: new Date().toISOString() }
              : inv,
          ),
        );

        alert("Payment processed successfully!");
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

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading customer portal...</div>
      </div>
    );
  }

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
                <p className="font-medium">
                  {accountInfo.primaryContact || "Customer"}
                </p>
                <p className="text-gray-500">
                  {customerId ? `Customer #${customerId.slice(0, 8)}` : "Customer"}
                </p>
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
        {dataError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {dataError}
          </div>
        )}
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
                    <Input
                      value={accountInfo.primaryContact || "Customer"}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer ID</label>
                    <Input value={customerId ? customerId.slice(0, 8) : ""} readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Manager</label>
                    <Input value={accountInfo.primaryContact || ""} readOnly />
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

        {/* Load Request Form Modal */}
        {showLoadRequestForm && (
          <LoadRequestForm
            onSubmit={handleLoadRequestSubmit}
            onCancel={() => setShowLoadRequestForm(false)}
          />
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
