"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RegTab = "dot" | "mc" | "ein";

const COMPANY_TYPES = ["Dump Truck Company","Fleet","Broker","Owner Operator Group","Contractor","Mixed Operation"];
const TIMEZONES = ["America/Chicago","America/New_York","America/Denver","America/Los_Angeles","America/Phoenix"];

type Profile = {
  company_name: string; dba: string; address: string; phone: string; email: string;
  dot_number: string; mc_number: string; ein: string; primary_contact: string;
  timezone: string; default_currency: string; default_dispatch_region: string; company_type: string;
};

const EMPTY: Profile = {
  company_name:"", dba:"", address:"", phone:"", email:"",
  dot_number:"", mc_number:"", ein:"", primary_contact:"",
  timezone:"America/Chicago", default_currency:"USD", default_dispatch_region:"", company_type:"Dump Truck Company",
};

const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 11px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12.5, outline: "none", boxSizing: "border-box" };

export default function CompanyProfilePage() {
  const [profile, setProfile]   = useState<Profile>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [regTab, setRegTab]     = useState<RegTab>("dot");

  useEffect(() => {
    fetch("/api/ronyx/settings/admin?group=company_profile").then(r => r.json()).then(d => {
      const p = d.map?.company_profile?.profile;
      if (p) setProfile({ ...EMPTY, ...p });
    }).finally(() => setLoading(false));
  }, []);

  function set(key: keyof Profile) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setProfile(p => ({ ...p, [key]: e.target.value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/settings/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting_group: "company_profile", setting_key: "profile", setting_value: profile }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setToast("Company profile saved.");
    } catch (err: any) {
      setToast(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <Link href="/ronyx/settings" style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Company Profile</span>
      </div>

      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.4px", marginBottom: 6 }}>Company Profile</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 22 }}>Company identity, regulatory numbers, and operational defaults.</div>

      <form onSubmit={save} style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: "24px 28px" }}>
        {/* Identity */}
        <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Identity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
          {[
            { label: "Company Name",    key: "company_name",    placeholder: "Move Around LLC" },
            { label: "DBA",             key: "dba",             placeholder: "Doing Business As…" },
            { label: "Primary Contact", key: "primary_contact", placeholder: "Monica Peña" },
            { label: "Phone",           key: "phone",           placeholder: "+1 (832) 000-0000" },
            { label: "Email",           key: "email",           placeholder: "office@example.com" },
            { label: "Address",         key: "address",         placeholder: "Houston, TX 77001" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input value={(profile as any)[key]} onChange={set(key as keyof Profile)} placeholder={placeholder} style={inp} />
            </div>
          ))}
        </div>

        {/* Regulatory */}
        <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Regulatory Numbers</div>

        {/* Tab row */}
        <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "2px solid #e2e8f0" }}>
          {([
            { id: "dot" as RegTab, label: "US DOT",    prefix: "USDOT",  key: "dot_number" },
            { id: "mc"  as RegTab, label: "MC Number", prefix: "MC-",    key: "mc_number"  },
            { id: "ein" as RegTab, label: "EIN / Tax", prefix: "",       key: "ein"        },
          ] as { id: RegTab; label: string; prefix: string; key: keyof Profile }[]).map(t => {
            const active = regTab === t.id;
            const filled = !!(profile as any)[t.key];
            return (
              <button key={t.id} type="button" onClick={() => setRegTab(t.id)} style={{
                padding: "10px 22px", border: "none", background: "none", cursor: "pointer",
                fontWeight: 800, fontSize: 13,
                color: active ? "#1e40af" : filled ? "#0f172a" : "#94a3b8",
                borderBottom: active ? "2px solid #1e40af" : "2px solid transparent",
                marginBottom: -2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {t.label}
                {filled && <span style={{ background: active ? "#dbeafe" : "#f1f5f9", color: active ? "#1e40af" : "#475569", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Tab panel */}
        <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "20px 22px", marginBottom: 22, background: "#f8fafc" }}>
          {regTab === "dot" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>US DOT Number</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#64748b" }}>USDOT</span>
                <input
                  value={profile.dot_number} onChange={set("dot_number")} placeholder="0000000"
                  style={{ ...inp, width: 180, fontWeight: 700, fontSize: 16, color: "#0f172a", letterSpacing: "0.05em" }}
                />
              </div>
              {profile.dot_number && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
                  Full number: <strong>USDOT {profile.dot_number}</strong>
                </div>
              )}
            </div>
          )}
          {regTab === "mc" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>MC Number (Motor Carrier)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#64748b" }}>MC-</span>
                <input
                  value={profile.mc_number.replace(/^MC-?/i, "")} onChange={e => setProfile(p => ({ ...p, mc_number: "MC-" + e.target.value.replace(/^MC-?/i, "") }))} placeholder="000000"
                  style={{ ...inp, width: 180, fontWeight: 700, fontSize: 16, color: "#0f172a", letterSpacing: "0.05em" }}
                />
              </div>
              {profile.mc_number && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
                  Full number: <strong>{profile.mc_number.startsWith("MC") ? profile.mc_number : "MC-" + profile.mc_number}</strong>
                </div>
              )}
            </div>
          )}
          {regTab === "ein" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>EIN / Federal Tax ID</div>
              <input
                value={profile.ein} onChange={set("ein")} placeholder="XX-XXXXXXX"
                style={{ ...inp, width: 220, fontWeight: 700, fontSize: 16, color: "#0f172a", letterSpacing: "0.05em" }}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Format: 12-3456789</div>
            </div>
          )}
        </div>

        {/* Operational Defaults */}
        <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Operational Defaults</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div>
            <label style={lbl}>Company Type</label>
            <select value={profile.company_type} onChange={set("company_type")} style={inp}>
              {COMPANY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Timezone</label>
            <select value={profile.timezone} onChange={set("timezone")} style={inp}>
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Default Currency</label>
            <input value={profile.default_currency} onChange={set("default_currency")} placeholder="USD" style={inp} />
          </div>
          <div>
            <label style={lbl}>Default Dispatch Region</label>
            <input value={profile.default_dispatch_region} onChange={set("default_dispatch_region")} placeholder="Houston Metro" style={inp} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving}
            style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: saving ? "#93c5fd" : "#1e40af", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
          <Link href="/ronyx/settings">
            <button type="button" style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
