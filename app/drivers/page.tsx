"use client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "../components/ui/card";

export default function DriversPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        Drivers
      </h1>
      <p style={{ fontSize: 20, color: "#475569", marginBottom: 32 }}>
        Manage driver profiles, documents, and compliance.
      </p>
      <div
        style={{
          background: "#e0e7ef",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
          padding: 32,
          minWidth: 340,
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontSize: 20,
          color: "#2563eb",
          fontWeight: 500,
          gap: 10,
        }}
      >
        <div>
          • Upload front/back of CDL, TWIC, ID, and MVR. Track license, medical,
          and certification expirations.
        </div>
        <div>
          • Store W-2/1099 status, pay rate, start date, and contact details.
        </div>
        <div>
          • Receive automated alerts 30 days before any document expires.
        </div>
      </div>
      <footer style={{ color: "#94a3b8", fontSize: 14, marginTop: 40 }}>
        © {new Date().getFullYear()} Move Around TMS
      </footer>
    </div>
  );
}
