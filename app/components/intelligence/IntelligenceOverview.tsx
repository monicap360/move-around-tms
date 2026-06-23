"use client";

export default function IntelligenceOverview() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">
        MoveAround Intelligence Core™
      </h1>

      <p className="text-gray-300 text-lg">Fleet Central Intelligence System</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Panel title="Ticket Forensics" metric="92%" desc="Accuracy Score" />
        <Panel title="Payroll Intelligence" metric="88%" desc="Pay Integrity" />
        <Panel title="Contract AI" metric="14" desc="Potential Savings" />
      </div>
    </div>
  );
}

function Panel({ title, metric, desc }) {
  return (
    <div
      className="
      backdrop-blur-md bg-white/5 border border-white/10 
      rounded-xl p-6 shadow-xl hover:bg-white/10 transition
    "
    >
      <h2 className="text-xl text-white font-bold">{title}</h2>
      <p className="text-4xl text-green-400 font-bold mt-4">{metric}</p>
      <p className="text-gray-400">{desc}</p>
    </div>
  );
}
