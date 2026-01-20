"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoleBasedAuth } from "../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function RonyxReportsPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
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
      const companyQueries = [
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

      let companyRecords: any[] = [];
      for (const query of companyQueries) {
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          companyRecords = data;
          break;
        }
      }

      const companyIds = companyRecords.map((company: any) => company.id || company.organization_id);

      // Calculate date range
      const now = new Date();
      const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Fetch invoices/revenue data
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .in("organization_id", companyIds.length > 0 ? companyIds : ["null"])
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (invoicesError) console.warn("Error fetching invoices:", invoicesError);

      // Aggregate report data
      const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const paidRevenue = (invoices || []).filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const pendingInvoices = (invoices || []).filter((inv) => inv.status === "Draft" || inv.status === "Sent").length;

      setReports([
        {
          id: "financial",
          title: "Financial Summary",
          period: dateRange,
          totalRevenue,
          paidRevenue,
          pendingAmount: totalRevenue - paidRevenue,
          pendingInvoices,
          invoices: invoices || [],
        },
      ]);
    } catch (error: any) {
      console.error("Error loading reports:", error);
    } finally {
      setLoadingReports(false);
    }
  }, [user?.email, dateRange]);

  useEffect(() => {
    if (profile?.role === "partner" || user?.email === "melidazvl@outlook.com") {
      loadReports();
    }
  }, [profile?.role, user?.email, loadReports]);

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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Monthly Reports</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Date Range Filter */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <label style={{ color: "#ccc", fontWeight: 600 }}>Period:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ background: "#2A2A2A", color: "#FFFFFF", border: "1px solid #404040", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {loadingReports ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#ccc" }}>Loading reports...</div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {reports.map((report) => (
              <div key={report.id} style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "1.5rem" }}>{report.title}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div style={{ background: "#1E1E1E", padding: "1rem", borderRadius: "8px", border: "1px solid #404040" }}>
                    <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Total Revenue</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#F7931E" }}>${report.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "#1E1E1E", padding: "1rem", borderRadius: "8px", border: "1px solid #404040" }}>
                    <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Paid Revenue</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#22c55e" }}>${report.paidRevenue.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "#1E1E1E", padding: "1rem", borderRadius: "8px", border: "1px solid #404040" }}>
                    <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Pending Amount</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444" }}>${report.pendingAmount.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "#1E1E1E", padding: "1rem", borderRadius: "8px", border: "1px solid #404040" }}>
                    <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Pending Invoices</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#F7931E" }}>{report.pendingInvoices}</div>
                  </div>
                </div>
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#FFFFFF", marginBottom: "1rem" }}>Recent Invoices</h3>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {report.invoices.slice(0, 10).map((invoice: any) => (
                      <div key={invoice.id} style={{ background: "#1E1E1E", padding: "1rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #404040" }}>
                        <div>
                          <div style={{ color: "#FFFFFF", fontWeight: 600 }}>{invoice.invoice_number || invoice.id}</div>
                          <div style={{ color: "#ccc", fontSize: "0.9rem" }}>{new Date(invoice.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#F7931E", fontWeight: 700, fontSize: "1.1rem" }}>${Number(invoice.total || 0).toLocaleString()}</div>
                          <div style={{ color: invoice.status === "Paid" ? "#22c55e" : "#ef4444", fontSize: "0.9rem" }}>{invoice.status || "Draft"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
