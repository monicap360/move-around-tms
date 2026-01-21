"use client";

export default function RonyxLoadBoard({ tenant }: { tenant: string }) {
  return (
    <div className="ronyx-card">
      <p className="ronyx-muted">
        Live load board for tenant: <strong>{tenant}</strong>
      </p>
      <div className="ronyx-placeholder">No loads available yet.</div>
    </div>
  );
}
