"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Info, ArrowRight } from "lucide-react";

interface ExplainabilityCardProps {
  title: string;
  why: string;
  comparedTo: {
    type: "driver_historical" | "site_historical" | "global";
    value: number;
    period: string;
  };
  recommendedAction: string;
  severity?: "low" | "medium" | "high";
}

export default function ExplainabilityCard({
  title,
  why,
  comparedTo,
  recommendedAction,
  severity = "medium",
}: ExplainabilityCardProps) {
  const getSeverityColor = () => {
    switch (severity) {
      case "high":
        return "border-red-300 bg-red-50";
      case "medium":
        return "border-yellow-300 bg-yellow-50";
      default:
        return "border-blue-300 bg-blue-50";
    }
  };

  const getBaselineLabel = () => {
    switch (comparedTo.type) {
      case "driver_historical":
        return "Driver's 30-day average";
      case "site_historical":
        return "Site's 90-day average";
      default:
        return "Global average";
    }
  };

  return (
    <Card className={`border-2 ${getSeverityColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold">Why</span>
          </div>
          <p className="text-sm text-gray-700 ml-6">{why}</p>
        </div>

        {/* Compared To */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold">Compared To</span>
          </div>
          <div className="ml-6 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">{getBaselineLabel()}:</span>{" "}
              {comparedTo.value.toLocaleString()} ({comparedTo.period})
            </p>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold">Recommended Action</span>
          </div>
          <p className="text-sm text-gray-700 ml-6">{recommendedAction}</p>
        </div>
      </CardContent>
    </Card>
  );
}
