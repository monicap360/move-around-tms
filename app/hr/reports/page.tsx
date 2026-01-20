"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Users,
  Award,
  FileText,
  Target,
  Clock,
  Car,
  Fuel,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

type ReportMetrics = {
  // Fleet Overview
  totalDrivers: number;
  activeDrivers: number;
  highPerformers: number;
  atRiskDrivers: number;
  averageSafetyScore: number;

  // Performance Trends (30-day comparison)
  safetyScoreTrend: number;
  incidentTrend: number;
  mpgTrend: number;
  onTimeTrend: number;

  // Incidents & Safety
  totalIncidents: number;
  criticalIncidents: number;
  preventableIncidents: number;
  injuryIncidents: number;

  // Training & Compliance
  completedTrainings: number;
  overdueTrainings: number;
  expiringCertifications: number;
  complianceRate: number;

  // Goals & Performance
  totalGoals: number;
  achievedGoals: number;
  overdueGoals: number;
  goalCompletionRate: number;
};

type TrendData = {
  date: string;
  safetyScore: number;
  incidents: number;
  mpg: number;
  onTimeRate: number;
};

type DriverRanking = {
  driver_id: string;
  driver_name: string;
  employee_id: string;
  safety_score: number;
  incidents: number;
  mpg: number;
  on_time_rate: number;
  rank: number;
};

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [topPerformers, setTopPerformers] = useState<DriverRanking[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<DriverRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [reportType, setReportType] = useState("overview");

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  async function loadReportData() {
    setLoading(true);
    try {
      // Load current metrics
      await Promise.all([
        loadFleetMetrics(),
        loadTrendData(),
        loadDriverRankings(),
      ]);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFleetMetrics() {
    // Get fleet overview metrics
    const { data: drivers } = await supabase
      .from("driver_performance_summary")
      .select("*");

    if (!drivers) return;

    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter(
      (d: any) => d.employment_status === "active",
    ).length;
    const highPerformers = drivers.filter(
      (d: any) => d.current_safety_score >= 90,
    ).length;
    const atRiskDrivers = drivers.filter(
      (d: any) => d.current_safety_score < 70,
    ).length;

    const avgSafetyScore =
      totalDrivers > 0
        ? Math.round(
            drivers.reduce(
              (sum: number, d: any) => sum + (d.current_safety_score || 0),
              0,
            ) / totalDrivers,
          )
        : 0;

    // Get incidents data
    const { data: incidents } = await supabase
      .from("driver_incidents")
      .select("*")
      .gte(
        "incident_date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const totalIncidents = incidents?.length || 0;
    const criticalIncidents =
      incidents?.filter((i: any) => i.severity === "critical").length || 0;
    const preventableIncidents =
      incidents?.filter((i: any) => i.was_preventable === true).length || 0;
    const injuryIncidents =
      incidents?.filter((i: any) => i.injuries_reported === true).length || 0;

    // Get training data
    const { data: trainings } = await supabase
      .from("driver_safety_training")
      .select("*");

    const completedTrainings =
      trainings?.filter((t: any) => t.completion_status === "completed")
        .length || 0;
    const overdueTrainings =
      trainings?.filter(
        (t: any) =>
          t.completion_status === "in_progress" &&
          new Date(t.due_date || "") < new Date(),
      ).length || 0;

    // Get goals data
    const { data: goals } = await supabase
      .from("driver_performance_goals")
      .select("*");

    const totalGoals = goals?.length || 0;
    const achievedGoals =
      goals?.filter((g: any) => g.status === "achieved").length || 0;
    const overdueGoals =
      goals?.filter(
        (g: any) =>
          g.status !== "achieved" && new Date(g.target_date) < new Date(),
      ).length || 0;

    setMetrics({
      totalDrivers,
      activeDrivers,
      highPerformers,
      atRiskDrivers,
      averageSafetyScore: avgSafetyScore,
      safetyScoreTrend: 2.3, // Would calculate from historical data
      incidentTrend: -12.5,
      mpgTrend: 3.1,
      onTimeTrend: 5.2,
      totalIncidents,
      criticalIncidents,
      preventableIncidents,
      injuryIncidents,
      completedTrainings,
      overdueTrainings,
      expiringCertifications: 8, // Would calculate from driver documents
      complianceRate: 94.5,
      totalGoals,
      achievedGoals,
      overdueGoals,
      goalCompletionRate:
        totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0,
    });
  }

  async function loadTrendData() {
    // Simulate trend data - in production, this would come from historical tables
    const mockTrends: TrendData[] = [];
    const days = parseInt(selectedPeriod);

    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      mockTrends.push({
        date: date.toISOString().split("T")[0],
        safetyScore: 85 + Math.random() * 10,
        incidents: Math.floor(Math.random() * 5),
        mpg: 6.5 + Math.random() * 1.5,
        onTimeRate: 88 + Math.random() * 10,
      });
    }

    setTrendData(mockTrends);
  }

  async function loadDriverRankings() {
    const { data: performance } = await supabase
      .from("driver_performance_summary")
      .select("*")
      .order("current_safety_score", { ascending: false });

    if (!performance) return;

    const rankings: DriverRanking[] = performance.map(
      (driver: any, index: number) => ({
        driver_id: driver.driver_id,
        driver_name: driver.driver_name,
        employee_id: driver.employee_id,
        safety_score: driver.current_safety_score || 0,
        incidents: driver.incidents_12mo || 0,
        mpg: driver.recent_mpg || 0,
        on_time_rate: driver.recent_on_time_pct || 0,
        rank: index + 1,
      }),
    );

    setTopPerformers(rankings.slice(0, 10));
    setBottomPerformers(rankings.slice(-5).reverse());
  }

  async function exportReport(format: string) {
    // In production, this would generate and download actual reports
    const reportData = {
      period: selectedPeriod,
      type: reportType,
      generatedAt: new Date().toISOString(),
      metrics,
      trends: trendData,
      topPerformers,
      bottomPerformers,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: format === "json" ? "application/json" : "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hr-report-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getTrendIcon(trend: number) {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  }

  function getTrendColor(trend: number) {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading advanced reports...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/hr/performance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Advanced Reports
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive analytics and fleet insights
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => loadReportData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => exportReport("json")}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={() => exportReport("csv")}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Period
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e: any) => setSelectedPeriod(e.target.value)}
                  className="border rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e: any) => setReportType(e.target.value)}
                  className="border rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="overview">Fleet Overview</option>
                  <option value="safety">Safety & Incidents</option>
                  <option value="performance">Performance Metrics</option>
                  <option value="compliance">Compliance Status</option>
                  <option value="training">Training & Development</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fleet Safety Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metrics?.averageSafetyScore}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {getTrendIcon(metrics?.safetyScoreTrend || 0)}
                  <span
                    className={getTrendColor(metrics?.safetyScoreTrend || 0)}
                  >
                    {(metrics?.safetyScoreTrend || 0) > 0 ? "+" : ""}
                    {(metrics?.safetyScoreTrend || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High Performers</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics?.highPerformers}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics?.totalDrivers
                    ? (
                        (metrics.highPerformers / metrics.totalDrivers) *
                        100
                      ).toFixed(0)
                    : 0}
                  % of fleet
                </p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Incidents</p>
                <p className="text-2xl font-bold text-orange-600">
                  {metrics?.totalIncidents}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {getTrendIcon(-(metrics?.incidentTrend || 0))}
                  <span
                    className={getTrendColor(-(metrics?.incidentTrend || 0))}
                  >
                    {metrics?.incidentTrend}% vs last period
                  </span>
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics?.complianceRate?.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {metrics?.expiringCertifications} expiring soon
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trends Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Trends ({selectedPeriod} days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Simulated chart area - in production, use Chart.js, Recharts, or similar */}
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Interactive Performance Chart</p>
                  <p className="text-sm text-gray-400">
                    Safety Score, Incidents, MPG, On-Time Rate trends
                  </p>
                </div>
              </div>

              {/* Summary stats below chart */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Avg MPG</p>
                  <p className="text-lg font-bold text-green-600">
                    {trendData.length > 0
                      ? (
                          trendData.reduce((sum, d) => sum + d.mpg, 0) /
                          trendData.length
                        ).toFixed(1)
                      : "N/A"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Avg On-Time</p>
                  <p className="text-lg font-bold text-blue-600">
                    {trendData.length > 0
                      ? (
                          trendData.reduce((sum, d) => sum + d.onTimeRate, 0) /
                          trendData.length
                        ).toFixed(0)
                      : "N/A"}
                    %
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Incidents</p>
                  <p className="text-lg font-bold text-orange-600">
                    {trendData.reduce((sum, d) => sum + d.incidents, 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Safety Score</p>
                  <p className="text-lg font-bold text-blue-600">
                    {trendData.length > 0
                      ? (
                          trendData.reduce((sum, d) => sum + d.safetyScore, 0) /
                          trendData.length
                        ).toFixed(0)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <div className="space-y-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topPerformers.slice(0, 5).map((driver) => (
                  <div
                    key={driver.driver_id}
                    className="flex justify-between items-center p-2 bg-green-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {driver.driver_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        #{driver.rank} - {driver.employee_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {driver.safety_score}
                      </p>
                      <p className="text-xs text-gray-500">Safety Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Focus Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                <p className="font-medium text-red-800 text-sm">
                  At-Risk Drivers
                </p>
                <p className="text-red-600 text-xs">
                  {metrics?.atRiskDrivers} drivers with safety scores &lt; 70
                </p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                <p className="font-medium text-orange-800 text-sm">
                  Overdue Training
                </p>
                <p className="text-orange-600 text-xs">
                  {metrics?.overdueTrainings} training sessions overdue
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <p className="font-medium text-yellow-800 text-sm">
                  Expiring Certifications
                </p>
                <p className="text-yellow-600 text-xs">
                  {metrics?.expiringCertifications} certifications expiring soon
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <p className="font-medium text-blue-800 text-sm">
                  Goal Completion
                </p>
                <p className="text-blue-600 text-xs">
                  {metrics?.goalCompletionRate.toFixed(0)}% goals achieved
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Report Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Executive Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Automated Reports
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Driver Performance Review
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Safety Compliance Audit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Rankings */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Performance Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Driver</th>
                    <th className="text-left p-2">Safety Score</th>
                    <th className="text-left p-2">Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.slice(0, 10).map((driver) => (
                    <tr
                      key={driver.driver_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-2 font-medium">#{driver.rank}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {driver.driver_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {driver.employee_id}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge
                          className={
                            driver.safety_score >= 90
                              ? "bg-green-100 text-green-800"
                              : driver.safety_score >= 80
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {driver.safety_score}
                        </Badge>
                      </td>
                      <td className="p-2">{driver.incidents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {metrics?.criticalIncidents}
                  </p>
                  <p className="text-sm text-gray-600">Critical Incidents</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics?.preventableIncidents}
                  </p>
                  <p className="text-sm text-gray-600">Preventable</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {metrics?.injuryIncidents}
                  </p>
                  <p className="text-sm text-gray-600">With Injuries</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics?.totalIncidents
                      ? (
                          ((metrics.totalIncidents -
                            metrics.preventableIncidents) /
                            metrics.totalIncidents) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </p>
                  <p className="text-sm text-gray-600">Non-Preventable</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Incident Trends</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">vs Last Period</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(-(metrics?.incidentTrend || 0))}
                      <span
                        className={`text-sm ${getTrendColor(-(metrics?.incidentTrend || 0))}`}
                      >
                        {metrics?.incidentTrend}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
