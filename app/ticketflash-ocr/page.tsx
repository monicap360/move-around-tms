"use client";

import Link from "next/link";
import { useState } from "react";

const sampleTickets = {
  handwritten: {
    icon: "📋",
    description: "Handwritten scale ticket with smudged ink",
    data: [
      { label: "Ticket Number", value: "TX-8842" },
      { label: "Date", value: "05/17/2024" },
      { label: "Gross Weight", value: "68,420 lbs" },
      { label: "Tare Weight", value: "32,150 lbs" },
      { label: "Net Weight", value: "36,270 lbs" },
      { label: "Material", value: '3/4" Crushed Gravel' },
      { label: "Customer", value: "Jones Construction" },
      { label: "Driver", value: "D. Perez" },
    ],
  },
  printed: {
    icon: "📰",
    description: "Printed scale house ticket with barcode",
    data: [
      { label: "Ticket Number", value: "PT-7716" },
      { label: "Date", value: "05/16/2024" },
      { label: "Gross Weight", value: "72,580 lbs" },
      { label: "Tare Weight", value: "34,220 lbs" },
      { label: "Net Weight", value: "38,360 lbs" },
      { label: "Material", value: "Fill Sand" },
      { label: "Customer", value: "Thompson Co" },
      { label: "Driver", value: "S. Grant" },
    ],
  },
};

export default function TicketFlashOcrPage() {
  const [processing, setProcessing] = useState(false);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [ticketMeta, setTicketMeta] = useState<string | null>(null);
  const [results, setResults] = useState<typeof sampleTickets.handwritten | null>(null);
  const [subscribeStatus, setSubscribeStatus] = useState("");

  const simulateProcessing = (ticket: typeof sampleTickets.handwritten) => {
    setProcessing(true);
    setResults(null);
    setTimeout(() => {
      setProcessing(false);
      setResults(ticket);
    }, 1600);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setTicketPreview(file.type.includes("image") ? "📷" : "📄");
    setTicketMeta(`${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    simulateProcessing(sampleTickets.handwritten);
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
              <div style={{ fontSize: "2.5rem" }}>{ticketPreview || "📄"}</div>
              <div style={{ color: "rgba(255,255,255,0.7)" }}>
                {ticketMeta || "Drag & drop your ticket image here"}
              </div>
              <label className="ticketflash-btn">
                Select Ticket Image
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
            <div className="ticketflash-actions">
              <button className="ticketflash-btn secondary" onClick={() => simulateProcessing(sampleTickets.handwritten)}>
                Handwritten Ticket
              </button>
              <button className="ticketflash-btn secondary" onClick={() => simulateProcessing(sampleTickets.printed)}>
                Printed Ticket
              </button>
            </div>
          </div>

          <div className="ticketflash-card">
            <h2>Extracted Data</h2>
            {processing && (
              <div className="ticketflash-result" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 8 }}>AI Processing…</div>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>Average processing time: 1.8 seconds</div>
              </div>
            )}
            {!processing && !results && (
              <div className="ticketflash-result" style={{ textAlign: "center" }}>
                Upload a ticket to see OCR extraction.
              </div>
            )}
            {!processing &&
              results?.data.map((field) => (
                <div className="ticketflash-result" key={field.label}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{field.label}</div>
                  <div className="ticketflash-stat">{field.value}</div>
                </div>
              ))}
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
