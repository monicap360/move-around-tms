"use client";

export default function RonyxLoadBoard({ companyId }: { companyId: string }) {
  return (
    <div className="ronyx-card">
      <p className="ronyx-muted">
        Live load board for company: <strong>{companyId}</strong>
      </p>
      <div className="ronyx-placeholder">No loads available yet.</div>
    </div>
  );
}
