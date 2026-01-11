"use client";
import { useEffect, useState } from "react";

interface AIInsight {
  type: "eta" | "anomaly" | "suggestion";
  message: string;
  context?: string;
}

const mockInsights: AIInsight[] = [
  {
    type: "eta",
    message: "Predicted delivery for LR-2024-001: 2025-11-03 13:45 (on time)",
    context: "Based on real-time traffic and HOS",
  },
  {
    type: "anomaly",
    message: "Anomaly detected: LR-2024-002 has a 2-hour pickup delay risk.",
    context: "Weather and driver HOS",
  },
  {
    type: "suggestion",
    message:
      "Suggestion: Rebook LR-2024-003 with alternate carrier for lower cost.",
    context: "AI rate prediction",
  },
];

export default function AIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    // In production, fetch from backend/AI service
    setInsights(mockInsights);
  }, []);

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">AI Insights</h2>
      <ul className="space-y-4">
        {insights.map((ins, i) => (
          <li
            key={i}
            className={`p-4 rounded border-l-4 ${ins.type === "eta" ? "border-blue-500 bg-blue-50" : ins.type === "anomaly" ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}`}
          >
            <div className="font-semibold mb-1">
              {ins.type === "eta" && "Predictive ETA"}
              {ins.type === "anomaly" && "Anomaly"}
              {ins.type === "suggestion" && "Smart Suggestion"}
            </div>
            <div>{ins.message}</div>
            {ins.context && (
              <div className="text-xs text-gray-500 mt-1">{ins.context}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
