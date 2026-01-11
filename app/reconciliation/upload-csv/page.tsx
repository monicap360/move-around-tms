"use client";

import { useState, useRef } from "react";
import { analyzePitCsvHeaders } from "@/lib/csv/headerAnalyzer";

export default function UploadCsvPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pitName, setPitName] = useState("");
  const [autoPitName, setAutoPitName] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [mapping, setMapping] = useState<any>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: Fetch pit formats for dropdown
  // const pitFormats = ...

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setError(null);
    setLoading(true);
    // Read file as base64 for API
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      // Send to backend
      const res = await fetch("/api/reconciliation/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, filename: file.name }),
      });
      if (!res.ok) {
        setError("Failed to parse CSV");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPreview(data.preview);
      setMapping(data.mapping);
      setHeaders(data.headers);
      setRows(data.preview);
      setAutoPitName(data.mapping?.pit_name || "");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">
        Pit Ticket CSV Upload & Mapping
      </h1>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="border rounded px-2 py-1"
        />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Pit Name (optional)</label>
        <input
          type="text"
          value={pitName}
          onChange={(e) => setPitName(e.target.value)}
          placeholder="Auto-detect or enter manually"
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      {/* TODO: Dropdown for auto-detect pit name from formats */}
      {loading && <div className="text-blue-600">Parsing CSV...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {headers.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Detected Columns</h2>
          <ul className="text-sm bg-gray-50 rounded p-2">
            {Object.entries(mapping || {}).map(([key, val]) => (
              <li key={key}>
                <span className="font-mono text-gray-700">{key}</span>:{" "}
                <span className="text-blue-700">
                  {val || <span className="text-red-500">(not found)</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Preview (first 10 rows)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="border px-2 py-1 bg-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {headers.map((h, j) => (
                      <td key={j} className="border px-2 py-1">
                        {row.raw_data?.[j] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* TODO: Confirm Mapping, Save Format, Run Reconciliation buttons */}
    </div>
  );
}
