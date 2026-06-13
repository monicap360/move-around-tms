"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────── */
type Load = {
  id: string;
  load_number?: string;
  customer_name?: string;
  pickup_location?: string;
  delivery_location?: string;
  driver_name?: string;
  truck_number?: string;
  status: string;
  priority?: string;
  appointment_time?: string;
  created_at?: string;
  updated_at?: string;
};

type Driver = { id: string; name?: string; full_name?: string };

/* ─── Lane config ────────────────────────────────── */
const LANES = [
  { key: "unassigned",  label: "Unassigned",  color: "#f59e0b", bg: "#fef3c7" },
  { key: "assigned",    label: "Assigned",     color: "#3b82f6", bg: "#eff6ff" },
  { key: "in_transit",  label: "In Transit",   color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "at_pickup",   label: "At Pickup",    color: "#f97316", bg: "#fff7ed" },
  { key: "at_delivery", label: "At Delivery",  color: "#06b6d4", bg: "#ecfeff" },
  { key: "completed",   label: "Completed",    color: "#10b981", bg: "#f0fdf4" },
  { key: "exception",   label: "Exception",    color: "#ef4444", bg: "#fee2e2" },
] as const;


/* ─── Assign modal ───────────────────────────────── */
function AssignModal({
  load,
  drivers,
  onAssign,
  onClose,
}: {
  load: Load;
  drivers: Driver[];
  onAssign: (loadId: string, driverName: string, truckNumber: string) => Promise<void>;
  onClose: () => void;
}) {
  const [driverName, setDriverName] = useState(load.driver_name || "");
  const [truckNumber, setTruckNumber] = useState(load.truck_number || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!driverName.trim()) { alert("Select a driver."); return; }
    setSaving(true);
    await onAssign(load.id, driverName, truckNumber);
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Assign Load</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.85rem" }}>
          Load #{load.load_number || load.id.slice(0, 8)} · {load.pickup_location} → {load.delivery_location}
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Driver</label>
          {drivers.length > 0 ? (
            <select value={driverName} onChange={(e) => setDriverName(e.target.value)} style={inp}>
              <option value="">Select driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.full_name || d.name || ""}>
                  {d.full_name || d.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} style={inp} placeholder="Driver name" />
          )}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Truck # (optional)</label>
          <input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} style={inp} placeholder="Unit 214" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={saving} style={{ background: "#1e40af", color: "#fff", padding: "9px 22px", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Assigning…" : "Assign"}
          </button>
          <button onClick={onClose} style={{ padding: "9px 16px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", background: "#fff" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Load card ──────────────────────────────────── */
function LoadCard({
  load,
  onDragStart,
  onAssign,
}: {
  load: Load;
  onDragStart: (id: string) => void;
  onAssign: (load: Load) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(load.id)}
      style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", cursor: "grab", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "box-shadow 120ms" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a" }}>
          #{load.load_number || load.id.slice(0, 6)}
        </span>
        {load.priority === "high" && (
          <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 7px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>HIGH</span>
        )}
      </div>
      {load.customer_name && (
        <div style={{ fontSize: "0.78rem", color: "#0f172a", fontWeight: 600, marginBottom: 4 }}>{load.customer_name}</div>
      )}
      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6 }}>
        {load.pickup_location && <div>📍 {load.pickup_location}</div>}
        {load.delivery_location && <div>🏁 {load.delivery_location}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.73rem", color: "#94a3b8" }}>
          {load.driver_name
            ? <span>{load.driver_name} {load.truck_number && `· #${load.truck_number}`}</span>
            : <span style={{ color: "#f59e0b", fontWeight: 600 }}>Unassigned</span>
          }
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(load); }}
            style={{ padding: "2px 8px", background: "#eff6ff", border: "none", borderRadius: 5, fontSize: "0.7rem", fontWeight: 700, color: "#1e40af", cursor: "pointer" }}
          >
            Assign
          </button>
          <Link
            href={`/ronyx/dispatch/loads/${load.id}`}
            style={{ padding: "2px 8px", background: "#f8fafc", border: "none", borderRadius: 5, fontSize: "0.7rem", fontWeight: 600, color: "#475569", textDecoration: "none" }}
          >
            Detail
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main board ─────────────────────────────────── */
export default function RonyxDispatchBoard() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Load | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  const loadData = useCallback(async () => {
    const [loadsRes, driversRes] = await Promise.all([
      fetch("/api/ronyx/loads"),
      fetch("/api/ronyx/drivers/list"),
    ]);
    const loadsData = await loadsRes.json();
    const driversData = await driversRes.json();
    setLoads(Array.isArray(loadsData) ? loadsData : loadsData.loads || []);
    setDrivers(driversData.drivers || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Derive KPIs
  const unassignedCount = loads.filter((l) => l.status === "unassigned").length;
  const inTransitCount  = loads.filter((l) => l.status === "in_transit").length;
  const exceptionCount  = loads.filter((l) => l.status === "exception").length;
  const completedToday  = loads.filter((l) => l.status === "completed" && l.updated_at?.startsWith(dateFilter)).length;

  async function moveLoad(loadId: string, newStatus: string) {
    setLoads((prev) => prev.map((l) => l.id === loadId ? { ...l, status: newStatus } : l));
    await fetch(`/api/ronyx/loads`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: loadId, status: newStatus }),
    });
  }

  async function handleAssign(loadId: string, driverName: string, truckNumber: string) {
    setLoads((prev) => prev.map((l) => l.id === loadId ? { ...l, driver_name: driverName, truck_number: truckNumber, status: "assigned" } : l));
    await fetch("/api/ronyx/loads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: loadId, driver_name: driverName, truck_number: truckNumber, status: "assigned" }),
    });
    setMsg(`Assigned ${driverName} to load.`);
    setTimeout(() => setMsg(""), 5000);
  }

  const visibleLoads = search.trim()
    ? loads.filter((l) =>
        l.load_number?.toLowerCase().includes(search.toLowerCase()) ||
        l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.truck_number?.toLowerCase().includes(search.toLowerCase())
      )
    : loads;

  const loadsForLane = (laneKey: string) =>
    visibleLoads.filter((l) => (l.status || "unassigned") === laneKey);

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>Dispatch Board</h1>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: "0.83rem" }}>Drag load cards between lanes to update status</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loads, drivers…"
            style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.83rem", outline: "none", width: 200 }}
          />
          <input
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            type="date"
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.83rem", outline: "none" }}
          />
          <Link href="/ronyx/loads" style={{ background: "#1e40af", color: "#fff", padding: "8px 18px", borderRadius: 8, fontWeight: 700, fontSize: "0.83rem", textDecoration: "none" }}>
            + Create Load
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Unassigned", value: unassignedCount, color: "#f59e0b", bg: "#fef3c7" },
          { label: "In Transit",  value: inTransitCount,  color: "#8b5cf6", bg: "#f5f3ff" },
          { label: "Exceptions",  value: exceptionCount,  color: "#ef4444", bg: "#fee2e2" },
          { label: "Completed Today", value: completedToday, color: "#10b981", bg: "#f0fdf4" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.color}33`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: "0.73rem", fontWeight: 700, color: kpi.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: kpi.color, lineHeight: 1.1, marginTop: 4 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Status message */}
      {msg && (
        <div style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: 8, marginBottom: 12, fontSize: "0.85rem", fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading loads…</div>
      ) : (
        /* Kanban board */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, overflowX: "auto" }}>
          {LANES.map((lane) => {
            const laneLoads = loadsForLane(lane.key);
            return (
              <div
                key={lane.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedId) {
                    moveLoad(draggedId, lane.key);
                    setDraggedId(null);
                  }
                }}
                style={{ minWidth: 180 }}
              >
                {/* Lane header */}
                <div style={{ background: lane.bg, border: `1px solid ${lane.color}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: lane.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {lane.label}
                  </span>
                  <span style={{ background: lane.color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700 }}>
                    {laneLoads.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
                  {laneLoads.length === 0 ? (
                    <div style={{ border: "2px dashed #e2e8f0", borderRadius: 8, padding: "20px 8px", textAlign: "center", color: "#cbd5e1", fontSize: "0.75rem" }}>
                      Drop here
                    </div>
                  ) : (
                    laneLoads.map((load) => (
                      <LoadCard
                        key={load.id}
                        load={load}
                        onDragStart={(id) => setDraggedId(id)}
                        onAssign={(l) => setAssignTarget(l)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          load={assignTarget}
          drivers={drivers}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.88rem", outline: "none", background: "#fff", boxSizing: "border-box",
};
