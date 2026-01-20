"use client";

// Marketplace Browse Loads Page
// Unified board for shippers, haulers, brokers

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function MarketplaceBrowse() {
  const [role, setRole] = useState("broker");
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function resolveOrganization() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (mounted) {
        setCurrentUserId(user.id);
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (mounted) {
        setOrganizationId(membership?.organization_id || null);
      }
    }

    resolveOrganization();

    return () => {
      mounted = false;
    };
  }, []);

  async function checkOrganizationCompliance() {
    if (!organizationId) {
      return { compliant: true, issues: [] as string[] };
    }

    const issues: string[] = [];

    try {
      const { count: alertCount, error: alertError } = await supabase
        .from("compliance_notifications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("resolved", false);

      if (!alertError && alertCount && alertCount > 0) {
        issues.push(`${alertCount} unresolved compliance alerts`);
      }
    } catch (err) {
      console.error("Compliance notifications error:", err);
    }

    try {
      const { data: docs, error: docsError } = await supabase
        .from("driver_documents")
        .select("expiration_date, status")
        .eq("organization_id", organizationId);

      if (!docsError && docs) {
        const today = new Date();
        const expiredCount = docs.filter((doc: any) => {
          if (doc.status === "expired" || doc.status === "rejected") return true;
          if (!doc.expiration_date) return false;
          return new Date(doc.expiration_date) < today;
        }).length;
        if (expiredCount > 0) {
          issues.push(`${expiredCount} expired driver documents`);
        }
      }
    } catch (err) {
      console.error("Driver documents error:", err);
    }

    return { compliant: issues.length === 0, issues };
  }

  async function logComplianceViolation(action: string, reason: string) {
    await supabase
      .from("compliance_violations")
      .insert([
        {
          action,
          reason,
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          organization_id: organizationId,
        },
      ]);
  }

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
                        const compliance = await checkOrganizationCompliance();
                        if (!compliance.compliant) {
                          alert(
                            `You are not compliant to bid: ${compliance.issues.join(", ")}`,
                          );
                          await logComplianceViolation(
                            "bid_load",
                            compliance.issues.join("; "),
                          );
                          return;
                        }

                        await supabase
                          .from("loads")
                          .update({
                            status: "bid",
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", load.id);

                        await supabase
                          .from("load_bids")
                          .insert([
                            {
                              load_id: load.id,
                              bidder_id: currentUserId,
                              organization_id: organizationId,
                              created_at: new Date().toISOString(),
                            },
                          ]);
                      }}
                    >
                      Bid
                    </button>
                  )}
                  {role === "broker" && (
                    <button
                      className="bg-yellow-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        const compliance = await checkOrganizationCompliance();
                        if (!compliance.compliant) {
                          alert(
                            `Broker is not compliant: ${compliance.issues.join(", ")}`,
                          );
                          await logComplianceViolation(
                            "match_load",
                            compliance.issues.join("; "),
                          );
                          return;
                        }

                        await supabase
                          .from("loads")
                          .update({
                            status: "matched",
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", load.id);

                        await supabase
                          .from("load_matches")
                          .insert([
                            {
                              load_id: load.id,
                              broker_id: currentUserId,
                              organization_id: organizationId,
                              created_at: new Date().toISOString(),
                            },
                          ]);
                      }}
                    >
                      Match
                    </button>
                  )}
                  {role === "shipper" && (
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        const newOrigin = window.prompt(
                          "Update origin",
                          load.origin || "",
                        );
                        if (newOrigin === null) return;
                        const newDestination = window.prompt(
                          "Update destination",
                          load.destination || "",
                        );
                        if (newDestination === null) return;
                        const newWeight = window.prompt(
                          "Update weight",
                          String(load.weight || ""),
                        );
                        if (newWeight === null) return;

                        await supabase
                          .from("loads")
                          .update({
                            origin: newOrigin,
                            destination: newDestination,
                            weight: Number(newWeight),
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", load.id);
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
