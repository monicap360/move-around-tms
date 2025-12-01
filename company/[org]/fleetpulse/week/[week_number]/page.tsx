"use client";

export default function FleetPulseWeek({ params }: any) {
  const { week_number } = params;
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-cyan-300 mb-6">Weekly Fleet Heatmap — Week {week_number}</h1>
      <section className="glass-panel p-6 rounded-2xl mb-8">
        <h2 className="text-xl font-semibold mb-2">Revenue, Pay, Tonnage, Underperformers</h2>
        <div className="opacity-80">Peak vs off-peak analysis, underperformers, and operational trends for the week.</div>
      </section>
    </div>
  );
}
