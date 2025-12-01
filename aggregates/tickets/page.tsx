"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabaseClient";
import { uploadTicketImage } from "../../utils/uploadTicketImage";
import toast from "react-hot-toast";
import { 
  FileText, 
  Truck, 
  User, 
  DollarSign,
  Search,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Upload
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
  driver_name?: string;
  truck_number?: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  cdl_number: string;
}

interface TruckInfo {
  id: string;
  truck_number: string;
  make: string;
  model: string;
  year: number;
}

export default function TicketsPage() {
  // State
  const [tickets, setTickets] = useState<AggregateTicket[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<AggregateTicket | null>(null);
  const [ocrFields, setOcrFields] = useState<any>(null);
  const [ocrStatus, setOcrStatus] = useState<'pending' | 'completed' | 'approved'>('pending');
  const [newTicket, setNewTicket] = useState<any>({
    ticket_number: '', driver_id: '', driver_name: '', truck_id: '', truck_number: '', customer_name: '', material_type: '', quantity: 0, unit: 'tons', rate: 0, pickup_location: '', delivery_location: '', pickup_date: '', delivery_date: '', odometer_start: 0, odometer_end: 0, fuel_used: 0, notes: '', image: null
  });
  const [organizationId, setOrganizationId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [realtimeClient, setRealtimeClient] = useState<any>(null);

  // Effects
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await supabase.realtime.setAuth(session.access_token);
        setRealtimeClient(supabase);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOrganizationId(user?.user_metadata?.organization_id || "");
      setUserId(user?.id || "");
    };
    fetchUser();
    loadTicketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!realtimeClient || !session || !selectedTicket) return;
    const channel = realtimeClient.channel(`ticket:${selectedTicket.id}:ocr`, { config: { private: true } });
    const ocrHandler = (payload: any) => {
      updateOCRUI(payload.data, selectedTicket);
    };
    channel.on('broadcast', { event: 'ocr_completed' }, ocrHandler);
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [realtimeClient, session, selectedTicket]);

  // Handlers
  const updateOCRUI = useCallback((data: any, ticket: AggregateTicket | null) => {
    setOcrFields(data.fields);
    setOcrStatus('completed');
    setTickets((prev: AggregateTicket[]) => prev.map(t => t.id === ticket?.id ? { ...t, status: 'ocr_completed' } : t));
  }, []);

  async function loadTicketData() {
    try {
      setLoading(true);
      const { data: ticketData } = await supabase.from('aggregate_tickets').select('*').order('created_at', { ascending: false });
      const { data: driverData } = await supabase.from('drivers').select('id, name, phone, cdl_number').eq('organization_id', organizationId).order('name');
      const { data: truckData } = await supabase.from('trucks').select('id, truck_number, make, model, year').eq('organization_id', organizationId).order('truck_number');
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
      const { data: ticketRow, error: insertError } = await supabase
        .from('aggregate_tickets')
        .insert([{ ...newTicket, ticket_number: ticketNumber, total_amount: total, status: 'pending', organization_id: organizationId }])
        .select()
        .single();
      if (insertError) throw insertError;
      const ticket_id = ticketRow.id;
      if (newTicket.image) {
        const { url, error: uploadError } = await uploadTicketImage(newTicket.image, organizationId, ticket_id, userId);
        if (uploadError) {
          toast.error("Image upload failed.");
          return;
        }
        await supabase.from('aggregate_tickets').update({ ticket_image_url: url }).eq('id', ticket_id);
        const { data: ocr } = await supabase.functions.invoke("vision-ocr", { body: { image_url: url, organization_id: organizationId, ticket_id } });
        if (ocr) {
          setNewTicket((nt: any) => ({ ...nt, driver_id: ocr.driver_id || nt.driver_id, driver_name: ocr.driver_name || nt.driver_name, truck_id: ocr.truck_id || nt.truck_id, truck_number: ocr.truck_number || nt.truck_number, material_type: ocr.material || nt.material_type, quantity: ocr.tons || nt.quantity, pickup_location: ocr.jobsite || nt.pickup_location, delivery_location: ocr.jobsite || nt.delivery_location, notes: ocr.ticket_number ? `Ticket #: ${ocr.ticket_number}` : nt.notes }));
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
    setNewTicket({ ticket_number: '', driver_id: '', driver_name: '', truck_id: '', truck_number: '', customer_name: '', material_type: '', quantity: 0, unit: 'tons', rate: 0, pickup_location: '', delivery_location: '', pickup_date: '', delivery_date: '', odometer_start: 0, odometer_end: 0, fuel_used: 0, notes: '', image: null });
  }

  async function approveTicket() {
    if (!selectedTicket) return;
    try {
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
      await supabase.from('aggregate_tickets').update({ ...updatedFields, status: 'approved' }).eq('id', selectedTicket.id);
      await supabase.rpc('calculate_driver_pay', { ticket_id: selectedTicket.id });
      await supabase.rpc('auto_advance_load', { ticket_id: selectedTicket.id });
      if (realtimeClient) {
        const channel = realtimeClient.channel(`ticket:${selectedTicket.id}:ocr`, { config: { private: true } });
        channel.send({ type: 'broadcast', event: 'ticket_approved', payload: { ticket_id: selectedTicket.id, status: 'approved' } });
      }
      setOcrStatus('approved');
      toast.success('Ticket approved!');
      await loadTicketData();
      setTimeout(() => { setSelectedTicket(null); setOcrFields(null); }, 1200);
    } catch (error) {
      toast.error('Failed to approve ticket.');
      console.error(error);
    }
  }

  // UI helpers
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
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ...rest of the component...

  // Render
  return (
    <div className="p-8 space-y-6">
      {/* ...other UI code... */}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Example fields, add more as needed */}
              <div>
                <label className="block text-sm font-medium mb-1">Driver</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newTicket.driver_id}
                  onChange={e => setNewTicket({ ...newTicket, driver_id: e.target.value })}
                >
                  <option value="">Select driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Truck</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newTicket.truck_id}
                  onChange={e => setNewTicket({ ...newTicket, truck_id: e.target.value })}
                >
                  <option value="">Select truck</option>
                  {trucks.map(truck => (
                    <option key={truck.id} value={truck.id}>{truck.truck_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name</label>
                <Input
                  value={newTicket.customer_name}
                  onChange={e => setNewTicket({ ...newTicket, customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Material Type</label>
                <Input
                  value={newTicket.material_type}
                  onChange={e => setNewTicket({ ...newTicket, material_type: e.target.value })}
                  placeholder="Material type"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={newTicket.quantity}
                    onChange={e => setNewTicket({ ...newTicket, quantity: Number(e.target.value) })}
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate</label>
                  <Input
                    type="number"
                    value={newTicket.rate}
                    onChange={e => setNewTicket({ ...newTicket, rate: Number(e.target.value) })}
                    placeholder="Rate"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Location</label>
                  <Input
                    value={newTicket.pickup_location}
                    onChange={e => setNewTicket({ ...newTicket, pickup_location: e.target.value })}
                    placeholder="Pickup location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Location</label>
                  <Input
                    value={newTicket.delivery_location}
                    onChange={e => setNewTicket({ ...newTicket, delivery_location: e.target.value })}
                    placeholder="Delivery location"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Date</label>
                  <Input
                    type="date"
                    value={newTicket.pickup_date}
                    onChange={e => setNewTicket({ ...newTicket, pickup_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Date</label>
                  <Input
                    type="date"
                    value={newTicket.delivery_date}
                    onChange={e => setNewTicket({ ...newTicket, delivery_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newTicket.notes}
                  onChange={e => setNewTicket({ ...newTicket, notes: e.target.value })}
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
                  onChange={e => setNewTicket((nt: typeof newTicket) => ({ ...nt, image: e.target.files?.[0] || null }))}
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
