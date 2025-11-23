"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Users, 
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";

interface DashboardMetrics {
  revenue: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };
  profit: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };
  activeDrivers: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  activeVehicles: {
    current: number;
    maintenance: number;
    outOfService: number;
  };
  compliance: {
    compliant: number;
    expiringSoon: number;
    expired: number;
    total: number;
  };
  tickets: {
    processed: number;
    pending: number;
    rejected: number;
  };
  safety: {
    dvirCompliance: number;
    incidents: number;
    safetyScore: number;
  };
}

interface PerformanceData {
  period: string;
  revenue: number;
  profit: number;
  tickets: number;
  mpg: number;
}

export default function AdvancedAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load dashboard metrics
      const metricsResponse = await fetch(`/api/analytics/dashboard?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
      }

      // Load performance trend data
      const performanceResponse = await fetch(`/api/analytics/performance?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceData(performanceData.data);
      }
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time business intelligence and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: '1y', label: '1 Year' },
            ].map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range.value as any)}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.revenue.current)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(metrics.revenue.trend)}
                    <span className={`text-sm ${
                      metrics.revenue.trend === 'up' ? 'text-green-600' : 
                      metrics.revenue.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(metrics.revenue.percentage)}
                    </span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Profit */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Profit</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.profit.current)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(metrics.profit.trend)}
                    <span className={`text-sm ${
                      metrics.profit.trend === 'up' ? 'text-green-600' : 
                      metrics.profit.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(metrics.profit.percentage)}
                    </span>
                  </div>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Active Drivers */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Drivers</p>
                  <p className="text-2xl font-bold">{metrics.activeDrivers.current}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(metrics.activeDrivers.trend)}
                    <span className="text-sm text-gray-600">
                      {metrics.activeDrivers.current - metrics.activeDrivers.previous} this period
                    </span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* Fleet Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fleet Status</p>
                  <p className="text-2xl font-bold">{metrics.activeVehicles.current}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {metrics.activeVehicles.maintenance} in maintenance
                    </Badge>
                  </div>
                </div>
                <Truck className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Overview */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Compliance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compliant</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(metrics.compliance.compliant / metrics.compliance.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metrics.compliance.compliant}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expiring Soon</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(metrics.compliance.expiringSoon / metrics.compliance.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metrics.compliance.expiringSoon}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expired</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${(metrics.compliance.expired / metrics.compliance.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metrics.compliance.expired}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety Metrics */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Safety Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">DVIR Compliance</span>
                  <span className="text-lg font-semibold">{metrics.safety.dvirCompliance}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Safety Score</span>
                  <span className="text-lg font-semibold">{metrics.safety.safetyScore}/100</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Incidents (30d)</span>
                  <Badge variant={metrics.safety.incidents === 0 ? "default" : "destructive"}>
                    {metrics.safety.incidents}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Trend Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Interactive Charts Coming Soon</p>
              <p className="text-sm text-gray-400">
                Revenue, profit, and operational metrics over time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
