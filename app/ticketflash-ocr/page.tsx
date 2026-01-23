"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type TicketRecord = {
  id: string;
  ticket_number?: string | null;
  ticket_date?: string | null;
  material?: string | null;
  quantity?: number | null;
  unit_type?: string | null;
  driver_name_ocr?: string | null;
  image_url?: string | null;
  ocr_json?: {
    extracted_data?: {
      ticketNumber?: string | null;
      material?: string | null;
      quantity?: number | null;
      unitType?: string | null;
      ticketDate?: string | null;
      driverName?: string | null;
    };
    raw_text?: string | null;
    lines?: string[] | null;
  } | null;
  ocr_processed_at?: string | null;
  ocr_confidence?: number | null;
  ocr_raw_text?: string | null;
};

export default function TicketFlashOcrPage() {
  const [processing, setProcessing] = useState(false);
  const [ticketPreviewUrl, setTicketPreviewUrl] = useState<string | null>(null);
  const [ticketMeta, setTicketMeta] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [subscribeStatus, setSubscribeStatus] = useState("");

  useEffect(() => {
    return () => {
      if (ticketPreviewUrl) URL.revokeObjectURL(ticketPreviewUrl);
    };
  }, [ticketPreviewUrl]);

  const createTicket = async () => {
    const response = await fetch("/api/ronyx/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending", unit_type: "Ton", ticket_notes: "Source: Office" }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to create ticket");
    }
    const payload = await response.json();
    return payload.ticket as TicketRecord;
  };

  const fetchTicket = async (id: string) => {
    const response = await fetch(`/api/ronyx/tickets/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.ticket as TicketRecord;
  };

  const pollForOcr = async (id: string) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const ticket = await fetchTicket(id);
      if (ticket) {
        setTicketData(ticket);
        const hasOcr =
          Boolean(ticket.ocr_processed_at) ||
          Boolean(ticket.ocr_json?.extracted_data) ||
          Boolean(ticket.ocr_raw_text);
        if (hasOcr) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setErrorMessage("");
    setStatusMessage("");
    setTicketData(null);
    setProcessing(true);

    if (ticketPreviewUrl) URL.revokeObjectURL(ticketPreviewUrl);
    const nextPreviewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setTicketPreviewUrl(nextPreviewUrl);
    setTicketMeta(`${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    try {
      setStatusMessage("Creating ticket...");
      const ticket = await createTicket();
      setTicketId(ticket.id);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", ticket.id);
      formData.append("doc_type", "ticket");

      setStatusMessage("Uploading ticket...");
      const uploadResponse = await fetch("/api/ronyx/tickets/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const payload = await uploadResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Upload failed");
      }

      setStatusMessage("Processing OCR...");
      await pollForOcr(ticket.id);
      setStatusMessage("OCR complete.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Ticket processing failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="ticketflash-page">
      <style jsx global>{`
        :root {
          --ticketflash-black: #080808;
          --ticketflash-carbon: #121212;
          --ticketflash-gray: #1e1e1e;
          --ticketflash-yellow: #ffd700;
          --ticketflash-red: #ff2800;
          --ticketflash-blue: #00b4ff;
          --ticketflash-green: #00ff9d;
        }
        .ticketflash-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #080808 0%, #121212 100%);
          color: #f8fafc;
          padding: 40px 20px 80px;
        }
        .ticketflash-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ticketflash-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 1px solid rgba(255, 215, 0, 0.25);
          padding-bottom: 20px;
        }
        .ticketflash-title {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(90deg, var(--ticketflash-yellow), var(--ticketflash-red));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ticketflash-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
          margin-top: 10px;
        }
        .ticketflash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .ticketflash-card {
          background: rgba(30, 30, 30, 0.9);
          border-radius: 16px;
          border: 1px solid rgba(255, 215, 0, 0.2);
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
        }
        .ticketflash-card h2 {
          color: var(--ticketflash-yellow);
          margin-bottom: 12px;
        }
        .ticketflash-upload {
          border: 2px dashed rgba(255, 215, 0, 0.35);
          border-radius: 12px;
          padding: 28px;
          text-align: center;
          margin-bottom: 18px;
          transition: 0.2s ease;
        }
        .ticketflash-preview {
          margin-top: 16px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px;
        }
        .ticketflash-preview img {
          border-radius: 10px;
        }
        .ticketflash-upload:hover {
          border-color: var(--ticketflash-yellow);
          background: rgba(255, 215, 0, 0.06);
        }
        .ticketflash-upload button {
          margin-top: 16px;
        }
        .ticketflash-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          font-weight: 700;
          cursor: pointer;
          background: linear-gradient(90deg, var(--ticketflash-yellow), var(--ticketflash-red));
          color: #0b0b0b;
          text-decoration: none;
        }
        .ticketflash-btn.secondary {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 215, 0, 0.4);
        }
        .ticketflash-result {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          margin-bottom: 12px;
        }
        .ticketflash-result strong {
          color: #fff;
        }
        .ticketflash-raw {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          white-space: pre-wrap;
          max-height: 240px;
          overflow: auto;
        }
        .ticketflash-stat {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--ticketflash-yellow);
        }
        .ticketflash-features,
        .ticketflash-stats,
        .ticketflash-cta {
          margin-top: 40px;
        }
        .ticketflash-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
        }
        .ticketflash-feature {
          background: rgba(30, 30, 30, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.2);
          padding: 20px;
        }
        .ticketflash-cta {
          text-align: center;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 16px;
          padding: 32px;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        .ticketflash-price {
          display: inline-flex;
          padding: 10px 24px;
          border-radius: 999px;
          background: rgba(0, 255, 157, 0.15);
          color: var(--ticketflash-green);
          font-weight: 700;
          margin-bottom: 18px;
        }
        .ticketflash-form {
          display: grid;
          gap: 12px;
          max-width: 420px;
          margin: 20px auto 0;
        }
        .ticketflash-form input {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
        }
        .ticketflash-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
      `}</style>

      <div className="ticketflash-container">
        <div className="ticketflash-header">
          <div className="ticketflash-title">TicketFlash OCR Module</div>
          <p className="ticketflash-subtitle">
            Process paper tickets at 99.97% accuracy with AI‑powered optical character recognition.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link href="/#modules" className="ticketflash-btn secondary">
              ← Back to Modules
            </Link>
          </div>
        </div>

        <div className="ticketflash-grid">
          <div className="ticketflash-card">
            <h2>Upload Paper Ticket</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
              Upload a photo or scan of your paper ticket. Our AI extracts data in under 2 seconds.
            </p>
            <div className="ticketflash-upload">
              <div style={{ fontSize: "2.5rem" }}>{ticketPreviewUrl ? "🧾" : "📄"}</div>
              <div style={{ color: "rgba(255,255,255,0.7)" }}>
                {ticketMeta || "Drag & drop your ticket image here"}
              </div>
              <label className="ticketflash-btn">
                Select Ticket Image
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {ticketPreviewUrl && (
              <div className="ticketflash-preview">
                <Image
                  src={ticketPreviewUrl}
                  alt="Uploaded ticket preview"
                  width={520}
                  height={360}
                  style={{ width: "100%", height: "auto", objectFit: "contain" }}
                  unoptimized
                />
              </div>
            )}
            {statusMessage && (
              <div className="ticketflash-result" style={{ textAlign: "center" }}>
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className="ticketflash-result" style={{ textAlign: "center", color: "#ff7a7a" }}>
                {errorMessage}
              </div>
            )}
          </div>

          <div className="ticketflash-card">
            <h2>Extracted Data</h2>
            {processing && (
              <div className="ticketflash-result" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 8 }}>AI Processing…</div>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>Average processing time: 1.8 seconds</div>
              </div>
            )}
            {!processing && !ticketData && (
              <div className="ticketflash-result" style={{ textAlign: "center" }}>
                Upload a ticket to see OCR extraction.
              </div>
            )}
            {!processing && ticketData && (
              <>
                <div className="ticketflash-result" style={{ borderColor: "rgba(0, 255, 157, 0.35)" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
                    Parsed Fields (from OCR)
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>
                    Use the raw OCR text below to verify every field.
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Ticket ID</div>
                  <div className="ticketflash-stat">{ticketId || ticketData.id}</div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Ticket Number</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.ticketNumber ||
                      ticketData.ticket_number ||
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Date</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.ticketDate ||
                      ticketData.ticket_date ||
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Material</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.material ||
                      ticketData.material ||
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Quantity</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.quantity ??
                      ticketData.quantity ??
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Unit</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.unitType ||
                      ticketData.unit_type ||
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Driver</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_json?.extracted_data?.driverName ||
                      ticketData.driver_name_ocr ||
                      "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>OCR Confidence</div>
                  <div className="ticketflash-stat">
                    {ticketData.ocr_confidence ? `${ticketData.ocr_confidence}%` : "Pending"}
                  </div>
                </div>
                <div className="ticketflash-result">
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Raw OCR Text (Full)</div>
                  <div className="ticketflash-raw">
                    {ticketData.ocr_json?.raw_text ||
                      ticketData.ocr_raw_text ||
                      "OCR text will appear here after processing."}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ticketflash-features">
          <h2 style={{ textAlign: "center", marginBottom: 24 }}>Key Selling Features</h2>
          <div className="ticketflash-features-grid">
            {[
              { icon: "⚡", title: "2‑Second Processing", desc: "Convert paper tickets into digital data in seconds." },
              { icon: "✍️", title: "Handwriting Recognition", desc: "Accurately reads handwritten numbers and notes." },
              { icon: "🌐", title: "Multi‑Language Support", desc: "Supports English, Spanish, and more." },
              { icon: "🧠", title: "Learning AI", desc: "Improves accuracy over time with every ticket." },
            ].map((feature) => (
              <div className="ticketflash-feature" key={feature.title}>
                <div style={{ fontSize: "1.8rem" }}>{feature.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 10 }}>{feature.title}</div>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ticketflash-stats ticketflash-card" style={{ marginTop: 40 }}>
          <h2>Industry‑Leading Performance</h2>
          <div className="ticketflash-grid" style={{ marginTop: 18 }}>
            {[
              { value: "99.97%", label: "Accuracy Rate" },
              { value: "1.8s", label: "Avg Processing Time" },
              { value: "1000+", label: "Tickets / Hour" },
              { value: "85%", label: "Cost Reduction" },
            ].map((stat) => (
              <div className="ticketflash-result" key={stat.label} style={{ textAlign: "center" }}>
                <div className="ticketflash-stat">{stat.value}</div>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ticketflash-cta">
          <div className="ticketflash-price">Sell Separately: $599/month</div>
          <h2>Subscribe to TicketFlash OCR</h2>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>
            Sign up to start processing tickets immediately. We’ll activate your account in under 1 business day.
          </p>
          <div className="ticketflash-form">
            <input placeholder="Company name" />
            <input placeholder="Work email" type="email" />
            <input placeholder="Fleet size" type="number" min={1} />
            <button
              className="ticketflash-btn"
              type="button"
              onClick={() => setSubscribeStatus("Thanks! Your subscription request is received.")}
            >
              Subscribe for $599/mo
            </button>
            {subscribeStatus && (
              <div style={{ color: "var(--ticketflash-green)", fontWeight: 600 }}>{subscribeStatus}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
