import Link from "next/link";

export default function RonyxHrCompliancePage() {
  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #f3f5f9;
          --ronyx-carbon: #ffffff;
          --ronyx-steel: #eef1f6;
          --ronyx-border: rgba(31, 41, 55, 0.12);
          --ronyx-accent: #2563eb;
          --ronyx-success: #16a34a;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(14, 165, 233, 0.12), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 14px;
          padding: 18px;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--ronyx-steel);
          border: 1px solid rgba(37, 99, 235, 0.12);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(37, 99, 235, 0.08);
        }
        .status {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status.good {
          color: var(--ronyx-success);
          background: rgba(22, 163, 74, 0.12);
        }
        .status.warn {
          color: var(--ronyx-warning);
          background: rgba(245, 158, 11, 0.12);
        }
        .status.bad {
          color: var(--ronyx-danger);
          background: rgba(239, 68, 68, 0.12);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>HR & TXDOT Compliance</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Track driver qualification files, TXDOT/FMCSA compliance, and document expirations.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Compliant Drivers", value: "42", status: "good" },
            { label: "Expiring Soon", value: "6", status: "warn" },
            { label: "Missing Docs", value: "3", status: "bad" },
            { label: "TXDOT Audits Ready", value: "100%", status: "good" },
          ].map((stat) => (
            <div key={stat.label} className="ronyx-card">
              <div style={{ fontSize: "0.75rem", color: "rgba(15,23,42,0.6)", textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, marginTop: 6 }}>{stat.value}</div>
              <span className={`status ${stat.status}`} style={{ marginTop: 8, display: "inline-flex" }}>
                {stat.status === "good" ? "Compliant" : stat.status === "warn" ? "Expiring" : "Missing"}
              </span>
            </div>
          ))}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Driver Profile Information</h2>
          <div className="ronyx-grid">
            {[
              "Driver Name",
              "Employee / Contractor ID",
              "Status (Active / Inactive / Pending)",
              "Hire Date / Termination Date",
              "Position / Role",
              "License Number & Class",
              "License Expiration Date",
              "State of Issuance",
              "Endorsements / Restrictions",
              "Driver Contact Info",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status good">Tracked</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Required Driver Documents</h2>
          <div className="ronyx-grid">
            {[
              "Driver License (Front & Back)",
              "DOT Medical Card",
              "MVR (Motor Vehicle Record)",
              "Social Security / ID Copy",
              "TWIC Card",
              "Passport / Work Authorization",
              "W‑2 or 1099 Uploads",
              "Employment Application & Resume",
              "Driver File Checklist",
              "Signature Forms (Drug/Alcohol, Handbook)",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Upload</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            TXDOT / FMCSA Compliance Documents
          </h2>
          <div className="ronyx-grid">
            {[
              "DQF Checklist",
              "Annual MVR Review",
              "Road Test Certificate",
              "Previous Employment Verification",
              "Drug & Alcohol Clearinghouse Results",
              "Pre‑Employment Drug Test",
              "Random / Post‑Accident Logs",
              "HOS Violations / Training Logs",
              "Incident / Accident Reports",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">View</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Training & Certifications</h2>
          <div className="ronyx-grid">
            {[
              "Orientation Status",
              "Safety Training Records",
              "HazMat Training Certificate",
              "ELD / Logbook Training",
              "Annual Refresher Dates",
              "Trainer Signature",
              "Upload Training Certificates",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Manage</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Document Management & Tracking</h2>
          <div className="ronyx-grid">
            {[
              "Upload Button for each category",
              "Document Expiration Tracker",
              "Compliance Status Bar (Green/Yellow/Red)",
              "Auto Alerts for Renewals",
              "Search & Filter by Driver/Expiration/Type",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status good">Enabled</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Reports & Export Options</h2>
          <div className="ronyx-grid">
            {[
              "Driver Compliance Summary Report",
              "Upcoming Expiration Report",
              "Non‑Compliant Driver List",
              "Export to PDF / Excel",
              "Audit‑Ready Folder Download",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Generate</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Optional Add‑Ons</h2>
          <div className="ronyx-grid">
            {[
              "Link to TXDOT Portal / Clearinghouse",
              "Digital Signature Support",
              "Auto‑Reminders 30/60/90 days before expiration",
              "HR Notes / Disciplinary Actions Log",
              "Driver Pay Rate / Classification Record",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status warn">Optional</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
