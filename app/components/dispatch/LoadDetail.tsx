import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

export default function LoadDetail({ loadId }: { loadId: string }) {
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);
  const [hos, setHos] = useState<any>(null);
  const [exceptions, setExceptions] = useState<string[]>([]);

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
          // Simulate compliance/HOS check and exception detection
          // In production, fetch from backend or compliance engine
          setCompliance({
            driverCompliant: data.driver_compliance !== false,
            truckCompliant: data.truck_compliance !== false,
            notes: data.compliance_notes || ""
          });
          setHos({
            hosOk: data.hos_ok !== false,
            hoursLeft: data.hos_hours_left ?? 8
          });
          const ex: string[] = [];
          if (data.driver_compliance === false) ex.push("Driver not compliant");
          if (data.truck_compliance === false) ex.push("Truck not compliant");
          if (data.hos_ok === false) ex.push("HOS violation risk");
          setExceptions(ex);
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
      // Business logic: trigger notifications on exceptions
      if (exceptions.length > 0) {
        await fetch("/api/compliance-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert_type: "dispatch_exception",
            truck_number: load?.truckNumber,
            dvir_id: load?.dvir_id,
            message: `Exception(s) for Load #${load?.load_number}: ${exceptions.join(", ")}`,
            recipient_email: load?.dispatcher_email || process.env.NEXT_PUBLIC_ADMIN_EMAIL
          })
        });
      }
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
      {/* Compliance/HOS/Exception Info */}
      <div className="mt-4">
        <div className="font-semibold">Compliance & HOS Check</div>
        <ul className="list-disc ml-6 text-sm">
          <li>Driver Compliance: {compliance?.driverCompliant ? <span className="text-green-600">OK</span> : <span className="text-red-600">NOT COMPLIANT</span>}</li>
          <li>Truck Compliance: {compliance?.truckCompliant ? <span className="text-green-600">OK</span> : <span className="text-red-600">NOT COMPLIANT</span>}</li>
          <li>HOS: {hos?.hosOk ? <span className="text-green-600">OK</span> : <span className="text-red-600">VIOLATION RISK</span>} ({hos?.hoursLeft} hrs left)</li>
          {compliance?.notes && <li>Notes: {compliance.notes}</li>}
        </ul>
        {exceptions.length > 0 && (
          <div className="mt-2 text-red-600 font-semibold">Exceptions: {exceptions.join(", ")}</div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Button disabled={saving || status === "assigned"} onClick={() => updateStatus("assigned")}>Mark Assigned</Button>
        <Button disabled={saving || status === "in_progress"} onClick={() => updateStatus("in_progress")}>Mark In Progress</Button>
        <Button disabled={saving || status === "completed"} onClick={() => updateStatus("completed")}>Mark Completed</Button>
      </div>
    </div>
  );
}
