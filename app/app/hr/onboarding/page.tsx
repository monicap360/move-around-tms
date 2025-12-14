"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Calendar,
  TrendingUp,
  UserPlus,
  ClipboardList,
  ArrowLeft,
  Filter
} from "lucide-react";

type OnboardingProgress = {
  onboarding_id: string;
  driver_id: string;
  driver_name: string;
  employee_id: string;
  onboarding_status: string;
  started_date: string;
  target_completion_date: string;
  actual_completion_date: string | null;
  assigned_hr_rep: string | null;
  template_name: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  blocking_steps: number;
  completion_percentage: number;
};

type OverdueTask = {
  onboarding_id: string;
  driver_name: string;
  employee_id: string;
  step_title: string;
  category: string;
  assigned_department: string;
  step_status: string;
  target_completion_date: string;
  days_overdue: number;
};

type OnboardingStats = {
  totalActive: number;
  completedThisMonth: number;
  overdueItems: number;
  averageCompletionTime: number;
};

export default function OnboardingDashboard() {
  const [onboardingList, setOnboardingList] = useState<OnboardingProgress[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [stats, setStats] = useState<OnboardingStats>({
    totalActive: 0,
    completedThisMonth: 0,
    overdueItems: 0,
    averageCompletionTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOnboardingData();
  }, []);

  async function loadOnboardingData() {
    try {
      // Load onboarding progress summary
      const { data: progressData, error: progressError } = await supabase
        .from("onboarding_progress_summary")
        .select("*")
        .order("started_date", { ascending: false });

      if (progressError) {
        console.error("Error loading onboarding progress:", progressError);
        return;
      }

      setOnboardingList(progressData || []);

      // Load overdue tasks
      const { data: overdueData, error: overdueError } = await supabase
        .from("overdue_onboarding_tasks")
        .select("*")
        .limit(10);

      if (!overdueError && overdueData) {
        setOverdueTasks(overdueData);
      }

      // Calculate stats
      const activeOnboarding = (progressData || []).filter(o => 
        ['Not Started', 'In Progress'].includes(o.onboarding_status)
      );
      
      const completedThisMonth = (progressData || []).filter(o => {
        if (!o.actual_completion_date) return false;
        const completedDate = new Date(o.actual_completion_date);
        const now = new Date();
        return completedDate.getMonth() === now.getMonth() && 
               completedDate.getFullYear() === now.getFullYear();
      });

      setStats({
        totalActive: activeOnboarding.length,
        completedThisMonth: completedThisMonth.length,
        overdueItems: overdueData?.length || 0,
        averageCompletionTime: 12 // This would be calculated from actual data
      });

    } catch (err) {
      console.error("Error loading onboarding data:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOnboarding = onboardingList.filter(item => {
    const matchesSearch = item.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         item.onboarding_status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'not started': return 'bg-gray-100 text-gray-800';
      case 'on hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getProgressColor(percentage: number) {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 30) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getDaysRemaining(targetDate: string) {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading onboarding dashboard...</div>
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
            <h1 className="text-3xl font-bold text-gray-800">Driver Onboarding</h1>
            <p className="text-gray-600 mt-1">Track new driver onboarding progress and completion</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/drivers/new">
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add New Driver
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
                <p className="text-sm text-gray-500">Active Onboarding</p>
                <p className="text-2xl font-bold">{stats.totalActive}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed This Month</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedThisMonth}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueItems}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Completion</p>
                <p className="text-2xl font-bold">{stats.averageCompletionTime} days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Onboarding List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Active Onboarding ({filteredOnboarding.length})
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="not started">Not Started</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Onboarding List */}
              <div className="space-y-4">
                {filteredOnboarding.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No onboarding processes found</p>
                    <p className="text-gray-400">Add a new driver to start the onboarding process</p>
                  </div>
                ) : (
                  filteredOnboarding.map((item) => (
                    <div key={item.onboarding_id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{item.driver_name}</h3>
                            <Badge className={getStatusColor(item.onboarding_status)}>
                              {item.onboarding_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Employee ID: {item.employee_id} • {item.template_name}
                          </p>
                          {item.assigned_hr_rep && (
                            <p className="text-sm text-gray-600">
                              HR Rep: {item.assigned_hr_rep}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Link href={`/hr/onboarding/${item.onboarding_id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            Progress: {item.completed_steps} of {item.total_steps} steps
                          </span>
                          <span className={`text-sm font-bold ${getProgressColor(item.completion_percentage)}`}>
                            {item.completion_percentage}%
                          </span>
                        </div>
                        <Progress value={item.completion_percentage} className="h-2" />
                      </div>

                      {/* Status Indicators */}
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-4">
                          <span className="text-gray-600">
                            Started: {new Date(item.started_date).toLocaleDateString()}
                          </span>
                          {item.blocking_steps > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {item.blocking_steps} blocking steps
                            </span>
                          )}
                          {item.failed_steps > 0 && (
                            <span className="text-orange-600">
                              {item.failed_steps} failed steps
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {item.onboarding_status === 'Completed' && item.actual_completion_date ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Completed {new Date(item.actual_completion_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1 ${
                              getDaysRemaining(item.target_completion_date) < 0 
                                ? 'text-red-600' 
                                : getDaysRemaining(item.target_completion_date) <= 3 
                                  ? 'text-orange-600' 
                                  : 'text-gray-600'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {getDaysRemaining(item.target_completion_date) < 0 
                                ? `${Math.abs(getDaysRemaining(item.target_completion_date))} days overdue`
                                : `${getDaysRemaining(item.target_completion_date)} days remaining`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Overdue Tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Overdue Tasks ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueTasks.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No overdue tasks!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueTasks.slice(0, 5).map((task, idx) => (
                    <div key={idx} className="border-l-4 border-red-500 pl-3 py-2">
                      <h4 className="font-medium text-sm">{task.driver_name}</h4>
                      <p className="text-xs text-gray-600">{task.step_title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.assigned_department}
                        </Badge>
                        <span className="text-xs text-red-600 font-medium">
                          {task.days_overdue} days overdue
                        </span>
                      </div>
                    </div>
                  ))}
                  {overdueTasks.length > 5 && (
                    <div className="text-center pt-2 border-t">
                      <Button variant="link" size="sm" className="text-xs">
                        View All Overdue ({overdueTasks.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/hr/drivers/new">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New Driver
                </Button>
              </Link>
              <Link href="/hr/onboarding/templates">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Manage Templates
                </Button>
              </Link>
              <Link href="/hr/onboarding/reports">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
