  // Approve Ticket logic
  // Approve Ticket logic (full implementation)
  async function approveTicket() {
    if (!selectedTicket) return;
    try {
      // 1. Save updated fields (if dispatcher edited)
      let updatedFields: any = {};
      if (ocrFields) {
        updatedFields = {
          tons: ocrFields.tons,
          material_name: ocrFields.material,
          price_per_ton: ocrFields.price_per_ton,
          total_amount: ocrFields.total_amount,
          ticket_number: ocrFields.ticket_number,
          customer_name: ocrFields.customer_name,
          plant_name: ocrFields.plant,
        };
      }
      await supabase
        .from('aggregate_tickets')
        .update({
          ...updatedFields,
          status: 'approved',
        })
        .eq('id', selectedTicket.id);

      // 2. Recalculate pay (Phase 1 function already exists)
      await supabase.rpc('calculate_driver_pay', { ticket_id: selectedTicket.id });

      // 3. Update load auto-advance
      await supabase.rpc('auto_advance_load', { ticket_id: selectedTicket.id });

      // 4. Insert into load_status_history (handled by auto_advance_load)

      // 5. Broadcast realtime update (optional, if using supabase.realtime)
      if (realtimeClient) {
        const channel = realtimeClient.channel(`ticket:${selectedTicket.id}:ocr`, { config: { private: true } });
        channel.send({
          type: 'broadcast',
          event: 'ticket_approved',
          payload: { ticket_id: selectedTicket.id, status: 'approved' }
        });
      }

      // 6. UI Behavior: lock fields, show badge, close modal, mark complete
      setOcrStatus('approved');
      toast.success('Ticket approved!');
      await loadTicketData();
      setTimeout(() => {
        setSelectedTicket(null);
        setOcrFields(null);
      }, 1200);
    } catch (error) {
      toast.error('Failed to approve ticket.');
      console.error(error);
    }
  }
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabaseClient";
import { createClient } from '@supabase/supabase-js';
import { uploadTicketImage } from "../../utils/uploadTicketImage";
import toast from "react-hot-toast";
import { 
  FileText, 
  Truck, 
  User, 
  MapPin, 
  Calendar,
  DollarSign,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Download
} from "lucide-react";

interface AggregateTicket {
  id: string;
  ticket_number: string;
  driver_id: string;
  truck_id: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  rate: number;
  total_amount: number;
  pickup_location: string;
  delivery_location: string;
  pickup_date: string;
  delivery_date: string;
  status: 'pending' | 'approved' | 'invoiced' | 'paid' | 'cancelled' | 'ocr_completed';
  odometer_start: number;
  odometer_end: number;
  fuel_used: number;
  notes: string;
  created_at: string;
  // Related data
  driver_name?: string;
  truck_number?: string;
// ...existing code (no stray bracket at end)

interface Driver {
  id: string;
  name: string;
  phone: string;
  cdl_number: string;
// ...existing code... (no stray bracket at end)
}
interface TruckInfo {
  id: string;
  truck_number: string;
  make: string;
  model: string;
  year: number;
}

