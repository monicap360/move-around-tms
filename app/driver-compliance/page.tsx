"use client";

import { useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "identity" | "cdl" | "medical" | "documents" | "done";

type FormData = {
  full_name:                     string;
  truck_number:                  string;
  phone:                         string;
  home_address:                  string;
  emergency_contact_name:        string;
  emergency_contact_phone:       string;
  emergency_contact_relationship: string;
  cdl_number:                    string;
  cdl_class:                     string;
  cdl_state:                     string;
  cdl_expiration:                string;
  medical_card_expiration:       string;
  drug_test_date:                string;
};

const EMPTY: FormData = {
  full_name: "", truck_number: "", phone: "", home_address: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
  cdl_number: "", cdl_class: "", cdl_state: "", cdl_expiration: "",
  medical_card_expiration: "", drug_test_date: "",
};

const CDL_CLASSES = ["A", "B", "C"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DriverCompliancePage() {
  const [step,      setStep]    = useState<Step>("identity");
  const [form,      setForm]    = useState<FormData>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]   = useState<string | null>(null);
  const [docUrls,   setDocUrls] = useState<{
    cdl_front?: string; cdl_back?: string; medical_card?: string;
  }>({});
  const [docPreviews, setDocPreviews] = useState<{
    cdl_front?: string; cdl_back?: string; medical_card?: string;
  }>({});

  const cdlFrontRef  = useRef<HTMLInputElement>(null);
  const cdlBackRef   = useRef<HTMLInputElement>(null);
  const medCardRef   = useRef<HTMLInputElement>(null);

  function set(field: keyof FormData, val: string) {
    setForm(f => ({ ...f, [field]: val }));
    setError(null);
  }

  // ── Upload a document photo/PDF ──────────────────────────────────────────
  async function uploadDoc(file: File, label: string): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("label", label);
    const res = await fetch("/api/driver-compliance/upload-doc", { method: "POST", body: fd });
    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      throw new Error(e ?? "Upload failed");
    }
    const { url } = await res.json();
    return url;
  }

  async function handleDocFile(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "cdl_front" | "cdl_back" | "medical_card",
    label: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    // Show local preview immediately
    setDocPreviews(p => ({ ...p, [key]: URL.createObjectURL(file) }));
    try {
      const url = await uploadDoc(file, label);
      if (url) setDocUrls(u => ({ ...u, [key]: url }));
    } catch (err: any) {
      setError(err?.message ?? "Upload failed — try again");
      setDocPreviews(p => ({ ...p, [key]: undefined }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/driver-compliance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...docUrls }),
      });
      if (!res.ok) {
        const { error: e } = await res.json().catch(() => ({}));
        throw new Error(e ?? "Submission failed");
      }
      setStep("done");
    } catch (err: any) {
      setError(err?.message ?? "Submission failed — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function canProceed(): boolean {
    if (step === "identity") return !!form.full_name.trim() && !!form.truck_number.trim();
    if (step === "cdl")      return !!form.cdl_number.trim() && !!form.cdl_class && !!form.cdl_state && !!form.cdl_expiration;
    if (step === "medical")  return !!form.medical_card_expiration;
    if (step === "documents") return true;
    return false;
  }

  function nextStep() {
    if (step === "identity")  { setStep("cdl");       return; }
    if (step === "cdl")       { setStep("medical");   return; }
    if (step === "medical")   { setStep("documents"); return; }
    if (step === "documents") { handleSubmit();        return; }
  }

  const STEPS: Step[] = ["identity", "cdl", "medical", "documents"];
  const stepIdx = STEPS.indexOf(step);

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    page:     { minHeight: "100vh", background: "#f0f4ff", fontFamily: "'Inter','Segoe UI',sans-serif", padding: "0 0 40px" } as React.CSSProperties,
    header:   { background: "#1e3a8a", color: "#fff", padding: "16px 20px 14px", textAlign: "center" as const },
    logo:     { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)", marginBottom: 4 },
    title:    { fontSize: "1.1rem", fontWeight: 800, color: "#fff", marginBottom: 2 },
    subtitle: { fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" },
    card:     { background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(30,58,138,0.08)", padding: "24px 20px", margin: "16px 16px 0", maxWidth: 480, marginLeft: "auto", marginRight: "auto" } as React.CSSProperties,
    label:    { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 } as React.CSSProperties,
    input:    { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "1rem", color: "#111827", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" },
    inputFocus: { borderColor: "#2563eb" },
    select:   { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "1rem", color: "#111827", outline: "none", background: "#fff", boxSizing: "border-box" as const, fontFamily: "inherit" } as React.CSSProperties,
    field:    { marginBottom: 16 } as React.CSSProperties,
    row2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 } as React.CSSProperties,
    btn:      { width: "100%", padding: "14px", borderRadius: 12, border: "none", fontWeight: 800, fontSize: "1rem", cursor: "pointer", transition: "background 120ms" } as React.CSSProperties,
    btnPrimary: { background: "#1e3a8a", color: "#fff" } as React.CSSProperties,
    btnDisabled: { background: "#9ca3af", color: "#fff", cursor: "default" } as React.CSSProperties,
    sectionTitle: { fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#6b7280", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" } as React.CSSProperties,
    stepBar:  { display: "flex", gap: 6, padding: "14px 20px", maxWidth: 480, margin: "0 auto" } as React.CSSProperties,
    docBox:   { border: "2px dashed #d1d5db", borderRadius: 12, padding: "18px 16px", textAlign: "center" as const, cursor: "pointer", background: "#fafafa", marginBottom: 4, transition: "border-color 120ms" } as React.CSSProperties,
    docBoxDone: { borderColor: "#16a34a", background: "#f0fdf4" } as React.CSSProperties,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <div style={S.logo}>MoveAround TMS · Ronyx Logistics</div>
          <div style={S.title}>Driver Compliance Portal</div>
        </div>
        <div style={{ ...S.card, textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#15803d", marginBottom: 8 }}>Information Submitted!</div>
          <div style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
            Thank you, <strong>{form.full_name}</strong>.<br/>
            Your compliance information has been received and will be reviewed by the office team.
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", fontSize: "0.82rem", color: "#15803d", marginBottom: 24 }}>
            <strong>What happens next:</strong> The office will verify your documents and update your profile. If anything is missing, they will reach out to you.
          </div>
          <button style={{ ...S.btn, ...S.btnPrimary, maxWidth: 240, margin: "0 auto" }} onClick={() => { setForm(EMPTY); setDocUrls({}); setDocPreviews({}); setStep("identity"); }}>
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>MoveAround TMS · Ronyx Logistics</div>
        <div style={S.title}>Driver Compliance Portal</div>
        <div style={S.subtitle}>Submit your compliance information securely</div>
      </div>

      {/* Step progress bar */}
      <div style={S.stepBar}>
        {["Your Info", "CDL", "Medical Card", "Documents"].map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: 4, borderRadius: 4, marginBottom: 4,
              background: i <= stepIdx ? "#1e3a8a" : "#e5e7eb",
              transition: "background 200ms",
            }} />
            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: i <= stepIdx ? "#1e3a8a" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={S.card}>

        {/* ── STEP 1: Identity ──────────────────────────────────────── */}
        {step === "identity" && (
          <>
            <div style={S.sectionTitle}>Your Information</div>

            <div style={S.field}>
              <label style={S.label}>Full Name *</label>
              <input style={S.input} placeholder="First and Last Name" value={form.full_name}
                onChange={e => set("full_name", e.target.value)} autoFocus autoComplete="name" />
            </div>

            <div style={S.field}>
              <label style={S.label}>Truck Number *</label>
              <input style={S.input} placeholder="e.g. MM-1234" value={form.truck_number}
                onChange={e => set("truck_number", e.target.value)} autoComplete="off" />
            </div>

            <div style={S.field}>
              <label style={S.label}>Cell Phone</label>
              <input style={S.input} type="tel" placeholder="(000) 000-0000" value={form.phone}
                onChange={e => set("phone", e.target.value)} autoComplete="tel" />
            </div>

            <div style={S.field}>
              <label style={S.label}>Home Address</label>
              <input style={S.input} placeholder="Street, City, State, ZIP" value={form.home_address}
                onChange={e => set("home_address", e.target.value)} autoComplete="street-address" />
            </div>

            <div style={{ ...S.sectionTitle, marginTop: 20 }}>Emergency Contact</div>

            <div style={S.field}>
              <label style={S.label}>Emergency Contact Name</label>
              <input style={S.input} placeholder="Full Name" value={form.emergency_contact_name}
                onChange={e => set("emergency_contact_name", e.target.value)} />
            </div>

            <div style={S.row2}>
              <div>
                <label style={S.label}>Phone</label>
                <input style={S.input} type="tel" placeholder="(000) 000-0000" value={form.emergency_contact_phone}
                  onChange={e => set("emergency_contact_phone", e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Relationship</label>
                <select style={S.select} value={form.emergency_contact_relationship}
                  onChange={e => set("emergency_contact_relationship", e.target.value)}>
                  <option value="">Select…</option>
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                  <option>Child</option>
                  <option>Partner</option>
                  <option>Friend</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2: CDL ──────────────────────────────────────────── */}
        {step === "cdl" && (
          <>
            <div style={S.sectionTitle}>Commercial Driver's License (CDL)</div>

            <div style={S.field}>
              <label style={S.label}>CDL License Number *</label>
              <input style={S.input} placeholder="License number on your CDL" value={form.cdl_number}
                onChange={e => set("cdl_number", e.target.value.toUpperCase())} autoCapitalize="characters" />
            </div>

            <div style={S.row2}>
              <div>
                <label style={S.label}>CDL Class *</label>
                <select style={S.select} value={form.cdl_class} onChange={e => set("cdl_class", e.target.value)}>
                  <option value="">Class…</option>
                  {CDL_CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Issuing State *</label>
                <select style={S.select} value={form.cdl_state} onChange={e => set("cdl_state", e.target.value)}>
                  <option value="">State…</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>CDL Expiration Date *</label>
              <input style={S.input} type="date" value={form.cdl_expiration}
                onChange={e => set("cdl_expiration", e.target.value)} />
            </div>

            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 14px", fontSize: "0.78rem", color: "#1e40af", marginTop: 8 }}>
              ℹ️ Your CDL number and expiration date are required to verify dispatch eligibility and complete payroll.
            </div>
          </>
        )}

        {/* ── STEP 3: Medical Card ─────────────────────────────────── */}
        {step === "medical" && (
          <>
            <div style={S.sectionTitle}>DOT Medical Card</div>

            <div style={S.field}>
              <label style={S.label}>Medical Card Expiration Date *</label>
              <input style={S.input} type="date" value={form.medical_card_expiration}
                onChange={e => set("medical_card_expiration", e.target.value)} />
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 5 }}>
                Found on your DOT physical card. Required for compliance.
              </div>
            </div>

            <div style={{ ...S.sectionTitle, marginTop: 20 }}>Drug & Alcohol Test (Optional)</div>

            <div style={S.field}>
              <label style={S.label}>Last Drug Test Date</label>
              <input style={S.input} type="date" value={form.drug_test_date}
                onChange={e => set("drug_test_date", e.target.value)} />
            </div>

            <div style={{ background: "#fefce8", borderRadius: 10, padding: "12px 14px", fontSize: "0.78rem", color: "#854d0e", marginTop: 8 }}>
              ⚠️ A valid medical card (not expired) is required to operate a commercial vehicle. Please keep your card on your person at all times.
            </div>
          </>
        )}

        {/* ── STEP 4: Documents ────────────────────────────────────── */}
        {step === "documents" && (
          <>
            <div style={S.sectionTitle}>Upload Document Photos</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
              Take a clear photo of each document. JPG, PNG, HEIC, or PDF accepted. Each file limit is 10 MB.
            </div>

            {/* CDL Front */}
            <div style={S.field}>
              <label style={S.label}>CDL — Front</label>
              <div
                style={{ ...(docPreviews.cdl_front ? { ...S.docBox, ...S.docBoxDone } : S.docBox) }}
                onClick={() => cdlFrontRef.current?.click()}
              >
                {docPreviews.cdl_front ? (
                  <div>
                    <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>✅</div>
                    <div style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600 }}>CDL Front uploaded</div>
                    <div style={{ fontSize: "0.68rem", color: "#6b7280", marginTop: 2 }}>Tap to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "2rem", marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Tap to take photo or upload</div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 4 }}>CDL front side</div>
                  </div>
                )}
              </div>
              <input ref={cdlFrontRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }}
                onChange={e => handleDocFile(e, "cdl_front", "cdl_front")} />
            </div>

            {/* CDL Back */}
            <div style={S.field}>
              <label style={S.label}>CDL — Back</label>
              <div
                style={{ ...(docPreviews.cdl_back ? { ...S.docBox, ...S.docBoxDone } : S.docBox) }}
                onClick={() => cdlBackRef.current?.click()}
              >
                {docPreviews.cdl_back ? (
                  <div>
                    <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>✅</div>
                    <div style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600 }}>CDL Back uploaded</div>
                    <div style={{ fontSize: "0.68rem", color: "#6b7280", marginTop: 2 }}>Tap to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "2rem", marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Tap to take photo or upload</div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 4 }}>CDL back side (endorsements)</div>
                  </div>
                )}
              </div>
              <input ref={cdlBackRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }}
                onChange={e => handleDocFile(e, "cdl_back", "cdl_back")} />
            </div>

            {/* Medical Card */}
            <div style={S.field}>
              <label style={S.label}>DOT Medical Card</label>
              <div
                style={{ ...(docPreviews.medical_card ? { ...S.docBox, ...S.docBoxDone } : S.docBox) }}
                onClick={() => medCardRef.current?.click()}
              >
                {docPreviews.medical_card ? (
                  <div>
                    <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>✅</div>
                    <div style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600 }}>Medical Card uploaded</div>
                    <div style={{ fontSize: "0.68rem", color: "#6b7280", marginTop: 2 }}>Tap to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "2rem", marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Tap to take photo or upload</div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 4 }}>DOT medical examiner's certificate</div>
                  </div>
                )}
              </div>
              <input ref={medCardRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }}
                onChange={e => handleDocFile(e, "medical_card", "medical_card")} />
            </div>

            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
              Documents are optional but speed up your verification. All files are stored securely and only accessible by Ronyx Logistics office staff.
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "11px 14px", color: "#dc2626", fontSize: "0.82rem", marginBottom: 16, marginTop: 8 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step !== "identity" && (
            <button
              style={{ ...S.btn, background: "#f3f4f6", color: "#374151", flex: "0 0 80px", fontSize: "0.9rem" }}
              onClick={() => {
                if (step === "cdl")       setStep("identity");
                if (step === "medical")   setStep("cdl");
                if (step === "documents") setStep("medical");
              }}
            >
              ← Back
            </button>
          )}
          <button
            style={{ ...S.btn, ...(canProceed() && !uploading && !submitting ? S.btnPrimary : S.btnDisabled), flex: 1 }}
            disabled={!canProceed() || uploading || submitting}
            onClick={nextStep}
          >
            {submitting ? "Submitting…" :
             uploading  ? "Uploading…"  :
             step === "documents" ? "Submit Compliance Info" : "Continue →"}
          </button>
        </div>

        {step === "identity" && (
          <div style={{ marginTop: 16, fontSize: "0.72rem", color: "#9ca3af", textAlign: "center" }}>
            Your information is submitted directly to Ronyx Logistics.<br/>
            Questions? Call the office at your dispatch contact number.
          </div>
        )}
      </div>
    </div>
  );
}
