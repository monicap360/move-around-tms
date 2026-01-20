"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoleBasedAuth } from "../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function RonyxDriversPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const partnerEmail = user?.email;
      if (!partnerEmail) return;

      // Get partner info
      const partnerKey = "ronyx";
      let { data: partnerData } = await supabase
        .from("partners")
        .select("id, email")
        .eq("email", partnerEmail)
        .limit(1)
        .single();

      if (!partnerData) {
        const { data: fallbackPartner } = await supabase
          .from("partners")
          .select("id, email")
          .eq("slug", partnerKey)
          .limit(1)
          .single();
        partnerData = fallbackPartner ?? null;
      }

      if (!partnerData) {
        console.error("Partner not found");
        return;
      }

      // Get organizations/companies for this partner
      const orgQueries = [
        supabase
          .from("organizations")
          .select("*")
          .eq("partner_id", partnerData.id),
        supabase
          .from("organizations")
          .select("*")
          .eq("partner_slug", partnerKey),
        supabase
          .from("companies")
          .select("*")
          .eq("partner_id", partnerData.id),
        supabase
          .from("companies")
          .select("*")
          .eq("partner_slug", partnerKey),
      ];

      let organizationsData: any[] = [];
      for (const query of orgQueries) {
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          organizationsData = data;
          break;
        }
      }

      const orgIds = organizationsData.map(
        (organization: any) =>
          organization.id || organization.organization_id,
      );

      // Fetch drivers for these organizations
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .in("organization_id", orgIds.length > 0 ? orgIds : ["null"])
        .order("created_at", { ascending: false });

      if (driversError) {
        console.error("Error fetching drivers:", driversError);
        setDrivers([]);
      } else {
        setDrivers(driversData || []);
      }
    } catch (error: any) {
      console.error("Error loading drivers:", error);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (profile?.role === "partner" || user?.email === "melidazvl@outlook.com") {
      loadDrivers();
    }
  }, [loadDrivers, profile?.role, user?.email]);

  if (loading) {
    return (
      <div className="ronyx-dashboard" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "50px", height: "50px", border: "4px solid #404040", borderTop: "4px solid #F7931E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }}></div>
          <p style={{ color: "#ccc" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission("partner") && user?.email !== "melidazvl@outlook.com") {
    return (
      <div className="ronyx-dashboard" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#ccc" }}>
          <h1 style={{ color: "#F7931E", fontSize: "2rem", marginBottom: "1rem" }}>Access Denied</h1>
          <p>ROnyx Fleet Management access required.</p>
          <Link href="/partners/ronyx" style={{ color: "#F7931E", textDecoration: "none" }}>Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ronyx-dashboard" style={{ background: "#1E1E1E", color: "#FFFFFF", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1E1E1E 0%, #2d2d2d 100%)", borderBottom: "3px solid #F7931E", padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button onClick={() => router.push("/partners/ronyx")} style={{ background: "transparent", border: "1px solid #F7931E", color: "#F7931E", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>← Back</button>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Manage Drivers</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {loadingDrivers ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#ccc" }}>Loading drivers...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {drivers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#ccc", gridColumn: "1 / -1" }}>No drivers found</div>
            ) : (
              drivers.map((driver) => (
                <div key={driver.id} style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF" }}>{driver.name || "Unknown Driver"}</div>
                    <div
                      style={{
                        color: driver.status === "active" || driver.status === "Active" ? "#22c55e" : "#ef4444",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.75rem",
                        borderRadius: "20px",
                        background: driver.status === "active" || driver.status === "Active" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      }}
                    >
                      {driver.status || "Unknown"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
                      <span style={{ fontWeight: 600 }}>Email:</span> {driver.email || "N/A"}
                    </div>
                    <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
                      <span style={{ fontWeight: 600 }}>Phone:</span> {driver.phone || "N/A"}
                    </div>
                    {driver.safety_score && (
                      <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
                        <span style={{ fontWeight: 600 }}>Safety Score:</span> {driver.safety_score}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
