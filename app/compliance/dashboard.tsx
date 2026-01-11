"use client";
import { useState } from "react";

const reminders = [
  { type: "IFTA", due: "2026-03-31" },
  { type: "DOT Inspection", due: "2026-02-15" },
  { type: "Insurance Renewal", due: "2026-04-01" },
  { type: "Maintenance", due: "2026-01-20" },
];

const drivers = [
  { name: "John D.", qualification: "Valid", safetyScore: 92 },
  { name: "Jane S.", qualification: "Expiring Soon", safetyScore: 85 },
];

export default function ComplianceDashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Compliance & Safety</h1>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Upcoming Reminders</h2>
        <ul className="list-disc pl-6">
          {reminders.map(r => (
            <li key={r.type} className="mb-1">{r.type}: <span className="font-mono">{r.due}</span></li>
          ))}
        </ul>
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Driver Qualification Files</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1">Driver</th>
              <th className="px-2 py-1">Qualification</th>
              <th className="px-2 py-1">Safety Score</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.name} className="border-b">
                <td className="px-2 py-1 font-mono">{d.name}</td>
                <td className="px-2 py-1">{d.qualification}</td>
                <td className="px-2 py-1">{d.safetyScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>Automated reminders and safety scorecards:</strong> Coming soon. All compliance and safety workflows will be automated.
      </div>
    </div>
  );
}
