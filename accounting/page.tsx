"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";

export default function AccountingPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Accounting</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>
            Track inbound and outbound cash flow with supported methods: Cash,
            Zelle, Venmo, Cash App, Check.
          </p>
          <p>Syncs with Payroll and Invoices for total profit reporting.</p>
        </CardContent>
      </Card>
    </div>
  );
}
