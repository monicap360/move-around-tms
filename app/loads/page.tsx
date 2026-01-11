"use client";
import React, { useState } from "react";
import Link from "next/link";

const tabs = [
  { key: "active", label: "Active Loads" },
  { key: "available", label: "Available Loads" },
  { key: "completed", label: "Completed Loads" },
  { key: "cancelled", label: "Cancelled Loads" },
  { key: "search", label: "Load Board Search" },
];

const LoadsPage = () => {
  const [tab, setTab] = useState("active");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Loads</h1>
      <div className="mb-6 flex gap-2 flex-wrap">
        {tabs.map((t) => (
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
        {tab === "active" && <ActiveLoads />}
        {tab === "available" && <AvailableLoads />}
        {tab === "completed" && <CompletedLoads />}
        {tab === "cancelled" && <CancelledLoads />}
        {tab === "search" && <LoadBoardSearch />}
      </div>
    </div>
  );
};

function ActiveLoads() {
  // ...fetch and display active loads, show Assigned Drivers, Load Details, Status
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Active Loads</h2>
      {/* List of active loads with driver/truck/trailer assignments */}
      {/* Each load links to <LoadDetails /> */}
      <div className="text-gray-500">No active loads.</div>
    </div>
  );
}
function AvailableLoads() {
  // ...fetch and display available loads
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Available Loads</h2>
      <div className="text-gray-500">No available loads.</div>
    </div>
  );
}
function CompletedLoads() {
  // ...fetch and display completed loads
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Completed Loads</h2>
      <div className="text-gray-500">No completed loads.</div>
    </div>
  );
}
function CancelledLoads() {
  // ...fetch and display cancelled loads
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cancelled Loads</h2>
      <div className="text-gray-500">No cancelled loads.</div>
    </div>
  );
}
function LoadBoardSearch() {
  // ...integrate with external load boards
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Load Board Search</h2>
      <div className="text-gray-500">External load board integration coming soon.</div>
    </div>
  );
}

export default LoadsPage;
