"use client";

export default function RonyxDispatchSheet({ tenant }: { tenant: string }) {
  return (
    <div className="ronyx-card">
      <p className="ronyx-muted">
        Dispatch sheets for tenant: <strong>{tenant}</strong>
      </p>
      <div className="ronyx-placeholder">No dispatch sheets ready.</div>
    </div>
  );
}
