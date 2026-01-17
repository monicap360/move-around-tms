"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const loadTabs = [
  "Active Loads",
  "Available Loads",
  "Completed Loads",
  "Cancelled Loads",
  "Load Board Search",
  "Assigned Drivers",
];

const detailTabs = [
  "Load Details",
  "Documents",
  "Payments & Settlements",
  "Tracking / GPS",
  "Status Updates",
  "Customer Info",
];

type CustomerOption = { id: string; customer_name: string };
type TruckOption = { id: string; truck_number: string };
type DriverOption = { id: string; name: string };

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
  const [detailTab, setDetailTab] = useState(detailTabs[0]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
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
  const [assignment, setAssignment] = useState({
    load_id: "",
    driver_name: "",
    truck_number: "",
    status_notes: "",
  });
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const alerts = useMemo(() => {
    const now = Date.now();
    return loads
      .filter((load) => load.status === "active" && load.started_at)
      .map((load) => {
        const startedAt = load.started_at ? new Date(load.started_at).getTime() : 0;
        const hours = startedAt ? Math.floor((now - startedAt) / (1000 * 60 * 60)) : 0;
        return { load, hours };
      })
      .filter((entry) => entry.hours >= 2);
  }, [loads]);

  const availableLoads = useMemo(() => loads.filter((load) => load.status === "available"), [loads]);

  async function assignLoad() {
    if (!assignment.load_id) {
      setAssignmentMessage("Select a load to assign.");
      return;
    }
    if (!assignment.driver_name) {
      setAssignmentMessage("Select a driver.");
      return;
    }
    setAssignmentMessage("");
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
    setAssignmentMessage("Load assigned to driver.");
  }

  useEffect(() => {
    void loadLoads();
    void loadCustomers();
    void loadTrucks();
    void loadDrivers();
  }, []);

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

  async function loadCustomers() {
    try {
      const res = await fetch("/api/ronyx/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("Failed to load customers", err);
      setCustomers([]);
    }
  }

  async function loadTrucks() {
    try {
      const res = await fetch("/api/ronyx/trucks");
      const data = await res.json();
      setTrucks(data.trucks || []);
    } catch (err) {
      console.error("Failed to load trucks", err);
      setTrucks([]);
    }
  }

  async function loadDrivers() {
    try {
      const res = await fetch("/api/ronyx/drivers/list");
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (err) {
      console.error("Failed to load drivers", err);
      setDrivers([]);
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

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Live Alerts</h2>
          {alerts.length === 0 ? (
            <div className="ronyx-row">No active detention alerts.</div>
          ) : (
            alerts.map(({ load, hours }) => (
              <div key={load.id || load.load_number} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{load.load_number} • {load.route}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    Detention timer running • {hours} hrs since start
                  </div>
                </div>
                <span className="status warn">Alert</span>
              </div>
            ))
          )}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Dispatcher Intake (Assign Load)</h2>
          <div className="ronyx-grid" style={{ rowGap: 16 }}>
            <div>
              <label className="ronyx-label">Available Load</label>
              <select
                className="ronyx-input"
                value={assignment.load_id}
                onChange={(e) => setAssignment((prev) => ({ ...prev, load_id: e.target.value }))}
              >
                <option value="">Select load</option>
                {availableLoads.map((load) => (
                  <option key={load.id || load.load_number} value={load.id}>
                    {load.load_number} • {load.route}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ronyx-label">Driver</label>
              <input
                className="ronyx-input"
                list="driver-list"
                value={assignment.driver_name}
                onChange={(e) => setAssignment((prev) => ({ ...prev, driver_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Truck</label>
              <input
                className="ronyx-input"
                list="truck-list"
                value={assignment.truck_number}
                onChange={(e) => setAssignment((prev) => ({ ...prev, truck_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Notes</label>
              <input
                className="ronyx-input"
                value={assignment.status_notes}
                onChange={(e) => setAssignment((prev) => ({ ...prev, status_notes: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <button className="ronyx-action" onClick={assignLoad}>
                Assign & Dispatch
              </button>
              {assignmentMessage ? <span style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{assignmentMessage}</span> : null}
            </div>
          </div>
          <datalist id="driver-list">
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.name} />
            ))}
          </datalist>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Create Load</h2>
          <div className="ronyx-grid" style={{ rowGap: 16 }}>
            <div>
              <label className="ronyx-label">Load Number</label>
              <input
                className="ronyx-input"
                value={newLoad.load_number}
                onChange={(e) => setNewLoad({ ...newLoad, load_number: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Customer</label>
              <input
                className="ronyx-input"
                list="customer-list"
                value={newLoad.customer_name}
                onChange={(e) => setNewLoad({ ...newLoad, customer_name: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Job Site</label>
              <input
                className="ronyx-input"
                value={newLoad.job_site}
                onChange={(e) => setNewLoad({ ...newLoad, job_site: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Material</label>
              <input
                className="ronyx-input"
                value={newLoad.material}
                onChange={(e) => setNewLoad({ ...newLoad, material: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Quantity</label>
              <input
                className="ronyx-input"
                type="number"
                value={newLoad.quantity}
                onChange={(e) => setNewLoad({ ...newLoad, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Unit Type</label>
              <select
                className="ronyx-input"
                value={newLoad.unit_type}
                onChange={(e) => setNewLoad({ ...newLoad, unit_type: e.target.value })}
              >
                <option value="Load">Load</option>
                <option value="Ton">Ton</option>
                <option value="Yard">Yard</option>
                <option value="Hour">Hour</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Rate Type</label>
              <select
                className="ronyx-input"
                value={newLoad.rate_type}
                onChange={(e) => setNewLoad({ ...newLoad, rate_type: e.target.value })}
              >
                <option value="per_load">Per Load</option>
                <option value="per_ton">Per Ton</option>
                <option value="per_yard">Per Yard</option>
                <option value="per_hour">Per Hour</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Rate Amount</label>
              <input
                className="ronyx-input"
                type="number"
                value={newLoad.rate_amount}
                onChange={(e) => setNewLoad({ ...newLoad, rate_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Pickup Location</label>
              <input
                className="ronyx-input"
                value={newLoad.pickup_location}
                onChange={(e) => setNewLoad({ ...newLoad, pickup_location: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery Location</label>
              <input
                className="ronyx-input"
                value={newLoad.delivery_location}
                onChange={(e) => setNewLoad({ ...newLoad, delivery_location: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Route (optional)</label>
              <input className="ronyx-input" value={newLoad.route} onChange={(e) => setNewLoad({ ...newLoad, route: e.target.value })} />
            </div>
            <div>
              <label className="ronyx-label">Driver</label>
              <input
                className="ronyx-input"
                value={newLoad.driver_name}
                onChange={(e) => setNewLoad({ ...newLoad, driver_name: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Truck</label>
              <input
                className="ronyx-input"
                list="truck-list"
                value={newLoad.truck_number}
                onChange={(e) => setNewLoad({ ...newLoad, truck_number: e.target.value })}
              />
            </div>
            <div>
              <label className="ronyx-label">Status</label>
              <select
                className="ronyx-input"
                value={newLoad.status}
                onChange={(e) => setNewLoad({ ...newLoad, status: e.target.value })}
              >
                <option value="available">Available</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Notes</label>
              <input
                className="ronyx-input"
                value={newLoad.status_notes}
                onChange={(e) => setNewLoad({ ...newLoad, status_notes: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="ronyx-action" onClick={createLoad}>
                Create Load
              </button>
            </div>
          </div>
          <datalist id="customer-list">
            {customers.map((customer) => (
              <option key={customer.id} value={customer.customer_name} />
            ))}
          </datalist>
          <datalist id="truck-list">
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.truck_number} />
            ))}
          </datalist>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeTab}</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/ronyx/dispatch" className="ronyx-action">
                Dispatch
              </Link>
              <Link href="/ronyx/tickets" className="ronyx-action">
                Tickets
              </Link>
            </div>
          </div>
          <div className="ronyx-grid">
            {loading ? (
              <div className="ronyx-row">Loading loads...</div>
            ) : filteredLoads.length === 0 ? (
              <div className="ronyx-row">No loads in this view yet.</div>
            ) : (
              filteredLoads.map((load) => (
                <div key={load.id || load.load_number} className="ronyx-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {load.load_number} • {load.route}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      Driver: {load.driver_name || "Unassigned"} • Truck: {load.truck_number || "—"} • Customer:{" "}
                      {load.customer_name || "—"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {load.material || "Material —"} • {load.quantity || "—"} {load.unit_type || ""} • Job:{" "}
                      {load.job_site || "—"} • Ticket: {load.ticket_id ? "Created" : "Pending"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="ronyx-input"
                      style={{ minWidth: 140 }}
                      value={load.status}
                      onChange={(e) => {
                        setLoads((prev) =>
                          prev.map((item) => (item.id === load.id ? { ...item, status: e.target.value } : item)),
                        );
                      }}
                    >
                      <option value="available">Available</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                      className="ronyx-input"
                      style={{ minWidth: 160 }}
                      value={load.driver_name || ""}
                      placeholder="Assign driver"
                      onChange={(e) => {
                        setLoads((prev) =>
                          prev.map((item) => (item.id === load.id ? { ...item, driver_name: e.target.value } : item)),
                        );
                      }}
                    />
                    <input
                      className="ronyx-input"
                      style={{ minWidth: 140 }}
                      value={load.truck_number || ""}
                      placeholder="Truck"
                      onChange={(e) => {
                        setLoads((prev) =>
                          prev.map((item) => (item.id === load.id ? { ...item, truck_number: e.target.value } : item)),
                        );
                      }}
                    />
                    <button
                      className="ronyx-action"
                      onClick={() =>
                        load.id &&
                        updateLoad(load.id, {
                          status: load.status,
                          driver_name: load.driver_name,
                          truck_number: load.truck_number,
                        })
                      }
                      disabled={savingId === load.id}
                    >
                      {savingId === load.id ? "Saving..." : "Save"}
                    </button>
                    {load.status === "completed" && !load.ticket_id ? (
                      <button
                        className="ronyx-action"
                        onClick={() => load.id && updateLoad(load.id, { action: "complete" })}
                        disabled={savingId === load.id}
                      >
                        Create Ticket
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ronyx-card">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {detailTabs.map((tab) => (
              <button
                key={tab}
                className={`ronyx-tab ${detailTab === tab ? "active" : ""}`}
                onClick={() => setDetailTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailTab === "Load Details" && (
            <div className="ronyx-grid">
              {[
                "Load number",
                "Pickup & delivery dates",
                "Shipper & receiver details",
                "Commodity",
                "Weight & pieces",
                "Rate confirmation",
                "Contact info",
                "Instructions / Notes",
              ].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Captured</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Documents" && (
            <div className="ronyx-grid">
              {["BOL", "Rate Confirmations", "Receipts", "POD"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <button className="ronyx-action">Upload / Download</button>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Payments & Settlements" && (
            <div className="ronyx-grid">
              {["Freight Rate", "Detention / Layover", "Fuel Surcharge", "Driver Pay Breakdown"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status warn">Review</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Tracking / GPS" && (
            <div className="ronyx-grid">
              {["Live GPS Location", "ETA Updates", "Geofence Events"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Live</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Status Updates" && (
            <div className="ronyx-grid">
              {["Dispatched", "In Transit", "Delivered", "POD Received", "Paid"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Enabled</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "Customer Info" && (
            <div className="ronyx-grid">
              {["Broker / Shipper Contact", "Credit Terms", "Notes / History"].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span className="status good">Available</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
