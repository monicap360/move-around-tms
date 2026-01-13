"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
  AlertCircle,
} from "lucide-react";

interface FinancialIntelligenceProps {
  ticket: {
    id: string;
    total_pay?: number;
    total_bill?: number;
    total_profit?: number;
    pay_rate?: number;
    bill_rate?: number;
    quantity?: number;
  };
}

export default function FinancialIntelligence({
  ticket,
}: FinancialIntelligenceProps) {
  const [costs, setCosts] = useState({ fuel_cost: 0, tolls_cost: 0, other_costs: 0, total_costs: 0 });
  const [loadingCosts, setLoadingCosts] = useState(true);

  useEffect(() => {
    async function fetchCosts() {
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/costs`);
        if (res.ok) {
          const data = await res.json();
          setCosts(data);
        }
      } catch (err) {
        console.error("Error fetching ticket costs:", err);
      } finally {
        setLoadingCosts(false);
      }
    }
    if (ticket.id) {
      fetchCosts();
    }
  }, [ticket.id]);

  const payRate = ticket.pay_rate || 0;
  const billRate = ticket.bill_rate || 0;
  const quantity = ticket.quantity || 0;
  const totalPay = ticket.total_pay || quantity * payRate;
  const totalBill = ticket.total_bill || quantity * billRate;
  const totalProfit = ticket.total_profit || totalBill - totalPay;
  const margin = totalBill > 0 ? (totalProfit / totalBill) * 100 : 0;

  // Use real cost data from API
  const fuelCost = costs.fuel_cost || 0;
  const tollsCost = costs.tolls_cost || 0;
  const otherCosts = costs.other_costs || 0;
  const totalCosts = totalPay + fuelCost + tollsCost + otherCosts;
  const netProfit = totalBill - totalCosts;
  const netMargin = totalBill > 0 ? (netProfit / totalBill) * 100 : 0;

  // Profitability indicators
  const isProfitable = netProfit > 0;
  const isHighMargin = margin >= 20;
  const isLowMargin = margin < 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profitability Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Gross Profit</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${totalProfit.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {totalProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {margin.toFixed(1)}% margin
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${netProfit.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {netMargin.toFixed(1)}% net margin
              </span>
            </div>
          </div>
        </div>

        {/* Margin Analysis */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Margin Analysis</span>
            {isHighMargin && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                High Margin
              </span>
            )}
            {isLowMargin && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Low Margin
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Bill Rate</span>
              <span className="font-semibold">${billRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pay Rate</span>
              <span className="font-semibold">${payRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>Rate Difference</span>
              <span className={`font-semibold ${billRate >= payRate ? "text-green-600" : "text-red-600"}`}>
                ${(billRate - payRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Allocation */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">Cost Allocation</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Driver Pay</span>
              <span className="font-semibold">${totalPay.toFixed(2)}</span>
            </div>
            {fuelCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Fuel</span>
                <span className="font-semibold">${fuelCost.toFixed(2)}</span>
              </div>
            )}
            {tollsCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tolls</span>
                <span className="font-semibold">${tollsCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-2 font-semibold">
              <span>Total Costs</span>
              <span>${totalCosts.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Revenue Recognition */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Revenue Recognition</p>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Billable Amount:</span>
              <span className="font-semibold">${totalBill.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500">
              Status: {ticket.status || "Pending"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
