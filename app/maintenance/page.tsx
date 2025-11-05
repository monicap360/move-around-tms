"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

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
        </CardContent>
      </Card>
    </div>
  );
}