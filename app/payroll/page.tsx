"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type PayrollRow = {
  driver_id: string;
  driver_name: string;
  employment_type: "W2" | "1099" | string;
  week_start_friday: string;
  week_end_thursday: string;
  total_tickets: number;
  approved_tickets: number;
  gross_pay: number;
  social_security_withholding: number;
  medicare_withholding: number;
  federal_tax_withholding: number;
  employer_social_security: number;
  employer_medicare: number;
  employer_futa: number;
  net_pay: number;
};

export default function PayrollPage() {
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");

  useEffect(() => {
    // Default to current Friday ISO date to match API
    if (!weekStart) setWeekStart(computeCurrentFridayISODate());
  }, [weekStart]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalDrivers += 1;
        acc.totalTickets += r.total_tickets || 0;
        acc.approvedTickets += r.approved_tickets || 0;
        acc.grossPay += r.gross_pay || 0;
        acc.netPay += r.net_pay || 0;
        acc.ssWithholding += r.social_security_withholding || 0;
        acc.medicareWithholding += r.medicare_withholding || 0;
        acc.federalWithholding += r.federal_tax_withholding || 0;
        acc.employerTaxes += (r.employer_social_security || 0) + (r.employer_medicare || 0) + (r.employer_futa || 0);
        return acc;
      },
      {
        totalDrivers: 0,
        totalTickets: 0,
        approvedTickets: 0,
        grossPay: 0,
        netPay: 0,
        ssWithholding: 0,
        medicareWithholding: 0,
        federalWithholding: 0,
        employerTaxes: 0,
      }
    );
  }, [rows]);

  async function loadPayroll() {
    setError("");
    setLoading(true);
    try {
      const url = new URL(window.location.origin + "/api/payroll");
      if (weekStart) url.searchParams.set("weekStart", weekStart);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load payroll");
      setRows(json.rows || []);
    } catch (e: any) {
      setError(e.message || "Failed to load payroll");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Payroll</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Token</label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Enter admin token"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Week Start (Friday)</label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadPayroll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto"
              >
                Load
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
          )}

          {/* Summary */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded border">
              <SummaryItem label="Drivers" value={summary.totalDrivers} />
              <SummaryItem label="Tickets" value={summary.totalTickets} />
              <SummaryItem label="Approved" value={summary.approvedTickets} />
              <SummaryItem label="Gross Pay" value={`$${summary.grossPay.toFixed(2)}`} />
              <SummaryItem label="Net Pay" value={`$${summary.netPay.toFixed(2)}`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-gray-500">No payroll data found for this week.</p>
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <Th>Driver</Th>
                <Th>Type</Th>
                <Th>Tickets</Th>
                <Th>Approved</Th>
                <Th>Gross Pay</Th>
                <Th>W2 Withholding</Th>
                <Th>Employer Taxes</Th>
                <Th>Net Pay</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.driver_id}-${r.week_start_friday}`} className="border-b hover:bg-gray-50">
                  <Td>{r.driver_name}</Td>
                  <Td>{r.employment_type}</Td>
                  <Td>{r.total_tickets}</Td>
                  <Td>{r.approved_tickets}</Td>
                  <Td>${r.gross_pay?.toFixed(2) ?? "0.00"}</Td>
                  <Td>
                    ${(r.social_security_withholding + r.medicare_withholding + r.federal_tax_withholding).toFixed(2)}
                  </Td>
                  <Td>
                    ${(r.employer_social_security + r.employer_medicare + r.employer_futa).toFixed(2)}
                  </Td>
                  <Td><span className="font-semibold">${r.net_pay?.toFixed(2) ?? "0.00"}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3">{children}</td>;
}

function computeCurrentFridayISODate(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0..6
  const iso = ((day + 6) % 7) + 1; // 1..7
  const daysToFriday = (5 - iso + 7) % 7;
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  friday.setUTCDate(friday.getUTCDate() + daysToFriday);
  return friday.toISOString().slice(0, 10);
}
