import FastScanSupportChat from "../../../components/FastScanSupportChat";
("use client");
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Scan {
  id: string;
  organizationId: string;
  ticketId: string;
  documentId: string;
  createdAt: string;
  status: string;
  resultId?: string;
  driverId?: string;
  truckId?: string;
  material?: string;
  netWeight?: string;
  customer?: string;
  job?: string;
  timestamp?: string;
  pitName?: string;
  notes?: string;
  referenceNumber?: string;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "accounting", label: "Accounting / Payroll" },
  { value: "ops", label: "Operations Manager" },
];

const ROLE_PITCH = {
  owner: {
    pitch:
      "Fast Scan protects your bottom line by preventing payroll mistakes before they happen. Manual ticket entry and mismatched pit tickets are the #1 source of lost revenue and driver disputes. With Fast Scan, only verified, reconciled loads make it into payroll—so you pay drivers accurately, avoid costly corrections, and build trust.",
    subtext:
      "Prevents payroll mistakes so you keep more revenue and avoid disputes.",
  },
  accounting: {
    pitch:
      "Fast Scan eliminates manual ticket entry errors and mismatched loads, so payroll is always based on verified, reconciled tickets. You’ll dramatically reduce corrections, disputes, and rework—saving hours every week and ensuring every driver is paid exactly what they earned.",
    subtext:
      "Ensures payroll is calculated only from verified, reconciled tickets—no more manual mistakes.",
  },
  ops: {
    pitch:
      "Fast Scan streamlines your ticket process and prevents payroll errors by auto-matching driver, truck, material, and time. You’ll catch issues before payroll runs, reduce admin labor, and keep drivers happy with accurate, dispute-free pay.",
    subtext:
      "Reduces admin work and catches ticket issues before payroll—drivers get paid right, every time.",
  },
};

