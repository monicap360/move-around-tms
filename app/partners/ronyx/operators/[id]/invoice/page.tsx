"use client";

import { useState, useEffect } from "react";
import { useRoleBasedAuth } from "../../../../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";

const supabase = createClient();

export default function RonyxOperatorInvoicePage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const operatorId = params?.id as string;
  const invoiceId = searchParams?.get("invoiceId");
  const [operator, setOperator] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    dueDate: "",
  });

  useEffect(() => {
    if (operatorId && (profile?.role === "partner" || user?.email === "melidazvl@outlook.com")) {
      loadOperator();
      if (invoiceId) {
        loadInvoice();
      }
    }
  }, [operatorId, invoiceId, profile]);

  async function loadOperator() {
    try {
      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", operatorId).single();
      if (!orgData) {
        const { data: companyData } = await supabase.from("companies").select("*").eq("id", operatorId).single();
        if (companyData) setOperator(companyData);
      } else {
        setOperator(orgData);
      }
    } catch (error: any) {
      console.error("Error loading operator:", error);
    }
  }

  async function loadInvoice() {
    try {
      const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (!error && invoice) {
        setFormData({
          amount: invoice.total?.toString() || "",
          description: invoice.notes || invoice.line_items?.[0]?.description || "",
          dueDate: invoice.due_date || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading invoice:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const invoiceData: any = {
        organization_id: operatorId,
        company: operator?.name || operator?.company_name || "N/A",
        contact_name: operator?.contact_name || operator?.owner_name || "",
        contact_email: operator?.primary_contact_email || operator?.contact_email || "",
        total: parseFloat(formData.amount),
        subtotal: parseFloat(formData.amount),
        line_items: [{ description: formData.description, amount: parseFloat(formData.amount) }],
        notes: formData.description,
        due_date: formData.dueDate || null,
        status: "Draft",
        updated_at: new Date().toISOString(),
      };

      if (invoiceId) {
        // Update existing invoice
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoiceId);

        if (error) throw error;
        alert("Invoice updated successfully!");
      } else {
        // Create new invoice
        invoiceData.invoice_number = `INV-${Date.now()}`;
        invoiceData.created_at = new Date().toISOString();

        const { error } = await supabase.from("invoices").insert(invoiceData);

        if (error) throw error;
        alert("Invoice created successfully!");
      }

      router.push(`/partners/ronyx/operators/${operatorId}`);
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      alert("Failed to save invoice: " + error.message);
    } finally {
      setSaving(false);
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

  return (
    <div className="ronyx-dashboard" style={{ background: "#1E1E1E", color: "#FFFFFF", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1E1E1E 0%, #2d2d2d 100%)", borderBottom: "3px solid #F7931E", padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button onClick={() => router.push(`/partners/ronyx/operators/${operatorId}`)} style={{ background: "transparent", border: "1px solid #F7931E", color: "#F7931E", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>← Back</button>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>{invoiceId ? "Edit Invoice" : "Create Invoice"}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem" }}>
          {operator && (
            <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid #404040" }}>
              <div style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Bill To</div>
              <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1.1rem" }}>{operator.name || operator.company_name || "N/A"}</div>
              <div style={{ color: "#ccc", fontSize: "0.9rem" }}>{operator.contact_name || operator.owner_name || ""}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => router.push(`/partners/ronyx/operators/${operatorId}`)}
                style={{ background: "transparent", color: "#FFFFFF", border: "1px solid #404040", padding: "0.75rem 2rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ background: "#F7931E", color: "#1E1E1E", border: "none", padding: "0.75rem 2rem", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? (invoiceId ? "Updating..." : "Creating...") : (invoiceId ? "Update Invoice" : "Create Invoice")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
