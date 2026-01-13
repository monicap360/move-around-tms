"use client";

import ExplainabilityCard from "@/components/data-confidence/ExplainabilityCard";
import { useState, useEffect } from "react";

interface ExplainabilityCardIntegrationProps {
  exceptionId: string;
  anomalyId?: string;
  confidenceEventId?: string;
}

export default function ExplainabilityCardIntegration({
  exceptionId,
  anomalyId,
  confidenceEventId,
}: ExplainabilityCardIntegrationProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExplainabilityData();
  }, [exceptionId, anomalyId, confidenceEventId]);

  async function loadExplainabilityData() {
    try {
      setLoading(true);
      // Fetch exception, anomaly, and confidence data
      // This would combine data from multiple sources
      // For now, we'll use placeholder structure
      setData({
        why: "Data deviates significantly from historical baseline",
        comparedTo: {
          type: "site_historical",
          value: 1000,
          period: "90 days",
        },
        recommendedAction: "Review ticket details and verify with driver",
      });
    } catch (err) {
      console.error("Error loading explainability data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return <div className="text-sm text-gray-500">Loading explainability...</div>;
  }

  return (
    <ExplainabilityCard
      title="Why This Exception?"
      why={data.why}
      comparedTo={data.comparedTo}
      recommendedAction={data.recommendedAction}
      severity="medium"
    />
  );
}
