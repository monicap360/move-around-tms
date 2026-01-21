"use client";

import FleetPage from "@/app/fleet/FleetView";

export default function RonyxFleetPage() {
  return (
    <div className="ronyx-fleet-shell">
      <style jsx global>{`
        .ronyx-fleet-shell .container {
          max-width: 100%;
          padding: 0;
          margin: 0;
        }
        .ronyx-fleet-shell {
          background: transparent;
        }
        .ronyx-fleet-content {
          padding: 6px 0 20px;
          width: 100%;
          box-sizing: border-box;
        }
        .ronyx-fleet-shell h1,
        .ronyx-fleet-shell h2,
        .ronyx-fleet-shell h3 {
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .ronyx-fleet-shell h1 {
          font-size: 1.75rem;
        }
        .ronyx-fleet-shell .bg-card,
        .ronyx-fleet-shell .card,
        .ronyx-fleet-shell [class*="rounded-lg"][class*="border"] {
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.4);
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
        }
        .ronyx-fleet-shell .border {
          border-color: rgba(148, 163, 184, 0.4);
        }
        .ronyx-fleet-shell .text-gray-600 {
          color: rgba(71, 85, 105, 0.82);
        }
        .ronyx-fleet-shell .text-gray-500 {
          color: rgba(100, 116, 139, 0.82);
        }
        .ronyx-fleet-shell button,
        .ronyx-fleet-shell a,
        .ronyx-fleet-shell input,
        .ronyx-fleet-shell select {
          font-weight: 600;
        }
        .ronyx-fleet-shell button,
        .ronyx-fleet-shell .btn,
        .ronyx-fleet-shell a.btn,
        .ronyx-fleet-shell [class*="rounded-md"] {
          border-radius: 10px;
        }
        .ronyx-fleet-shell .bg-primary,
        .ronyx-fleet-shell .bg-blue-600 {
          background: #1d4ed8;
        }
        .ronyx-fleet-shell .bg-blue-600:hover,
        .ronyx-fleet-shell .bg-primary:hover {
          background: #1e40af;
        }
        .ronyx-fleet-shell .bg-slate-900,
        .ronyx-fleet-shell .text-slate-900 {
          color: #0f172a;
        }
        @media (max-width: 768px) {
          .ronyx-fleet-shell .container {
            padding: 0 12px;
          }
          .ronyx-fleet-content {
            padding: 8px 0 24px;
          }
        }
      `}</style>
      <div className="ronyx-fleet-content">
        <FleetPage defaultTab="financial" showOnlyFinancial />
      </div>
    </div>
  );
}
