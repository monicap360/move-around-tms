"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface WeightConfidenceBadgeProps {
  netWeight: number;
  siteBaseline: number | null; // 60-90 day site average
  confidenceScore: number; // 0-1
  siteName?: string;
}

/**
 * Weight Confidence Badge Component
 * Displays confidence for net_weight based on site baseline comparison
 * Designed for aggregates/quarries vertical
 */
export default function WeightConfidenceBadge({
  netWeight,
  siteBaseline,
  confidenceScore,
  siteName,
}: WeightConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate variance from baseline
  const variance = siteBaseline 
    ? Math.abs((netWeight - siteBaseline) / siteBaseline) * 100
    : null;

  // Determine badge color based on confidence score
  const getBadgeStyle = () => {
    if (confidenceScore >= 0.7) {
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        icon: CheckCircle2,
        label: "High",
      };
    } else if (confidenceScore >= 0.5) {
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        icon: AlertTriangle,
        label: "Medium",
      };
    } else {
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        icon: AlertCircle,
        label: "Low",
      };
    }
  };

  const style = getBadgeStyle();
  const Icon = style.icon;

  // Tooltip text
  const tooltipText = siteBaseline
    ? `Outside historical norm for ${siteName || "this site"}. Baseline: ${siteBaseline.toFixed(1)} tons. Variance: ${variance?.toFixed(1)}%`
    : "Baseline not yet established for this site";

  return (
    <div className="relative inline-flex items-center gap-2">
      <span className="text-sm font-medium">{netWeight.toFixed(1)} tons</span>
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} cursor-help`}
        >
          <Icon className="w-3 h-3" />
          <span className="text-xs font-semibold">{style.label}</span>
        </div>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap">
            {tooltipText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </div>
  );
}
