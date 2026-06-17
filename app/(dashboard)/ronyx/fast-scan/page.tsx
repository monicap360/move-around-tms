"use client";

import { useEffect, useRef, useState } from "react";

const SCAN_TYPES = [
  { value: "trip_proof",    label: "Trip Proof",          icon: "📋", color: "#16a34a", bg: "#f0fdf4" },
  { value: "fuel",          label: "Fuel / Toll",         icon: "⛽", color: "#2563eb", bg: "#eff6ff" },
  { value: "receipt",       label: "Receipt / Expense",   icon: "🧾", color: "#7c3aed", bg: "#f5f3ff" },
  { value: "damage",        label: "Damage Report",       icon: "⚠️",  color: "#dc2626", bg: "#fef2f2" },
  { value: "incident",      label: "Incident Report",     icon: "🚨", color: "#ea580c", bg: "#fff7ed" },
  { value: "complaint",     label: "Customer Complaint",  icon: "💬", color: "#d97706", bg: "#fffbeb" },
  { value: "no_show",       label: "No-Show",             icon: "🚫", color: "#6b7280", bg: "#f9fafb" },
  { value: "missing_proof", label: "Missing Proof",       icon: "❓", color: "#0891b2", bg: "#ecfeff" },
  { value: "other",         label: "Other",               icon: "📌", color: "#64748b", bg: "#f8fafc" },
];

const PAYROLL_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create:    { label: "Create Pay",    color: "#16a34a" },
  hold:      { label: "Hold",          color: "#dc2626" },
  adjust:    { label: "Adjust",        color: "#d97706" },
  reimburse: { label: "Reimburse",     color: "#7c3aed" },
  release:   { label: "Release",       color: "#2563eb" },
  none:      { label: "No Impact",     color: "#94a3b8" },
};

type ScanResult = {
  scan: any;
  ticket: any;
  payroll_item: any | null;
  payroll_action: string;
  payroll_impact: boolean;
  message: string;
};

type Scan = any;

