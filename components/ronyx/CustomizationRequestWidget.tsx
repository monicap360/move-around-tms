"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const PAGE_OPTIONS = [
  "Dispatch / Daily Import",
  "Dispatch Guard™",
  "Fast Scan™",
  "Tickets",
  "Payroll",
  "Billing",
  "Fleet / Trucks",
  "Maintenance",
  "Compliance",
  "Drivers",
  "Owner Operators",
  "Driver Network",
  "Reports",
  "Settings",
  "Dashboard / Home",
  "Other / Not Listed",
];

type FormState = {
  page_or_feature: string;
  description:     string;
  priority:        "low" | "normal" | "urgent";
  contact_name:    string;
  contact_email:   string;
};

const EMPTY: FormState = {
  page_or_feature: "",
  description:     "",
  priority:        "normal",
  contact_name:    "",
  contact_email:   "",
};

export default function CustomizationRequestWidget() {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState<FormState>({ ...EMPTY, page_or_feature: guessPage(pathname) });
  const [submitting, setSub]  = useState(false);
  const [done, setDone]       = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);

  function guessPage(p: string): string {
    if (p.includes("fast-scan"))      return "Fast Scan™";
    if (p.includes("daily-import"))   return "Dispatch / Daily Import";
    if (p.includes("dispatch-guard")) return "Dispatch Guard™";
    if (p.includes("dispatch"))       return "Dispatch / Daily Import";
    if (p.includes("tickets"))        return "Tickets";
    if (p.includes("payroll"))        return "Payroll";
    if (p.includes("billing"))        return "Billing";
    if (p.includes("fleet"))          return "Fleet / Trucks";
    if (p.includes("maintenance"))    return "Maintenance";
    if (p.includes("compliance"))     return "Compliance";
    if (p.includes("drivers"))        return "Drivers";
    if (p.includes("owner-operator")) return "Owner Operators";
    if (p.includes("driver-network")) return "Driver Network";
    if (p.includes("reports"))        return "Reports";
    if (p.includes("settings"))       return "Settings";
    return "";
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.description.trim()) {
      setErr("Please describe what you need changed.");
      return;
    }
    setSub(true); setErr(null);
    try {
      const r = await fetch("/api/ronyx/support/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          org_name: typeof window !== "undefined"
            ? window.location.hostname.split(".")[0].toUpperCase()
            : "Unknown",
          org_slug: typeof window !== "undefined"
            ? window.location.hostname.split(".")[0]
            : "",
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setDone(d.request_id);
        setForm({ ...EMPTY, page_or_feature: guessPage(pathname) });
      } else {
        setErr(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSub(false);
    }
  }

  function close() {
    setOpen(false);
    setDone(null);
    setErr(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: "0.85rem",
    background: "#f8fafc", color: "#0f172a", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setDone(null); setErr(null); }}
        title="Request a customization or change"
        style={{
          position: "fixed",
          bottom: 76,
          right: 20,
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 24,
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "#fff",
          fontSize: "0.82rem",
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(109,40,217,0.45)",
          fontFamily: "Inter, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🔧</span>
        Request a Change
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.50)",
            zIndex: 9999, display: "flex", alignItems: "flex-end",
            justifyContent: "center", padding: "0 0 0 0",
          }}
        >
          {/* Modal panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480,
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              padding: "28px 24px 32px",
              fontFamily: "Inter, sans-serif",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />

            {done ? (
              /* Success state */
              <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                  Thank You for Your Request
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6, marginBottom: 4 }}>
                  We received your request (#{done}). Our team will review it and follow up with you on whether it can be scheduled and when.
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 24 }}>
                  Please note this is a request only and does not guarantee implementation.
                </div>
                <button
                  onClick={close}
                  style={{
                    padding: "10px 28px", borderRadius: 10, border: "none",
                    background: "#0f172a", color: "#fff", fontSize: "0.88rem",
                    fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    🔧 Request a Change or Customization
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
                    Describe what you need and we'll get back to you.
                  </div>
                </div>

                {/* Page / feature */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                    WHICH PAGE OR FEATURE?
                  </label>
                  <select
                    value={form.page_or_feature}
                    onChange={(e) => set("page_or_feature", e.target.value)}
                    style={inp}
                  >
                    <option value="">— Select a page or feature —</option>
                    {PAGE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                    WHAT DO YOU NEED CHANGED? *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Describe the change, new feature, or problem you're experiencing..."
                    rows={4}
                    style={{ ...inp, resize: "vertical", minHeight: 100 }}
                  />
                </div>

                {/* Priority */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
                    PRIORITY
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["low", "normal", "urgent"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => set("priority", p)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: 8, fontSize: "0.82rem",
                          fontWeight: 700, cursor: "pointer", border: "2px solid",
                          borderColor: form.priority === p
                            ? (p === "urgent" ? "#dc2626" : p === "normal" ? "#1d4ed8" : "#16a34a")
                            : "#e2e8f0",
                          background: form.priority === p
                            ? (p === "urgent" ? "#fef2f2" : p === "normal" ? "#eff6ff" : "#f0fdf4")
                            : "#fff",
                          color: form.priority === p
                            ? (p === "urgent" ? "#dc2626" : p === "normal" ? "#1d4ed8" : "#16a34a")
                            : "#94a3b8",
                        }}
                      >
                        {p === "low" ? "🟢 Low" : p === "normal" ? "🟡 Normal" : "🔴 Urgent"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                      YOUR NAME (optional)
                    </label>
                    <input
                      value={form.contact_name}
                      onChange={(e) => set("contact_name", e.target.value)}
                      placeholder="Your name"
                      style={inp}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                      YOUR EMAIL (optional)
                    </label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => set("contact_email", e.target.value)}
                      placeholder="you@company.com"
                      style={inp}
                    />
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{
                  background: "#fefce8", border: "1px solid #fde68a",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                  fontSize: "0.78rem", color: "#92400e", lineHeight: 1.5,
                }}>
                  <strong>Please note:</strong> Submitting this form is a request only — it does not guarantee implementation. All requests are reviewed by the MoveAround TMS team. We will follow up to let you know if and when your request will be scheduled.
                </div>

                {/* Error */}
                {err && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: "0.83rem", marginBottom: 14 }}>
                    {err}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                    background: submitting ? "#94a3b8" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "#fff", fontSize: "0.92rem", fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Sending..." : "📨 Submit Request"}
                </button>

                <button
                  onClick={close}
                  style={{
                    width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10,
                    border: "1px solid #e2e8f0", background: "#fff",
                    color: "#64748b", fontSize: "0.85rem", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
