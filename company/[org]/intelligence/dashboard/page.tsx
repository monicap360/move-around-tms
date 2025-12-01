"use client";

export default function IntelligenceDashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-cyan-300 mb-6">Intelligence Core™ Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-2">Enterprise KPIs</h2>
          <ul className="list-disc ml-6 opacity-80">
            <li>Profit Impact</li>
            <li>Cross-fleet Intelligence</li>
            <li>Trends & Alerts</li>
          </ul>
        </section>
        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-2">Attention Required</h2>
          <ul className="list-disc ml-6 opacity-80">
            <li>AI-detected Issues</li>
            <li>Critical Tickets</li>
            <li>Payroll Discrepancies</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
