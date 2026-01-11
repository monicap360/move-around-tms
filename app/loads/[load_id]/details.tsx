"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const detailsTabs = [
  { key: "info", label: "Load Details" },
  { key: "documents", label: "Documents" },
  { key: "payments", label: "Payments / Settlements" },
  { key: "tracking", label: "Tracking / GPS" },
  { key: "status", label: "Load Status Updates" },
  { key: "customer", label: "Customer Info" },
];

const LoadDetails = () => {
  const params = useParams();
  const loadId = params?.load_id;
  const [tab, setTab] = useState("info");
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadId) return;
    setLoading(true);
    supabase
      .from("loads")
      .select("*")
      .eq("id", loadId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setLoad(data || null);
        setLoading(false);
      });
  }, [loadId]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Load Details / Dispatch Sheet</h1>
      <div className="mb-6 flex gap-2 flex-wrap">
        {detailsTabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded border font-semibold ${tab === t.key ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded shadow p-6 min-h-[300px]">
        {loading ? <div>Loading...</div> : error ? <div className="text-red-600">{error}</div> : !load ? <div>No load found.</div> : (
          <>
            {tab === "info" && <InfoTab load={load} />}
            {tab === "documents" && <DocumentsTab load={load} />}
            {tab === "payments" && <PaymentsTab load={load} />}
            {tab === "tracking" && <TrackingTab load={load} />}
            {tab === "status" && <StatusTab load={load} />}
            {tab === "customer" && <CustomerTab load={load} />}
          </>
        )}
      </div>
    </div>
  );
};

function InfoTab({ load }: { load: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Load Information</h2>
      <ul className="space-y-1">
        <li>Load number: <span className="font-mono">#{load.load_number}</span></li>
        <li>Pickup date: {load.pickup_date || "--"}</li>
        <li>Delivery date: {load.delivery_date || "--"}</li>
        <li>Shipper: {load.shipper_name || "--"}</li>
        <li>Receiver: {load.receiver_name || "--"}</li>
        <li>Commodity: {load.commodity || "--"}</li>
        <li>Weight & pieces: {load.weight || "--"} / {load.pieces || "--"}</li>
        <li>Rate confirmation: {load.rate_confirmation || "--"}</li>
        <li>Contact info: {load.contact_info || "--"}</li>
        <li>Instructions / Notes: {load.notes || "--"}</li>
      </ul>
      <div className="mt-4">Assigned Driver/Truck/Trailer: {load.driver_name || "--"} / {load.truck_number || "--"} / {load.trailer_number || "--"}</div>
    </div>
  );
}
function DocumentsTab({ load }: { load: any }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>(load.documents || []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    setUploading(true);
    const file = e.target.files?.[0];
    if (!file) return setUploading(false);
    const filePath = `loads/${load.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
    const newDoc = { name: file.name, url: urlData?.publicUrl };
    setDocs((prev) => [...prev, newDoc]);
    await supabase.from("loads").update({ documents: [...docs, newDoc] }).eq("id", load.id);
    setSuccess("Uploaded successfully.");
    setUploading(false);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      <input type="file" accept="application/pdf,image/*" className="mb-2" onChange={handleUpload} disabled={uploading} />
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <ul className="divide-y">
        {docs.length === 0 ? <li className="text-gray-500">No documents uploaded.</li> : docs.map((doc, i) => (
          <li key={i} className="py-1 flex items-center gap-2">
            <a href={doc.url} target="_blank" rel="noopener" className="text-blue-600 underline">{doc.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
function PaymentsTab({ load }: { load: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Payments / Settlements</h2>
      <ul className="space-y-1">
        <li>Freight rate: {load.freight_rate || "--"}</li>
        <li>Detention / Layover: {load.detention || "--"}</li>
        <li>Fuel surcharge: {load.fuel_surcharge || "--"}</li>
        <li>Driver pay breakdown: {load.driver_pay_breakdown || "--"}</li>
      </ul>
    </div>
  );
}
function TrackingTab({ load }: { load: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tracking / GPS</h2>
      <ul className="space-y-1">
        <li>Live location: {load.live_location || "--"}</li>
        <li>ETA: {load.eta || "--"}</li>
      </ul>
    </div>
  );
}
function StatusTab({ load }: { load: any }) {
  const [status, setStatus] = useState(load.status);
  const [saving, setSaving] = useState(false);
  const [podReceived, setPodReceived] = useState(!!load.pod_received);
  const [paid, setPaid] = useState(!!load.paid);

  async function updateField(field: string, value: any) {
    setSaving(true);
    const { error } = await supabase
      .from("loads")
      .update({ [field]: value })
      .eq("id", load.id);
    setSaving(false);
    if (!error) {
      if (field === "status") setStatus(value);
      if (field === "pod_received") setPodReceived(value);
      if (field === "paid") setPaid(value);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Load Status Updates</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Status: {status || "--"}</li>
        <li>POD received: {podReceived ? "Yes" : "No"}</li>
        <li>Paid: {paid ? "Yes" : "No"}</li>
      </ul>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-blue-600 text-white" disabled={saving || status === "assigned"} onClick={() => updateField("status", "assigned")}>Mark Assigned</button>
        <button className="px-3 py-1 rounded bg-blue-600 text-white" disabled={saving || status === "in_progress"} onClick={() => updateField("status", "in_progress")}>Mark In Progress</button>
        <button className="px-3 py-1 rounded bg-green-600 text-white" disabled={saving || status === "completed"} onClick={() => updateField("status", "completed")}>Mark Completed</button>
        <button className="px-3 py-1 rounded bg-gray-600 text-white" disabled={saving || podReceived} onClick={() => updateField("pod_received", true)}>Mark POD Received</button>
        <button className="px-3 py-1 rounded bg-yellow-600 text-white" disabled={saving || paid} onClick={() => updateField("paid", true)}>Mark Paid</button>
      </div>
    </div>
  );
}
function CustomerTab({ load }: { load: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Customer Info</h2>
      <ul className="space-y-1">
        <li>Broker/Shipper: {load.customer_name || "--"}</li>
        <li>Contact: {load.customer_contact || "--"}</li>
        <li>Credit terms: {load.credit_terms || "--"}</li>
        <li>Notes: {load.customer_notes || "--"}</li>
      </ul>
    </div>
  );
}

export default LoadDetails;
