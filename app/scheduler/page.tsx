"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { autoScheduleLoads } from "../lib/scheduler";

export default function SchedulerPage() {
  const [log, setLog] = useState<any[]>([]);

  const runScheduler = async () => {
    // call server via API in a future step; for now call the helper directly (will fail in browser if supabase client is server-only)
    try {
      const result = await fetch("/api/run-scheduler", { method: "POST" }).then(
        (r) => r.json(),
      );
      setLog(result.assignments || []);
    } catch (err) {
      console.error(err);
      setLog([]);
    }
  };

  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Auto Scheduler & Manual Overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={runScheduler}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Run Auto-Scheduler
          </button>

          <table className="min-w-full border border-gray-300 text-sm mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Driver</th>
                <th className="border px-3 py-2">Truck</th>
                <th className="border px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {log.map((a: any) => (
                <tr key={a.driver} className="text-center">
                  <td className="border px-3 py-2">{a.driver}</td>
                  <td className="border px-3 py-2">{a.truck}</td>
                  <td className="border px-3 py-2 space-x-2">
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                      Reassign
                    </button>
                    <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
