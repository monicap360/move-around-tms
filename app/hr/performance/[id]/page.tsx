"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  ArrowLeft,
  Shield,
  AlertTriangle,
  Award,
  TrendingUp,
  TrendingDown,
  Car,
  Fuel,
  Clock,
  Calendar,
  MapPin,
  Target,
  BookOpen,
  FileText,
  Eye,
  Plus
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
};

type RecentIncident = {
  id: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  description: string;
  investigation_status: string;
};

type TrainingRecord = {
  id: string;
  training_date: string;
  training_type: string;
  completion_status: string;
  score: number | null;
  notes: string | null;
};

type PerformanceGoal = {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number | null;
  target_date: string;
  status: string;
  description: string;
};

export default function DriverPerformancePage({ params }: { params: { id: string } }) {
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
  const [incidents, setIncidents] = useState<RecentIncident[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadDriverPerformance();
    }
  }, [params.id]);

  async function loadDriverPerformance() {
    try {
      // Load driver performance summary
      const { data: performanceData, error: perfError } = await supabase
        .from("driver_performance_summary")
        .select("*")
        .eq("driver_id", params.id)
        .single();

      if (perfError) {
        console.error("Error loading performance data:", perfError);
        return;
      }

      setPerformance(performanceData);

      // Load recent incidents
      const { data: incidentData, error: incError } = await supabase
        .from("driver_incidents")
        .select("*")
        .eq("driver_id", params.id)
        .order("incident_date", { ascending: false })
        .limit(10);

      if (!incError && incidentData) {
        setIncidents(incidentData);
      }

      // Load training records
      const { data: trainingData, error: trainError } = await supabase
        .from("driver_safety_training")
        .select("*")
        .eq("driver_id", params.id)
        .order("training_date", { ascending: false })
        .limit(10);

      if (!trainError && trainingData) {
        setTrainings(trainingData);
      }

      // Load performance goals
      const { data: goalData, error: goalError } = await supabase
        .from("driver_performance_goals")
        .select("*")
        .eq("driver_id", params.id)
        .order("target_date", { ascending: true });

      if (!goalError && goalData) {
        setGoals(goalData);
      }

    } catch (err) {
      console.error("Error loading driver performance:", err);
    } finally {
      setLoading(false);
    }
  }

  function getSafetyScoreColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  }

  function getSafetyScoreBadge(score: number) {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-yellow-100 text-yellow-800';
    if (score >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  function getSeverityColor(severity: string) {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getGoalProgress(goal: PerformanceGoal): number {
    if (!goal.current_value || goal.target_value === 0) return 0;
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading driver performance...</div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="p-8">
        <div className="text-red-500">Driver not found</div>
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
            <h1 className="text-3xl font-bold text-gray-800">{performance.driver_name}</h1>
            <p className="text-gray-600 mt-1">Employee ID: {performance.employee_id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/hr/drivers/${params.id}`}>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Driver Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Safety Score & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Safety Score</p>
                <p className={`text-3xl font-bold ${getSafetyScoreColor(performance.current_safety_score)}`}>
                  {performance.current_safety_score}
                </p>
                {performance.current_safety_score >= 90 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    High Performer
                  </p>
                )}
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recent Miles</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(performance.recent_miles / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
              <Car className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fuel Efficiency</p>
                <p className="text-2xl font-bold text-green-600">
                  {performance.recent_mpg?.toFixed(1) || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">MPG Average</p>
              </div>
              <Fuel className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">On-Time Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {performance.recent_on_time_pct?.toFixed(0) || 'N/A'}%
                </p>
                <p className="text-xs text-gray-500">Delivery performance</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Goals */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Goals ({goals.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-4">
                  <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No performance goals set</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{goal.goal_type}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                        <Badge className={getStatusColor(goal.status)}>
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {goal.current_value || 0} / {goal.target_value}</span>
                          <span>{getGoalProgress(goal).toFixed(0)}%</span>
                        </div>
                        <Progress value={getGoalProgress(goal)} className="h-2" />
                        <div className="text-xs text-gray-500">
                          Target date: {new Date(goal.target_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Incidents ({incidents.length})
                </CardTitle>
                <Link href="/hr/performance/incidents/new">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Report Incident
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-4">
                  <Shield className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-green-600">No recent incidents - Great job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{incident.incident_type}</h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{incident.description}</p>
                        </div>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{new Date(incident.incident_date).toLocaleDateString()}</span>
                        <span className="capitalize">{incident.investigation_status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                  {incidents.length > 5 && (
                    <div className="text-center pt-2 border-t">
                      <Link href="/hr/performance/incidents">
                        <Button variant="link" size="sm" className="text-xs">
                          View All Incidents ({incidents.length})
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Training History ({trainings.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Log Training
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trainings.length === 0 ? (
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No training records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainings.slice(0, 5).map((training) => (
                    <div key={training.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-sm">{training.training_type}</h4>
                        <p className="text-xs text-gray-500">{new Date(training.training_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(training.completion_status)}>
                          {training.completion_status}
                        </Badge>
                        {training.score && (
                          <p className="text-xs text-gray-600 mt-1">Score: {training.score}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Key Metrics & Quick Actions */}
        <div className="space-y-6">
          {/* 12-Month Summary */}
          <Card>
            <CardHeader>
              <CardTitle>12-Month Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Incidents</span>
                <span className={`font-medium ${performance.incidents_12mo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {performance.incidents_12mo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accidents</span>
                <span className={`font-medium ${performance.accidents_12mo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {performance.accidents_12mo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Violations</span>
                <span className={`font-medium ${performance.violations_12mo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {performance.violations_12mo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trainings (YTD)</span>
                <span className="font-medium">{performance.trainings_ytd}</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Review */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Review</CardTitle>
            </CardHeader>
            <CardContent>
              {performance.last_review_date ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Review</span>
                    <span className="text-sm">{new Date(performance.last_review_date).toLocaleDateString()}</span>
                  </div>
                  {performance.last_review_rating && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rating</span>
                      <span className="font-medium">{performance.last_review_rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No reviews yet</p>
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" size="sm">
                Schedule Review
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Performance Goal
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Schedule Training
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Review
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}