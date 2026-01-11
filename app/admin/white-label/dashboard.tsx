"use client";
import { useState } from "react";

export default function WhiteLabelWorkflow() {
  const [domain, setDomain] = useState("");
  const [brandColor, setBrandColor] = useState("#005BBB");
  const [role, setRole] = useState("admin");
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        White-Labeling & Workflow Automation
      </h1>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Custom Domain & Branding</h2>
        <div className="mb-2">
          <label className="block mb-1 font-medium">Custom Domain</label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="yourcompany.com"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1 font-medium">Brand Color</label>
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="w-12 h-8 border rounded"
          />
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Role & Permission Management</h2>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded px-2 py-1 mb-2"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="driver">Driver</option>
          <option value="customer">Customer</option>
        </select>
        <div className="text-gray-500">
          Advanced permissions and custom roles coming soon.
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Workflow Builder</h2>
        <div className="text-gray-500">
          No-code/low-code workflow automation coming soon.
        </div>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>White-labeling and workflow automation:</strong> Coming soon.
        Customize your TMS and automate business processes without code.
      </div>
    </div>
  );
}
