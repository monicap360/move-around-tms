"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Reports & Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>View revenue, expense, fuel-cost-per-mile, and profit analytics.</p>
          <p>Visual charts for IFTA trends, maintenance cost, and driver performance.</p>
          <p>Export to PDF/CSV for management review.</p>
        </CardContent>
      </Card>
    </div>
  )
}
