import Link from "next/link";

export default function DevMap() {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ronyx Dev Map</h1>
      <ul className="space-y-3 text-blue-700 underline">
        <li><Link href="/company/ronyx/dashboards">Dashboard</Link></li>
        <li><Link href="/company/ronyx/dashboards/trends">Trends</Link></li>
        <li><Link href="/company/ronyx/dashboards/sla">SLA</Link></li>
        <li><Link href="/company/ronyx/dashboards/risk">Risk</Link></li>
        <li><Link href="/company/ronyx/alerts">Alerts</Link></li>
        <li><Link href="/company/ronyx/fast-scan">Fast Scan</Link></li>
        <li><Link href="/company/ronyx/compliance">Compliance</Link></li>
        <li><Link href="/company/ronyx/documents">Documents</Link></li>
        <li><Link href="/company/ronyx/settings">Settings</Link></li>
      </ul>
      <div className="mt-8 text-gray-500 text-sm">Temporary navigation for rapid iteration. Add/remove links as needed.</div>
    </div>
  );
}
