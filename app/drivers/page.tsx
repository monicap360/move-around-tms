"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function DriversPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Driver Profiles</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>Upload front/back of CDL, TWIC, ID, and MVR. Track license, medical, and certification expirations.</p>
          <p>Store W-2/1099 status, pay rate, start date, and contact details.</p>
          <p>Receive automated alerts 30 days before any document expires.</p>
        </CardContent>
      </Card>
    </div>
  );
}
