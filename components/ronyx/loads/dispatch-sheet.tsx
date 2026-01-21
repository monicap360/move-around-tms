"use client";

export default function RonyxDispatchSheet({ companyId }: { companyId: string }) {
  return (
    <div className="ronyx-card">
      <p className="ronyx-muted">
        Dispatch sheets for company: <strong>{companyId}</strong>
      </p>
      <div className="ronyx-placeholder">No dispatch sheets ready.</div>
    </div>
  );
}
