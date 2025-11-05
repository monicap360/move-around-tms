"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { FileText, Upload, AlertCircle, Users, Calendar, Building, CheckCircle } from "lucide-react";

type DocumentStats = {
  totalDocuments: number;
  expiringCount: number;
  pendingReview: number;
  totalDrivers: number;
};

type RecentDocument = {
  id: string;
  doc_type: string;
  created_at: string;
  expiration_date: string | null;
  status: string;
  driver_name: string | null;
};

export default function HRPage() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get total drivers
      const { count: driverCount } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true });

      // Get total documents
      const { count: docCount } = await supabase
        .from("driver_documents")
        .select("*", { count: "exact", head: true });

      // Get expiring documents (next 60 days)
      const { count: expiringCount } = await supabase
        .from("driver_documents_expiring")
        .select("*", { count: "exact", head: true });

      // Get pending review count
      const { count: pendingCount } = await supabase
        .from("driver_documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending Manager Review");

      // Get recent documents
      const { data: recent } = await supabase
        .from("driver_documents")
        .select(`
          id,
          doc_type,
          created_at,
          expiration_date,
          status,
          drivers (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalDocuments: docCount || 0,
        expiringCount: expiringCount || 0,
        pendingReview: pendingCount || 0,
        totalDrivers: driverCount || 0,
      });

      setRecentDocs(
        (recent || []).map((doc: any) => ({
          id: doc.id,
          doc_type: doc.doc_type,
          created_at: doc.created_at,
          expiration_date: doc.expiration_date,
          status: doc.status,
          driver_name: doc.drivers?.name || "Unknown",
        }))
      );
    } catch (err) {
      console.error("Error loading HR data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading HR dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Human Resources</h1>
          <p className="text-gray-600 mt-1">Ronyx Logistics LLC - 3741 Graves Ave, Groves, Texas 77619</p>
        </div>
        <Link href="/hr/upload">
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Drivers</p>
                <p className="text-2xl font-bold">{stats?.totalDrivers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold">{stats?.totalDocuments || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.expiringCount || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingReview || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/hr/drivers">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage Drivers
            </Button>
          </Link>
          <Link href="/hr/onboarding">
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Driver Onboarding
            </Button>
          </Link>
          <Link href="/hr/performance">
            <Button variant="outline" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Performance Dashboard
            </Button>
          </Link>
          <Link href="/hr/reports">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Advanced Reports
            </Button>
          </Link>
          <Link href="/hr/compliance">
            <Button variant="outline" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              DOT Compliance
            </Button>
          </Link>
          <Link href="/hr/dvir-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              DVIR Dashboard
            </Button>
          </Link>
          <Link href="/driver/templates">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Onboarding Forms
            </Button>
          </Link>
          <Link href="/hr/upload">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New Document
            </Button>
          </Link>
          <Link href="/company-assets">
            <Button variant="outline" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Company Assets
            </Button>
          </Link>
          <Link href="/admin/hr-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              View All Documents
            </Button>
          </Link>
          <Link href="/admin/expiring-docs">
            <Button variant="outline" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Expiring Documents
            </Button>
          </Link>
          <Link href="/admin/review-docs">
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Review Pending Docs
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No documents yet. <Link href="/hr/upload" className="text-blue-600 underline">Upload your first document</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Document Type</th>
                    <th className="text-left p-3">Uploaded</th>
                    <th className="text-left p-3">Expires</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{doc.driver_name}</td>
                      <td className="p-3">{doc.doc_type}</td>
                      <td className="p-3">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        {doc.expiration_date
                          ? new Date(doc.expiration_date).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            doc.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "Denied"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
