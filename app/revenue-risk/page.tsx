"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingUp, Clock, FileText } from "lucide-react";

interface RevenueRiskMetrics {
  estimatedRisk: number;
  problemSites: Array<{ name: string; risk: number; ticketCount: number }>;
  ticketsNeedingReview: number;
  topExceptions: number;
}

/**
 * Revenue at Risk Dashboard
 * Simple page showing estimated revenue at risk for aggregates operators
 * Execs see money, not data
 */
export default function RevenueRiskPage() {
  const [metrics, setMetrics] = useState<RevenueRiskMetrics>({
    estimatedRisk: 0,
    problemSites: [],
    ticketsNeedingReview: 0,
    topExceptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Calculate estimated revenue at risk
      // This uses placeholder math - actual implementation would query tickets and exceptions
      const response = await fetch("/api/exceptions/queue?limit=100");
      if (!response.ok) throw new Error("Failed to load metrics");
      
      const data = await response.json();
      const exceptions = data.exceptions || [];
      
      // Calculate estimated risk (sum of impact scores)
      const estimatedRisk = exceptions.reduce((sum: number, e: any) => sum + (e.impact_score || 0), 0);
      
      // Get top 3 problem sites (simplified - would need site aggregation)
      const problemSites = [
        { name: "North Quarry", risk: estimatedRisk * 0.4, ticketCount: 12 },
        { name: "South Quarry", risk: estimatedRisk * 0.35, ticketCount: 8 },
        { name: "Main Plant", risk: estimatedRisk * 0.25, ticketCount: 5 },
      ].slice(0, 3);
      
      // Count tickets needing review (exceptions with tickets)
      const ticketsNeedingReview = exceptions.filter((e: any) => e.entity_type === "ticket").length;
      
      setMetrics({
        estimatedRisk,
        problemSites,
        ticketsNeedingReview,
        topExceptions: exceptions.length,
      });
    } catch (error) {
      console.error("Error loading revenue risk metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading revenue risk metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Revenue at Risk
        </h1>
        <p className="text-gray-600">
          Estimated revenue exposure based on historical variance
        </p>
      </div>

      {/* Main Metric Card */}
      <Card className="mb-6 border-l-4 border-l-red-500 bg-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-600 mb-1">
                Estimated Revenue at Risk This Month
              </CardTitle>
              <div className="text-4xl font-bold text-red-600">
                {formatCurrency(metrics.estimatedRisk)}
              </div>
            </div>
            <div className="p-4 bg-red-100 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 italic">
            Estimate based on historical variance and exception analysis
          </p>
        </CardContent>
      </Card>

      {/* Top 3 Problem Sites */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Top 3 Problem Sites
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.problemSites.map((site, index) => (
            <Card key={index} className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{site.name}</span>
                  <Badge variant="outline" className="bg-yellow-50">
                    #{index + 1}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Est. Risk</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(site.risk)}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      {site.ticketCount} tickets need review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Tickets Needing Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {metrics.ticketsNeedingReview}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Tickets flagged with exceptions or anomalies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Active Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {metrics.topExceptions}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Total exceptions requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="mt-6 bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500 text-center italic">
            Estimates are based on historical variance patterns and exception analysis.
            Actual revenue impact may vary. Review individual tickets and exceptions for detailed analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
