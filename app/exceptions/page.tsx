"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Shield, Clock, ArrowUp } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Exception {
  id: string;
  entity_type: string;
  entity_id: string;
  impact_score: number;
  confidence_score: number;
  priority_rank: number;
  recommended_action: string;
  explanation: string;
  status: string;
  created_at: string;
  // Related data
  ticket_number?: string;
  ticket_amount?: number;
  site_name?: string;
}

/**
 * Top-5 Exceptions View
 * Critical for aggregates demo - shows only 5 items, sorted by estimated $ impact
 */
export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    try {
      // Fetch top 5 exceptions by priority_rank
      const response = await fetch("/api/exceptions/queue?limit=5");
      if (!response.ok) throw new Error("Failed to load exceptions");
      
      const data = await response.json();
      setExceptions(data.exceptions || []);
    } catch (error) {
      console.error("Error loading exceptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactLabel = (impactScore: number) => {
    if (impactScore >= 1000) return "High";
    if (impactScore >= 500) return "Medium";
    return "Low";
  };

  const getImpactColor = (impactScore: number) => {
    if (impactScore >= 1000) return "bg-red-100 text-red-800 border-red-300";
    if (impactScore >= 500) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-blue-100 text-blue-800 border-blue-300";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "scale_variance":
        return "Scale Variance";
      case "dwell_time":
        return "Dwell Time";
      case "dispute_risk":
        return "Dispute Risk";
      case "audit_exposure":
        return "Audit Risk";
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading exceptions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Priority Exceptions
        </h1>
        <p className="text-gray-600">
          Top 5 items requiring attention, ranked by estimated impact
        </p>
      </div>

      {/* Exceptions List */}
      {exceptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No exceptions found. All systems operating normally.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exceptions.map((exception, index) => (
            <Card key={exception.id} className="border-l-4 border-l-green-600">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 font-bold">
                        {index + 1}
                      </div>
                      <CardTitle className="text-xl">
                        {getTypeLabel(exception.entity_type)}
                      </CardTitle>
                      <Badge className={getImpactColor(exception.impact_score)}>
                        {getImpactLabel(exception.impact_score)} Impact
                      </Badge>
                    </div>
                    {exception.ticket_number && (
                      <p className="text-sm text-gray-600">
                        Ticket #{exception.ticket_number}
                        {exception.site_name && ` • ${exception.site_name}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(exception.impact_score)}
                    </div>
                    <div className="text-xs text-gray-500">Est. Impact</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Explanation
                    </p>
                    <p className="text-sm text-gray-600">{exception.explanation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Recommended Action
                    </p>
                    <p className="text-sm text-gray-600">{exception.recommended_action}</p>
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Confidence: {(exception.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(exception.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {exceptions.length > 0 && (
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Estimated Impact</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    exceptions.reduce((sum, e) => sum + e.impact_score, 0)
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Items Requiring Review</p>
                <p className="text-2xl font-bold text-gray-800">
                  {exceptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
