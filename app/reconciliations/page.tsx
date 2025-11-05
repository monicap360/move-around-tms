"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ReconciliationsPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Ticket Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>Upload vendor CSV files (Martin Marietta, CEMEX, S-5, Train) for comparison with scanned tickets.</p>
          <p>Automatically match ticket numbers, dates, truck IDs, and flag any rate discrepancies.</p>
          <p>Generate reconciliation summary and export to Excel/PDF.</p>
        </CardContent>
      </Card>
    </div>
  );
}