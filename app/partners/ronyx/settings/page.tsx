"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoleBasedAuth } from "../../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function RonyxSettingsPage() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const partnerSlugField = ["s", "l", "u", "g"].join("");
  const [settings, setSettings] = useState({
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    monthlyFee: "",
  });

  const loadSettings = useCallback(async () => {
    try {
      const partnerEmail = user?.email;
      if (!partnerEmail) return;

      // Get partner info
      const partnerKey = "ronyx";
      let { data: partnerData } = await supabase
        .from("partners")
        .select("*")
        .eq("email", partnerEmail)
        .limit(1)
        .single();

      if (!partnerData) {
        const { data: fallbackPartner } = await supabase
          .from("partners")
          .select("*")
          .eq(partnerSlugField, partnerKey)
          .limit(1)
          .single();
        partnerData = fallbackPartner ?? null;
      }

      if (partnerData) {
        setSettings({
          companyName: partnerData.brand_name || partnerData.full_name || "",
          contactEmail: partnerData.email || "",
          contactPhone: partnerData.phone || "",
          monthlyFee: partnerData.monthly_fee?.toString() || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  }, [user?.email]);

  useEffect(() => {
    if (profile?.role === "partner" || user?.email === "melidazvl@outlook.com") {
      loadSettings();
    }
  }, [profile?.role, user?.email, loadSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const partnerEmail = user?.email;
      if (!partnerEmail) return;

      // Update partner settings
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
          .eq(partnerSlugField, partnerKey)
          .limit(1)
          .single();
        partnerData = fallbackPartner ?? null;
      }

      if (partnerData) {
        const { error } = await supabase
          .from("partners")
          .update({
            brand_name: settings.companyName,
            email: settings.contactEmail,
            phone: settings.contactPhone,
            monthly_fee: settings.monthlyFee ? parseFloat(settings.monthlyFee) : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", partnerData.id);

        if (error) throw error;
        alert("Settings saved successfully!");
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Fleet Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "#2A2A2A", border: "1px solid #404040", borderRadius: "12px", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "2rem" }}>Partner Information</h2>

          <div style={{ display: "grid", gap: "1.5rem", marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Contact Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Contact Phone</label>
              <input
                type="tel"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#ccc", marginBottom: "0.5rem", fontWeight: 600 }}>Default Monthly Fee ($)</label>
              <input
                type="number"
                value={settings.monthlyFee}
                onChange={(e) => setSettings({ ...settings, monthlyFee: e.target.value })}
                style={{ width: "100%", background: "#1E1E1E", border: "1px solid #404040", color: "#FFFFFF", padding: "0.75rem", borderRadius: "6px", fontSize: "1rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => router.push("/partners/ronyx")}
              style={{ background: "transparent", color: "#FFFFFF", border: "1px solid #404040", padding: "0.75rem 2rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: "#F7931E", color: "#1E1E1E", border: "none", padding: "0.75rem 2rem", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
