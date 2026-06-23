"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Clock, AlertCircle } from "lucide-react";

interface TrialGateBannerProps {
  daysRemaining: number;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

/**
 * 3-Day Trial Gate Banner
 * Shows trial status and limits access after trial expires
 */
export default function TrialGateBanner({
  daysRemaining,
  onDismiss,
  onUpgrade,
}: TrialGateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed || daysRemaining <= 0) {
    return null;
  }

  const isExpiringSoon = daysRemaining <= 1;
  const bgColor = isExpiringSoon ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200";
  const textColor = isExpiringSoon ? "text-yellow-800" : "text-blue-800";
  const iconColor = isExpiringSoon ? "text-yellow-600" : "text-blue-600";

  return (
    <Card className={`${bgColor} border-l-4 ${isExpiringSoon ? "border-l-yellow-500" : "border-l-blue-500"} mb-4`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {isExpiringSoon ? (
              <AlertCircle className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
            ) : (
              <Clock className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${textColor} mb-1`}>
                Intelligence Trial — {daysRemaining} {daysRemaining === 1 ? "Day" : "Days"} Remaining
              </h3>
              <p className={`text-sm ${textColor} opacity-90`}>
                {isExpiringSoon
                  ? "Your trial expires today. Upgrade to continue accessing confidence scores, revenue risk metrics, and audit packets."
                  : "You're currently on a free 3-day trial of MoveAround Intelligence. Upgrade to continue full access."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onUpgrade && (
              <Button
                onClick={onUpgrade}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                Upgrade Now
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className={textColor}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
