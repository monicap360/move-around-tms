"use client";

import React, { useState } from "react";

interface QRCodeScanProps {
  onScan: (data: string) => void;
}

const QRCodeScan: React.FC<QRCodeScanProps> = ({ onScan }) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue("");
    }
  };

  // Fallback: Manual input (QR scanner library not installed)
  // In production, integrate a real QR code scanner library (e.g., react-qr-reader, html5-qrcode)
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Scan QR/Barcode:</div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter QR/Barcode data"
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 14,
            flex: 1,
          }}
        />
        <button
          type="submit"
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Scan
        </button>
      </form>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
        Note: QR scanner library not installed. Enter code manually.
      </div>
    </div>
  );
};

export default QRCodeScan;
