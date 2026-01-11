"use client";
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
  const ticketInputRef = useRef<HTMLInputElement>(null);

  // Placeholder handlers for ticket upload and DVIR submit
  function handleTicketUpload() {}
  function handleDVIRSubmit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); }



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
    loadDriver();
    loadSummary();
    loadTickets();
  }, []);

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
                    <button className="bg-blue-700 px-3 py-1 rounded text-xs" onClick={() => alert("View load details coming soon")}>View</button>
                    <button className="bg-green-700 px-3 py-1 rounded text-xs" onClick={() => alert("Mark complete coming soon")}>Mark Complete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "ticket" && (
          <div>
            {/* ...existing ticket tab code... */}
          </div>
        )}

        {activeTab === "dvir" && (
          <div>
            {/* ...existing dvir tab code... */}
          </div>
        )}

        {activeTab === "pay" && (
          <div>
            {/* ...existing pay tab code... */}
          </div>
        )}

        {activeTab === "compliance" && (
          <ComplianceTab driverId={driver?.driver_uuid || driver?.uuid || ""} role="driver" />
        )}
      </div>
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