const S = {
  page:   { padding: 0 },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "28px 32px 24px",
    borderRadius: 14,
    marginBottom: 24,
    color: "#fff",
  },
  hTitle:  { fontSize: "1.5rem", fontWeight: 800, margin: 0 },
  hSub:    { fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 },
  card:    { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 },
  row:     { display: "flex", gap: 16, flexWrap: "wrap" as const },
  label:   { fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  input:   { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none", background: "#f8fafc" },
  btn:     { padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer" },
};

export default function FastScanPage() {
  const [scanType, setScanType]     = useState("trip_proof");
  const [driverName, setDriverName] = useState("");
  const [truckNum, setTruckNum]     = useState("");
  const [jobNum, setJobNum]         = useState("");
  const [amount, setAmount]         = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<ScanResult | null>(null);
  const [error, setError]           = useState("");
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ronyx/fast-scan")
      .then(r => r.json())
      .then(d => setRecentScans(d.scans || []))
      .catch(() => {})
      .finally(() => setLoadingScans(false));
  }, []);

  const selectedType = SCAN_TYPES.find(t => t.value === scanType)!;

  async function submit() {
    if (!driverName.trim() && !truckNum.trim()) {
      setError("Enter at least a driver name or truck number.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/ronyx/fast-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: `fastScan://manual/${Date.now()}`,
          file_type: "manual",
          scan_type: scanType,
          driver_name: driverName || null,
          detected_vehicle: truckNum || null,
          job_number: jobNum || null,
          detected_amount: amount ? parseFloat(amount) : null,
          extracted_text: notes || null,
          confidence_score: 1,
          uploaded_by: "dispatcher",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Submission failed."); return; }
      setResult(data);
      // refresh scans
      fetch("/api/ronyx/fast-scan").then(r => r.json()).then(d => setRecentScans(d.scans || []));
      // reset form
      setDriverName(""); setTruckNum(""); setJobNum(""); setAmount(""); setNotes("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        {/* Brand stack */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            {/* Product name */}
            <h1 style={{ ...S.hTitle, fontSize: "1.8rem", letterSpacing: "-0.02em" }}>
              Fast Scan™
            </h1>
            {/* Module tagline */}
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.02em" }}>
              Ticket OCR &nbsp;•&nbsp; Invoice Match &nbsp;•&nbsp; Payroll Verification
            </p>
            {/* Powered-by line */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Powered by
              </span>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                MoveAround TMS
              </span>
              <span style={{ fontSize: "0.62rem", color: "#64748b", fontWeight: 600 }}>
                &nbsp;·&nbsp; by Igotta Technologies
              </span>
            </div>
          </div>
          {/* Badge */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>📡</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Live</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* Left: form */}
        <div>
          {/* Scan type grid */}
          <div style={S.card}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>Scan Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {SCAN_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setScanType(t.value)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 10,
                    border: scanType === t.value ? `2px solid ${t.color}` : "2px solid #e2e8f0",
                    background: scanType === t.value ? t.bg : "#f8fafc",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    transition: "all 120ms",
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: scanType === t.value ? t.color : "#64748b", lineHeight: 1.2 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div style={S.card} ref={formRef}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.07em" }}>Details</div>
            <div style={S.row}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={S.label}>Driver Name</label>
                <input style={S.input} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Truck / Unit #</label>
                <input style={S.input} value={truckNum} onChange={e => setTruckNum(e.target.value)} placeholder="e.g. 142" />
              </div>
            </div>
            <div style={{ ...S.row, marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Job / Project #</label>
                <input style={S.input} value={jobNum} onChange={e => setJobNum(e.target.value)} placeholder="e.g. MM-4421" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Amount ($)</label>
                <input style={S.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 245.00" type="number" step="0.01" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Notes / Extracted Text</label>
              <textarea
                style={{ ...S.input, height: 80, resize: "vertical", fontFamily: "inherit" }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste extracted text or add notes here…"
              />
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.82rem" }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={submit}
                disabled={submitting}
                style={{ ...S.btn, background: selectedType.color, color: "#fff", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Submitting…" : `Submit ${selectedType.icon} ${selectedType.label}`}
              </button>
            </div>
          </div>

          {/* Result card */}
          {result && (
            <div style={{ ...S.card, border: "2px solid #16a34a", background: "#f0fdf4" }}>
              <div style={{ fontWeight: 700, color: "#16a34a", marginBottom: 10 }}>✓ Scan Submitted</div>
              <div style={{ fontSize: "0.82rem", color: "#166534", marginBottom: 12 }}>{result.message}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  ["Scan ID", result.scan?.id?.slice(-8)],
                  ["Ticket ID", result.ticket?.id?.slice(-8)],
                  ["Payroll Action", (() => {
                    const a = PAYROLL_ACTION_LABELS[result.payroll_action] || { label: result.payroll_action, color: "#64748b" };
                    return <span style={{ fontWeight: 700, color: a.color }}>{a.label}</span>;
                  })()],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setResult(null)} style={{ marginTop: 12, ...S.btn, background: "#fff", border: "1px solid #e2e8f0", color: "#475569" }}>
                New Scan
              </button>
            </div>
          )}
        </div>

        {/* Right: recent scans */}
        <div style={S.card}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Recent Scans</span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{recentScans.length} records</span>
          </div>
          {loadingScans ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>Loading…</div>
          ) : recentScans.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>No scans yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentScans.slice(0, 20).map((s: any) => {
                const t = SCAN_TYPES.find(x => x.value === s.scan_type) || SCAN_TYPES[SCAN_TYPES.length - 1];
                return (
                  <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #f1f5f9", background: "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: t.color }}>{t.label}</span>
                      <span style={{
                        marginLeft: "auto",
                        fontSize: "0.67rem",
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: s.upload_status === "linked" ? "#dcfce7" : "#fef3c7",
                        color: s.upload_status === "linked" ? "#16a34a" : "#92400e",
                      }}>{s.upload_status}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {s.detected_vehicle && <span>Truck {s.detected_vehicle} · </span>}
                      {new Date(s.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legal footer */}
      <div style={{ marginTop: 32, padding: "14px 0", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "0.68rem", color: "#94a3b8", lineHeight: 1.7 }}>
          <strong style={{ color: "#64748b" }}>Fast Scan™</strong> is a product of{" "}
          <strong style={{ color: "#64748b" }}>Igotta Technologies</strong> and part of the{" "}
          <strong style={{ color: "#64748b" }}>MoveAround TMS</strong> platform.
        </p>
      </div>
    </div>
  );
}