  const [tickets, setTickets] = useState<AggregateTicket[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<AggregateTicket | null>(null);
  const [ocrFields, setOcrFields] = useState<any>(null);
  const [ocrStatus, setOcrStatus] = useState<'pending' | 'completed' | 'approved'>('pending');
  const [session, setSession] = useState<any>(null);
  const [realtimeClient, setRealtimeClient] = useState<any>(null);
  // Fetch session and set up realtime client
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        // Use the already-imported supabase client for realtime
        await supabase.realtime.setAuth(session.access_token);
        setRealtimeClient(supabase);
      }
    };
    fetchSession();
  }, []);

  // Real-time OCR subscription logic
  useEffect(() => {
    if (!realtimeClient || !session || !selectedTicket) return;
    const channel = realtimeClient.channel(`ticket:${selectedTicket.id}:ocr`, { config: { private: true } });
    const ocrHandler = (payload: any) => {
      updateOCRUI(payload.data);
    };
    channel.on('broadcast', { event: 'ocr_completed' }, ocrHandler);
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeClient, session, selectedTicket]);

  // Update UI with OCR data
  const updateOCRUI = useCallback((data: any) => {
    setOcrFields(data.fields);
    setOcrStatus('completed');
    // Optionally update ticket status in UI
    setTickets(prev => prev.map(t => t.id === selectedTicket?.id ? { ...t, status: 'ocr_completed' } : t));
  }, [selectedTicket]);

  const [newTicket, setNewTicket] = useState<{
    ticket_number: string;
    driver_id: string;
    driver_name: string;
    truck_id: string;
    truck_number: string;
    customer_name: string;
    material_type: string;
    quantity: number;
    unit: string;
    rate: number;
    pickup_location: string;
    delivery_location: string;
    pickup_date: string;
    delivery_date: string;
    odometer_start: number;
    odometer_end: number;
    fuel_used: number;
    notes: string;
    image: File | null;
  }>({
    ticket_number: '',
    driver_id: '',
    driver_name: '',
    truck_id: '',
    truck_number: '',
    customer_name: '',
    material_type: '',
    quantity: 0,
    unit: 'tons',
    rate: 0,
    pickup_location: '',
    delivery_location: '',
    pickup_date: '',
    delivery_date: '',
    odometer_start: 0,
    odometer_end: 0,
    fuel_used: 0,
    notes: '',
    image: null
  });
  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOrganizationId(user?.user_metadata?.organization_id || "");
      setUserId(user?.id || "");
    };
    fetchUser();
    loadTicketData();
  }, []);

  async function loadTicketData() {
    try {
      setLoading(true);

      // Load tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from('aggregate_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketError) throw ticketError;

      // Load drivers
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id, name, phone, cdl_number')
        .eq('organization_id', organizationId)
        .order('name');

      if (driverError) console.error("Error loading drivers:", driverError);

      // Load trucks
      const { data: truckData, error: truckError } = await supabase
        .from('trucks')
        .select('id, truck_number, make, model, year')
        .eq('organization_id', organizationId)
        .order('truck_number');

      if (truckError) console.error("Error loading trucks:", truckError);

      // Merge data
      const enrichedTickets = (ticketData || []).map(ticket => ({
        ...ticket,
        driver_name: driverData?.find(d => d.id === ticket.driver_id)?.name || 'Unknown Driver',
        truck_number: truckData?.find(t => t.id === ticket.truck_id)?.truck_number || 'Unknown Truck'
      }));

      setTickets(enrichedTickets);
      setDrivers(driverData || []);
      setTrucks(truckData || []);

    } catch (error) {
      console.error("Error loading ticket data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    try {
      if (!organizationId || !userId) {
        toast.error("Missing organization or user ID.");
        return;
      }
      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
      const total = newTicket.quantity * newTicket.rate;

      // 1. Create ticket row first
      const { data: ticketRow, error: insertError } = await supabase
        .from('aggregate_tickets')
        .insert([{
          ...newTicket,
          ticket_number: ticketNumber,
          total_amount: total,
          status: 'pending',
          organization_id: organizationId
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      const ticket_id = ticketRow.id;

      // 2. Upload image with metadata
      if (newTicket.image) {
        const { url, error: uploadError } = await uploadTicketImage(
          newTicket.image,
          organizationId,
          ticket_id,
          userId
        );
        if (uploadError) {
          toast.error("Image upload failed.");
          return;
        }
        // 3. Update ticket with image URL
        await supabase
          .from('aggregate_tickets')
          .update({ ticket_image_url: url })
          .eq('id', ticket_id);

        // 4. Call OCR Edge Function
        const { data: ocr } = await supabase.functions.invoke("vision-ocr", {
          body: {
            image_url: url,
            organization_id: organizationId,
            ticket_id
          }
        });
        if (ocr) {
          // Auto-fill fields from OCR
          setNewTicket(nt => ({
            ...nt,
            driver_id: ocr.driver_id || nt.driver_id,
            driver_name: ocr.driver_name || nt.driver_name,
            truck_id: ocr.truck_id || nt.truck_id,
            truck_number: ocr.truck_number || nt.truck_number,
            material_type: ocr.material || nt.material_type,
            quantity: ocr.tons || nt.quantity,
            pickup_location: ocr.jobsite || nt.pickup_location,
            delivery_location: ocr.jobsite || nt.delivery_location,
            notes: ocr.ticket_number ? `Ticket #: ${ocr.ticket_number}` : nt.notes
          }));
          toast.success("OCR data extracted and fields auto-filled.");
        }
      }

      await loadTicketData();
      setShowCreateModal(false);
      resetNewTicket();
      toast.success("Ticket uploaded successfully!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    }
  }

  function resetNewTicket() {
    setNewTicket({
      ticket_number: '',
      driver_id: '',
      driver_name: '',
      truck_id: '',
      truck_number: '',
      customer_name: '',
      material_type: '',
      quantity: 0,
      unit: 'tons',
      rate: 0,
      pickup_location: '',
      delivery_location: '',
      pickup_date: '',
      delivery_date: '',
      odometer_start: 0,
      odometer_end: 0,
      fuel_used: 0,
      notes: '',
      image: null
    });
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      invoiced: { color: 'bg-blue-100 text-blue-800', icon: FileText },
      paid: { color: 'bg-green-100 text-green-800', icon: DollarSign },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.driver_name && ticket.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.truck_number && ticket.truck_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const ticketDate = new Date(ticket.created_at);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          matchesDate = ticketDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Aggregate Tickets</h1>
          <p className="text-gray-600 mt-1">
            Manage delivery tickets with driver and truck assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Ticket
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tickets.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {tickets.filter(t => t.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${tickets.reduce((sum, t) => sum + (t.total_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search tickets, customers, drivers..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
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

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tickets found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Ticket #</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Truck</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Material</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Delivery Date</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{ticket.ticket_number}</td>
                      <td className="p-3">{getStatusBadge(ticket.status)}
                        {selectedTicket && selectedTicket.id === ticket.id && ocrStatus === 'completed' && (
                          <span className="ml-2 text-green-600"><CheckCircle className="inline w-4 h-4" /> OCR Complete</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{ticket.driver_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <span>{ticket.truck_number}</span>
                        </div>
                      </td>
                      <td className="p-3">{ticket.customer_name}</td>
                      <td className="p-3">{ticket.material_type}</td>
                      <td className="p-3">{ticket.quantity} {ticket.unit}</td>
                      <td className="p-3 font-semibold text-green-600">
                        ${ticket.total_amount?.toLocaleString()}
                      </td>
                      <td className="p-3">
                        {ticket.delivery_date ? new Date(ticket.delivery_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
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
      {/* Ticket Details OCR Fields (if selected) */}
      {selectedTicket && (
        <Card className={`mt-6 ${ocrStatus === 'approved' ? 'bg-green-50 border-green-400' : ''}`}>
          <CardHeader>
            <CardTitle>
              OCR Fields
              {ocrStatus === 'approved' && (
                <span className="ml-4 px-2 py-1 bg-green-600 text-white rounded text-xs">Ticket Approved</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ocrFields ? (
              <div className="grid grid-cols-2 gap-4">
                <div><b>Material:</b> {ocrFields.material}</div>
                <div><b>Tons:</b> {ocrFields.tons}</div>
                <div><b>Plant:</b> {ocrFields.plant}</div>
                <div><b>Ticket #:</b> {ocrFields.ticket_number}</div>
                <div><b>Customer:</b> {ocrFields.customer_name}</div>
                <div><b>Price/Ton:</b> {ocrFields.price_per_ton}</div>
                <div><b>Total:</b> {ocrFields.total_amount}</div>
                {/* Add more fields as needed */}
                <div className="col-span-2 text-green-600 font-bold flex items-center gap-2">
                  {ocrStatus === 'completed' && <><CheckCircle className="w-5 h-5" /> OCR Complete</>}
                  {ocrStatus === 'approved' && <><CheckCircle className="w-5 h-5" /> Ticket Approved</>}
                </div>
                <div className="col-span-2 flex gap-2 mt-4">
                  <Button variant="success" onClick={approveTicket} disabled={ocrStatus === 'approved'}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve Ticket
                  </Button>
                </div>
              </div>
            ) : (
              <div>Waiting for OCR results...</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Driver</label>
                  <select 
                    value={newTicket.driver_id}
                    onChange={(e) => setNewTicket({...newTicket, driver_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Truck</label>
                  <select 
                    value={newTicket.truck_id}
                    onChange={(e) => setNewTicket({...newTicket, truck_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Truck</option>
                    {trucks.map(truck => (
                      <option key={truck.id} value={truck.id}>{truck.truck_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Customer Name</label>
                <Input
                  value={newTicket.customer_name}
                  onChange={(e) => setNewTicket({...newTicket, customer_name: e.target.value})}
                  placeholder="Customer name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Material Type</label>
                  <Input
                    value={newTicket.material_type}
                    onChange={(e) => setNewTicket({...newTicket, material_type: e.target.value})}
                    placeholder="e.g., Sand, Gravel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={newTicket.quantity}
                    onChange={(e) => setNewTicket({...newTicket, quantity: Number(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Rate ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTicket.rate}
                    onChange={(e) => setNewTicket({...newTicket, rate: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Location</label>
                  <Input
                    value={newTicket.pickup_location}
                    onChange={(e) => setNewTicket({...newTicket, pickup_location: e.target.value})}
                    placeholder="Pickup address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Location</label>
                  <Input
                    value={newTicket.delivery_location}
                    onChange={(e) => setNewTicket({...newTicket, delivery_location: e.target.value})}
                    placeholder="Delivery address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Date</label>
                  <Input
                    type="datetime-local"
                    value={newTicket.pickup_date}
                    onChange={(e) => setNewTicket({...newTicket, pickup_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Date</label>
                  <Input
                    type="datetime-local"
                    value={newTicket.delivery_date}
                    onChange={(e) => setNewTicket({...newTicket, delivery_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newTicket.notes}
                  onChange={(e) => setNewTicket({...newTicket, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={createTicket}>
                  Create Ticket
                </Button>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setNewTicket(nt => ({ ...nt, image: e.target.files?.[0] || null }))}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
