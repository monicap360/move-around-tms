"use client";
import { useMemo, useRef } from "react";
import { exportNodeAsPng } from "./exportAsImage";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";

function calculateRiskScore(dvirs, truck) {
  // Example: base risk on recent defects, overdue, and usage
  const recent = dvirs.filter(d => d.truck_number === truck).slice(0, 10);
  let score = 0;
  let reasons = [];
  const now = new Date();
  const overdue = recent.filter(d => d.overall_status === "defective" && !d.mechanic_signature);
  if (overdue.length > 0) {
    score += 40;
    reasons.push("Overdue repair(s)");
  }
  const repeat = recent.filter(d => d.overall_status === "defective").length;
  if (repeat >= 3) {
    score += 30;
    reasons.push("Repeat defects");
  }
  // Add more logic: e.g., time since last inspection, mileage, etc.
  const lastInspection = recent.find(d => d.overall_status !== "defective");
  if (!lastInspection || (now.getTime() - new Date(lastInspection.date || lastInspection.created_at).getTime()) > 1000*60*60*24*30) {
    score += 20;
    reasons.push("Inspection overdue");
  }
  // Cap at 100
  return { score: Math.min(score, 100), reasons };
}

type RiskData = { truck: string; score: number; reasons: string[] };

export default function PredictiveAnalytics({ dvirs }) {
  // Get all unique trucks
  const trucks: string[] = useMemo(() => Array.from(new Set(dvirs.map((d: any) => String(d.truck_number)))), [dvirs]);
  const riskData: RiskData[] = useMemo(() => trucks.map(truck => ({
    truck,
    ...calculateRiskScore(dvirs, truck)
  })), [dvirs, trucks]);
  const highRisk = riskData.filter(r => r.score >= 60);
  const medRisk = riskData.filter(r => r.score >= 30 && r.score < 60);


  const sectionRef = useRef<HTMLDivElement>(null);
  if (riskData.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Predictive Analytics: Vehicle Risk</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            onClick={() => {
              const headers = ["Truck","Risk Score","Reasons"];
              const rows = riskData.map(r => [r.truck, r.score, r.reasons.join("; ")]);
              const csv = [headers, ...rows].map(r => r.map(x => `"${(x||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `predictive_analytics_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >Export CSV</button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            onClick={() => {
              if (sectionRef.current) exportNodeAsPng(sectionRef.current, `predictive_analytics_${new Date().toISOString().slice(0,10)}.png`);
            }}
          >Export as Image</button>
        </div>
      </div>
      <div ref={sectionRef}>
        <Card className="border border-yellow-400 bg-yellow-50">
          <CardHeader className="bg-yellow-600 text-white rounded-t-lg">
            <CardTitle>Predictive Analytics: Vehicle Risk</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="mb-2 font-semibold">High Risk Vehicles</div>
            <ul className="list-disc ml-6 text-sm mb-4">
              {highRisk.length === 0 && <li>None</li>}
              {highRisk.map((r: RiskData) => (
                <li key={r.truck}>
                  Truck <b>{r.truck}</b> (Risk Score: {r.score}) - {r.reasons.join(", ")}
                </li>
              ))}
            </ul>
            <div className="mb-2 font-semibold">Medium Risk Vehicles</div>
            <ul className="list-disc ml-6 text-sm mb-4">
              {medRisk.length === 0 && <li>None</li>}
              {medRisk.map((r: RiskData) => (
                <li key={r.truck}>
                  Truck <b>{r.truck}</b> (Risk Score: {r.score}) - {r.reasons.join(", ")}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
