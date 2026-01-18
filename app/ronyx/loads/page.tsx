"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const loadTabs = [
  "Active Loads",
  "Available Loads",
  "Completed Loads",
  "Cancelled Loads",
  "Load Board Search",
  "Assigned Drivers",
];

type Load = {
  id?: string;
  load_number: string;
  route: string;
  status: string;
  driver_name: string;
  customer_name: string;
  job_site?: string;
  material?: string;
  quantity?: number;
  unit_type?: string;
  rate_type?: string;
  rate_amount?: number;
  pickup_location?: string;
  delivery_location?: string;
  truck_number?: string;
  ticket_id?: string | null;
  status_notes?: string;
  started_at?: string | null;
  completed_at?: string | null;
};

export default function RonyxLoadsPage() {
  const [activeTab, setActiveTab] = useState(loadTabs[0]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newLoad, setNewLoad] = useState({
    load_number: "",
    route: "",
    status: "available",
    driver_name: "",
    customer_name: "",
    job_site: "",
    material: "",
    quantity: "",
    unit_type: "Load",
    rate_type: "per_load",
    rate_amount: "",
    pickup_location: "",
    delivery_location: "",
    truck_number: "",
    status_notes: "",
  });
  const rateConInputRef = useRef<HTMLInputElement | null>(null);
  const [assignment, setAssignment] = useState({
    load_id: "",
    driver_name: "",
    truck_number: "",
    status_notes: "",
  });
  const [showMap, setShowMap] = useState(false);
  const [leoInsights, setLeoInsights] = useState<
    { id: string; type: string; message: string; action: string }[]
  >([]);

  const availableLoads = useMemo(() => loads.filter((load) => load.status === "available"), [loads]);
  const activeLoads = useMemo(() => loads.filter((load) => load.status === "active"), [loads]);
  const completedLoads = useMemo(() => loads.filter((load) => load.status === "completed"), [loads]);
  const cancelledLoads = useMemo(() => loads.filter((load) => load.status === "cancelled"), [loads]);

  const seedDispatchCards = [
    {
      id: "LD-4029",
      status: "LOADING",
      statusClass: "loading",
      driver: "J. Lane",
      truck: "#24",
      from: "Pit 3",
      to: "Katy Site",
      material: "12yd Gravel",
      timer: "12 min",
      column: "pit",
    },
    {
      id: "LD-4031",
      status: "WAITING",
      statusClass: "waiting",
      driver: "S. Grant",
      truck: "#18",
      from: "Pit 7",
      to: "Beltway 8",
      material: "15yd Topsoil",
      timer: "8 min wait",
      column: "pit",
    },
    {
      id: "LD-4021",
      status: "ON TRACK",
      statusClass: "ontrack",
      driver: "D. Perez",
      truck: "#12",
      from: "Pit 7",
      to: "I-45 Jobsite",
      material: "",
      eta: "14 min",
      distance: "8.2 mi",
      column: "transit",
    },
    {
      id: "LD-4018",
      status: "DELIVERING",
      statusClass: "delivering",
      driver: "M. Chen",
      truck: "#07",
      from: "",
      to: "Main St Project",
      material: "18yd Road Base",
      detention: "0 min",
      column: "site",
    },
  ];

  const seedDriverAvailability = [
    {
      name: "D. Perez",
      truck: "#12",
      status: "available",
      detail: "4h 22m available",
      location: "Returning empty from I-45",
      distance: "3.2 mi from Pit 7",
      actionLabel: "Assign",
      actionVariant: "primary",
    },
    {
      name: "J. Lane",
      truck: "#24",
      status: "on-break",
      detail: "On break until 10:30",
      location: "At Pit 3",
      distance: "18 min remaining",
      actionLabel: "On Break",
      actionVariant: "secondary",
      disabled: true,
    },
  ];

  const seedBackhaulOpportunities = [
    {
      id: "bh001",
      title: "Pit 3 → Downtown Site",
      detail: "8yd Fill Sand • 6.5 miles",
      price: "$185",
      delta: "+$42 over empty return",
    },
  ];

  const seedDispatchAlerts = [
    {
      id: "alert-1",
      icon: "⛔",
      title: "Truck 18 - Maintenance Due",
      body: "Due in 3 days | Last service: 12,542 mi ago",
      tone: "critical",
      actions: ["Schedule"],
    },
    {
      id: "alert-2",
      icon: "⚠️",
      title: "Load LD-4025 - Detention Timer",
      body: "45 min free time elapsed | Site: Thompson Co",
      tone: "warning",
      actions: ["Charge $75", "Contact Site"],
    },
    {
      id: "alert-3",
      icon: "ℹ️",
      title: "Shift Change in 45 min",
      body: "Evening crew: 4 drivers available",
      tone: "info",
      actions: ["View Crew"],
    },
  ];

  const [dispatchCards, setDispatchCards] = useState(seedDispatchCards);
  const [driverAvailability, setDriverAvailability] = useState(seedDriverAvailability);
  const [backhaulOpportunities, setBackhaulOpportunities] = useState(seedBackhaulOpportunities);
  const [dispatchAlerts, setDispatchAlerts] = useState(seedDispatchAlerts);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateSidebar, setShowCreateSidebar] = useState(false);
  const [showDriverPanel, setShowDriverPanel] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"comms" | "docs" | "tracking" | "payment">("comms");
  const [visibleColumns, setVisibleColumns] = useState({
    pit: true,
    transit: true,
    site: true,
  });

  async function assignLoad() {
    if (!assignment.load_id) {
      return;
    }
    if (!assignment.driver_name) {
      return;
    }
    await updateLoad(assignment.load_id, {
      status: "active",
      driver_name: assignment.driver_name,
      truck_number: assignment.truck_number || null,
      status_notes: assignment.status_notes || null,
    });
    setAssignment({
      load_id: "",
      driver_name: "",
      truck_number: "",
      status_notes: "",
    });
  }

  useEffect(() => {
    void loadLoads();
    void loadLeoInsights();
    const interval = setInterval(() => setLastUpdated(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadLeoInsights() {
    try {
      const res = await fetch("/api/assistants/leo/insights");
      const data = await res.json();
      setLeoInsights(data.insights || []);
    } catch (err) {
      console.error("Failed to load Leo insights", err);
      setLeoInsights([]);
    }
  }

  async function loadLoads() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/loads");
      const data = await res.json();
      setLoads(data.loads || []);
    } catch (err) {
      console.error("Failed to load loads", err);
      setLoads([]);
    } finally {
      setLoading(false);
    }
  }

  const statusMap: Record<string, string> = {
    "Active Loads": "active",
    "Available Loads": "available",
    "Completed Loads": "completed",
    "Cancelled Loads": "cancelled",
    "Load Board Search": "available",
    "Assigned Drivers": "active",
  };

  const filteredLoads = loads.filter((load) => {
    if (activeTab === "Assigned Drivers") return Boolean(load.driver_name);
    const target = statusMap[activeTab];
    return target ? load.status === target : true;
  });

  async function createLoad() {
    try {
      const route =
        newLoad.route || (newLoad.pickup_location && newLoad.delivery_location
          ? `${newLoad.pickup_location} → ${newLoad.delivery_location}`
          : "");
      const res = await fetch("/api/ronyx/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLoad,
          route,
          quantity: newLoad.quantity ? Number(newLoad.quantity) : null,
          rate_amount: newLoad.rate_amount ? Number(newLoad.rate_amount) : null,
        }),
      });
      const data = await res.json();
      if (data.load) {
        setLoads((prev) => [data.load, ...prev]);
        setNewLoad({
          load_number: "",
          route: "",
          status: "available",
          driver_name: "",
          customer_name: "",
          job_site: "",
          material: "",
          quantity: "",
          unit_type: "Load",
          rate_type: "per_load",
          rate_amount: "",
          pickup_location: "",
          delivery_location: "",
          truck_number: "",
          status_notes: "",
        });
      }
    } catch (err) {
      console.error("Failed to create load", err);
    }
  }

  async function updateLoad(loadId: string, updates: Partial<Load> & { action?: string }) {
    setSavingId(loadId);
    try {
      const res = await fetch("/api/ronyx/loads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loadId, ...updates }),
      });
      const data = await res.json();
      if (data.load) {
        setLoads((prev) => prev.map((load) => (load.id === loadId ? data.load : load)));
      }
    } catch (err) {
      console.error("Failed to update load", err);
    } finally {
      setSavingId(null);
    }
  }

  const logActivity = (message: string) => {
    setActivityLog((prev) => [`${new Date().toLocaleTimeString()} • ${message}`, ...prev].slice(0, 6));
  };

  const handleRateConScan = (file?: File) => {
    if (!file) return;
    setNewLoad((prev) => ({
      ...prev,
      customer_name: prev.customer_name || "Jones Construction",
      pickup_location: prev.pickup_location || "Pit 7",
      delivery_location: prev.delivery_location || "I-45 Jobsite",
      material: prev.material || "3/4\" Gravel",
      quantity: prev.quantity || "12",
      unit_type: prev.unit_type || "Tons",
      rate_type: prev.rate_type || "per_load",
      rate_amount: prev.rate_amount || "855",
    }));
    logActivity(`Rate confirmation scanned: ${file.name}.`);
  };

  const updateDispatchCard = (id: string, updates: Partial<(typeof seedDispatchCards)[number]>) => {
    setDispatchCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...updates } : card)));
  };

  const handleMessageDriver = (id: string) => {
    const driverMap: Record<string, { name: string; phone: string }> = {
      "LD-4029": { name: "J. Lane", phone: "+15551230001" },
      "LD-4031": { name: "S. Grant", phone: "+15551230002" },
      "LD-4021": { name: "D. Perez", phone: "+15551230003" },
      "LD-4018": { name: "M. Chen", phone: "+15551230004" },
    };
    const target = driverMap[id];
    if (!target) {
      logActivity(`No driver contact on file for ${id}.`);
      return;
    }
    fetch("/api/load-hub/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: target.phone,
        message: `Dispatch update for ${id}. Please confirm status.`,
      }),
    }).then(() => logActivity(`Message sent to ${target.name} (${id}).`));
  };

  const handleStatusUpdate = (id: string, status: string, column?: "pit" | "transit" | "site") => {
    updateDispatchCard(id, { status, column: column ?? undefined });
    logActivity(`Status updated for ${id} → ${status}.`);
  };

  const handleAssignDriver = (loadId: string, driverName: string, truck: string) => {
    updateDispatchCard(loadId, { driver: driverName, truck });
    setDriverAvailability((prev) =>
      prev.map((driver) =>
        driver.name === driverName ? { ...driver, status: "assigned", actionLabel: "Assigned", actionVariant: "secondary" } : driver,
      ),
    );
    logActivity(`Assigned ${driverName} (${truck}) to ${loadId}.`);
  };

  const handleBackhaulAssign = (backhaulId: string) => {
    const bh = backhaulOpportunities.find((item) => item.id === backhaulId);
    if (!bh) return;
    logActivity(`Backhaul assigned: ${bh.title}.`);
  };

  const handleAlertAction = (alertId: string, action: string) => {
    const alert = dispatchAlerts.find((item) => item.id === alertId);
    if (!alert) return;
    logActivity(`Alert action: ${alert.title} → ${action}.`);
  };

  const refreshDispatch = async () => {
    await Promise.all([loadLoads(), loadLeoInsights()]);
    setLastUpdated(new Date());
    logActivity("Dispatch data refreshed.");
  };

  const filteredDispatchCards = dispatchCards.filter((card) => {
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    return (
      card.id.toLowerCase().includes(needle) ||
      card.driver.toLowerCase().includes(needle) ||
      card.to.toLowerCase().includes(needle) ||
      card.from.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-success: #16a34a;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-input:focus,
        .ronyx-input:focus-visible {
          outline: none;
          border-color: rgba(29, 78, 216, 0.6);
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
        }
        .ronyx-tab {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: transparent;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.7);
          cursor: pointer;
        }
        .ronyx-tab.active {
          background: rgba(29, 78, 216, 0.14);
          color: #0f172a;
          border-color: rgba(29, 78, 216, 0.35);
        }
        .status {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status.good {
          color: var(--ronyx-success);
          background: rgba(22, 163, 74, 0.12);
        }
        .status.warn {
          color: var(--ronyx-warning);
          background: rgba(245, 158, 11, 0.12);
        }
        .status.bad {
          color: var(--ronyx-danger);
          background: rgba(239, 68, 68, 0.12);
        }
        .dispatch-header {
          display: grid;
          gap: 10px;
          padding: 18px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
          margin-bottom: 20px;
        }
        .dispatch-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
          font-weight: 700;
          font-size: 0.8rem;
        }
        .dispatch-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dispatch-toolbar input {
          min-width: 220px;
        }
        .dispatch-btn {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .dispatch-btn.primary {
          background: var(--ronyx-accent);
          color: #ffffff;
        }
        .dispatch-btn.secondary {
          background: rgba(29, 78, 216, 0.08);
          border-color: var(--ronyx-border);
          color: #0f172a;
        }
        .dispatch-btn.success {
          background: rgba(22, 163, 74, 0.16);
          border-color: rgba(22, 163, 74, 0.4);
          color: #166534;
        }
        .dispatch-btn.warning {
          background: rgba(245, 158, 11, 0.16);
          border-color: rgba(245, 158, 11, 0.45);
          color: #92400e;
        }
        .operations-layout {
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 18px;
        }
        .operations-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .board-column {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .column-stats {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.6);
        }
        .load-card {
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 12px;
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .load-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
        }
        .load-card:last-child {
          margin-bottom: 0;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
        }
        .load-status {
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .load-status.loading {
          background: rgba(29, 78, 216, 0.14);
          color: #1d4ed8;
        }
        .load-status.waiting {
          background: rgba(245, 158, 11, 0.16);
          color: #b45309;
        }
        .load-status.ontrack {
          background: rgba(22, 163, 74, 0.16);
          color: #15803d;
        }
        .load-status.delivering {
          background: rgba(99, 102, 241, 0.16);
          color: #4338ca;
        }
        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .card-more {
          margin-left: auto;
          border: none;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
          opacity: 0.6;
        }
        .card-actions-menu {
          position: relative;
        }
        .card-menu {
          position: absolute;
          right: 0;
          top: 28px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 8px;
          display: grid;
          gap: 6px;
          min-width: 180px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
          z-index: 5;
        }
        .card-menu button {
          text-align: left;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
        }
        .mini-map {
          height: 42px;
          border-radius: 8px;
          background: linear-gradient(90deg, rgba(29, 78, 216, 0.2), rgba(14, 116, 144, 0.2));
          position: relative;
          overflow: hidden;
        }
        .mini-map .map-dot {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #1d4ed8;
          transform: translateY(-50%);
        }
        .mini-map .map-dot.end {
          right: 12px;
          background: #16a34a;
        }
        .mini-map .map-dot.start {
          left: 12px;
        }
        .mini-map .map-line {
          position: absolute;
          top: 50%;
          left: 20px;
          right: 20px;
          height: 2px;
          background: rgba(15, 23, 42, 0.2);
          transform: translateY(-50%);
        }
        .driver-sidebar {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          display: grid;
          gap: 12px;
        }
        .driver-card {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #f8fafc;
        }
        .driver-card.available {
          border-color: rgba(22, 163, 74, 0.4);
        }
        .driver-card.on-break {
          border-color: rgba(245, 158, 11, 0.4);
        }
        .backhaul-section {
          margin-top: 6px;
          border-top: 1px solid rgba(15, 23, 42, 0.12);
          padding-top: 12px;
        }
        .backhaul-card {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px dashed rgba(15, 23, 42, 0.2);
          background: #f8fafc;
        }
        .map-overlay {
          margin-top: 18px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 12px;
        }
        .map-container {
          height: 360px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(29, 78, 216, 0.1), rgba(14, 116, 144, 0.1));
        }
        .map-legend {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
        }
        .alerts-panel {
          margin-top: 18px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 12px;
        }
        .alert-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #f8fafc;
        }
        .alert-item.critical {
          border-color: rgba(239, 68, 68, 0.45);
        }
        .alert-item.warning {
          border-color: rgba(245, 158, 11, 0.45);
        }
        .alert-item.info {
          border-color: rgba(59, 130, 246, 0.45);
        }
        .leo-panel {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 18px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          display: grid;
          gap: 10px;
        }
        .leo-insight {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          display: grid;
          gap: 6px;
        }
        .details-panel {
          position: sticky;
          top: 20px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 16px;
          display: grid;
          gap: 10px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }
        .create-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 360px;
          background: #ffffff;
          border-left: 1px solid var(--ronyx-border);
          padding: 18px;
          box-shadow: -12px 0 24px rgba(15, 23, 42, 0.12);
          display: grid;
          gap: 12px;
          z-index: 20;
        }
        .overlay-scrim {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 15;
        }
        .details-modal {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 30;
        }
        .modal-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 18px;
          width: min(820px, 92vw);
          max-height: 85vh;
          overflow: auto;
          border: 1px solid var(--ronyx-border);
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
        }
        .modal-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 12px 0;
        }
        .modal-tabs button {
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          padding: 6px 10px;
          background: #f8fafc;
          font-weight: 600;
        }
        .modal-tabs button.active {
          background: rgba(29, 78, 216, 0.12);
        }
        .activity-log {
          display: grid;
          gap: 6px;
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.7);
        }
        .column-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        @media (max-width: 980px) {
          .operations-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Loads</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Manage active, available, completed, and cancelled loads with full dispatch detail.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="dispatch-header">
          <div className="dispatch-header-top">
                <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>🚛 Dispatch Command Center</h2>
              <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
                Morning Shift | {activeLoads.length} Active Loads | {availableLoads.length} at pit queue | On-time: 97.4%
              </p>
                  </div>
            <div className="live-pill">🔴 LIVE • Last updated: {lastUpdated.toLocaleTimeString()}</div>
                </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "rgba(15,23,42,0.7)" }}>
            <span>Weather: ☀️ Clear</span>
            <span>Traffic: 🟢 Normal</span>
            <span>Fuel Price: $3.85/gal (-0.02)</span>
              </div>
          <div className="dispatch-toolbar">
            <input
              className="ronyx-input"
              style={{ flex: "1 1 240px" }}
              placeholder="Search loads, drivers, routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="dispatch-btn primary" onClick={() => setShowCreateSidebar(true)}>
              <span className="icon">+</span> Quick Create Load
            </button>
            <button className="dispatch-btn primary" onClick={assignLoad}>
              <span className="icon">👤</span> Assign Driver
            </button>
            <button className="dispatch-btn success">
              <span className="icon">🔄</span> Backhaul Board (3 available)
            </button>
            <button className="dispatch-btn secondary" onClick={() => setShowMap((prev) => !prev)}>
              <span className="icon">🗺️</span> {showMap ? "Return to Board" : "Map View"}
            </button>
            <button className="dispatch-btn secondary">
              <span className="icon">⚡</span> Optimize Routes
            </button>
            <button className="dispatch-btn secondary" onClick={refreshDispatch}>
              <span className="icon">🔄</span> Refresh
            </button>
            <button className="dispatch-btn warning">
              <span className="icon">🔔</span> Alerts ({dispatchAlerts.length})
            </button>
          </div>
        </section>

        <div className="operations-layout">
          <div className="operations-board">
            <div className="column-filter">
              <label>
                <input
                  type="checkbox"
                  checked={visibleColumns.pit}
                  onChange={() => setVisibleColumns((prev) => ({ ...prev, pit: !prev.pit }))}
                />{" "}
                Pit Queue
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={visibleColumns.transit}
                  onChange={() => setVisibleColumns((prev) => ({ ...prev, transit: !prev.transit }))}
                />{" "}
                In Transit
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={visibleColumns.site}
                  onChange={() => setVisibleColumns((prev) => ({ ...prev, site: !prev.site }))}
                />{" "}
                On Site
              </label>
            </div>

            {visibleColumns.pit && (
            <div className="board-column pit-queue">
              <div className="column-header">
                <h3>⛏️ Pit Queue (6)</h3>
                <div className="column-stats">Avg wait: 18 min</div>
            </div>
              {filteredDispatchCards
                .filter((card) => card.column === "pit")
                .map((card) => (
                  <div
                    key={card.id}
                    className="load-card"
                    draggable
                    onClick={() => setSelectedCardId(card.id)}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                  >
                    <div className="card-header">
                      <span className="load-id">{card.id}</span>
                      <div className="card-actions-menu">
                        <button
                          className="card-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((prev) => (prev === card.id ? null : card.id));
                          }}
                        >
                          ···
                        </button>
                        {menuOpenId === card.id && (
                          <div className="card-menu">
                            <button onClick={() => handleMessageDriver(card.id)}>Message Driver</button>
                            <button onClick={() => handleStatusUpdate(card.id, "LOADED", "transit")}>Update → LOADED</button>
                            <button onClick={() => { setSelectedCardId(card.id); setShowDetailsModal(true); }}>View Details</button>
                            <button onClick={() => logActivity(`Note added to ${card.id}.`)}>Add Note</button>
                            <button onClick={() => logActivity(`Reassign pit for ${card.id}.`)}>Reassign Pit</button>
                          </div>
                        )}
                      </div>
                      <span className={`load-status ${card.statusClass}`}>{card.status}</span>
            </div>
                    <div className="card-body">
                      <div className="driver-info">
                        <span className="driver-name">{card.driver}</span>
                        <span className="truck"> {card.truck}</span>
            </div>
                      <div className="route-info">
                        <span className="from">{card.from}</span> → <span className="to">{card.to}</span>
            </div>
                      <div className="load-details">
                        <span className="material">{card.material}</span>
                        <span className="timer"> ⏱️ {card.timer}</span>
            </div>
          </div>
                    <div className="card-actions">
                      <button className="dispatch-btn secondary" onClick={() => handleMessageDriver(card.id)}>MSG</button>
                      <button className="dispatch-btn warning" onClick={() => handleStatusUpdate(card.id, "UPDATE")}>UPDATE</button>
                      <button className="dispatch-btn secondary" onClick={() => setMenuOpenId((prev) => (prev === card.id ? null : card.id))}>···</button>
                    </div>
                  </div>
                ))}
            </div>
            )}

            {visibleColumns.transit && (
            <div className="board-column in-transit">
              <div className="column-header">
                <h3>🚛 In Transit (24)</h3>
                <div className="column-stats">Avg speed: 42 mph</div>
            </div>
              {filteredDispatchCards
                .filter((card) => card.column === "transit")
                .map((card) => (
                  <div key={card.id} className="load-card" onClick={() => setSelectedCardId(card.id)}>
                    <div className="card-header">
                      <span className="load-id">{card.id}</span>
                      <div className="card-actions-menu">
                        <button
                          className="card-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((prev) => (prev === card.id ? null : card.id));
                          }}
                        >
                          ···
                        </button>
                        {menuOpenId === card.id && (
                          <div className="card-menu">
                            <button onClick={() => handleMessageDriver(card.id)}>Message Driver</button>
                            <button onClick={() => logActivity(`ETA updated for ${card.id}.`)}>Update ETA</button>
                            <button onClick={() => { setSelectedCardId(card.id); setShowDetailsModal(true); }}>View Details</button>
                            <button onClick={() => logActivity(`Note added to ${card.id}.`)}>Add Note</button>
                          </div>
                        )}
                      </div>
                      <span className={`load-status ${card.statusClass}`}>{card.status}</span>
            </div>
                    <div className="card-body">
                      <div className="driver-info">
                        <span className="driver-name">{card.driver}</span>
                        <span className="truck"> {card.truck}</span>
            </div>
                      <div className="route-info">
                        <span className="from">{card.from}</span> → <span className="to">{card.to}</span>
            </div>
                      <div className="load-details">
                        <span className="eta">🕐 ETA: {card.eta}</span>
                        <span className="distance"> 📍 {card.distance}</span>
            </div>
                      <div className="mini-map">
                        <div className="map-dot start"></div>
                        <div className="map-line"></div>
                        <div className="map-dot end"></div>
            </div>
            </div>
                    <div className="card-actions">
                      <button className="dispatch-btn primary" onClick={() => logActivity(`Live tracking opened for ${card.id}.`)}>Live Track</button>
                      <button className="dispatch-btn secondary" onClick={() => handleMessageDriver(card.id)}>Call</button>
                      <button className="dispatch-btn secondary" onClick={() => setMenuOpenId((prev) => (prev === card.id ? null : card.id))}>···</button>
            </div>
            </div>
                ))}
            </div>
            )}

            {visibleColumns.site && (
            <div className="board-column on-site">
              <div className="column-header">
                <h3>🏗️ On Site (8)</h3>
                <div className="column-stats">Avg unload: 22 min</div>
            </div>
              {filteredDispatchCards
                .filter((card) => card.column === "site")
                .map((card) => (
                  <div key={card.id} className="load-card" onClick={() => setSelectedCardId(card.id)}>
                    <div className="card-header">
                      <span className="load-id">{card.id}</span>
                      <div className="card-actions-menu">
                        <button
                          className="card-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((prev) => (prev === card.id ? null : card.id));
                          }}
                        >
                          ···
                        </button>
                        {menuOpenId === card.id && (
                          <div className="card-menu">
                            <button onClick={() => handleMessageDriver(card.id)}>Message Driver</button>
                            <button onClick={() => handleStatusUpdate(card.id, "DELIVERED", "site")}>Update → Delivered</button>
                            <button onClick={() => { setSelectedCardId(card.id); setShowDetailsModal(true); }}>View Details</button>
                            <button onClick={() => logActivity(`Note added to ${card.id}.`)}>Add Note</button>
                          </div>
                        )}
                      </div>
                      <span className={`load-status ${card.statusClass}`}>{card.status}</span>
            </div>
                    <div className="card-body">
                      <div className="driver-info">
                        <span className="driver-name">{card.driver}</span>
                        <span className="truck"> {card.truck}</span>
            </div>
                      <div className="route-info">
                        <span className="to">{card.to}</span>
            </div>
                      <div className="load-details">
                        <span className="material">{card.material}</span>
                        <span className="detention"> ⏰ Detention: {card.detention}</span>
            </div>
                      <div className="site-alert">
                        <span className="alert-note">⚠️ Site closes at 3 PM</span>
            </div>
          </div>
                    <div className="card-actions">
                      <button className="dispatch-btn warning" onClick={() => handleStatusUpdate(card.id, "DETENTION")}>Detention</button>
                      <button className="dispatch-btn success" onClick={() => handleStatusUpdate(card.id, "DELIVERED", "site")}>Delivered</button>
                      <button className="dispatch-btn secondary" onClick={() => setMenuOpenId((prev) => (prev === card.id ? null : card.id))}>···</button>
                    </div>
                  </div>
                ))}
            </div>
            )}
          </div>

          <div className="driver-sidebar">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>👥 Available Drivers (8/12)</h3>
              <button className="dispatch-btn secondary" onClick={() => setShowDriverPanel((prev) => !prev)}>
                {showDriverPanel ? "Collapse" : "Expand"}
              </button>
            </div>
            {showDriverPanel && driverAvailability.map((driver) => (
              <div
                key={driver.name}
                className={`driver-card ${driver.status}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const loadId = e.dataTransfer.getData("text/plain");
                  if (loadId) handleAssignDriver(loadId, driver.name, driver.truck);
                }}
              >
                <div className="driver-info">
                  <strong>{driver.name}</strong>
                  <small>
                    {" "}
                    Truck {driver.truck} • {driver.detail}
                  </small>
            </div>
                <div className="driver-location">
                  <span className="location">{driver.location}</span>
                  <span className="distance"> {driver.distance}</span>
          </div>
                <button
                  className={`dispatch-btn ${driver.actionVariant}`}
                  disabled={driver.disabled}
                  onClick={() =>
                    selectedCardId ? handleAssignDriver(selectedCardId, driver.name, driver.truck) : logActivity(`Select a load for ${driver.name}.`)
                  }
                >
                  {driver.actionLabel}
                </button>
                    </div>
            ))}

            <div className="backhaul-section">
              <h4>🔄 Backhaul Opportunities</h4>
              {backhaulOpportunities.map((bh) => (
                <div key={bh.id} className="backhaul-card">
                  <div className="bh-info">
                    <strong>{bh.title}</strong>
                    <small> {bh.detail}</small>
                    </div>
                  <div className="bh-value">
                    <span className="price">{bh.price}</span>
                    <small> {bh.delta}</small>
                    </div>
                  <button className="dispatch-btn success" onClick={() => handleBackhaulAssign(bh.id)}>Assign</button>
                  </div>
              ))}
                  </div>
                </div>
          </div>

        {showMap && (
          <div className="map-overlay">
            <div className="dispatch-header-top">
              <h3>📍 Live Fleet Map</h3>
              <button className="dispatch-btn secondary" onClick={() => setShowMap(false)}>
                Return to Board
              </button>
          </div>
            <div className="map-container" />
            <div className="map-legend">
              <div className="legend-item">● Loaded</div>
              <div className="legend-item">● Empty</div>
              <div className="legend-item">● Pit Location</div>
              <div className="legend-item">● Job Site</div>
                </div>
            </div>
          )}

        {showCreateSidebar && (
          <>
            <div className="overlay-scrim" onClick={() => setShowCreateSidebar(false)} />
            <aside className="create-sidebar">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>➕ Create Load</h3>
                <button className="dispatch-btn secondary" onClick={() => setShowCreateSidebar(false)}>
                  Close
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="dispatch-btn primary" onClick={() => rateConInputRef.current?.click()}>
                  📷 Scan Rate Confirmation
                </button>
                <span style={{ color: "rgba(15,23,42,0.65)", fontSize: "0.85rem" }}>
                  Auto-fills customer, route, material, and rate.
                </span>
              </div>
              <input
                ref={rateConInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  handleRateConScan(e.target.files?.[0]);
                  if (rateConInputRef.current) rateConInputRef.current.value = "";
                }}
              />
              <label className="ronyx-label">Customer</label>
              <input
                className="ronyx-input"
                value={newLoad.customer_name}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Jones Construction"
              />
              <label className="ronyx-label">From</label>
              <input
                className="ronyx-input"
                value={newLoad.pickup_location}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, pickup_location: e.target.value }))}
                placeholder="Pit 7"
              />
              <label className="ronyx-label">To</label>
              <input
                className="ronyx-input"
                value={newLoad.delivery_location}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, delivery_location: e.target.value }))}
                placeholder="1500 Main St"
              />
              <label className="ronyx-label">Material</label>
              <input
                className="ronyx-input"
                value={newLoad.material}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, material: e.target.value }))}
                placeholder="Gravel"
              />
              <label className="ronyx-label">Quantity</label>
              <input
                className="ronyx-input"
                value={newLoad.quantity}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="12"
              />
              <label className="ronyx-label">Unit</label>
              <select
                className="ronyx-input"
                value={newLoad.unit_type}
                onChange={(e) => setNewLoad((prev) => ({ ...prev, unit_type: e.target.value }))}
              >
                <option value="Load">Load</option>
                <option value="Tons">Tons</option>
                <option value="Yards">Yards</option>
              </select>
              <div>
                <label className="ronyx-label">Quick Assign To</label>
                <div style={{ display: "grid", gap: 6 }}>
                  {driverAvailability.map((driver) => (
                    <button
                      key={driver.name}
                      className="dispatch-btn secondary"
                      onClick={() => handleAssignDriver(selectedCardId || "LD-NEW", driver.name, driver.truck)}
                    >
                      {driver.name} • {driver.truck}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="dispatch-btn primary" onClick={createLoad}>
                  Save & Dispatch
                </button>
                <button className="dispatch-btn secondary" onClick={createLoad}>
                  Save
                </button>
              </div>
            </aside>
          </>
        )}

        {showDetailsModal && (
          <div className="details-modal">
            <div className="overlay-scrim" onClick={() => setShowDetailsModal(false)} />
            <div className="modal-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Load Details • {selectedCardId}</strong>
                <button className="dispatch-btn secondary" onClick={() => setShowDetailsModal(false)}>
                  ✕ Close
                </button>
              </div>
              <div className="modal-tabs">
                <button className={detailsTab === "comms" ? "active" : ""} onClick={() => setDetailsTab("comms")}>📞 Communications</button>
                <button className={detailsTab === "docs" ? "active" : ""} onClick={() => setDetailsTab("docs")}>📄 Documents</button>
                <button className={detailsTab === "tracking" ? "active" : ""} onClick={() => setDetailsTab("tracking")}>📍 Tracking</button>
                <button className={detailsTab === "payment" ? "active" : ""} onClick={() => setDetailsTab("payment")}>💰 Payment</button>
              </div>
              {detailsTab === "comms" && (
                <div>
                  <div className="ronyx-row">08:30 AM - You (SMS): "ETA still 09:45?"</div>
                  <div className="ronyx-row">08:31 AM - Driver: "Yes, traffic clear now."</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="dispatch-btn secondary" onClick={() => handleMessageDriver(selectedCardId || "")}>New Message</button>
                    <button className="dispatch-btn secondary">Call Driver</button>
                    <button className="dispatch-btn secondary">Email Customer</button>
                  </div>
                </div>
              )}
              {detailsTab === "docs" && <div className="ronyx-row">Documents: Rate con, BOL, ticket, invoice.</div>}
              {detailsTab === "tracking" && <div className="ronyx-row">Tracking timeline + GPS snapshots.</div>}
              {detailsTab === "payment" && <div className="ronyx-row">Payment status: Net 30 • Invoice draft.</div>}
            </div>
          </div>
        )}

        <div className="alerts-panel">
          <h3>🔔 Active Alerts</h3>
          {dispatchAlerts.map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.tone}`} onClick={() => logActivity(`Opened alert: ${alert.title}`)}>
              <div className="alert-content">
                <strong>
                  {alert.icon} {alert.title}
                </strong>
                <p>{alert.body}</p>
                </div>
              <div className="alert-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {alert.actions.map((action) => (
                  <button key={action} className="dispatch-btn secondary" onClick={() => handleAlertAction(alert.id, action)}>
                    {action}
                  </button>
              ))}
            </div>
                </div>
              ))}
            </div>

        <div className="leo-panel">
          <h3>🧠 Leo — Shipment Copilot</h3>
          {leoInsights.length === 0 ? (
            <div className="ronyx-row">No insights available.</div>
          ) : (
            leoInsights.map((insight) => (
              <div key={insight.id} className="leo-insight">
                <strong>{insight.message}</strong>
                <span style={{ color: "rgba(15,23,42,0.7)" }}>{insight.action}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="dispatch-btn secondary" onClick={() => logActivity(`Leo action applied: ${insight.action}`)}>
                    Activate
                  </button>
                  <button className="dispatch-btn secondary" onClick={() => logActivity(`Leo insight dismissed: ${insight.id}`)}>
                    Dismiss
                  </button>
                </div>
            </div>
            ))
          )}
                </div>

        <div className="details-panel">
          <h3>Load Details</h3>
          {selectedCardId ? (
            (() => {
              const card = dispatchCards.find((item) => item.id === selectedCardId);
              if (!card) return <div className="ronyx-row">Select a load card to view details.</div>;
              return (
                <>
                  <strong>{card.id}</strong>
                  <div>{card.from ? `${card.from} → ${card.to}` : card.to}</div>
                  <div>Driver: {card.driver} {card.truck}</div>
                  <div>Status: {card.status}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="dispatch-btn secondary" onClick={() => handleMessageDriver(card.id)}>Message Driver</button>
                    <button className="dispatch-btn secondary" onClick={() => logActivity(`Opened documents for ${card.id}.`)}>Docs</button>
                    <button className="dispatch-btn secondary" onClick={() => logActivity(`Opened tracking for ${card.id}.`)}>Tracking</button>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="ronyx-row">Select a load card to view details.</div>
          )}
          <div>
            <h4 style={{ marginTop: 8 }}>Recent Activity</h4>
            <div className="activity-log">
              {activityLog.length === 0 ? <span>No activity yet.</span> : activityLog.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            {loadTabs.map((tab) => (
              <button
                key={tab}
                className={`ronyx-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
              ))}
            </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="status good">Active: {activeLoads.length}</span>
            <span className="status warn">Available: {availableLoads.length}</span>
            <span className="status good">Completed: {completedLoads.length}</span>
            <span className="status bad">Cancelled: {cancelledLoads.length}</span>
          </div>
          {loading ? (
            <div className="ronyx-row">Loading loads...</div>
          ) : filteredLoads.length === 0 ? (
            <div className="ronyx-row">No loads in this view yet.</div>
          ) : (
            <div className="ronyx-grid">
              {filteredLoads.map((load) => (
                <div key={load.id || load.load_number} className="ronyx-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>{load.load_number} • {load.route}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {load.customer_name} • {load.material || "Material"} • {load.quantity || "—"} {load.unit_type || ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(15,23,42,0.5)" }}>
                      Driver: {load.driver_name || "Unassigned"} • Truck: {load.truck_number || "TBD"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span className={`status ${load.status === "completed" ? "good" : "warn"}`}>{load.status}</span>
                    <button
                      className="ronyx-action"
                      onClick={() => updateLoad(load.id, { status: "completed", completed_at: new Date().toISOString() })}
                      disabled={!load.id || savingId === load.id}
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>





      </div>
    </div>
  );
}
