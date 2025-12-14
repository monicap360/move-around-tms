"use client";

import { useEffect, useState } from "react";
import { TrendingUp, MapPin, DollarSign, RefreshCcw } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AILaneProfitability({ params }: any) {
  const org = params.org;
  const [lanes, setLanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLanes() {
    setLoading(true);
    const res = await fetch(`/api/company/${org}/ai/lane-profitability`);
    const data = await res.json();
    setLanes(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchLanes();
  }, [org]);

  return (
    <div className="p-8 space-y-8 bg-[#0e1116] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-green-400" /> AI Lane Profitability
        </h1>
        <button
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg"
          onClick={fetchLanes}
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
          {lanes.map((lane: any, i: number) => (
            <Card key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg hover:bg-white/10 transition text-white">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-6 h-6 text-purple-300" />
                <span className="font-bold text-lg">{lane.lane}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-green-300" />
                <span className="text-sm">Profit:</span>
                <span className="font-bold text-xl text-green-200">${lane.profit}</span>
              </div>
              <div className="text-gray-300 text-sm mt-2">
                <span className="font-semibold">Volume:</span> {lane.volume}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Avg Cycle: {lane.avg_cycle} min
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}