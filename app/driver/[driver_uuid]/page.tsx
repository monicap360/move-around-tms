"use client";
/* eslint-disable @next/next/no-img-element */
// Tesla-style, mobile-first, no-login driver portal
import { useEffect, useState, useRef } from "react";
import ComplianceTab from "@/components/compliance/ComplianceTab";
import Image from "next/image";
import Link from "next/link";
import { DriverPhoto } from "@/app/components/driver-hud/DriverPhoto";
import { TruckLogoBadge } from "@/app/components/driver-hud/TruckLogoBadge";
import LiveTelemetry from "./components/LiveTelemetry";
import DispatchMessenger from "./components/DispatchMessenger";
import MaintenanceAlerts from "./components/MaintenanceAlerts";
import DriverAI from "./components/DriverAI";
import { supabase } from "../../lib/supabaseClient";

export default function DriverHUD() {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [summary, setSummary] = useState<any>({ earnings: 0, loads: 0, hours: 0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ticket' | 'dvir' | 'loads' | 'pay' | 'compliance'>('loads');
  const [loads, setLoads] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pay, setPay] = useState<any>(null);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const ticketInputRef = useRef<HTMLInputElement>(null);

  // Ticket upload handler
  async function handleTicketUpload() {
    const file = ticketInputRef.current?.files?.[0];
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      if (!driver?.driver_uuid && !driver?.uuid) {
        throw new Error('Driver information not available');
      }

      const driver_uuid = driver.driver_uuid || driver.uuid;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('driver_uuid', driver_uuid);

      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      alert('Ticket uploaded successfully! Processing...');
      
      // Reload tickets
      const res = await fetch("/api/driver/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }

      // Reset file input
      if (ticketInputRef.current) {
        ticketInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading ticket:', error);
      alert(`Error uploading ticket: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  // DVIR submit handler
  async function handleDVIRSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    try {
      // Redirect to DVIR page for full form
      window.location.href = '/driver/dvir';
    } catch (error: any) {
      console.error('Error submitting DVIR:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }



  useEffect(() => {
    async function loadDriver() {
      const res = await fetch("/api/driver/me");
      const data = await res.json();
      setDriver(data);
      setLoading(false);
    }
    async function loadSummary() {
      const res = await fetch("/api/driver/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    }
    async function loadTickets() {
      const res = await fetch("/api/driver/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    }
    async function loadLoads() {
      if (driver?.driver_uuid || driver?.uuid) {
        const driver_uuid = driver.driver_uuid || driver.uuid;
        const { data, error } = await supabase
          .from('loads')
          .select('*')
          .eq('driver_uuid', driver_uuid)
          .in('status', ['assigned', 'in_transit', 'en_route'])
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setLoads(data);
        }
      }
    }
    loadDriver();
    loadSummary();
    loadTickets();
    if (driver) loadLoads();
  }, [driver]);

  if (loading) {
    return (
      <div className="glass-panel p-10">Loading dashboard...</div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-2 py-4">
      {/* HEADER */}
      <div className="w-full max-w-md rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 mb-4 flex items-center gap-4 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold border-4 border-blue-400">
          {driver && driver.photo_url ? (
            <img src={driver.photo_url} alt="Driver" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            driver && driver.name ? driver.name.split(" ").map((n: string) => n[0]).join("") : "DR"
          )}
        </div>
        <div>
          <div className="font-bold text-lg">{driver && driver.name}</div>
          <div className="text-xs text-blue-300">Driver UUID: {driver && driver.driver_uuid}</div>
          <div className="text-xs text-gray-400">Truck: {driver && driver.truck_number ? driver.truck_number : "-"}</div>
          <div className="text-xs text-gray-400">Org: {driver && driver.organization_code ? driver.organization_code : "-"}</div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white" onClick={() => setActiveTab("compliance")}>HR & TXDOT Compliance</button>
      </div>

      {/* QUICK ACTIONS */}
      <div className="w-full max-w-md flex flex-wrap gap-2 mb-4 justify-center">
        <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white" onClick={() => setActiveTab("ticket")}>Upload Ticket</button>
        <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white" onClick={() => setActiveTab("dvir")}>Start DVIR</button>
        <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white" onClick={() => setActiveTab("loads")}>My Loads</button>
        <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white" onClick={() => setActiveTab("pay")}>Pay</button>
      </div>

      {/* ACTIVE TAB */}
      <div className="w-full max-w-md bg-gray-900 rounded-xl shadow-lg p-4">
        {activeTab === "loads" && (
          <div>
            <div className="font-bold mb-2 text-blue-200">Active Loads</div>
            {loads.length === 0 ? <div className="text-gray-400">No active loads.</div> : (
              loads.map((load: any) => (
                <div key={load.id} className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="font-semibold">#{load.load_number} • {load.material}</div>
                  <div className="text-xs text-gray-400">Plant: {load.plant}</div>
                  <div className="text-xs text-gray-400">Pickup: {load.pickup}</div>
                  <div className="text-xs text-gray-400">Dropoff: {load.dropoff}</div>
                  <div className="text-xs text-blue-400">Status: {load.status}</div>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-blue-700 px-3 py-1 rounded text-xs" onClick={() => handleViewLoadDetails(load)}>View</button>
                    <button className="bg-green-700 px-3 py-1 rounded text-xs" onClick={() => handleMarkLoadComplete(load)}>Mark Complete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "ticket" && (
          <div>
            <div className="font-bold mb-4 text-blue-200">Upload Ticket</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Select Ticket File (Image/PDF)</label>
                <input
                  ref={ticketInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white"
                />
              </div>
              <button
                onClick={handleTicketUpload}
                disabled={uploading}
                className="w-full bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Ticket'}
              </button>
              <div className="mt-4">
                <Link href="/driver/upload" className="text-blue-400 underline text-sm">
                  Go to Full Ticket Upload Page →
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dvir" && (
          <div>
            <div className="font-bold mb-4 text-blue-200">DVIR Inspection</div>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Complete your pre-trip or post-trip inspection.</p>
              <Link href="/driver/dvir">
                <button className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold text-white">
                  Start DVIR Inspection →
                </button>
              </Link>
            </div>
          </div>
        )}

        {activeTab === "pay" && (
          <div>
            <div className="font-bold mb-4 text-blue-200">Pay Information</div>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Current Period Earnings</div>
                <div className="text-2xl font-bold text-green-400">${summary.earnings || '0.00'}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Loads Completed</div>
                <div className="text-xl font-semibold">{summary.loads || 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Hours Worked</div>
                <div className="text-xl font-semibold">{summary.hours || 0}h</div>
              </div>
              <Link href="/payroll">
                <button className="w-full bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 font-semibold text-white">
                  View Full Payroll Details →
                </button>
              </Link>
            </div>
          </div>
        )}

        {activeTab === "compliance" && (
          <ComplianceTab driverId={driver?.driver_uuid || driver?.uuid || ""} role="driver" />
        )}
      </div>

      {/* Load Details Modal */}
      {showLoadDetails && selectedLoad && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowLoadDetails(false)}>
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Load Details</h2>
              <button onClick={() => setShowLoadDetails(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Load Number</div>
                <div className="text-lg font-semibold">{selectedLoad.load_number || selectedLoad.id}</div>
              </div>
              {selectedLoad.origin && (
                <div>
                  <div className="text-sm text-gray-400">Origin</div>
                  <div>{selectedLoad.origin}</div>
                </div>
              )}
              {selectedLoad.destination && (
                <div>
                  <div className="text-sm text-gray-400">Destination</div>
                  <div>{selectedLoad.destination}</div>
                </div>
              )}
              {selectedLoad.status && (
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <div className="text-blue-400">{selectedLoad.status}</div>
                </div>
              )}
              {selectedLoad.material && (
                <div>
                  <div className="text-sm text-gray-400">Material</div>
                  <div>{selectedLoad.material}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: any) {
  return (
    <div className="glass-card p-4 text-center" style={{ borderRadius: 12, fontSize: 18 }}>
      <p style={{ opacity: 0.6 }}>{label}</p>
      <h3 style={{ fontSize: 22, fontWeight: 600 }}>{value}</h3>
    </div>
  );
}

function TicketTile({ id, plant, weight, status }: { id: string; plant: string; weight: string; status: string; }) {
  return (
    <div className="glass-card lift p-4 flex justify-between items-center" style={{ borderRadius: 12 }}>
      <div>
        <h4 className="font-semibold">{id}</h4>
        <p style={{ opacity: 0.7 }}>{plant}</p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p>{weight}</p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>{status}</p>
      </div>
    </div>
  );
}


