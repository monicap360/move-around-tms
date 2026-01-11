import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import Link from "next/link";
import {
  Upload,
  FileText,
  TrendingUp,
  FileEdit,
  Settings,
  Receipt,
  Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AggregatesPage() {
  // Create Supabase client for server-side authentication
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  // Check authentication
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    redirect("/login");
  }
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Aggregates</h1>
          <p className="text-gray-600 mt-1">
            Manage tickets, quotes, invoices, material rates, and profit reports
          </p>
        </div>
        <Link href="/aggregates/upload">
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Ticket
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/aggregates/upload">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Upload className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold">Upload Ticket</p>
                  <p className="text-sm text-gray-500">Scan with OCR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/review-tickets">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-semibold">Review Tickets</p>
                  <p className="text-sm text-gray-500">Approve pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/aggregates/profit-reports">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="font-semibold">Profit Reports</p>
                  <p className="text-sm text-gray-500">
                    Revenue vs Pay, margins
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/aggregates/quotes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileEdit className="w-8 h-8 text-indigo-500" />
                <div>
                  <p className="font-semibold">Quote Management</p>
                  <p className="text-sm text-gray-500">Create & send quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/material-rates">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-gray-500" />
                <div>
                  <p className="font-semibold">Material Rates</p>
                  <p className="text-sm text-gray-500">Manage pricing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/aggregates/quote-requests">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-semibold">Quote Requests</p>
                  <p className="text-sm text-gray-500">
                    Reply with email drafts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/aggregates/invoices">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Receipt className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="font-semibold">Invoices</p>
                  <p className="text-sm text-gray-500">
                    Create & download branded PDFs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Ticket Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-700">
          <p>
            📸 <strong>Upload any scanner output:</strong> Take photos with your
            phone or upload PDFs from document scanners
          </p>
          <p>
            🤖 <strong>AI-powered OCR:</strong> Automatically extracts partner,
            material, quantity, ticket number, and driver
          </p>
          <p>
            💰 <strong>Auto-calculation:</strong> System calculates pay based on
            partner rates and material types
          </p>
          <p>
            ✅ <strong>Manager review:</strong> All tickets go to "Pending
            Manager Review" for approval before payroll
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
