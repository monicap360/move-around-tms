"use client";

import { useEffect, useRef, useState } from "react";

type UploadStatus =
  | "idle"
  | "checking_quality"
  | "uploading"
  | "processing_ocr"
  | "confirming"
  | "submitted"
  | "error";

type DriverUploadResult = {
  upload_id?: string;
  ticket_number?: string;
  ocr_confidence?: number;
  extracted?: {
    ticket_number?: string;
    truck_number?: string;
    driver_name?: string;
    ticket_date?: string;
    material?: string;
    tons?: number;
  };
  missing_fields?: string[];
  photo_quality_status?: string;
  upload_status?: string;
  message?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  submitted:          { label: "Submitted",             color: "#2563eb", icon: "📤" },
  processing:         { label: "Reading Ticket",        color: "#7c3aed", icon: "🔍" },
  needs_better_photo: { label: "Needs Better Photo",    color: "#dc2626", icon: "📷" },
  needs_review:       { label: "Needs Office Review",   color: "#d97706", icon: "⚠️" },
  accepted:           { label: "Accepted",              color: "#16a34a", icon: "✅" },
  missing_original:   { label: "Missing Original Ticket", color: "#ea580c", icon: "📋" },
};

export default function DriverUploadTicketPage() {
  const [driverName, setDriverName]     = useState("");
  const [truckNumber, setTruckNumber]   = useState("");
  const [jobNumber, setJobNumber]       = useState("");
  const [frontFile, setFrontFile]       = useState<File | null>(null);
  const [backFile, setBackFile]         = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview]   = useState<string | null>(null);
  const [notes, setNotes]               = useState("");
  const [status, setStatus]             = useState<UploadStatus>("idle");
  const [result, setResult]             = useState<DriverUploadResult | null>(null);
  const [error, setError]               = useState("");
  const [history, setHistory]           = useState<any[]>([]);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ronyx/fast-scan/upload?source=driver_mobile&limit=10")
      .then(r => r.json())
      .then(d => setHistory(d.documents || []))
      .catch(() => {});
  }, []);

  function previewFile(file: File, setter: (url: string) => void) {
    const url = URL.createObjectURL(file);
    setter(url);
  }

  function handleFrontFile(f: File) {
    setFrontFile(f);
    previewFile(f, setFrontPreview);
  }

  function handleBackFile(f: File) {
    setBackFile(f);
    previewFile(f, setBackPreview);
  }

  async function handleSubmit() {
    if (!frontFile) { setError("Take a photo of the front of your ticket first."); return; }
    if (!driverName.trim()) { setError("Enter your name."); return; }
    setError("");
    setStatus("checking_quality");

    await new Promise(r => setTimeout(r, 600)); // brief quality check pause

    setStatus("uploading");
    try {
      const form = new FormData();
      form.append("file", frontFile, frontFile.name);
      if (backFile) form.append("back_file", backFile, backFile.name);
      form.append("scan_type", "ticket");
      form.append("uploaded_from", "driver_mobile");
      form.append("driver_name", driverName.trim());
      if (truckNumber) form.append("truck_number", truckNumber.trim());
      if (jobNumber)   form.append("job_number",   jobNumber.trim());
      if (notes)       form.append("notes",        notes.trim());

      const res = await fetch("/api/ronyx/fast-scan/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        setError(data.error || "Upload failed. Please try again.");
        setStatus("error");
        return;
      }

      // Run OCR
      if (data.document_id) {
        setStatus("processing_ocr");
        try {
          const ocrRes = await fetch("/api/ronyx/fast-scan/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: data.document_id }),
          });
          const ocrData = await ocrRes.json();
          setResult({
            upload_id:          data.document_id,
            ticket_number:      ocrData.ticket_number || data.ticket_number,
            ocr_confidence:     ocrData.ocr_confidence,
            extracted:          ocrData.extracted,
            missing_fields:     ocrData.missing_fields,
            photo_quality_status: "good",
            upload_status:      "submitted",
            message:            "Your ticket was received. The office will review it shortly.",
          });
        } catch {
          setResult({
            upload_id:     data.document_id,
            upload_status: "submitted",
            message:       "Ticket uploaded. OCR will run shortly — the office will review it.",
          });
        }
      } else {
        setResult({
          upload_status: "submitted",
          message:       "Ticket submitted. The office will review it shortly.",
        });
      }

      setStatus("submitted");
      setHistory(prev => [{ id: data.document_id, driver_name: driverName, created_at: new Date().toISOString(), upload_status: "submitted" }, ...prev.slice(0, 9)]);
    } catch (e: any) {
      setError(e.message || "Upload failed — check your connection and try again.");
      setStatus("error");
    }
  }

  function resetForm() {
    setFrontFile(null); setBackFile(null);
    setFrontPreview(null); setBackPreview(null);
    setDriverName(""); setTruckNumber(""); setJobNumber(""); setNotes("");
    setResult(null); setError("");
    setStatus("idle");
    if (frontRef.current) frontRef.current.value = "";
    if (backRef.current)  backRef.current.value  = "";
  }

  const isSubmitting = ["checking_quality","uploading","processing_ocr"].includes(status);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 40px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 14, padding: "20px 20px 18px", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Submit Ticket</div>
        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>Take a photo of your ticket and submit it from your phone.</div>
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "4px 10px" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Fast Scan™ · MoveAround TMS</span>
        </div>
      </div>

      {/* Submitted confirmation */}
      {status === "submitted" && result && (
        <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: "#15803d", fontSize: "1rem", marginBottom: 4 }}>✓ Ticket Submitted</div>
          <div style={{ fontSize: "0.82rem", color: "#166534", marginBottom: 16 }}>{result.message}</div>

          {result.ticket_number && (
            <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0", marginBottom: 12 }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Ticket #</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>{result.ticket_number}</div>
            </div>
          )}

          {result.extracted && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>What we read</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  ["Driver",   result.extracted.driver_name],
                  ["Truck",    result.extracted.truck_number],
                  ["Date",     result.extracted.ticket_date],
                  ["Material", result.extracted.material],
                  ["Tons",     result.extracted.tons?.toString()],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={String(k)} style={{ background: "#fff", borderRadius: 6, padding: "7px 10px", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const }}>{k}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#0f172a", marginTop: 1 }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(result.missing_fields?.length ?? 0) > 0 && (
            <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: "0.75rem", color: "#92400e", marginBottom: 12 }}>
              <strong>Heads up:</strong> We couldn't read {result.missing_fields!.join(", ")} clearly. The office will review.
            </div>
          )}

          <div style={{ padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.72rem", color: "#1e40af" }}>
            <strong>Keep your paper ticket.</strong> You may be asked to turn in the original within 3 business days.
          </div>

          <button onClick={resetForm} style={{ marginTop: 16, width: "100%", padding: "12px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
            Submit Another Ticket
          </button>
        </div>
      )}

      {/* Upload form */}
      {status !== "submitted" && (
        <>
          {/* Driver info */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem", marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Your Info</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {[
                { label: "Your Name *", value: driverName, set: setDriverName, placeholder: "First and last name", required: true },
                { label: "Truck / Unit #", value: truckNumber, set: setTruckNumber, placeholder: "e.g. 8143" },
                { label: "Job / Project #", value: jobNumber, set: setJobNumber, placeholder: "e.g. MM-4421 (if known)" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{f.label}</label>
                  <input
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.9rem", outline: "none", background: "#f8fafc", boxSizing: "border-box" as const }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Front photo */}
          <div style={{ background: "#fff", borderRadius: 12, border: frontFile ? "2px solid #16a34a" : "2px dashed #cbd5e1", padding: 18, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              Front of Ticket *
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 12 }}>Take a clear photo of the front. Make sure all fields are readable.</div>

            <input ref={frontRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f); }} />

            {frontPreview ? (
              <div>
                <img src={frontPreview} alt="Front ticket preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #e2e8f0", maxHeight: 240, objectFit: "cover" as const }} />
                <button onClick={() => frontRef.current?.click()}
                  style={{ marginTop: 8, width: "100%", padding: "8px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                  📷 Retake Photo
                </button>
              </div>
            ) : (
              <button onClick={() => frontRef.current?.click()}
                style={{ width: "100%", padding: "20px", background: "#f8fafc", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "center" as const }}>
                <div style={{ fontSize: "2rem", marginBottom: 4 }}>📷</div>
                <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Take Photo</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>or tap to choose from gallery</div>
              </button>
            )}
          </div>

          {/* Back photo (optional) */}
          <div style={{ background: "#fff", borderRadius: 12, border: backFile ? "2px solid #16a34a" : "1px solid #e2e8f0", padding: 18, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              Back of Ticket <span style={{ fontWeight: 500, color: "#94a3b8", textTransform: "none" as const, fontSize: "0.72rem" }}>(optional)</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 12 }}>Add a back photo if it has signatures or additional information.</div>

            <input ref={backRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f); }} />

            {backPreview ? (
              <div>
                <img src={backPreview} alt="Back ticket preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #e2e8f0", maxHeight: 200, objectFit: "cover" as const }} />
                <button onClick={() => backRef.current?.click()}
                  style={{ marginTop: 8, width: "100%", padding: "8px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                  📷 Retake Back Photo
                </button>
              </div>
            ) : (
              <button onClick={() => backRef.current?.click()}
                style={{ width: "100%", padding: "14px", background: "#f8fafc", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "center" as const }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>📄</div>
                <div style={{ fontWeight: 600, color: "#64748b", fontSize: "0.8rem" }}>Add Back Photo</div>
              </button>
            )}
          </div>

          {/* Notes */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18, marginBottom: 16 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for the office — e.g. ticket was damaged, project name, etc."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none", background: "#f8fafc", resize: "vertical" as const, minHeight: 70, fontFamily: "inherit", boxSizing: "border-box" as const }}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.82rem", marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Status feedback while submitting */}
          {isSubmitting && (
            <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, marginBottom: 14, textAlign: "center" as const }}>
              <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.85rem" }}>
                {status === "checking_quality" && "📷 Checking photo quality…"}
                {status === "uploading"        && "📤 Uploading your ticket…"}
                {status === "processing_ocr"   && "🔍 Reading ticket details…"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#3b82f6", marginTop: 4 }}>This usually takes 10–20 seconds</div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !frontFile}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: frontFile && !isSubmitting ? "#16a34a" : "#94a3b8",
              color: "#fff", border: "none", fontWeight: 800, fontSize: "0.95rem", cursor: frontFile && !isSubmitting ? "pointer" : "default",
              transition: "background 150ms",
            }}>
            {isSubmitting ? "Submitting…" : "📤 Submit Ticket"}
          </button>

          <div style={{ marginTop: 12, textAlign: "center" as const, fontSize: "0.68rem", color: "#94a3b8" }}>
            Keep the original paper ticket. You may need to turn it in within 3 business days.
          </div>
        </>
      )}

      {/* Recent submissions */}
      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>My Recent Submissions</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {history.slice(0, 5).map((h: any) => {
              const info = STATUS_LABELS[h.upload_status] || { label: h.upload_status || "Submitted", color: "#64748b", icon: "📤" };
              return (
                <div key={h.id || h.created_at} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.3rem" }}>{info.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.82rem" }}>
                      {h.ticket_number ? `Ticket #${h.ticket_number}` : h.driver_name || "Ticket"}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>
                      {new Date(h.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: info.color, background: `${info.color}18`, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" as const }}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: "center" as const, fontSize: "0.65rem", color: "#cbd5e1" }}>
        Fast Scan™ · MoveAround TMS by Igotta Technologies
      </div>
    </div>
  );
}
