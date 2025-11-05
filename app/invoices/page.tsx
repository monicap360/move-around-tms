"use client";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";

export default function InvoicesPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>
            View and manage all billing and invoice history. Approve drafts,
            send invoices, and mark payments received.
          </p>
          <p className="text-sm text-gray-500">
            Next: auto-generated PDF invoices with payment tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
