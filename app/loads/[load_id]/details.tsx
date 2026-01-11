"use client";
import React, { useState } from "react";

const detailsTabs = [
  { key: "info", label: "Load Details" },
  { key: "documents", label: "Documents" },
  { key: "payments", label: "Payments / Settlements" },
  { key: "tracking", label: "Tracking / GPS" },
  { key: "status", label: "Load Status Updates" },
  { key: "customer", label: "Customer Info" },
];

const LoadDetails = () => {
  const [tab, setTab] = useState("info");

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
        {tab === "info" && <InfoTab />}
        {tab === "documents" && <DocumentsTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "tracking" && <TrackingTab />}
        {tab === "status" && <StatusTab />}
        {tab === "customer" && <CustomerTab />}
      </div>
    </div>
  );
};

function InfoTab() {
  // ...show all load fields
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Load Information</h2>
      <ul className="space-y-1">
        <li>Load number: <span className="font-mono">#12345</span></li>
        <li>Pickup & delivery dates: --</li>
        <li>Shipper & receiver details: --</li>
        <li>Commodity: --</li>
        <li>Weight & pieces: --</li>
        <li>Rate confirmation: --</li>
        <li>Contact info: --</li>
        <li>Instructions / Notes: --</li>
      </ul>
      <div className="mt-4">Assigned Driver/Truck/Trailer: --</div>
    </div>
  );
}
function DocumentsTab() {
  // ...upload/download BOLs, rate confirmations, receipts
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      <div className="text-gray-500">No documents uploaded.</div>
    </div>
  );
}
function PaymentsTab() {
  // ...show freight rate, detention, fuel surcharge, driver pay breakdown
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Payments / Settlements</h2>
      <div className="text-gray-500">No payment info available.</div>
    </div>
  );
}
function TrackingTab() {
  // ...show live location, ETA
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tracking / GPS</h2>
      <div className="text-gray-500">Tracking integration coming soon.</div>
    </div>
  );
}
function StatusTab() {
  // ...show status: Dispatched, In transit, Delivered, POD received, Paid
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Load Status Updates</h2>
      <ul className="list-disc ml-6">
        <li>Dispatched</li>
        <li>In transit</li>
        <li>Delivered</li>
        <li>POD received</li>
        <li>Paid</li>
      </ul>
    </div>
  );
}
function CustomerTab() {
  // ...show broker/shipper contact, credit terms, notes
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Customer Info</h2>
      <div className="text-gray-500">No customer info available.</div>
    </div>
  );
}

export default LoadDetails;
