"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import { DollarSign, AlertTriangle, User, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PayrollWeekDetail({ params }: any) {
  const company = params.company;
  const weekId = params.week;
  const [week, setWeek] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/company/${company}/payroll/${weekId}`);
      const json = await res.json();
      setWeek(json.week);
      setEntries(json.entries);
      setLoading(false);
    }
    load();
  }, [company, weekId]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Payroll Week: ${week?.week_start} — ${week?.week_end}`}/>

      <Link href={`/company/${company}/payroll`} className="inline-flex items-center text-blue-600 mb-2">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Payroll Weeks
      </Link>

      {loading ? (
        <Card>Loading...</Card>
      ) : !week ? (
        <Card>Payroll week not found.</Card>
      ) : (
        <>
          <Card className="flex flex-col md:flex-row gap-6 justify-between items-center">
            <div>
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold">Total Pay:</span>
                <span className="text-lg font-bold text-green-700">${week.total_pay?.toLocaleString() ?? '--'}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">Exceptions:</span>
                <span className="font-bold">{week.exception_count}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <User className="w-4 h-4" />
              <span className="font-semibold">Drivers:</span>
              <span className="font-bold">{week.driver_count}</span>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-xl mb-4">Payroll Entries</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-3 text-left">Driver</th>
                    <th className="p-3 text-left">Loads</th>
                    <th className="p-3 text-left">Tons</th>
                    <th className="p-3 text-left">Hours</th>
                    <th className="p-3 text-left">Hourly Pay</th>
                    <th className="p-3 text-left">Load Pay</th>
                    <th className="p-3 text-left">Ton Pay</th>
                    <th className="p-3 text-left">Yard Pay</th>
                    <th className="p-3 text-left">Deductions</th>
                    <th className="p-3 text-left">Total Pay</th>
                    <th className="p-3 text-left">Exceptions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-gray-500">No payroll entries found.</td>
                    </tr>
                  ) : (
                    entries.map((entry: any) => (
                      <tr key={entry.id} className="border-b">
                        <td className="p-3">{entry.driver_name}</td>
                        <td className="p-3">{entry.total_loads}</td>
                        <td className="p-3">{entry.total_tons}</td>
                        <td className="p-3">{entry.total_hours}</td>
                        <td className="p-3">${entry.hourly_pay?.toLocaleString() ?? '--'}</td>
                        <td className="p-3">${entry.load_pay?.toLocaleString() ?? '--'}</td>
                        <td className="p-3">${entry.ton_pay?.toLocaleString() ?? '--'}</td>
                        <td className="p-3">${entry.yard_pay?.toLocaleString() ?? '--'}</td>
                        <td className="p-3">${entry.deductions?.toLocaleString() ?? '--'}</td>
                        <td className="p-3 font-bold">${entry.total_pay?.toLocaleString() ?? '--'}</td>
                        <td className="p-3 text-red-600 font-semibold">{entry.exception_count || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
