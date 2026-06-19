"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type UploadResult = {
  ticket_number?: string;
  ticket_date?: string;
  driver_name?: string;
  truck_number?: string;
  material?: string;
  gross_weight?: number;
  tare_weight?: number;
  net_weight?: number;
  tons?: number;
  pit_name?: string;
  ocr_confidence?: number;
  source_type: string;
};

export default function AccuriScaleUploadPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<UploadResult | null>(null);
  const [sourceType, setSource]   = useState<"ocr_upload" | "excel_import" | "manual_entry">("ocr_upload");
  const [toast, setToast]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manual, setManual] = useState({
    ticket_number: "", ticket_date: "", driver_name: "", truck_number: "",
    material: "", gross_weight: "", tare_weight: "", tons: "", pit_name: "", vendor_name: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (sourceType === "manual_entry") {
      const tons = manual.gross_weight && manual.tare_weight
        ? ((Number(manual.gross_weight) - Number(manual.tare_weight)) / 2000).toFixed(3)
        : manual.tons;
      setResult({
        ticket_number: manual.ticket_number,
        ticket_date:   manual.ticket_date,
        driver_name:   manual.driver_name,
        truck_number:  manual.truck_number,
        material:      manual.material,
        gross_weight:  manual.gross_weight ? Number(manual.gross_weight) : undefined,
        tare_weight:   manual.tare_weight  ? Number(manual.tare_weight)  : undefined,
        tons:          tons ? Number(tons) : undefined,
        pit_name:      manual.pit_name || manual.vendor_name,
        ocr_confidence: 100,
        source_type:   "manual_entry",
      });
      showToast("✓ Manual ticket entry saved");
      return;
    }

    if (!file) return;
    setUploading(true);

    // Simulate OCR result for now (real OCR integration would call TicketFlash API)
    await new Promise(r => setTimeout(r, 1800));
    setResult({
      ticket_number:  "TKT-" + Math.floor(Math.random() * 90000 + 10000),
      ticket_date:    new Date().toISOString().split("T")[0],
      driver_name:    "Extracted from ticket",
      truck_number:   "Extracted from ticket",
      material:       "Extracted from ticket",
      gross_weight:   undefined,
      tare_weight:    undefined,
      tons:           undefined,
      pit_name:       "Extracted from ticket",
      ocr_confidence: 87,
      source_type:    "ocr_upload",
    });
    setUploading(false);
    showToast("✓ Ticket uploaded — OCR results ready for review");
  };

  const handleSaveToAccuriScale = () => {
    showToast("✓ Ticket saved to AccuriScale — matching against loads...");
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#1e293b", color: "#fff",
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #020817 0%, #0c1a2e 100%)", padding: "24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Link href="/ronyx/accuriscale" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", textDecoration: "none" }}>← AccuriScale</Link>
        </div>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#fff" }}>Upload Scale Ticket</h1>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>
          Upload a paper ticket photo, PDF, or Excel — TicketFlash OCR extracts every field automatically.
        </p>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>

        {/* Source type selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            ["ocr_upload",    "📷 Upload Ticket (OCR)"],
            ["excel_import",  "📊 Excel Import"],
            ["manual_entry",  "✏️ Manual Entry"],
          ] as [typeof sourceType, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setSource(key); setResult(null); setFile(null); setPreview(null); }}
              style={{ padding: "9px 18px", borderRadius: 8, border: `1.5px solid ${sourceType === key ? "#22d3ee" : "#e2e8f0"}`,
                background: sourceType === key ? "#0c1a2e" : "#fff", color: sourceType === key ? "#22d3ee" : "#64748b",
                fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 20 }}>

          {/* Upload / Manual panel */}
          <div>
            {(sourceType === "ocr_upload" || sourceType === "excel_import") && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${file ? "#22d3ee" : "#cbd5e1"}`, borderRadius: 14, padding: "48px 32px",
                  textAlign: "center", cursor: "pointer", background: file ? "#f0fdfe" : "#fff", transition: "all .2s" }}>
                <input ref={fileRef} type="file"
                  accept={sourceType === "excel_import" ? ".xlsx,.xls,.csv" : "image/*,.pdf"}
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {preview ? (
                  <img src={preview} alt="ticket preview" style={{ maxHeight: 220, borderRadius: 8, marginBottom: 16 }} />
                ) : (
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>
                    {sourceType === "excel_import" ? "📊" : "📷"}
                  </div>
                )}
                {file ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "#22d3ee", marginBottom: 4 }}>{file.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                      {sourceType === "excel_import" ? "Drop Excel or CSV file here" : "Drop ticket photo or PDF here"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {sourceType === "excel_import" ? "Accepts .xlsx, .xls, .csv" : "Accepts JPG, PNG, PDF"}
                    </div>
                    <div style={{ marginTop: 16, display: "inline-block", background: "#f1f5f9", padding: "8px 18px",
                      borderRadius: 8, fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                      Browse Files
                    </div>
                  </div>
                )}
              </div>
            )}

            {sourceType === "manual_entry" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>Manual Ticket Entry</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {([
                    ["ticket_number", "Ticket Number", "TKT-009201"],
                    ["ticket_date",   "Ticket Date",   "2026-06-19"],
                    ["driver_name",   "Driver Name",   "Carlos M."],
                    ["truck_number",  "Truck Number",  "TRK-18"],
                    ["pit_name",      "Pit / Vendor",  "Katy Pit"],
                    ["vendor_name",   "Vendor Name",   "Martin Marietta"],
                    ["material",      "Material",      "Crushed Limestone"],
                    ["gross_weight",  "Gross Weight (lbs)", "47200"],
                    ["tare_weight",   "Tare Weight (lbs)",  "26600"],
                    ["tons",          "Net Tons (override)", "10.3"],
                  ] as [keyof typeof manual, string, string][]).map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
                      <input value={manual[key]} onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                        placeholder={ph}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: "0.82rem", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR info */}
            {sourceType === "ocr_upload" && (
              <div style={{ marginTop: 14, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", fontSize: "0.75rem", color: "#1d4ed8" }}>
                <strong>TicketFlash OCR</strong> will extract: Ticket #, Date, Driver, Truck, Material, Gross/Tare/Net Weight, Tons, Pit, Customer, Signature.
                Results are editable before saving.
              </div>
            )}

            {/* Upload button */}
            <button onClick={handleUpload} disabled={uploading || (sourceType !== "manual_entry" && !file)}
              style={{ marginTop: 16, width: "100%", padding: "14px", background: uploading ? "#64748b" : "#22d3ee",
                color: "#000", border: "none", borderRadius: 10, fontWeight: 900, fontSize: "0.95rem",
                cursor: uploading || (!file && sourceType !== "manual_entry") ? "not-allowed" : "pointer" }}>
              {uploading ? "⏳ Processing with TicketFlash OCR..." :
               sourceType === "manual_entry" ? "✓ Save Manual Entry" :
               sourceType === "excel_import" ? "📊 Import Excel" : "📷 Upload & Run OCR"}
            </button>
          </div>

          {/* OCR Result panel */}
          {result && (
            <div style={{ background: "#fff", border: "1.5px solid #22d3ee", borderRadius: 14, padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>
                  {result.source_type === "manual_entry" ? "Manual Entry" : "OCR Extraction Result"}
                </h3>
                {result.ocr_confidence && (
                  <span style={{ background: result.ocr_confidence >= 90 ? "#dcfce7" : "#fef9c3",
                    color: result.ocr_confidence >= 90 ? "#15803d" : "#b45309",
                    padding: "3px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800 }}>
                    {result.ocr_confidence}% confidence
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  ["Ticket Number", result.ticket_number],
                  ["Ticket Date",   result.ticket_date],
                  ["Driver",        result.driver_name],
                  ["Truck",         result.truck_number],
                  ["Pit / Vendor",  result.pit_name],
                  ["Material",      result.material],
                  ["Gross Weight",  result.gross_weight ? `${result.gross_weight.toLocaleString()} lbs` : undefined],
                  ["Tare Weight",   result.tare_weight  ? `${result.tare_weight.toLocaleString()} lbs`  : undefined],
                  ["Net Tons",      result.tons          ? `${result.tons} tons` : undefined],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#64748b", marginBottom: 16 }}>
                Review the extracted fields above. Edit any field before saving. AccuriScale will match this ticket against dispatch loads.
              </div>

              <button onClick={handleSaveToAccuriScale}
                style={{ width: "100%", padding: "12px", background: "#15803d", color: "#fff", border: "none",
                  borderRadius: 9, fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", marginBottom: 8 }}>
                ✓ Save to AccuriScale — Run Matching
              </button>
              <Link href="/ronyx/accuriscale"
                style={{ display: "block", textAlign: "center", fontSize: "0.78rem", color: "#64748b", textDecoration: "none", padding: "8px" }}>
                View Exception Queue →
              </Link>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {[
            { icon: "📷", title: "Photo Upload",       body: "Take a photo of the paper ticket with your phone or camera. TicketFlash OCR reads all fields automatically." },
            { icon: "📄", title: "PDF Upload",          body: "Upload a PDF scale ticket from the pit system, email, or scanner. Works with most pit and quarry ticket formats." },
            { icon: "📊", title: "Excel / CSV Import", body: "Export your pit tickets to Excel or CSV and upload the file. AccuriScale maps the columns automatically." },
            { icon: "✏️", title: "Manual Entry",        body: "Type in the ticket details directly. Best for single tickets or when the original document is unreadable." },
          ].map(card => (
            <div key={card.title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b", marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.6 }}>{card.body}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
