"use client";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function ViolationsPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Violations & Alerts</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 text-gray-700">
          <p>Upload citations, safety reports, and incident documents for review.</p>
          <p className="mt-2 text-sm text-gray-500">Future: link to audit trail and automated alerts.</p>
        </CardContent>
      </Card>
    </div>
  );
}
