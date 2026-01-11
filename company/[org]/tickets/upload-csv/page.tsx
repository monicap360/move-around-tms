"use client";

import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";
import Papa from "papaparse";

export default function CsvReconciliationPage({ params }: any) {
  const company = params.company;

  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  function parseCsv(file: File) {
    setProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        setCsvRows(res.data);
        await reconcileWithDB(res.data);
      },
    });
  }

  async function reconcileWithDB(rows: any[]) {
    const response = await fetch(`/api/company/${company}/tickets/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    const output = await response.json();
    setResults(output);
    setProcessing(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">CSV Reconciliation</h1>
      <p className="text-gray-600">
        Upload a plant CSV file (Cemex, MM, Vulcan, GCC, TXI, or any custom
        plant). The system will automatically:
      </p>

      <ul className="text-gray-700 list-disc ml-6">
        <li>Match CSV lines to driver + truck + ticket</li>
        <li>Auto-create missing tickets</li>
        <li>Detect wrong weights, wrong dates, duplicates</li>
        <li>Mark exceptions for admin review</li>
        <li>Prepare payroll-ready results</li>
      </ul>

      <div className="border-2 border-dashed border-gray-300 p-10 rounded-xl text-center">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csvInput"
          onChange={(e) => e.target.files?.[0] && parseCsv(e.target.files[0])}
        />

        <label
          htmlFor="csvInput"
          className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto w-fit"
        >
          <Upload className="w-5 h-5" />
          Upload CSV File
        </label>
      </div>

      {processing && (
        <div className="text-blue-600 font-semibold flex gap-2 items-center">
          <RefreshCcw className="animate-spin w-5 h-5" /> Processing CSV...
        </div>
      )}

      {results && <ReconciliationResults results={results} />}
    </div>
  );
}

function ReconciliationResults({ results }: any) {
  return (
    <div className="space-y-6 mt-10">
      <h2 className="text-2xl font-semibold">Reconciliation Results</h2>

      <Metrics results={results} />

      <ExceptionsTable results={results} />

      <AutoCreatedTicketsTable results={results} />

      <MatchedTicketsTable results={results} />
    </div>
  );
}

function Metrics({ results }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricTile
        label="Total CSV Rows"
        value={results.total_rows}
        icon={<FileSpreadsheet />}
      />
      <MetricTile
        label="Matched Tickets"
        value={results.matched}
        icon={<CheckCircle />}
      />
      <MetricTile
        label="Auto-Created Tickets"
        value={results.created}
        icon={<Upload />}
      />
      <MetricTile
        label="Exceptions"
        value={results.exceptions}
        icon={<AlertTriangle />}
        color="text-red-600"
      />
    </div>
  );
}

function MetricTile({ label, value, icon, color = "text-blue-600" }: any) {
  return (
    <div className="bg-white rounded-xl shadow p-6 border">
      <div className="flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ExceptionsTable({ results }: any) {
  if (!results.exceptions_list?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 border">
      <h3 className="text-xl font-semibold mb-3 text-red-600 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Exceptions
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Ticket #</th>
            <th>Driver</th>
            <th>Truck</th>
            <th>Issue</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.exceptions_list.map((ex: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="py-2">{ex.ticket_number}</td>
              <td>{ex.driver}</td>
              <td>{ex.truck}</td>
              <td className="text-red-600">{ex.reason}</td>
              <td className="text-right">
                <button className="text-blue-600 underline">Fix</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AutoCreatedTicketsTable({ results }: any) {
  if (!results.created_list?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 border">
      <h3 className="text-xl font-semibold mb-3">Auto-Created Tickets</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Ticket #</th>
            <th>Driver</th>
            <th>Truck</th>
            <th>Tonnage</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {results.created_list.map((t: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="py-2">{t.ticket_number}</td>
              <td>{t.driver}</td>
              <td>{t.truck}</td>
              <td>{t.weight}</td>
              <td>{t.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchedTicketsTable({ results }: any) {
  if (!results.matched_list?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 border">
      <h3 className="text-xl font-semibold mb-3">Matched Tickets</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Ticket #</th>
            <th>Driver</th>
            <th>Truck</th>
            <th>Tonnage</th>
            <th>Matched With</th>
          </tr>
        </thead>
        <tbody>
          {results.matched_list.map((t: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="py-2">{t.ticket_number}</td>
              <td>{t.driver}</td>
              <td>{t.truck}</td>
              <td>{t.weight}</td>
              <td className="text-green-600">✓ DB Ticket #{t.db_ticket_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
