"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock, Activity, ArrowRight } from "lucide-react";

interface Incident {
  id: string;
  organization_id?: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'stabilizing' | 'monitoring' | 'resolved';
  incident_type: string;
  summary: string;
  detected_at: string;
  resolved_at?: string;
  auto_actions_taken?: string[];
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  async function loadIncidents() {
    try {
      setLoading(true);
      const response = await fetch("/api/ops/incidents?status=open");
      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error("Failed to load incidents:", error);
    } finally {
      setLoading(false);
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
        <div className="text-gray-500">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-gray-600 mt-1">Active incidents and response actions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadIncidents} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/company/[company]/ops/incidents/history">
            <Button variant="outline">
              View History
            </Button>
          </Link>
        </div>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Incidents</h3>
              <p className="text-gray-600">System is operating normally.</p>
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
                      {getStatusBadge(incident.status)}
                    </div>
                    <CardTitle className="text-lg">{incident.summary}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(incident.detected_at).toLocaleString()}
                      </div>
                      {incident.incident_type && (
                        <div className="capitalize">{incident.incident_type.replace('_', ' ')}</div>
                      )}
                    </div>
                  </div>
                  <Link href={`/company/[company]/ops/incidents/${incident.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              {incident.auto_actions_taken && incident.auto_actions_taken.length > 0 && (
                <CardContent>
                  <div className="text-sm">
                    <span className="font-semibold">Auto-actions taken:</span>{" "}
                    {incident.auto_actions_taken.map(a => a.replace('_', ' ')).join(", ")}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
