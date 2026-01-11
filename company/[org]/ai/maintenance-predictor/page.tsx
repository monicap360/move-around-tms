"use client";

import { useEffect, useState } from "react";
import { Wrench, Truck, AlertTriangle, Gauge, RefreshCcw } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AIMaintenancePredictor({ params }: any) {
  const org = params.org;
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPredictions() {
    setLoading(true);
    const res = await fetch(`/api/company/${org}/ai/maintenance-predictor`);
    const data = await res.json();
    setPredictions(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchPredictions();
  }, [org]);

  return (
    <div className="p-8 space-y-8 bg-[#0e1116] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="w-8 h-8 text-yellow-400" /> AI Maintenance
          Predictor
        </h1>
        <button
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg"
          onClick={fetchPredictions}
        >
          Refresh Predictions
        </button>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex justify-center items-center text-blue-400">
          <RefreshCcw className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {predictions.map((truck: any, i: number) => (
            <Card
              key={i}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg hover:bg-white/10 transition text-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-6 h-6 text-blue-300" />
                <span className="font-bold text-lg">
                  Truck #{truck.truck_number}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-5 h-5 text-yellow-300" />
                <span className="text-sm">Health Score:</span>
                <span className="font-bold text-xl text-yellow-200">
                  {truck.health_score}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-sm">Breakdown Risk:</span>
                <span className="font-bold text-xl text-red-300">
                  {truck.breakdown_risk}%
                </span>
              </div>
              <div className="text-gray-300 text-sm mt-2">
                <span className="font-semibold">Next Predicted Issue:</span>{" "}
                {truck.next_issue}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Last Maintenance: {truck.last_maintenance}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
