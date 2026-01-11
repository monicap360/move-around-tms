"use client";

import { useEffect, useState } from "react";
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

  return (
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
  );
}

function AssignModal({ load, onClose }: any) {
  // For demo: just a stub
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="font-bold text-lg mb-4">{load ? "Edit Assignment" : "Create Load"}</h2>
        {/* Assignment form fields here */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onClose}>Save</Button>
        </div>
      </div>
    </div>
  );
}
