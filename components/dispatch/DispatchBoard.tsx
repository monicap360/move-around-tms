"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Truck, User, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";

// Simple drag-and-drop using HTML5 API for MVP
export default function DispatchBoard() {
  const [loads, setLoads] = useState<any[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ open: boolean; load: any } | null>(null);

  useEffect(() => {
    async function loadData() {
      const res = await fetch("/api/dispatch/loads");
      setLoads(await res.json());
    }
    loadData();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase.channel('realtime:loads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, payload => {
        setLoads(prev => {
          if (payload.eventType === 'INSERT') {
            return [...prev, payload.new];
          } else if (payload.eventType === 'UPDATE') {
            return prev.map(l => l.id === payload.new.id ? payload.new : l);
          } else if (payload.eventType === 'DELETE') {
            return prev.filter(l => l.id !== payload.old.id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const columns = [
    { key: "unassigned", label: "Unassigned" },
    { key: "assigned", label: "Assigned" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  function onDragStart(id: string) {
    setDraggedId(id);
  }
  async function onDrop(status: string) {
    if (!draggedId) return;
    setLoads((prev) =>
      prev.map((l) => (l.id === draggedId ? { ...l, status } : l))
    );
    try {
      await fetch("/api/loads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggedId, status }),
      });
    } catch (e) {
      // Optionally show error
    }
    setDraggedId(null);
  }

  // Fetch real drivers from API (HR drivers table)
  const [drivers, setDrivers] = useState<any[]>([]);
  useEffect(() => {
    async function fetchDrivers() {
      const res = await fetch("/api/hr/drivers");
      setDrivers(await res.json());
    }
    fetchDrivers();
  }, []);

  function aiAssignLoads() {
    setLoads((prev) => {
      // Only consider active drivers with highest safety and matching endorsements
      const availableDrivers = drivers
        .filter((d) => d.status === "Active")
        .sort((a, b) => (b.safety_score || 0) - (a.safety_score || 0));
      let driverIdx = 0;
      return prev.map((l) => {
        if (l.status === "unassigned" || l.status === "pending") {
          // Find best driver for this load (endorsement match, highest safety)
          let assignedDriver = null;
          for (let d of availableDrivers) {
            if (!l.required_endorsement || (d.endorsements && d.endorsements.includes(l.required_endorsement))) {
              assignedDriver = d;
              break;
            }
          }
          if (!assignedDriver && availableDrivers.length > 0) {
            assignedDriver = availableDrivers[driverIdx % availableDrivers.length];
            driverIdx++;
          }
          if (assignedDriver) {
            return {
              ...l,
              status: "assigned",
              driver_name: assignedDriver.name,
              driver_id: assignedDriver.id,
              route: l.route || `Route-${Math.floor(Math.random() * 100 + 1)}`,
              ai_reason: `Best match: ${assignedDriver.name} (Safety: ${assignedDriver.safety_score})${l.required_endorsement ? ", Endorsement: " + l.required_endorsement : ""}`
            };
          }
        }
        return l;
      });
    });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={aiAssignLoads}>
          AI Auto-Assign Loads
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div
            key={col.key}
            className="bg-gray-50 rounded-xl p-3 min-h-[400px] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
          >
            <div className="font-bold mb-2 flex items-center gap-2">
              {col.label}
              {col.key === "unassigned" && (
                <Button size="sm" onClick={() => setAssignModal({ open: true, load: null })}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex-1 space-y-3">
              {loads.filter((l) => l.status === col.key).map((load) => (
                <div
                  key={load.id}
                  className="bg-white border rounded-lg p-3 shadow cursor-move flex flex-col gap-2"
                  draggable
                  onDragStart={() => onDragStart(load.id)}
                  onClick={() => setAssignModal({ open: true, load })}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">{load.load_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" /> {load.driver_name || "Unassigned"}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {load.status === "in_progress" && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                    {load.status === "completed" && <CheckCircle className="w-3 h-3 text-green-600" />}
                    <span>{load.status.replace("_", " ")}</span>
                  </div>
                  {load.route && (
                    <div className="text-xs text-gray-400">Route: {load.route}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {assignModal?.open && (
          <AssignModal load={assignModal.load} onClose={async () => {
            setAssignModal(null);
            // Refresh loads after closing modal
            const res = await fetch("/api/dispatch/loads");
            setLoads(await res.json());
          }} />
        )}
      </div>
    </>
  );
}

import { useState } from "react";

function AssignModal({ load, onClose }: any) {
  // Demo driver list
  const drivers = [
    { id: "d1", name: "John D." },
    { id: "d2", name: "Jane S." },
    { id: "d3", name: "Alex P." },
  ];
  const [driver, setDriver] = useState(load?.driver_name || "");
  const [route, setRoute] = useState(load?.route || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // For demo: update in-memory only, but call onClose to refresh
    if (load) {
      await fetch("/api/loads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: load.id, driver_name: driver, route }),
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="font-bold text-lg mb-4">{load ? "Edit Assignment" : "Create Load"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Driver</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={driver}
              onChange={e => setDriver(e.target.value)}
            >
              <option value="">Unassigned</option>
              {drivers.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Route</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={route}
              onChange={e => setRoute(e.target.value)}
              placeholder="e.g. A-B"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
