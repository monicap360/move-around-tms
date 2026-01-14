"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface Incident {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  incident_type: string;
  summary: string;
  detected_at: string;
  resolved_at?: string;
}

interface WeeklySummary {
  totalIncidents: number;
  criticalIncidents: number;
  avgResolutionTime: number;
  mostCommonType: string;
  stabilityScore: number;
}

export default function IncidentHistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    loadSummary();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const response = await fetch("/api/ops/incidents?status=resolved");
      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const response = await fetch("/api/ops/stability-summary");
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to load summary:", error);
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

  function calculateDuration(detected: string, resolved?: string) {
    if (!resolved) return "Ongoing";
    const duration = new Date(resolved).getTime() - new Date(detected).getTime();
    const minutes = Math.round(duration / 1000 / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading incident history...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Incident History</h1>
          <p className="text-gray-600 mt-1">Resolved incidents and stability metrics</p>
        </div>
        <Link href="/company/[company]/ops/incidents">
          <Button variant="outline">View Active</Button>
        </Link>
      </div>

      {/* Weekly Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalIncidents}</div>
              <div className="text-sm text-gray-600">This week</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {summary.criticalIncidents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.avgResolutionTime}</div>
              <div className="text-sm text-gray-600">minutes</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Most Common</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold capitalize">
                {summary.mostCommonType.replace("_", " ") || "None"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Stability Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{
                color: summary.stabilityScore >= 80 ? "#059669" : summary.stabilityScore >= 60 ? "#f59e42" : "#dc2626"
              }}>
                {summary.stabilityScore}
              </div>
              <div className="text-sm text-gray-600">out of 100</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incident List */}
      {incidents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Resolved Incidents</h3>
              <p className="text-gray-600">No incidents resolved this week.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityBadge(incident.severity)}
                      <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                    </div>
                    <CardTitle className="text-lg">{incident.summary}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(incident.detected_at).toLocaleString()}
                      </div>
                      {incident.resolved_at && (
                        <div>
                          Duration: {calculateDuration(incident.detected_at, incident.resolved_at)}
                        </div>
                      )}
                      <div className="capitalize">
                        {incident.incident_type?.replace("_", " ") || "Unknown"}
                      </div>
                    </div>
                  </div>
                  <Link href={`/company/[company]/ops/incidents/${incident.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
