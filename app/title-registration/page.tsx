"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TitleRegistrationPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Title & Registration</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>Store title documents and Unified Carrier Registration (UCR) details.</p>
          <p>Renewal and expiration reminders displayed on dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}