"use client";
import { useState } from "react";

export default function CustomerPortal() {
  const [tab, setTab] = useState("loads");
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Customer Self-Service Portal</h1>
      <div className="flex gap-4 mb-6">
        <button className={tab==="loads"?"font-bold underline":""} onClick={()=>setTab("loads")}>My Loads</button>
        <button className={tab==="invoices"?"font-bold underline":""} onClick={()=>setTab("invoices")}>Invoices</button>
        <button className={tab==="documents"?"font-bold underline":""} onClick={()=>setTab("documents")}>Documents</button>
        <button className={tab==="book"?"font-bold underline":""} onClick={()=>setTab("book")}>Book New Load</button>
      </div>
      {tab==="loads" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Active & Past Loads</h2>
          {/* TODO: List loads with status, tracking, and details */}
          <div className="text-gray-500">No loads yet.</div>
        </div>
      )}
      {tab==="invoices" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Invoices</h2>
          {/* TODO: List/download invoices */}
          <div className="text-gray-500">No invoices yet.</div>
        </div>
      )}
      {tab==="documents" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Documents</h2>
          {/* TODO: List/download BOL, POD, etc. */}
          <div className="text-gray-500">No documents yet.</div>
        </div>
      )}
      {tab==="book" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Book a New Load</h2>
          {/* TODO: Booking form */}
          <div className="text-gray-500">Booking form coming soon.</div>
        </div>
      )}
    </div>
  );
}
