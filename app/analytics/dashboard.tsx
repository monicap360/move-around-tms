"use client";

const insights = [
  { label: "Profitability Forecast", value: "$1,200,000", trend: "+8%" },
  { label: "Risk Score", value: "Low", trend: "Stable" },
  { label: "Driver Retention", value: "92%", trend: "+2%" },
  { label: "AI Recommendation", value: "Increase rates for high-risk jobs" },
];

export default function AnalyticsDashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Advanced Analytics & AI Insights</h1>
      <div className="grid grid-cols-2 gap-6 mb-8">
        {insights.map(i => (
          <div key={i.label} className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-lg font-semibold mb-1">{i.label}</div>
            <div className="text-2xl font-bold mb-1">{i.value}</div>
            {i.trend && <div className="text-xs text-green-700">{i.trend}</div>}
          </div>
        ))}
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">AI-Driven Recommendations</h2>
        <ul className="list-disc pl-6">
          <li>Optimize driver assignments for high-profit routes</li>
          <li>Reduce risk by flagging outlier loads</li>
          <li>Improve retention with targeted incentives</li>
        </ul>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>Predictive analytics and AI:</strong> Coming soon. The system will provide actionable insights and recommendations for all key business metrics.
      </div>
    </div>
  );
}
