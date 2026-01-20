"use client";

import React, { useState } from "react";

export default function ComplianceDrilldownModal({
  open,
  onClose,
  dvirs,
  complianceMap,
}) {
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [compliance, setCompliance] = useState("all");

  if (!open) return null;

  let filtered = dvirs;
  if (vehicle)
    filtered = filtered.filter((d) =>
      (d.truck_number || "").toLowerCase().includes(vehicle.toLowerCase()),
    );
  if (driver)
    filtered = filtered.filter((d) =>
      (d.driver_name || "").toLowerCase().includes(driver.toLowerCase()),
    );
  if (compliance !== "all") {
    filtered = filtered.filter((d) => {
      const c = complianceMap[d.id] || {
        missingFields: [],
        invalidDefects: [],
        intervalOk: true,
      };
      const isCompliant =
        c.missingFields.length === 0 &&
        c.invalidDefects.length === 0 &&
        c.intervalOk;
      return compliance === "compliant" ? isCompliant : !isCompliant;
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="mb-4 font-bold text-lg">DVIRs for Selected Date</div>
        <div className="flex gap-4 mb-4 items-center">
          <input
            className="input"
            placeholder="Filter by vehicle..."
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
          />
          <input
            className="input"
            placeholder="Filter by driver..."
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
          />
          <select
            className="input"
            value={compliance}
            onChange={(e) => setCompliance(e.target.value)}
          >
            <option value="all">All</option>
            <option value="compliant">Compliant</option>
            <option value="noncompliant">Noncompliant</option>
          </select>
          <button
            className="ml-auto px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            onClick={() => {
              const headers = [
                "Vehicle",
                "Driver",
                "Odometer",
                "Status",
                "Compliance",
                "Remarks",
              ];
              const rows = filtered.map((d) => {
                const c = complianceMap[d.id] || {
                  missingFields: [],
                  invalidDefects: [],
                  intervalOk: true,
                };
                const compliant =
                  c.missingFields.length === 0 &&
                  c.invalidDefects.length === 0 &&
                  c.intervalOk;
                return [
                  d.truck_number,
                  d.driver_name,
                  d.odometer_reading,
                  d.overall_status,
                  compliant ? "Compliant" : "Noncompliant",
                  d.remarks || "",
                ];
              });
              const csv = [headers, ...rows]
                .map((r) =>
                  r
                    .map((x) => `"${(x || "").toString().replace(/"/g, '""')}"`)
                    .join(","),
                )
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `dvir_drilldown_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="min-w-full border text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Vehicle</th>
                <th className="border px-2 py-1">Driver</th>
                <th className="border px-2 py-1">Odometer</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Compliance</th>
                <th className="border px-2 py-1">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const c = complianceMap[d.id] || {
                  missingFields: [],
                  invalidDefects: [],
                  intervalOk: true,
                };
                const compliant =
                  c.missingFields.length === 0 &&
                  c.invalidDefects.length === 0 &&
                  c.intervalOk;
                return (
                  <tr
                    key={d.id || i}
                    className={compliant ? "bg-green-50" : "bg-red-50"}
                  >
                    <td className="border px-2 py-1">{d.truck_number}</td>
                    <td className="border px-2 py-1">{d.driver_name}</td>
                    <td className="border px-2 py-1">{d.odometer_reading}</td>
                    <td className="border px-2 py-1">{d.overall_status}</td>
                    <td
                      className={
                        "border px-2 py-1 font-bold " +
                        (compliant ? "text-green-700" : "text-red-700")
                      }
                    >
                      {compliant ? "Compliant" : "Noncompliant"}
                    </td>
                    <td className="border px-2 py-1 text-xs">{d.remarks}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-400">
                    No DVIRs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
