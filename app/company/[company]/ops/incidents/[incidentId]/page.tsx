"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Activity, ArrowLeft, User, Zap } from "lucide-react";
import Link from "next/link";

interface IncidentDetail {
  incident: any;
  events: any[];
  actions: any[];
  recommendations: any[];
  decisionSummary: any;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.incidentId as string;
  const [data, setData] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  async function loadIncident() {
    try {
      setLoading(true);
      const response = await fetch(`/api/ops/incidents/${incidentId}`);
      const incidentData = await response.json();
      setData(incidentData);
    } catch (error) {
      console.error("Failed to load incident:", error);
    } finally {
      setLoading(false);
    }
  }

  async function approveRecommendation(recommendationId: string) {
    try {
      setApproving(recommendationId);
      const response = await fetch(
        `/api/ops/incidents/${incidentId}/recommendations/${recommendationId}/approve`,
        { method: "POST" }
      );
      if (response.ok) {
        await loadIncident(); // Reload to see updated status
      }
    } catch (error) {
      console.error("Failed to approve recommendation:", error);
    } finally {
      setApproving(null);
    }
  }

  async function resolveIncident() {
    try {
      const response = await fetch(`/api/ops/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (response.ok) {
        await loadIncident();
      }
    } catch (error) {
      console.error("Failed to resolve incident:", error);
    }
  }

  function getSeverityBadge(severity: string) {
    const colors = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
    };
    return (
      <Badge className={colors[severity as keyof typeof colors] || colors.info}>
        {severity}
      </Badge>
    );
  }

  function getStatusBadge(status: string) {
    const colors = {
      open: "bg-red-100 text-red-800",
      stabilizing: "bg-yellow-100 text-yellow-800",
      monitoring: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.open}>
        {status}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading incident details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-red-500">Incident not found</div>
      </div>
    );
  }

  const { incident, events, actions, recommendations, decisionSummary } = data;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/[company]/ops/incidents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Incident Details</h1>
        </div>
        {incident.status !== "resolved" && (
          <Button onClick={resolveIncident} variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Resolved
          </Button>
        )}
      </div>

      {/* Decision Summary */}
      {decisionSummary && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Decision Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-semibold mb-1">Incident Summary</div>
              <div>{decisionSummary.incidentSummary}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Time Window</div>
              <div className="text-sm text-gray-600">
                {new Date(decisionSummary.timeWindow.start).toLocaleString()} -{" "}
                {decisionSummary.timeWindow.end
                  ? new Date(decisionSummary.timeWindow.end).toLocaleString()
                  : "Ongoing"}
              </div>
            </div>
            {decisionSummary.autoActionsTaken.length > 0 && (
              <div>
                <div className="font-semibold mb-1">Auto-Actions Taken</div>
                <div className="text-sm">
                  {decisionSummary.autoActionsTaken
                    .map((a: string) => a.replace("_", " "))
                    .join(", ")}
                </div>
              </div>
            )}
            <div>
              <div className="font-semibold mb-1">Recommendation</div>
              <div>{decisionSummary.recommendation}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Risk if No Action</div>
              <div className="text-sm text-red-600">{decisionSummary.riskIfNoAction}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incident Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Incident Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Severity:</span>
              {getSeverityBadge(incident.severity)}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Status:</span>
              {getStatusBadge(incident.status)}
            </div>
            <div>
              <span className="font-semibold">Type:</span>{" "}
              <span className="capitalize">
                {incident.incident_type?.replace("_", " ") || "Unknown"}
              </span>
            </div>
            <div>
              <span className="font-semibold">Detected:</span>{" "}
              {new Date(incident.detected_at).toLocaleString()}
            </div>
            {incident.resolved_at && (
              <div>
                <span className="font-semibold">Resolved:</span>{" "}
                {new Date(incident.resolved_at).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System State</CardTitle>
          </CardHeader>
          <CardContent>
            {incident.current_system_state && (
              <div className="space-y-1 text-sm">
                {Object.entries(incident.current_system_state).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <span className="font-semibold capitalize">
                      {key.replace("_", " ")}:
                    </span>{" "}
                    {typeof value === "number"
                      ? value.toFixed(1)
                      : String(value)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec: any) => (
              <div
                key={rec.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{rec.recommendation}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Risk Level: <Badge>{rec.risk_level}</Badge>
                    </div>
                  </div>
                  {rec.status === "pending" && (
                    <Button
                      onClick={() => approveRecommendation(rec.id)}
                      disabled={approving === rec.id}
                      size="sm"
                    >
                      {approving === rec.id ? "Approving..." : "Approve"}
                    </Button>
                  )}
                  {rec.status === "approved" && (
                    <Badge className="bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  )}
                  {rec.status === "executed" && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Executed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event: any, index: number) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 ml-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold capitalize">
                      {event.event_type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {event.source}
                    </Badge>
                  </div>
                  {event.payload && (
                    <div className="text-sm text-gray-600">
                      {JSON.stringify(event.payload, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Taken */}
      {actions && actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actions Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actions.map((action: any) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div>
                    <span className="font-semibold capitalize">
                      {action.action_type.replace("_", " ")}
                    </span>
                    <div className="text-sm text-gray-600">
                      {new Date(action.executed_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge
                    className={
                      action.result === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {action.result}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