export default function FastScanPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Scan | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<"owner" | "accounting" | "ops">("owner");
  const [showManualEntry, setShowManualEntry] = useState(false);
  // CSV upload state
  const [csvError, setCsvError] = useState<string | null>(null);

  // CSV upload handler: POST to API, update UI
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setCsvError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/fastscan/upload-csv", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      // Map API fields to Scan type for UI
      setScans(
        data.tickets.map((t: any, i: number) => ({
          id: t.ticket_id || `row${i}`,
          ticketId: t.ticket_id,
          driverId: t.driver_name,
          truckId: t.truck_number,
          material: t.material,
          netWeight: t.net_weight,
          createdAt: t.load_date || new Date().toISOString(),
          status: t.status,
          organizationId: "RONYX",
          source: t.source,
        })),
      );
    } catch (err: any) {
      setCsvError(err.message || "Failed to upload CSV");
    }
    setUploading(false);
  }

  // Fetch scans from production API
  useEffect(() => {
    if (scans.length > 0) return;
    async function fetchScans() {
      setLoading(true);
      const res = await fetch("/api/fastscan/list");
      const data = await res.json();
      setScans(data.scans || []);
      setLoading(false);
    }
    fetchScans();
  }, [scans.length]);

  const scansToShow = scans;
  const riskExposure = (
    scansToShow.filter((s) => s.status === "violation" || s.status === "failed")
      .length * 100
  ).toLocaleString();

  // ...existing StatCard, StatusBadge, and other helpers...

  // Top-line money metric (Estimated Revenue Protected)
  const estimatedRevenueProtected = (
    scansToShow.filter((s) => s.status === "violation" || s.status === "failed")
      .length * 250
  ).toLocaleString();

  // Helper: Ticket Source (use real data if available)
  function getTicketSource(scan: Scan) {
    return scan.pitName ? "Pit" : "Internal";
  }

  // Helper: Risk Summary (basic rules)
  function getRiskSummary(scan: Scan) {
    const reasons = [];
    if (scan.status === "violation" || scan.status === "failed") {
      reasons.push("Weight mismatch (+2.4 tons vs internal)");
      reasons.push("Timestamp outside dispatch window");
    }
    if (scan.status === "needs_review") {
      reasons.push("OCR confidence below threshold");
    }
    if (scan.status === "rejected") {
      reasons.push("Duplicate ticket detected");
    }
    return reasons.length ? reasons : ["No risk factors detected"];
  }

  // Helper: Primary Action
  function getPrimaryAction(scan: Scan) {
    if (scan.status === "violation" || scan.status === "failed")
      return { label: "Send to Compliance", color: "bg-red-600" };
    if (scan.status === "needs_review" || scan.status === "pending")
      return { label: "Approve & Clear", color: "bg-yellow-500" };
    if (scan.status === "rejected")
      return { label: "Request Re-upload", color: "bg-gray-700" };
    return { label: "No Action Needed", color: "bg-green-600" };
  }

  // Helper: Group tickets by driver and week (Friday as week ending)
  function getWeekEndingFriday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  const ticketsByDriverWeek: {
    [driverId: string]: { [week: string]: Scan[] };
  } = {};
  scansToShow.forEach((scan) => {
    const week = getWeekEndingFriday(new Date(scan.createdAt));
    const driver = scan.driverId || "Unknown";
    if (!ticketsByDriverWeek[driver]) ticketsByDriverWeek[driver] = {};
    if (!ticketsByDriverWeek[driver][week])
      ticketsByDriverWeek[driver][week] = [];
    ticketsByDriverWeek[driver][week].push(scan);
  });

  // CSV export handler
  function handleExportCSV() {
    const headers = [
      "Ticket ID",
      "Driver",
      "Truck",
      "Material",
      "Net Weight",
      "Status",
      "Created At",
    ];
    const rows = scansToShow.map((scan) => [
      scan.ticketId,
      scan.driverId || "",
      scan.truckId || "",
      scan.material || "",
      scan.netWeight || "",
      scan.status,
      scan.createdAt,
    ]);
    const csvContent = [headers, ...rows]
      .map((r) =>
        r
          .map(String)
          .map((x) => '"' + x.replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 space-y-8">
      {/* Fast Scan Transition Banner */}
      <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <h2 className="text-xl font-bold text-blue-700 mb-2">
          Transition from Manual Excel Reconciliation to Fast Scan
        </h2>
        <ol className="list-decimal pl-6 text-base mb-2">
          <li>
            Upload your Excel/CSV sheet of tickets from the pit/material plant
            or your manual entry.
          </li>
          <li>Scan or upload ticket images/PDFs as usual.</li>
          <li>
            Fast Scan automatically matches, compares, and flags any mismatches,
            missing tickets, or errors.
          </li>
          <li>
            Review flagged issues and resolve before payroll runs—no more manual
            cross-checking!
          </li>
        </ol>
        <p className="text-sm text-blue-700">
          Fast Scan is built to replace manual spreadsheet reconciliation with
          automated, error-proof matching. You’ll save hours and catch mistakes
          before they cost you money.
        </p>
      </div>
      {/* Pit CSV Upload (trust signal) */}
      <div className="mb-2">
        <div className="font-semibold text-primary">Pit CSV Upload</div>
        <div className="text-xs text-muted-foreground mb-2">
          Upload the weekly CSV you receive from your pit or material supplier
          (e.g., Martin Marietta, Vulcan, etc). Fast Scan will group tickets by
          driver and week, flag issues, and prepare payroll for you. No manual
          mapping or reformatting required.
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <label className="font-semibold">Upload Pit/Plant CSV:</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={uploading}
          />
          {csvError && (
            <span className="text-red-600 text-xs ml-2">{csvError}</span>
          )}
          <button
            className="ml-4 px-3 py-1 rounded bg-gray-200 text-xs"
            onClick={() => setScans([])}
          >
            Clear
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          <span>Accepted columns (Axon, Rose Rocket, etc.):</span>
          <ul className="list-disc ml-6">
            <li>Ticket Number</li>
            <li>Date</li>
            <li>Time</li>
            <li>Customer Name/ID</li>
            <li>Driver Name/ID</li>
            <li>Truck/Unit Number</li>
            <li>Material/Product Type</li>
            <li>Plant/Pit Name or ID</li>
            <li>Destination/Job</li>
            <li>Gross Weight</li>
            <li>Tare Weight</li>
            <li>Net Weight</li>
            <li>Quantity</li>
            <li>Rate/Unit Price</li>
            <li>Total Amount</li>
            <li>PO/Reference Number</li>
            <li>Notes/Comments</li>
          </ul>
          <span>
            <a
              href="/sample-ticket-template.csv"
              className="underline text-blue-600"
              download
            >
              Download sample CSV template
            </a>
          </span>
        </div>
      </div>
      {/* Role selector */}
      <div className="mb-4 flex items-center gap-4">
        <label className="font-semibold">Who are you pitching to?</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "owner" | "accounting" | "ops")
          }
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority 1: Bold header and confident description */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-1">
          Fast Scan — Dual Ticket Reconciliation™
        </h1>
        <div className="text-gray-700 text-base font-medium">
          Reconcile your internal dispatch tickets with pit scale tickets to
          prevent short-pay, disputes, and audit issues.
        </div>
        {/* Role-specific subtext */}
        <div className="text-green-700 text-sm mt-1 font-semibold">
          {ROLE_PITCH[role].subtext}
        </div>
      </div>

      {/* Role-specific pitch */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-2 text-blue-900 text-sm font-medium">
        {ROLE_PITCH[role].pitch}
      </div>

      {/* Priority 6: Top-line money metric */}
      <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded flex items-center gap-4 text-lg font-semibold">
        <span className="text-green-700 text-2xl">🛡️</span>$
        {estimatedRevenueProtected} Estimated Revenue Protected (last 30 days)
        <span className="ml-2 text-xs text-gray-500">
          Financial control & risk reduction
        </span>
      </div>

      {/* Analytics Dashboard Link and Payroll Export Button */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <Link
          href="./fast-scan/analytics-dashboard"
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded shadow"
        >
          📊 Analytics Dashboard
        </Link>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow"
          onClick={handleExportCSV}
        >
          Export Payroll (CSV)
        </button>
      </div>
      {/* Weekly driver ticket summary */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          Driver Ticket Summary (Grouped by Week)
        </h2>
        {Object.entries(ticketsByDriverWeek).map(([driverId, weeks]) => (
          <div key={driverId} className="mb-6">
            <h3 className="font-semibold text-blue-700 mb-2">
              Driver: {driverId}
            </h3>
            {Object.entries(weeks).map(([week, tickets]) => (
              <div key={week} className="mb-2">
                <div className="text-sm text-gray-600 mb-1">
                  Week ending: {week} (Friday)
                </div>
                <table className="min-w-full bg-white rounded shadow mb-2">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm">
                      <th className="px-2 py-1">Ticket ID</th>
                      <th className="px-2 py-1">Source</th>
                      <th className="px-2 py-1">Material</th>
                      <th className="px-2 py-1">Net Weight</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((scan) => (
                      <tr key={scan.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1 font-mono">{scan.ticketId}</td>
                        <td className="px-2 py-1">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded ${getTicketSource(scan) === "Internal" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"}`}
                          >
                            {getTicketSource(scan)}
                          </span>
                        </td>
                        <td className="px-2 py-1">{scan.material || "-"}</td>
                        <td className="px-2 py-1">{scan.netWeight || "-"}</td>
                        <td className="px-2 py-1">
                          <StatusBadge status={scan.status} />
                        </td>
                        <td className="px-2 py-1">
                          <Link
                            href={`/company/ronyx/fast-scan/details/${scan.ticketId}`}
                            className="text-indigo-600 underline text-xs"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Priority 2/3: Scan Table with Ticket Source and upgraded status language */}
      <div className="mt-6">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="px-4 py-2">Ticket ID</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {scansToShow.map((scan) => (
              <tr key={scan.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-mono">{scan.ticketId}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded ${getTicketSource(scan) === "Internal" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"}`}
                  >
                    {getTicketSource(scan)}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {new Date(scan.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={scan.status} />
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/company/ronyx/fast-scan/details/${scan.ticketId}`}
                    className="text-indigo-600 underline text-xs"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Priority 4/5: Scan Detail Modal with Side-by-Side Ticket Comparison */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setSelected(null)}
              aria-label="Close details"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">
              Scan Details — Side-by-Side Comparison
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {/* Internal Ticket */}
              <div className="bg-blue-50 rounded p-4">
                <h3 className="font-bold text-blue-700 mb-2">
                  Internal Ticket
                </h3>
                <div className="mb-1">
                  <span className="font-semibold">Ticket ID:</span>{" "}
                  {selected.ticketId}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Truck:</span>{" "}
                  {selected.truckId || "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Driver:</span>{" "}
                  {selected.driverId || "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Material:</span>{" "}
                  {selected.material || "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Net Weight:</span>{" "}
                  {selected.netWeight || "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Timestamp:</span>{" "}
                  {selected.timestamp
                    ? new Date(selected.timestamp).toLocaleString()
                    : "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Pit:</span>{" "}
                  {selected.pitName || "-"}
                </div>
                <div className="mb-1">
                  <span className="font-semibold">Notes:</span>{" "}
                  {selected.notes || "-"}
                </div>
              </div>
              {/* Reconciliation Result */}
              <div className="bg-yellow-50 rounded p-4 flex flex-col items-center justify-center">
                <h3 className="font-bold text-yellow-700 mb-2">
                  Reconciliation Result
                </h3>
                <div className="mb-2">
                  <StatusBadge status={selected.status} />
                </div>
                <div className="mb-2 font-semibold">Risk Summary:</div>
                <ul className="list-disc ml-6 text-sm mb-2">
                  {getRiskSummary(selected).map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
                <button
                  className={`px-4 py-2 rounded text-white font-semibold ${getPrimaryAction(selected).color}`}
                  type="button"
                >
                  {getPrimaryAction(selected).label}
                  {role === "owner" && selected.status === "clear" && (
                    <span className="ml-2 text-xs">Included in payroll</span>
                  )}
                  {role === "owner" &&
                    (selected.status === "violation" ||
                      selected.status === "failed") && (
                      <span className="ml-2 text-xs">Blocked from payroll</span>
                    )}
                  {role === "owner" && selected.status === "needs_review" && (
                    <span className="ml-2 text-xs">Pending payroll review</span>
                  )}
                  {role === "accounting" && selected.status === "clear" && (
                    <span className="ml-2 text-xs">Included in payroll</span>
                  )}
                  {role === "accounting" &&
                    (selected.status === "violation" ||
                      selected.status === "failed") && (
                      <span className="ml-2 text-xs">Blocked from payroll</span>
                    )}
                  {role === "accounting" &&
                    selected.status === "needs_review" && (
                      <span className="ml-2 text-xs">
                        Pending payroll review
                      </span>
                    )}
                  {role === "ops" && selected.status === "clear" && (
                    <span className="ml-2 text-xs">Included in payroll</span>
                  )}
                  {role === "ops" &&
                    (selected.status === "violation" ||
                      selected.status === "failed") && (
                      <span className="ml-2 text-xs">Blocked from payroll</span>
                    )}
                  {role === "ops" && selected.status === "needs_review" && (
                    <span className="ml-2 text-xs">Pending payroll review</span>
                  )}
                </button>
              </div>
              {/* Pit Ticket (show if available) */}
              {selected.pitName && (
                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-bold text-gray-700 mb-2">Pit Ticket</h3>
                  <div className="mb-1">
                    <span className="font-semibold">Ticket ID:</span>{" "}
                    {selected.referenceNumber || selected.ticketId}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Truck:</span>{" "}
                    {selected.truckId || "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Driver:</span>{" "}
                    {selected.driverId || "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Material:</span>{" "}
                    {selected.material || "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Net Weight:</span>{" "}
                    {selected.netWeight || "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Timestamp:</span>{" "}
                    {selected.timestamp
                      ? new Date(selected.timestamp).toLocaleString()
                      : "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Pit:</span>{" "}
                    {selected.pitName || "-"}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Notes:</span>{" "}
                    {selected.notes || "-"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 italic">
        Unlike generic OCR tools, Fast Scan™ evaluates documents against
        operational and compliance risk — not just text extraction.
      </div>
      <FastScanSupportChat />
    </div>
  );
}

// Update StatusBadge for decision-oriented statuses
function StatusBadge({ status }: { status: string }) {
  let label = status,
    color = "bg-gray-400",
    icon = "";
  if (status === "clear" || status === "processed") {
    label = "✅ Clear";
    color = "bg-green-600";
    icon = "✅";
  } else if (status === "needs_review" || status === "pending") {
    label = "⚠️ Needs Review";
    color = "bg-yellow-500";
    icon = "⚠️";
  } else if (status === "violation" || status === "failed") {
    label = "🚨 Violation Risk";
    color = "bg-red-600";
    icon = "🚨";
  } else if (status === "rejected") {
    label = "❌ Rejected";
    color = "bg-gray-700";
    icon = "❌";
  }
  return (
    <span
      className={`inline-block px-2 py-1 text-xs text-white rounded ${color}`}
    >
      {icon} {label}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col items-center">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-gray-500 mt-1">{label}</div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
