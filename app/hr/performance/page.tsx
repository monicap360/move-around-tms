"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Award,
  Clock,
  Car,
  Fuel,
  Target,
  Users,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Eye,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

type DriverPerformance = {
  driver_id: string;
  driver_name: string;
  employee_id: string;
  current_safety_score: number;
  recent_miles: number;
  recent_mpg: number;
  recent_on_time_pct: number;
  incidents_12mo: number;
  accidents_12mo: number;
  violations_12mo: number;
  trainings_ytd: number;
  last_training_date: string | null;
  active_goals: number;
  achieved_goals: number;
  last_review_date: string | null;
  last_review_rating: number | null;
  employment_status: string;
};

type SafetyAlert = {
  driver_id: string;
  driver_name: string;
  employee_id: string;
  alert_type: string;
  severity: string;
  message: string;
  alert_date: string;
};

type PerformanceStats = {
  totalDrivers: number;
  highPerformers: number; // Safety score >= 90
  atRiskDrivers: number; // Safety score < 70
  averageSafetyScore: number;
  totalIncidents: number;
  totalViolations: number;
  averageMPG: number;
  averageOnTime: number;
};

export default function PerformanceDashboard() {
  const [driverPerformance, setDriverPerformance] = useState<
    DriverPerformance[]
  >([]);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalDrivers: 0,
    highPerformers: 0,
    atRiskDrivers: 0,
    averageSafetyScore: 0,
    totalIncidents: 0,
    totalViolations: 0,
    averageMPG: 0,
    averageOnTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("safety_score");
  const [filterBy, setFilterBy] = useState("all");

  useEffect(() => {
    loadPerformanceData();
  }, []);

  async function loadPerformanceData() {
    try {
      // Load driver performance summary
      const { data: performanceData, error: performanceError } = await supabase
        .from("driver_performance_summary")
        .select("*")
        .order("current_safety_score", { ascending: false });

      if (performanceError) {
        console.error("Error loading performance data:", performanceError);
        return;
      }

      setDriverPerformance(performanceData || []);

      // Load safety alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("driver_safety_alerts")
        .select("*")
        .order("severity", { ascending: false });

      if (!alertsError && alertsData) {
        setSafetyAlerts(alertsData);
      }

      // Calculate statistics
      if (performanceData) {
        const totalDrivers = performanceData.length;
        const highPerformers = performanceData.filter(
          (d: any) => d.current_safety_score >= 90,
        ).length;
        const atRiskDrivers = performanceData.filter(
          (d: any) => d.current_safety_score < 70,
        ).length;
        const averageSafetyScore =
          totalDrivers > 0
            ? Math.round(
                performanceData.reduce(
                  (sum: number, d: any) => sum + (d.current_safety_score || 0),
                  0,
                ) / totalDrivers,
              )
            : 0;
        const totalIncidents = performanceData.reduce(
          (sum: number, d: any) => sum + (d.incidents_12mo || 0),
          0,
        );
        const totalViolations = performanceData.reduce(
          (sum: number, d: any) => sum + (d.violations_12mo || 0),
          0,
        );
        const averageMPG =
          totalDrivers > 0
            ? +(
                performanceData.reduce(
                  (sum: number, d: any) => sum + (d.recent_mpg || 0),
                  0,
                ) / totalDrivers
              ).toFixed(1)
            : 0;
        const averageOnTime =
          totalDrivers > 0
            ? +(
                performanceData.reduce(
                  (sum: number, d: any) => sum + (d.recent_on_time_pct || 0),
                  0,
                ) / totalDrivers
              ).toFixed(1)
            : 0;

        setStats({
          totalDrivers,
          highPerformers,
          atRiskDrivers,
          averageSafetyScore,
          totalIncidents,
          totalViolations,
          averageMPG,
          averageOnTime,
        });
      }
    } catch (err) {
      console.error("Error loading performance data:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredDrivers = driverPerformance.filter((driver) => {
    const matchesSearch =
      driver.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filterBy === "high_performers")
      matchesFilter = driver.current_safety_score >= 90;
    else if (filterBy === "at_risk")
      matchesFilter = driver.current_safety_score < 70;
    else if (filterBy === "recent_incidents")
      matchesFilter = driver.incidents_12mo > 0;
    else if (filterBy === "recent_violations")
      matchesFilter = driver.violations_12mo > 0;

    return matchesSearch && matchesFilter;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    switch (sortBy) {
      case "safety_score":
        return (b.current_safety_score || 0) - (a.current_safety_score || 0);
      case "incidents":
        return (b.incidents_12mo || 0) - (a.incidents_12mo || 0);
      case "violations":
        return (b.violations_12mo || 0) - (a.violations_12mo || 0);
      case "miles":
        return (b.recent_miles || 0) - (a.recent_miles || 0);
      case "mpg":
        return (b.recent_mpg || 0) - (a.recent_mpg || 0);
      case "on_time":
        return (b.recent_on_time_pct || 0) - (a.recent_on_time_pct || 0);
      default:
        return a.driver_name.localeCompare(b.driver_name);
    }
  });

  function getSafetyScoreColor(score: number) {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    if (score >= 70) return "text-orange-600";
    return "text-red-600";
  }

  function getSafetyScoreBadge(score: number) {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-yellow-100 text-yellow-800";
    if (score >= 70) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  }

  function getAlertSeverityColor(severity: string) {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading performance dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/hr">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Performance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor driver safety scores, KPIs, and performance metrics
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/performance/incidents/new">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </Link>
          <Link href="/hr/performance/training/new">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Log Training
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Safety Score</p>
                <p
                  className={`text-2xl font-bold ${getSafetyScoreColor(stats.averageSafetyScore)}`}
                >
                  {stats.averageSafetyScore}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.totalDrivers} drivers
                </p>
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
                  {stats.highPerformers}
                </p>
                <p className="text-xs text-gray-500">Score ≥ 90</p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">At-Risk Drivers</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.atRiskDrivers}
                </p>
                <p className="text-xs text-gray-500">Score &lt; 70</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fleet Avg MPG</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.averageMPG}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.averageOnTime}% on-time
                </p>
              </div>
              <Fuel className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Performance Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Driver Performance ({sortedDrivers.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search drivers..."
                      value={searchTerm}
                      onChange={(e: any) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="border rounded-md px-3 py-2 bg-white text-sm"
                  >
                    <option value="safety_score">Sort by Safety Score</option>
                    <option value="incidents">Sort by Incidents</option>
                    <option value="violations">Sort by Violations</option>
                    <option value="miles">Sort by Miles</option>
                    <option value="mpg">Sort by MPG</option>
                    <option value="on_time">Sort by On-Time %</option>
                  </select>
                  <select
                    value={filterBy}
                    onChange={(e: any) => setFilterBy(e.target.value)}
                    className="border rounded-md px-3 py-2 bg-white text-sm"
                  >
                    <option value="all">All Drivers</option>
                    <option value="high_performers">High Performers</option>
                    <option value="at_risk">At-Risk Drivers</option>
                    <option value="recent_incidents">Recent Incidents</option>
                    <option value="recent_violations">Recent Violations</option>
                  </select>
                </div>
              </div>

              {/* Performance Table */}
              {sortedDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No drivers found</p>
                  <p className="text-gray-400">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3">Driver</th>
                        <th className="text-left p-3">Safety Score</th>
                        <th className="text-left p-3">Recent Performance</th>
                        <th className="text-left p-3">12-Mo Issues</th>
                        <th className="text-left p-3">Training</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDrivers.map((driver) => (
                        <tr
                          key={driver.driver_id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {driver.driver_name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                ID: {driver.employee_id}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getSafetyScoreBadge(
                                  driver.current_safety_score,
                                )}
                              >
                                {driver.current_safety_score || "N/A"}
                              </Badge>
                              {driver.current_safety_score >= 90 && (
                                <Award className="w-4 h-4 text-green-500" />
                              )}
                              {driver.current_safety_score < 70 && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 text-xs">
                              <div>
                                {(driver.recent_miles / 1000).toFixed(0)}k miles
                              </div>
                              <div>
                                {driver.recent_mpg?.toFixed(1) || "N/A"} MPG
                              </div>
                              <div>
                                {driver.recent_on_time_pct?.toFixed(0) || "N/A"}
                                % on-time
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 text-xs">
                              {driver.incidents_12mo > 0 ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-3 h-3" />
                                  {driver.incidents_12mo} incidents
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  No incidents
                                </div>
                              )}
                              {driver.violations_12mo > 0 ? (
                                <div className="text-orange-600">
                                  {driver.violations_12mo} violations
                                </div>
                              ) : (
                                <div className="text-green-600">
                                  No violations
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-xs">
                              <div>{driver.trainings_ytd} trainings YTD</div>
                              {driver.last_training_date ? (
                                <div className="text-gray-500">
                                  Last:{" "}
                                  {new Date(
                                    driver.last_training_date,
                                  ).toLocaleDateString()}
                                </div>
                              ) : (
                                <div className="text-red-500">
                                  No recent training
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Link
                                href={`/hr/performance/${driver.driver_id}`}
                              >
                                <Button variant="outline" size="sm">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Safety Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Safety Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Safety Alerts ({safetyAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safetyAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No active alerts!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safetyAlerts.slice(0, 5).map((alert, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-md p-3 ${getAlertSeverityColor(alert.severity)}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-sm">
                          {alert.driver_name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs mb-1">{alert.message}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">
                          ID: {alert.employee_id}
                        </span>
                        <span className="text-xs text-gray-500">
                          {alert.alert_type}
                        </span>
                      </div>
                    </div>
                  ))}
                  {safetyAlerts.length > 5 && (
                    <div className="text-center pt-2 border-t">
                      <Button variant="link" size="sm" className="text-xs">
                        View All Alerts ({safetyAlerts.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Total Incidents (12mo)
                </span>
                <span className="font-medium">{stats.totalIncidents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Total Violations (12mo)
                </span>
                <span className="font-medium">{stats.totalViolations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fleet MPG Average</span>
                <span className="font-medium">{stats.averageMPG}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">On-Time Average</span>
                <span className="font-medium">{stats.averageOnTime}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/hr/performance/incidents">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View All Incidents
                </Button>
              </Link>
              <Link href="/hr/performance/violations">
                <Button variant="outline" className="w-full justify-start">
                  <XCircle className="w-4 h-4 mr-2" />
                  Manage Violations
                </Button>
              </Link>
              <Link href="/hr/performance/training">
                <Button variant="outline" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Training Records
                </Button>
              </Link>
              <Link href="/hr/performance/goals">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Performance Goals
                </Button>
              </Link>
              <Link href="/hr/performance/reviews">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Performance Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
