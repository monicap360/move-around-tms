"use client";
import { useState } from "react";

const mockPartners = [
  { name: "DAT Load Board", type: "Load Board", status: "Connected" },
  { name: "Comdata Fuel", type: "Fuel Card", status: "Connected" },
  { name: "Great West Insurance", type: "Insurance", status: "Available" },
  { name: "QuickPay Fintech", type: "Fintech", status: "Available" }
];

const mockApiKey = "sk_live_1234abcd5678efgh";

export default function PartnerAPI() {
  const [apiKey, setApiKey] = useState(mockApiKey);
  const [show, setShow] = useState(false);

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">Open API & Partner Integrations</h2>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">API Key:</span>
          <input type={show ? "text" : "password"} value={apiKey} readOnly className="border rounded px-2 py-1 w-64" />
          <button className="text-xs text-blue-600 underline" onClick={() => setShow(v => !v)}>{show ? "Hide" : "Show"}</button>
        </div>
        <div className="text-xs text-gray-500">Use this key to access the TMS Open API. <a href="/docs/api" className="underline">View API docs</a></div>
      </div>
      <h3 className="text-lg font-semibold mb-2">Partner Integrations</h3>
      <table className="min-w-full text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Partner</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {mockPartners.map(p => (
            <tr key={p.name}>
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.type}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-xs ${p.status === "Connected" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{p.status}</span>
              </td>
              <td className="p-2">
                {p.status === "Connected" ? (
                  <button className="text-xs text-red-600 underline">Disconnect</button>
                ) : (
                  <button className="text-xs text-blue-600 underline">Connect</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-500">Contact support to add new partner integrations or request API scopes.</div>
    </div>
  );
}
