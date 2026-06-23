"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ConfidenceBadgeProps {
  score: number; // 0-1
  reason: string;
  fieldName?: string;
}

/**
 * Confidence Badge Component
 * Displays confidence score with color-coded badge and tooltip
 */
export default function ConfidenceBadge({
  score,
  reason,
  fieldName,
}: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine badge color and icon based on confidence score
  const getBadgeStyle = () => {
    if (score >= 0.7) {
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        icon: CheckCircle2,
        label: "High",
      };
    } else if (score >= 0.5) {
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
  const percentage = Math.round(score * 100);

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${style.bg} ${style.text} ${style.border} cursor-help text-xs font-medium`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{style.label} Confidence ({percentage}%)</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50">
          <div className="font-semibold mb-1">
            {fieldName ? `${fieldName}: ` : ""}Confidence Score
          </div>
          <div className="text-gray-300">{reason}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
