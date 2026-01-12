"use client";

import { useState, useEffect } from "react";
import { useRoleBasedAuth } from "../../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function RonyxNewOperatorPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    monthlyFee: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const partnerEmail = user?.email;
      if (!partnerEmail) {
        alert("User not found");
        return;
      }

      // Get partner info
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id")
        .or(`email.eq.${partnerEmail},slug.eq.ronyx`)
        .limit(1)
        .single();

      if (!partnerData) {
        alert("Partner not found");
        return;
      }

      // Create new organization/company (operator)
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.companyName,
          contact_name: formData.contactName,
          primary_contact_email: formData.contactEmail,
          primary_contact_phone: formData.contactPhone,
          monthly_fee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : 0,
          partner_id: partnerData.id,
          status: "active",
        })
        .select()
        .single();

      if (orgError) {
        // Try companies table as fallback
        const { error: companyError } = await supabase.from("companies").insert({
          name: formData.companyName,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          monthly_fee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : 0,
          partner_id: partnerData.id,
          status: "active",
        });

        if (companyError) throw companyError;
      }

      alert("Operator added successfully!");
      router.push("/partners/ronyx");
    } catch (error: any) {
      console.error("Error adding operator:", error);
      alert("Failed to add operator: " + error.message);
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
            <button onClick={() => router.push("/partners/ronyx")} style={{ background: "transparent", border: "1px solid #F7931E", color: "#F7931E", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>← Back</button>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Add New Operator</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Monthly Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                  style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => router.push("/partners/ronyx")}
                style={{ background: "transparent", color: "#FFFFFF", border: "1px solid #404040", padding: "0.75rem 2rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ background: "#F7931E", color: "#1E1E1E", border: "none", padding: "0.75rem 2rem", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Adding..." : "Add Operator"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
