"use client";

import { useState, useEffect } from "react";
import { useRoleBasedAuth } from "../../../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

const supabase = createClient();

export default function RonyxOperatorDetailPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const params = useParams();
  const operatorId = params?.id as string;
  const [operator, setOperator] = useState<any>(null);
  const [loadingOperator, setLoadingOperator] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (operatorId && (profile?.role === "partner" || user?.email === "melidazvl@outlook.com")) {
      loadOperatorData();
    }
  }, [operatorId, profile]);

  async function loadOperatorData() {
    setLoadingOperator(true);
    try {
      // Fetch operator/organization data
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", operatorId)
        .single();

      if (orgError || !orgData) {
        // Try companies table
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", operatorId)
          .single();

        if (companyError || !companyData) {
          console.error("Operator not found");
          return;
        }
        setOperator(companyData);
      } else {
        setOperator(orgData);
      }

      // Fetch invoices for this operator
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", operatorId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!invoicesError) {
        setInvoices(invoicesData || []);
      }

      // Fetch trucks for this operator
      const { count: truckCount } = await supabase
        .from("trucks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", operatorId);
    } catch (error: any) {
      console.error("Error loading operator data:", error);
    } finally {
      setLoadingOperator(false);
    }
  }

  if (loading || loadingOperator) {
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

  if (!operator) {
    return (
      <div className="ronyx-dashboard" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#ccc" }}>
          <h1 style={{ color: "#F7931E", fontSize: "2rem", marginBottom: "1rem" }}>Operator Not Found</h1>
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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>{operator.name || operator.company_name || "Operator Details"}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Operator Info */}
        <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "1.5rem" }}>Operator Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Company Name</div>
              <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1.1rem" }}>{operator.name || operator.company_name || "N/A"}</div>
            </div>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Contact Name</div>
              <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1.1rem" }}>{operator.contact_name || operator.owner_name || "N/A"}</div>
            </div>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Email</div>
              <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1.1rem" }}>{operator.primary_contact_email || operator.contact_email || operator.email || "N/A"}</div>
            </div>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Phone</div>
              <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1.1rem" }}>{operator.primary_contact_phone || operator.contact_phone || operator.phone || "N/A"}</div>
            </div>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Monthly Fee</div>
              <div style={{ color: "#F7931E", fontWeight: 700, fontSize: "1.1rem" }}>${Number(operator.monthly_fee || operator.subscription_fee || 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Status</div>
              <div
                style={{
                  color: operator.status === "active" ? "#22c55e" : "#ef4444",
                  fontWeight: 600,
                  padding: "0.25rem 0.75rem",
                  borderRadius: "20px",
                  background: operator.status === "active" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  display: "inline-block",
                }}
              >
                {operator.status || "active"}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF" }}>Recent Invoices</h2>
            <button
              onClick={() => router.push(`/partners/ronyx/operators/${operatorId}/invoice`)}
              style={{ background: "#F7931E", color: "#1E1E1E", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
            >
              Create Invoice
            </button>
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#ccc" }}>No invoices found</div>
            ) : (
              invoices.map((invoice) => (
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
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
