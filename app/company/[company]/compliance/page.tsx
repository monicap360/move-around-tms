"use client";
import { useEffect, useState } from "react";

interface Violation {
  ruleId: string;
  status: "pass" | "warn" | "fail";
  reason: string;
  evidence: string[];
  timestamp: string;
}

export default function CompliancePage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchViolations() {
      setLoading(true);
      // Replace 'org-1' with actual organizationId
      const res = await fetch("/api/compliance/list?organizationId=org-1");
      const data = await res.json();
      setViolations(data.violations || []);
      setLoading(false);
    }
    fetchViolations();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Compliance</h1>
      <p>
        Automated compliance checks and violation tracking for this company.
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
          <a
            href="../alerts"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Alerts
          </a>
          <a
            href="../documents"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Documents
          </a>
          <a
            href="../fast-scan"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            View Fast Scan
          </a>
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Violations</h2>
        {loading ? (
          <p>Loading...</p>
        ) : violations.length === 0 ? (
          <p>No violations found.</p>
        ) : (
          <table
            style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Evidence</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={i}>
                  <td>{v.ruleId}</td>
                  <td>{v.status}</td>
                  <td>{v.reason}</td>
                  <td>{v.evidence.join(", ")}</td>
                  <td>{v.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
