"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import ExplainabilityCardIntegration from "./ExplainabilityCardIntegration";

interface Exception {
  id: string;
  entity_type: string;
  entity_id: string;
  impact_score: number;
  confidence_score: number;
  priority_rank: number;
  exception_type: string;
  severity: string;
  recommended_action: string;
  explanation: string;
  status: string;
  created_at: string;
}

export default function ExceptionQueueDashboard() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExceptions();
    // Refresh every 30 seconds
    const interval = setInterval(loadExceptions, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadExceptions() {
    try {
      setLoading(true);
      const res = await fetch("/api/exceptions/queue?limit=5&status=open");
      if (res.ok) {
        const data = await res.json();
        setExceptions(data.exceptions || []);
      }
    } catch (err) {
      console.error("Error loading exceptions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(exceptionId: string, action: string) {
    try {
      const res = await fetch("/api/exceptions/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exception_id: exceptionId,
          action,
        }),
      });

      if (res.ok) {
        await loadExceptions();
      }
    } catch (err) {
      console.error("Error resolving exception:", err);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const formatExceptionType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading exceptions...</div>
        </CardContent>
      </Card>
    );
  }

  if (exceptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Exception Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
            <p>No exceptions requiring attention</p>
            <p className="text-sm mt-2">All clear! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Top Priority Exceptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {exceptions.map((exception) => (
            <div
              key={exception.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSeverityColor(exception.severity)}>
                      {exception.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-gray-600">
                      {formatExceptionType(exception.exception_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {exception.entity_type} #{exception.entity_id.slice(0, 8)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    {exception.explanation}
                  </p>

                  {exception.recommended_action && (
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Recommended:</strong> {exception.recommended_action}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Impact: ${exception.impact_score.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Priority: {exception.priority_rank.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(exception.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleResolve(exception.id, "resolve")}
                    className="gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(exception.id, "dismiss")}
                    className="gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
