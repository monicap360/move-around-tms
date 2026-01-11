"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
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
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("loads")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setLoads(data || []);
        setLoading(false);
      });
  }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Active Loads</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : loads.length === 0 ? (
        <div className="text-gray-500">No active loads.</div>
      ) : (
        <ul className="divide-y">
          {loads.map((load) => (
            <li
              key={load.id}
              className="py-2 flex flex-col md:flex-row md:items-center md:gap-4"
            >
              <Link
                href={`/loads/${load.id}/details`}
                className="text-blue-600 underline"
              >
                Load #{load.load_number}
              </Link>
              <span className="ml-2">
                Driver: {load.driver_name || "Unassigned"} | Truck:{" "}
                {load.truck_number || "-"} | Status: {load.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function AvailableLoads() {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("loads")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setLoads(data || []);
        setLoading(false);
      });
  }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Available Loads</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : loads.length === 0 ? (
        <div className="text-gray-500">No available loads.</div>
      ) : (
        <ul className="divide-y">
          {loads.map((load) => (
            <li
              key={load.id}
              className="py-2 flex flex-col md:flex-row md:items-center md:gap-4"
            >
              <Link
                href={`/loads/${load.id}/details`}
                className="text-blue-600 underline"
              >
                Load #{load.load_number}
              </Link>
              <span className="ml-2">
                Driver: {load.driver_name || "Unassigned"} | Truck:{" "}
                {load.truck_number || "-"} | Status: {load.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function CompletedLoads() {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("loads")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setLoads(data || []);
        setLoading(false);
      });
  }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Completed Loads</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : loads.length === 0 ? (
        <div className="text-gray-500">No completed loads.</div>
      ) : (
        <ul className="divide-y">
          {loads.map((load) => (
            <li
              key={load.id}
              className="py-2 flex flex-col md:flex-row md:items-center md:gap-4"
            >
              <Link
                href={`/loads/${load.id}/details`}
                className="text-blue-600 underline"
              >
                Load #{load.load_number}
              </Link>
              <span className="ml-2">
                Driver: {load.driver_name || "Unassigned"} | Truck:{" "}
                {load.truck_number || "-"} | Status: {load.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function CancelledLoads() {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("loads")
      .select("*")
      .eq("status", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setLoads(data || []);
        setLoading(false);
      });
  }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cancelled Loads</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : loads.length === 0 ? (
        <div className="text-gray-500">No cancelled loads.</div>
      ) : (
        <ul className="divide-y">
          {loads.map((load) => (
            <li
              key={load.id}
              className="py-2 flex flex-col md:flex-row md:items-center md:gap-4"
            >
              <Link
                href={`/loads/${load.id}/details`}
                className="text-blue-600 underline"
              >
                Load #{load.load_number}
              </Link>
              <span className="ml-2">
                Driver: {load.driver_name || "Unassigned"} | Truck:{" "}
                {load.truck_number || "-"} | Status: {load.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function LoadBoardSearch() {
  // ...integrate with external load boards
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Load Board Search</h2>
      <div className="text-gray-500">
        External load board integration coming soon.
      </div>
    </div>
  );
}

export default LoadsPage;
