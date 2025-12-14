"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Shield, RefreshCcw } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AIFraudAnomaly({ params }: any) {
  const org = params.org;
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    const res = await fetch(`/api/company/${org}/ai/fraud-anomaly`);
    const data = await res.json();
    setAlerts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchAlerts();
  }, [org]);

  return (
    <div className="p-8 space-y-8 bg-[#0e1116] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-red-400" /> AI Fraud & Anomaly Detection
        </h1>
        <button
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg"
          onClick={fetchAlerts}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex justify-center items-center text-blue-400">
          <RefreshCcw className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {alerts.map((alert: any, i: number) => (
            <Card key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg hover:bg-white/10 transition text-white">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-300" />
                <span className="font-bold text-lg">{alert.type}</span>
              </div>
              <div className="text-gray-300 text-sm mt-2">
                <span className="font-semibold">Details:</span> {alert.details}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Detected: {alert.detected_at}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}