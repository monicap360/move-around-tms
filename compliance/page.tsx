"use client";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Link from "next/link";
import { FileText, Shield, AlertTriangle, DollarSign } from "lucide-react";

export default function CompliancePage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Compliance & IFTA
          </h1>
          <p className="text-gray-600 mt-1">
            Manage DOT compliance, IFTA fuel tax reporting, and regulatory
            requirements
          </p>
        </div>
        <Link href="/admin/compliance">
          <Button className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            View Alerts
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/ifta">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="font-semibold">IFTA Reporting</p>
                  <p className="text-sm text-gray-500">
                    Quarterly fuel tax filings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/compliance">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold">Compliance Tracker</p>
                  <p className="text-sm text-gray-500">
                    UCR, insurance, DOT compliance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/violations">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-semibold">DOT Inspections</p>
                  <p className="text-sm text-gray-500">Violations & alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/review-docs">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-semibold">Document Review</p>
                  <p className="text-sm text-gray-500">Expiring certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-purple-500" />
              IFTA Fuel Tax Reporting
            </h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p>
                📊 <strong>Quarterly Filing:</strong> Q1 (Jan-Mar), Q2
                (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
              </p>
              <p>
                🚛 <strong>Trip Tracking:</strong> Automatically calculates
                miles per jurisdiction from ELD data
              </p>
              <p>
                ⛽ <strong>Fuel Purchases:</strong> Import fuel receipts and
                match to jurisdictions
              </p>
              <p>
                📄 <strong>Texas IFTA Reports:</strong> Generate PDFs ready for
                filing with state authorities
              </p>
              <p>
                💡 <strong>Tax Calculation:</strong> Computes taxable gallons,
                rates, and net tax due/refund by state
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              DOT & Regulatory Compliance
            </h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p>
                <strong>UCR Registration:</strong> Unified Carrier Registration
                annual renewal tracking
              </p>
              <p>
                🛡️ <strong>Insurance Certificates:</strong> Liability, cargo,
                and worker's comp coverage tracking
              </p>
              <p>
                🚨 <strong>DOT Inspections:</strong> Monitor Level 1-6
                inspections and violation history
              </p>
              <p>
                ⏰ <strong>Expiration Alerts:</strong> 30/60/90 day warnings for
                expiring documents and certifications
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
