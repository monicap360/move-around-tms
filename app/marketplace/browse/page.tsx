"use client";

// Marketplace Browse Loads Page
// Unified board for shippers, haulers, brokers

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getComplianceRules } from "@/lib/complianceRules";

const supabase = createClient();

export default function MarketplaceBrowse() {
  const [role, setRole] = useState("broker");
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoads() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("*")
        .order("created_at", { ascending: false });
      setLoads(data || []);
      setLoading(false);
    }
    fetchLoads();
    // Supabase Realtime subscription for instant updates
    const channel = supabase
      .channel("realtime:loads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        fetchLoads,
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <main className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Marketplace Loads</h1>
      <div className="mb-4">
        <span className="font-semibold">Role:</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="ml-2 border rounded p-1"
        >
          <option value="shipper">Shipper</option>
          <option value="hauler">Hauler</option>
          <option value="broker">Broker</option>
        </select>
      </div>
      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading loads…</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Origin</th>
              <th className="border p-2">Destination</th>
              <th className="border p-2">Weight</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load: any) => (
              <tr key={load.id}>
                <td className="border p-2">{load.origin}</td>
                <td className="border p-2">{load.destination}</td>
                <td className="border p-2">{load.weight}</td>
                <td className="border p-2">{load.status}</td>
                <td className="border p-2">
                  {role === "hauler" && (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        // Compliance check: block if hauler not compliant (stub)
                        const haulerCompliant = true; // TODO: Replace with real compliance check
                        if (!haulerCompliant) {
                          alert("You are not compliant to bid on this load.");
                          await supabase
                            .from("compliance_violations")
                            .insert([
                              {
                                action: "bid_load",
                                reason: "Hauler not compliant",
                                timestamp: new Date().toISOString(),
                              },
                            ]);
                          return;
                        }
                        await supabase
                          .from("loads")
                          .update({ status: "bid" })
                          .eq("id", load.id);
                        // TODO: Insert bid record, notify shipper
                      }}
                    >
                      Bid
                    </button>
                  )}
                  {role === "broker" && (
                    <button
                      className="bg-yellow-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        // Compliance check: block if broker, hauler, or load not compliant (stub)
                        const brokerCompliant = true; // TODO: Replace with real compliance check
                        const haulerCompliant = true; // TODO: Replace with real compliance check
                        const loadCompliant = true; // TODO: Replace with real compliance check
                        if (!brokerCompliant) {
                          alert("Broker is not compliant to match this load.");
                          await supabase
                            .from("compliance_violations")
                            .insert([
                              {
                                action: "match_load",
                                reason: "Broker not compliant",
                                timestamp: new Date().toISOString(),
                              },
                            ]);
                          return;
                        }
                        if (!haulerCompliant) {
                          alert("Selected hauler is not compliant.");
                          await supabase
                            .from("compliance_violations")
                            .insert([
                              {
                                action: "match_load",
                                reason: "Hauler not compliant",
                                timestamp: new Date().toISOString(),
                              },
                            ]);
                          return;
                        }
                        if (!loadCompliant) {
                          alert("Load is not compliant for matching.");
                          await supabase
                            .from("compliance_violations")
                            .insert([
                              {
                                action: "match_load",
                                reason: "Load not compliant",
                                timestamp: new Date().toISOString(),
                              },
                            ]);
                          return;
                        }
                        await supabase
                          .from("loads")
                          .update({ status: "matched" })
                          .eq("id", load.id);
                        // TODO: Assign hauler, notify both parties
                      }}
                    >
                      Match
                    </button>
                  )}
                  {role === "shipper" && (
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        // TODO: Open edit modal or page
                        alert("Edit load feature coming soon!");
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
