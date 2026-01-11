// Dashboard UI scaffold: KPI tiles + recent violations
import React from "react";
import Link from "next/link";
// Types from metrics contract
import { DashboardOverviewMetrics } from "@/src/dashboard/metrics.types";

async function fetchDashboardMetrics(): Promise<DashboardOverviewMetrics | null> {
  // TODO: Replace with real org context
  const res = await fetch("/api/dashboards/overview", {
    headers: { "x-organization-id": "demo_org" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const metrics = await fetchDashboardMetrics();

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <DashboardNav active="overview" />
      {!metrics ? (
        <div className="p-8">Failed to load dashboard metrics.</div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <Link href="../fast-scan">
              <KpiTile
                label="Total Scans"
                value={metrics.scans.total}
                clickable
              />
            </Link>
            <Link href="../compliance">
              <KpiTile
                label="Pass"
                value={metrics.compliance.statusCounts.pass}
                clickable
              />
            </Link>
            <Link href="../compliance">
              <KpiTile
                label="Warn"
                value={metrics.compliance.statusCounts.warn}
                clickable
              />
            </Link>
            <Link href="../compliance">
              <KpiTile
                label="Fail"
                value={metrics.compliance.statusCounts.fail}
                clickable
              />
            </Link>
          </div>
          {/* Recent Violations */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Recent Failures</h2>
            <RecentFailuresTable failures={metrics.compliance.recentFailures} />
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

function KpiTile({
  label,
  value,
  clickable,
}: {
  label: string;
  value: number;
  clickable?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded shadow p-4 flex flex-col items-center transition cursor-pointer ${clickable ? "hover:bg-blue-50 active:scale-[.98]" : ""}`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function RecentFailuresTable({
  failures,
}: {
  failures: DashboardOverviewMetrics["compliance"]["recentFailures"];
}) {
  if (!failures.length)
    return <div className="text-gray-500">No recent failures.</div>;
  return (
    <table className="min-w-full bg-white rounded shadow">
      <thead>
        <tr>
          <th className="px-4 py-2 text-left">Occurred At</th>
          <th className="px-4 py-2 text-left">Reason</th>
          <th className="px-4 py-2 text-left">Evidence IDs</th>
        </tr>
      </thead>
      <tbody>
        {failures.map((f) => (
          <tr key={f.complianceResultId}>
            <td className="px-4 py-2">
              {new Date(f.occurredAt).toLocaleString()}
            </td>
            <td className="px-4 py-2">{f.reason}</td>
            <td className="px-4 py-2 text-xs text-gray-600">
              {f.evidenceIds.join(", ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
