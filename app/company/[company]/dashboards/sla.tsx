// SLA Dashboard: MTTA, escalation effectiveness, by severity
import React from "react";

async function fetchSLAOverview() {
  const res = await fetch("/api/sla/overview", {
    headers: { "x-organization-id": "demo_org" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function formatSeconds(s: number | null) {
  if (s == null) return "-";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export default async function SLADashboard() {
  const metrics = await fetchSLAOverview();
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">SLA Performance</h1>
      <DashboardNav active="sla" />

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

      {!metrics ? (
        <div className="p-8">Failed to load SLA metrics.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SLAStat
              label="MTTA (mean)"
              value={formatSeconds(metrics.mttaMean)}
            />
            <SLAStat
              label="MTTA (median)"
              value={formatSeconds(metrics.mttaMedian)}
            />
            <SLAStat
              label="MTTA (95th)"
              value={formatSeconds(metrics.mtta95th)}
            />
            <SLAStat
              label="Acknowledgement Rate"
              value={
                metrics.acknowledgedRate
                  ? (metrics.acknowledgedRate * 100).toFixed(1) + "%"
                  : "-"
              }
            />
            <SLAStat
              label="Escalation Rate"
              value={
                metrics.escalationRate
                  ? (metrics.escalationRate * 100).toFixed(1) + "%"
                  : "-"
              }
            />
            <SLAStat label="Total Alerts" value={metrics.total} />
          </div>
          <h2 className="text-xl font-semibold mt-8 mb-2">By Severity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["critical", "warn", "info"].map((sev) => (
              <div key={sev} className="bg-white rounded shadow p-4">
                <div className="font-bold mb-2 capitalize">{sev}</div>
                <div>
                  MTTA (mean):{" "}
                  {formatSeconds(metrics.bySeverity[sev]?.mttaMean)}
                </div>
                <div>
                  MTTA (median):{" "}
                  {formatSeconds(metrics.bySeverity[sev]?.mttaMedian)}
                </div>
                <div>
                  Ack Rate:{" "}
                  {metrics.bySeverity[sev]?.acknowledgedRate
                    ? (metrics.bySeverity[sev].acknowledgedRate * 100).toFixed(
                        1,
                      ) + "%"
                    : "-"}
                </div>
                <div>
                  Escalation Rate:{" "}
                  {metrics.bySeverity[sev]?.escalationRate
                    ? (metrics.bySeverity[sev].escalationRate * 100).toFixed(
                        1,
                      ) + "%"
                    : "-"}
                </div>
                <div>Total: {metrics.bySeverity[sev]?.total ?? "-"}</div>
              </div>
            ))}
          </div>
        </>
      )}
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

function SLAStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col items-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-500 mt-1">{label}</div>
    </div>
  );
}
