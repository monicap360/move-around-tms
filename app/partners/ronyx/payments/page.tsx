"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoleBasedAuth } from "../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function RonyxPaymentsPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const partnerEmail = user?.email;
      if (!partnerEmail) return;

      // Get partner info
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, slug, email")
        .or(`email.eq.${partnerEmail},slug.eq.ronyx`)
        .limit(1)
        .single();

      if (!partnerData) {
        console.error("Partner not found");
        return;
      }

      // Get organizations/companies for this partner
      const companyQueries = [
        supabase.from("organizations").select("*").eq("partner_id", partnerData.id),
        supabase
          .from("organizations")
          .select("*")
          .eq("partner_slug", partnerData["slug"] || "ronyx"),
        supabase.from("companies").select("*").eq("partner_id", partnerData.id),
        supabase
          .from("companies")
          .select("*")
          .eq("partner_slug", partnerData["slug"] || "ronyx"),
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

      // Build query
      let invoicesQuery = supabase
        .from("invoices")
        .select("*")
        .in("organization_id", companyIds.length > 0 ? companyIds : ["null"])
        .order("created_at", { ascending: false });

      // Apply filter
      if (filter === "paid") {
        invoicesQuery = invoicesQuery.eq("status", "Paid");
      } else if (filter === "pending") {
        invoicesQuery = invoicesQuery.in("status", ["Draft", "Sent"]);
      } else if (filter === "overdue") {
        invoicesQuery = invoicesQuery.eq("status", "Overdue");
      }

      const { data: invoicesData, error: invoicesError } = await invoicesQuery;

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError);
        setInvoices([]);
      } else {
        setInvoices(invoicesData || []);
      }
    } catch (error: any) {
      console.error("Error loading payments:", error);
      setInvoices([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [user?.email, filter]);

  useEffect(() => {
    if (profile?.role === "partner" || user?.email === "melidazvl@outlook.com") {
      loadPayments();
    }
  }, [profile?.role, user?.email, loadPayments]);

  async function handleSendInvoice(invoiceId: string) {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "Sent", sent_at: new Date().toISOString() })
        .eq("id", invoiceId);

      if (error) throw error;
      loadPayments();
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice: " + error.message);
    }
  }

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

  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const paidAmount = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="ronyx-dashboard" style={{ background: "#1E1E1E", color: "#FFFFFF", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1E1E1E 0%, #2d2d2d 100%)", borderBottom: "3px solid #F7931E", padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button onClick={() => router.push("/partners/ronyx")} style={{ background: "transparent", border: "1px solid #F7931E", color: "#F7931E", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>← Back</button>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Payment Management</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "1.5rem", borderLeft: "4px solid #F7931E" }}>
            <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Total Amount</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#F7931E" }}>${totalAmount.toLocaleString()}</div>
          </div>
          <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "1.5rem", borderLeft: "4px solid #22c55e" }}>
            <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Paid Amount</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#22c55e" }}>${paidAmount.toLocaleString()}</div>
          </div>
          <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "1.5rem", borderLeft: "4px solid #ef4444" }}>
            <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Pending Amount</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444" }}>${pendingAmount.toLocaleString()}</div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
          {(["all", "pending", "paid", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "#F7931E" : "transparent",
                color: filter === f ? "#1E1E1E" : "#FFFFFF",
                border: "1px solid #F7931E",
                padding: "0.5rem 1.5rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        {loadingPayments ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#ccc" }}>Loading payments...</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#ccc" }}>No invoices found</div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>{invoice.invoice_number || invoice.id}</div>
                      <div style={{ color: "#ccc", fontSize: "0.9rem" }}>{invoice.company || "N/A"}</div>
                      <div style={{ color: "#ccc", fontSize: "0.9rem" }}>Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#F7931E", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.25rem" }}>${Number(invoice.total || 0).toLocaleString()}</div>
                      <div
                        style={{
                          color: invoice.status === "Paid" ? "#22c55e" : invoice.status === "Overdue" ? "#ef4444" : "#F7931E",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          padding: "0.25rem 0.75rem",
                          borderRadius: "20px",
                          background: invoice.status === "Paid" ? "rgba(34, 197, 94, 0.2)" : invoice.status === "Overdue" ? "rgba(239, 68, 68, 0.2)" : "rgba(247, 147, 30, 0.2)",
                          display: "inline-block",
                        }}
                      >
                        {invoice.status || "Draft"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {invoice.status !== "Paid" && (
                      <button
                        onClick={() => handleSendInvoice(invoice.id)}
                        style={{
                          background: "#F7931E",
                          color: "#1E1E1E",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Send Invoice
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/partners/ronyx/operators/${invoice.organization_id}/invoice?invoiceId=${invoice.id}`)}
                      style={{
                        background: "transparent",
                        color: "#F7931E",
                        border: "1px solid #F7931E",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      View Details
                    </button>
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
