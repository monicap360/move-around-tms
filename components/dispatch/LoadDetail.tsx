import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

export default function LoadDetail({ loadId }: { loadId: string }) {
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchLoad() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dispatch/load-detail?load_id=${loadId}`);
        const data = await res.json();
        if (data.error) setError(data.error.message || "Error loading load");
        else {
          setLoad(data);
          setStatus(data.status);
        }
      } catch (e) {
        setError("Failed to fetch load");
      }
      setLoading(false);
    }
    fetchLoad();
  }, [loadId]);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch("/api/loads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loadId, status: newStatus }),
      });
      setStatus(newStatus);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="bg-white border rounded-xl p-6">Loading...</div>;
  if (error) return <div className="bg-white border rounded-xl p-6 text-red-600">{error}</div>;
  if (!load) return <div className="bg-white border rounded-xl p-6">No load found.</div>;

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="text-lg font-bold mb-2">Load #{load.load_number}</div>
      <div className="text-gray-700">Status: <span className="font-semibold">{status.replace("_", " ")}</span></div>
      <div>Driver: <span className="font-semibold">{load.driver_name || "Unassigned"}</span></div>
      <div>Pickup: {load.pickup_location || "-"}</div>
      <div>Dropoff: {load.dropoff_location || "-"}</div>
      <div>ETA: {load.eta || "-"}</div>
      <div className="flex gap-2 mt-4">
        <Button disabled={saving || status === "assigned"} onClick={() => updateStatus("assigned")}>Mark Assigned</Button>
        <Button disabled={saving || status === "in_progress"} onClick={() => updateStatus("in_progress")}>Mark In Progress</Button>
        <Button disabled={saving || status === "completed"} onClick={() => updateStatus("completed")}>Mark Completed</Button>
      </div>
    </div>
  );
}
