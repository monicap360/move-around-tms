import Link from "next/link";

export default function DocumentsPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Documents</h1>
      <p>
        Upload, review, and manage compliance and operational documents for this
        company.
      </p>

      {/* Related actions block */}
      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
          background: "#f8fafc",
          padding: 16,
          borderRadius: 8,
        }}
      >
        <strong>Related:</strong>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <Link
            href="../alerts"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Alerts
          </Link>
          <Link
            href="../compliance"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Compliance
          </Link>
          <Link
            href="../fast-scan"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Fast Scan
          </Link>
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Document List</h2>
        <p>Document management coming soon.</p>
      </section>
    </div>
  );
}
