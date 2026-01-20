"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Calculator,
  Target,
  Zap,
} from "lucide-react";

interface ROIMetrics {
  ticketsProcessed: number;
  ticketsWithAnomalies: number;
  anomaliesCaught: number;
  estimatedSavings: number;
  hoursAutomated: number;
  reconciliationAccuracy: number;
  payrollDisputesAvoided: number;
  averageProcessingTime: number;
  manualProcessingTime: number;
}

interface MonthlyTrend {
  month: string;
  tickets: number;
  savings: number;
  anomalies: number;
}

export default function ROIDashboard() {
  const [metrics, setMetrics] = useState<ROIMetrics>({
    ticketsProcessed: 0,
    ticketsWithAnomalies: 0,
    anomaliesCaught: 0,
    estimatedSavings: 0,
    hoursAutomated: 0,
    reconciliationAccuracy: 0,
    payrollDisputesAvoided: 0,
    averageProcessingTime: 0,
    manualProcessingTime: 15, // Industry average: 15 minutes per ticket manually
  });
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "1y">("30d");

  // Cost assumptions for ROI calculation
  const COST_PER_HOUR = 25; // Average hourly rate for back-office staff
  const COST_PER_DISPUTE = 150; // Average cost to resolve a payroll dispute
  const COST_PER_ANOMALY_MISSED = 500; // Average cost of an undetected anomaly

  useEffect(() => {
    loadROIMetrics();
  }, [timeframe]);

  async function loadROIMetrics() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/roi-dashboard?timeframe=${timeframe}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to load ROI metrics");
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setMonthlyTrends(data.monthlyTrends || []);
    } catch (err) {
      console.error("Error loading ROI metrics:", err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-deep p-8">
        <div className="text-text-secondary">Loading ROI metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-deep p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-space-border text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
              ROI Dashboard
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Track your automation savings and operational efficiency
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(["30d", "90d", "1y"] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(tf)}
              className={timeframe === tf 
                ? "bg-gold-primary text-space-deep" 
                : "border-space-border text-text-secondary hover:text-text-primary"
              }
            >
              {tf === "30d" ? "30 Days" : tf === "90d" ? "90 Days" : "1 Year"}
            </Button>
          ))}
        </div>
      </div>

      {/* Key ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-space-panel border-space-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider">Total Savings</p>
                <p className="text-3xl font-bold text-gold-primary mt-1">
                  {formatCurrency(metrics.estimatedSavings)}
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  vs manual processing
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-gold-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider">Hours Automated</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {formatNumber(Math.round(metrics.hoursAutomated))}
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  labor hours saved
                </p>
              </div>
              <Clock className="w-10 h-10 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider">Anomalies Caught</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {formatNumber(metrics.anomaliesCaught)}
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  potential issues flagged
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider">Disputes Avoided</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {formatNumber(metrics.payrollDisputesAvoided)}
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  payroll conflicts prevented
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Efficiency */}
        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-primary" />
              Processing Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-text-secondary text-sm">Tickets Processed</p>
                <p className="text-2xl font-bold text-text-primary">
                  {formatNumber(metrics.ticketsProcessed)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-sm">Accuracy Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {metrics.reconciliationAccuracy.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Manual Processing Time</span>
                <span className="text-text-primary">{metrics.manualProcessingTime} min/ticket</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Automated Processing Time</span>
                <span className="text-gold-primary">{metrics.averageProcessingTime} min/ticket</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-text-secondary">Time Reduction</span>
                <span className="text-green-400">
                  {Math.round(((metrics.manualProcessingTime - metrics.averageProcessingTime) / metrics.manualProcessingTime) * 100)}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-space-border">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calculator className="w-4 h-4" />
                <span>Based on industry average of 15 min/ticket for manual processing</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Breakdown */}
        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-primary" />
              Savings Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-space-surface rounded border border-space-border">
                <div>
                  <p className="text-text-primary font-medium">Labor Cost Savings</p>
                  <p className="text-text-secondary text-xs">
                    {formatNumber(Math.round(metrics.hoursAutomated))} hours @ ${COST_PER_HOUR}/hr
                  </p>
                </div>
                <p className="text-gold-primary font-bold">
                  {formatCurrency(metrics.hoursAutomated * COST_PER_HOUR)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-space-surface rounded border border-space-border">
                <div>
                  <p className="text-text-primary font-medium">Dispute Prevention</p>
                  <p className="text-text-secondary text-xs">
                    {metrics.payrollDisputesAvoided} disputes @ ${COST_PER_DISPUTE}/dispute
                  </p>
                </div>
                <p className="text-gold-primary font-bold">
                  {formatCurrency(metrics.payrollDisputesAvoided * COST_PER_DISPUTE)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-space-surface rounded border border-space-border">
                <div>
                  <p className="text-text-primary font-medium">Anomaly Detection Value</p>
                  <p className="text-text-secondary text-xs">
                    {metrics.anomaliesCaught} anomalies caught early
                  </p>
                </div>
                <p className="text-gold-primary font-bold">
                  {formatCurrency(metrics.anomaliesCaught * COST_PER_ANOMALY_MISSED * 0.1)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-space-border">
              <div className="flex justify-between items-center">
                <span className="text-text-primary font-medium">Total ROI</span>
                <span className="text-2xl font-bold text-gold-primary">
                  {formatCurrency(metrics.estimatedSavings)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 1 && (
        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold-primary" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {monthlyTrends.map((trend, idx) => (
                <div key={idx} className="p-4 bg-space-surface rounded border border-space-border text-center">
                  <p className="text-text-secondary text-xs uppercase">{trend.month}</p>
                  <p className="text-text-primary font-bold mt-1">{formatNumber(trend.tickets)}</p>
                  <p className="text-text-secondary text-xs">tickets</p>
                  <p className="text-gold-primary font-medium mt-2">{formatCurrency(trend.savings)}</p>
                  <p className="text-text-secondary text-xs">saved</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Value Proposition */}
      <Card className="bg-space-panel border-space-border">
        <CardContent className="py-6">
          <div className="text-center">
            <h3 className="text-text-primary font-medium uppercase tracking-wider mb-2">
              Your Automation Investment
            </h3>
            <p className="text-text-secondary text-sm max-w-2xl mx-auto">
              Move Around TMS has processed <span className="text-gold-primary font-bold">{formatNumber(metrics.ticketsProcessed)}</span> tickets, 
              saving your team <span className="text-gold-primary font-bold">{formatNumber(Math.round(metrics.hoursAutomated))}</span> hours of manual work 
              and preventing <span className="text-gold-primary font-bold">{metrics.payrollDisputesAvoided}</span> potential payroll disputes. 
              Your estimated ROI is <span className="text-gold-primary font-bold">{formatCurrency(metrics.estimatedSavings)}</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
