"use client";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";

export default function MaintenancePage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>Log repairs, part replacements, and service intervals for each truck.</p>
          <p>Generate work orders and assign to mechanics; track costs and downtime.</p>
          <p>Automatically schedule next inspection or oil change based on mileage.</p>
          <a
            href="/maintenance/dvir"
            className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold text-lg"
          >
            Fill Out Driver Vehicle Inspection Report (DVIR)
          </a>
          <a
            href="/maintenance/dvir-dashboard"
            className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded shadow hover:bg-green-700 font-semibold text-lg ml-4"
          >
            View DVIR Dashboard
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
