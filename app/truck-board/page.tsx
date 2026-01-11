"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";

export default function TruckBoard() {
  const [trucks, setTrucks] = useState([
    {
      id: "1",
      unit: "T-101",
      driver: "Robert M.",
      status: "Ready",
      type: "EndDump",
    },
    {
      id: "2",
      unit: "T-102",
      driver: "Lilia G.",
      status: "Down",
      type: "EndDump",
    },
    {
      id: "3",
      unit: "T-103",
      driver: "Santiago P.",
      status: "Ready",
      type: "Flatbed",
    },
  ]);

  const handleAutoAssign = async (driverId: string) => {
    try {
      const res = await fetch("/api/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      alert(data.message || "No response");
    } catch (err) {
      alert("Error: " + String(err));
    }
  };

  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Truck Board · Auto Dispatch</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Truck</th>
                <th className="border px-3 py-2">Driver</th>
                <th className="border px-3 py-2">Type</th>
                <th className="border px-3 py-2">Status</th>
                <th className="border px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((t) => (
                <tr key={t.unit} className="text-center">
                  <td className="border px-3 py-2">{t.unit}</td>
                  <td className="border px-3 py-2">{t.driver}</td>
                  <td className="border px-3 py-2">{t.type}</td>
                  <td
                    className={`border px-3 py-2 font-semibold ${
                      t.status === "Ready"
                        ? "text-green-600"
                        : t.status === "Down"
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {t.status}
                  </td>
                  <td className="border px-3 py-2">
                    {t.status === "Down" ? (
                      <button
                        onClick={() => handleAutoAssign(t.id)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      >
                        Auto Assign Backup
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">No Action</span>
                    )}
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
