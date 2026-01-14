"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Activity, Server, HardDrive, Upload, AlertCircle } from "lucide-react";

interface HealthMetrics {
  memoryPercent: number;
  diskPercent: number;
  pm2Status: string;
  pm2RestartCount: number;
  uploadFailureRate: number;
  errorRate: number;
  appHealthCheck: boolean;
  timestamp: string;
}

export default function HealthMonitorPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any>(null);

  useEffect(() => {
    loadHealthMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(loadHealthMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadHealthMetrics() {
    try {
      setLoading(true);
      const response = await fetch("/api/ops/health");
      const data = await response.json();
      
      setMetrics(data.metrics);
      setAlerts(data.alerts);
    } catch (error) {
      console.error("Failed to load health metrics:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(value: number, threshold: number) {
    if (value >= threshold) return "text-red-600";
    if (value >= threshold * 0.8) return "text-yellow-600";
    return "text-green-600";
  }

  function getStatusBadge(status: boolean) {
    return status ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Degraded
      </Badge>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading health metrics...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">TMS Health Monitor</h1>
          <p className="text-gray-600 mt-1">Early warning system for incidents</p>
        </div>
        <Button onClick={loadHealthMetrics} disabled={loading}>
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {alerts && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.violations.map((violation: string, i: number) => (
                <div key={i} className="text-red-700">{violation}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Memory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: metrics ? getStatusColor(metrics.memoryPercent, 85) : undefined }}>
              {metrics ? `${metrics.memoryPercent.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Threshold: 85%
            </div>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: metrics ? getStatusColor(metrics.diskPercent, 80) : undefined }}>
              {metrics ? `${metrics.diskPercent.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Threshold: 80%
            </div>
          </CardContent>
        </Card>

        {/* PM2 Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              PM2 Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold capitalize">{metrics?.pm2Status || "—"}</div>
              {metrics && metrics.pm2RestartCount > 0 && (
                <div className="text-sm text-yellow-600">
                  {metrics.pm2RestartCount} restart(s) detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Failure Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Failure Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: metrics ? getStatusColor(metrics.uploadFailureRate * 100, 10) : undefined }}>
              {metrics ? `${(metrics.uploadFailureRate * 100).toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Threshold: 10%
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: metrics ? getStatusColor(metrics.errorRate, 10) : undefined }}>
              {metrics ? `${metrics.errorRate.toFixed(1)}/min` : "—"}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Threshold: 10 errors/min
            </div>
          </CardContent>
        </Card>

        {/* App Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              App Health Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? getStatusBadge(metrics.appHealthCheck) : "—"}
          </CardContent>
        </Card>
      </div>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {new Date(metrics.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
