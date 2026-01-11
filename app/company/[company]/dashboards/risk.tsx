// Risk Drivers Dashboard (placeholder for top violations, expiring docs, OCR trends)
import React from "react";

export default function RiskDashboard() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Risk Drivers</h1>
      <DashboardNav active="risk" />

      {/* Related actions block */}
      <div className="mb-6 bg-slate-50 p-4 rounded">
        <strong>Related:</strong>
        <div className="flex gap-6 mt-2">
          <a href="../../alerts" className="text-blue-700 underline">
            View Alerts
          </a>
          <a href="../../compliance" className="text-blue-700 underline">
            View Compliance
          </a>
          <a href="../../fast-scan" className="text-blue-700 underline">
            View Fast Scan
          </a>
          <a href="../../documents" className="text-blue-700 underline">
            View Documents
          </a>
        </div>
      </div>

      <div className="text-gray-500">Risk drivers analytics coming soon...</div>
    </div>
  );
}

function DashboardNav({ active }: { active: string }) {
  const tabs = [
    { key: "overview", label: "Overview", href: "./" },
    { key: "trends", label: "Trends", href: "./trends" },
    { key: "sla", label: "SLA", href: "./sla" },
    { key: "risk", label: "Risk", href: "./risk" },
  ];
  return (
    <div className="mb-6 flex gap-4">
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2 rounded ${active === tab.key ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
