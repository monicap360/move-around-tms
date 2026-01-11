"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

type PayrollRow = {
  driver_id: string;
  driver_name: string;
  driver_suffix: string | null;
  driver_dob: string | null;
  driver_license: string | null;
  pay_day: string;
  tickets_count: number;
  total_driver_pay: number;
  profit_margin: number;
  approved_count: number;
  voided_count: number;
  pending_count: number;
  all_void: boolean;
};

export default function PayrollPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");

  // Compute summary from rows
  const summary =
    rows.length > 0
      ? {
          totalDrivers: rows.length,
          totalTickets: rows.reduce(
            (sum, r) => sum + (r.tickets_count || 0),
            0,
          ),
          approvedTickets: rows.reduce(
            (sum, r) => sum + (r.approved_count || 0),
            0,
          ),
          grossPay: rows.reduce((sum, r) => sum + (r.total_driver_pay || 0), 0),
          netPay: rows.reduce((sum, r) => sum + (r.total_driver_pay || 0), 0), // Adjust if you have net pay logic
        }
      : {
          totalDrivers: 0,
          totalTickets: 0,
          approvedTickets: 0,
          grossPay: 0,
          netPay: 0,
        };

  useEffect(() => {
    if (!weekStart) setWeekStart(computeCurrentFridayISODate());
  }, [weekStart]);

  useEffect(() => {
    if (weekStart) loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function loadPayroll() {
    setError("");
    setLoading(true);
    try {
      let query = supabase.from("vw_weekly_payroll").select("*");
      if (weekStart) {
        query = query.eq("pay_day", weekStart);
      }
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load payroll");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        Payroll
      </h1>
      <p style={{ fontSize: 20, color: "#475569", marginBottom: 32 }}>
        Manage driver pay, tickets, and payroll reports.
      </p>
      <div
        style={{
          background: "#e0e7ef",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
          padding: 32,
          minWidth: 340,
          minHeight: 180,
          width: "100%",
          maxWidth: 1200,
          marginBottom: 24,
        }}
      >
        {/* Header */}
        <Card className="shadow-lg border bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardTitle>Payroll</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Week (Friday)
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Summary */}
            {rows.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded border">
                <SummaryItem label="Drivers" value={summary.totalDrivers} />
                <SummaryItem label="Tickets" value={summary.totalTickets} />
                <SummaryItem label="Approved" value={summary.approvedTickets} />
                <SummaryItem
                  label="Gross Pay"
                  value={`$${summary.grossPay.toFixed(2)}`}
                />
                <SummaryItem
                  label="Net Pay"
                  value={`$${summary.netPay.toFixed(2)}`}
                />
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
                  <Th>Suffix</Th>
                  <Th>License</Th>
                  <Th>Tickets</Th>
                  <Th>Approved</Th>
                  <Th>Voided</Th>
                  <Th>Pay</Th>
                  <Th>Profit</Th>
                  <Th>All Voided</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.driver_id}-${r.pay_day}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <Td>{r.driver_name}</Td>
                    <Td>{r.driver_suffix ?? ""}</Td>
                    <Td>{r.driver_license ?? ""}</Td>
                    <Td>{r.tickets_count}</Td>
                    <Td>{r.approved_count}</Td>
                    <Td>{r.voided_count}</Td>
                    <Td>${r.total_driver_pay?.toFixed(2) ?? "0.00"}</Td>
                    <Td>${r.profit_margin?.toFixed(2) ?? "0.00"}</Td>
                    <Td>{r.all_void ? "Yes" : "No"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <footer style={{ color: "#94a3b8", fontSize: 14, marginTop: 40 }}>
        © {new Date().getFullYear()} Move Around TMS
      </footer>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3">{children}</td>;
}

function computeCurrentFridayISODate(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0..6
  const iso = ((day + 6) % 7) + 1; // 1..7
  const daysToFriday = (5 - iso + 7) % 7;
  const friday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  friday.setUTCDate(friday.getUTCDate() + daysToFriday);
  return friday.toISOString().slice(0, 10);
}
