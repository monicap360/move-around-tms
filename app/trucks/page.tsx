"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";

export default function TrucksPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Fleet / Trucks</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>
            Register each truck unit with VIN, plate, insurance, and inspection
            info.
          </p>
          <p>
            Upload title, insurance card, inspection slip, and note expiration
            dates.
          </p>
          <p>
            Integrates with Maintenance tab for part tracking and service logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
