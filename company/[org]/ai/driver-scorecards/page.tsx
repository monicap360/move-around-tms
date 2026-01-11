"use client";

import { useEffect, useState } from "react";
import {
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCcw,
} from "lucide-react";
import Card from "@/components/ui/Card";

export default function AIDriverScorecards({ params }: any) {
  const org = params.org;
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchScorecards() {
    setLoading(true);
    const res = await fetch(`/api/company/${org}/ai/driver-scorecards`);
    const data = await res.json();
    setScorecards(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchScorecards();
  }, [org]);

  return (
    <div className="p-8 space-y-8 bg-[#0e1116] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCheck className="w-8 h-8 text-blue-400" /> AI Driver Scorecards
        </h1>
        <button
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg"
          onClick={fetchScorecards}
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
          {scorecards.map((driver: any, i: number) => (
            <Card
              key={i}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg hover:bg-white/10 transition text-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-6 h-6 text-blue-300" />
                <span className="font-bold text-lg">{driver.name}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-300" />
                <span className="text-sm">On-Time %:</span>
                <span className="font-bold text-xl text-green-200">
                  {driver.on_time_pct}%
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-sm">Exceptions:</span>
                <span className="font-bold text-xl text-red-300">
                  {driver.exceptions}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-yellow-300" />
                <span className="text-sm">Avg Cycle:</span>
                <span className="font-bold text-xl text-yellow-200">
                  {driver.avg_cycle} min
                </span>
              </div>
              <div className="text-gray-300 text-sm mt-2">
                <span className="font-semibold">Safety Flags:</span>{" "}
                {driver.safety_flags}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
