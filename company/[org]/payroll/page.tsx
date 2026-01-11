"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import {
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function PayrollHome({ params }: any) {
  const company = params.company;
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/company/${company}/payroll/weeks`);
      const json = await res.json();
      setWeeks(json);
      setLoading(false);
    }
    load();
  }, [company]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Control Center" />

      <Card>
        <h2 className="font-semibold text-xl mb-4">Payroll Weeks</h2>
        {loading ? (
          <p>Loading...</p>
        ) : weeks.length === 0 ? (
          <p className="text-gray-500">No payroll weeks found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {weeks.map((week: any) => (
              <Link
                key={week.id}
                href={`/company/${company}/payroll/${week.id}`}
                className="block"
              >
                <Card className="p-6 hover:bg-gray-50 cursor-pointer flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Calendar className="w-4 h-4" />
                    {week.week_start} — {week.week_end}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-bold">
                      ${week.total_pay?.toLocaleString() ?? "--"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-600">
                      {week.exception_count} Exception
                      {week.exception_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
