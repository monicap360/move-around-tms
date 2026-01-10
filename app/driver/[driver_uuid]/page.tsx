"use client";
// Tesla-style, mobile-first, no-login driver portal
import { useEffect, useState, useRef } from "react";
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
  const [activeTab, setActiveTab] = useState<'ticket' | 'dvir' | 'loads' | 'pay'>('loads');
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
            {/* DRIVER PHOTO */}
            <DriverPhoto
              photoUrl={driver?.photo_url}
              name={driver ? driver.first_name + " " + driver.last_name : ""}
              size={90}
            />
            {/* DRIVER DETAILS */}
            <div style={{ flex: 1 }}>
                          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>
                            {driver ? driver.first_name : ""} {driver ? driver.last_name : ""}
                          </h1>
                          <p style={{ opacity: 0.7 }}>UUID: {driver ? driver.uuid : ""}</p>
                          {driver && driver.truck_logo_url && (
                            <div style={{ marginTop: 6 }}>
                              <TruckLogoBadge logoUrl={driver.truck_logo_url} size={60} />
                            </div>
                          )}
                        </div>
                        {/* CLOCK IN/OUT BUTTON */}
                        <button
                          onClick={() => setClockedIn(!clockedIn)}
                          className="glass-card lift"
                          style={{
                            padding: "14px 20px",
                            fontSize: "18px",
                            borderRadius: "10px",
                            color: "white",
                            background: clockedIn ? "rgba(0,212,179,0.5)" : "rgba(255,0,0,0.5)",
                          }}
                        >
                          {clockedIn ? "Clock Out" : "Clock In"}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* DAILY SUMMARY */}
                  <section className="glass-panel p-6" style={{ borderRadius: 20 }}>
                    <h2 className="text-xl font-semibold mb-4">Today’s Summary</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <SummaryTile label="Earnings" value={summary.earnings ? `$${summary.earnings}` : "$0"} />
                      <SummaryTile label="Loads" value={summary.loads || 0} />
                      <SummaryTile label="Hours" value={clockedIn ? "LIVE" : summary.hours ? `${summary.hours}h` : "0h"} />
                    </div>
                  </section>
                  {/* PHASE 4: Tesla Cockpit Modules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <LiveTelemetry driver={driver} />
                    <DispatchMessenger driver={driver} />
                    <MaintenanceAlerts driver={driver} />
                    <DriverAI />
                  </div>
                  {/* TODAY’S TICKETS */}
                  <section className="glass-panel p-6" style={{ borderRadius: 20 }}>
                    <h2 className="text-xl font-semibold mb-4">Today’s Tickets</h2>
                    <Link
                      href="./upload"
                      className="glass-card lift"
                      style={{ padding: "12px 20px", borderRadius: "12px", display: "inline-block", marginBottom: "12px" }}
                    >
                      + Upload Ticket
                    </Link>
                    <div className="grid gap-3">
                      {tickets.length === 0 ? (
                        <div className="text-center text-cyan-300 opacity-60">No tickets for today.</div>
                      ) : (
                        tickets.map((t: any) => (
                          <TicketTile
                            key={t.id}
                            id={t.ticket_number || t.id}
                            plant={t.plant || t.location || "-"}
                            weight={t.weight ? `${t.weight} lbs` : "-"}
                            status={t.status || "-"}
                          />
                        ))
                      )}
                    </div>
                  </section>
                  {/* TESLA RADAR */}
                  <section className="glass-panel neon-teal" style={{ height: 220, borderRadius: 20, position: "relative", overflow: "hidden" }}>
                    <div className="radar-grid"></div>
                    <div className="radar-pulse"></div>
                    <div style={{ position: "absolute", bottom: 12, right: 12, opacity: 0.8 }}>Yard Radar</div>
                  </section>
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


