"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabaseClient";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  User,
  Truck,
  Download,
  Upload,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  Settings,
  BarChart,
} from "lucide-react";

interface ComplianceItem {
  id: string;
  driver_id: string;
  compliance_type: string;
  document_name: string;
  issue_date: string;
  expiration_date: string;
  issuing_authority: string;
  document_number: string;
  status: "active" | "expired" | "suspended" | "revoked" | "pending";
  verification_date: string;
  verified_by: string;
  audit_notes: string;
}

interface ComplianceStats {
  total_documents: number;
  active_count: number;
  expired_count: number;
  expiring_soon: number;
  pending_verification: number;
  compliance_rate: number;
}

interface RegulatoryItem {
  id: string;
  regulation_type: string;
  regulation_name: string;
  description: string;
  compliance_deadline: string;
  responsible_party: string;
  status: "pending" | "in_progress" | "compliant" | "non_compliant" | "overdue";
  last_audit_date: string;
  next_audit_date: string;
  penalty_amount: number;
}

export default function DOTComplianceDashboard() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [regulatoryItems, setRegulatoryItems] = useState<RegulatoryItem[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadComplianceData();
  }, []);

  async function loadComplianceData() {
    try {
      setLoading(true);

      // Load DOT compliance items
      const { data: complianceData, error: complianceError } = await supabase
        .from("dot_compliance")
        .select("*")
        .order("expiration_date", { ascending: true });

      if (complianceError) throw complianceError;

      // Load regulatory tracking items
      const { data: regulatoryData, error: regulatoryError } = await supabase
        .from("regulatory_tracking")
        .select("*")
        .order("compliance_deadline", { ascending: true });

      if (regulatoryError) throw regulatoryError;

      setComplianceItems(complianceData || []);
      setRegulatoryItems(regulatoryData || []);

      // Calculate statistics
      if (complianceData) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        );

        const activeCount = complianceData.filter(
          (item) => item.status === "active",
        ).length;
        const expiredCount = complianceData.filter(
          (item) =>
            item.status === "expired" || new Date(item.expiration_date) < now,
        ).length;
        const expiringSoon = complianceData.filter(
          (item) =>
            new Date(item.expiration_date) <= thirtyDaysFromNow &&
            new Date(item.expiration_date) > now,
        ).length;
        const pendingVerification = complianceData.filter(
          (item) => item.status === "pending",
        ).length;

        const complianceRate =
          complianceData.length > 0
            ? (activeCount / complianceData.length) * 100
            : 0;

        setStats({
          total_documents: complianceData.length,
          active_count: activeCount,
          expired_count: expiredCount,
          expiring_soon: expiringSoon,
          pending_verification: pendingVerification,
          compliance_rate: Math.round(complianceRate),
        });
      }
    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      expired: { color: "bg-red-100 text-red-800", icon: XCircle },
      suspended: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertTriangle,
      },
      revoked: { color: "bg-red-100 text-red-800", icon: XCircle },
      pending: { color: "bg-blue-100 text-blue-800", icon: Clock },
      compliant: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      non_compliant: { color: "bg-red-100 text-red-800", icon: XCircle },
      in_progress: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      overdue: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getComplianceTypeColor = (type: string) => {
    const typeColors = {
      CDL: "text-blue-600",
      Medical: "text-green-600",
      TWIC: "text-purple-600",
      HazMat: "text-red-600",
      "Drug Test": "text-orange-600",
      "Background Check": "text-indigo-600",
    };
    return typeColors[type as keyof typeof typeColors] || "text-gray-600";
  };

  const filteredCompliance = complianceItems.filter((item) => {
    const matchesSearch =
      item.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.compliance_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.document_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesType =
      typeFilter === "all" || item.compliance_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            DOT Compliance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive regulatory compliance tracking and audit readiness
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Audit Settings
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold">
                  {stats?.total_documents || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active/Compliant</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.active_count || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expired/Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.expired_count || 0}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.expiring_soon || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.compliance_rate || 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Compliance Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search documents, types, or numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Types</option>
              <option value="CDL">CDL License</option>
              <option value="Medical">DOT Medical</option>
              <option value="TWIC">TWIC Card</option>
              <option value="HazMat">HazMat Endorsement</option>
              <option value="Drug Test">Drug Testing</option>
              <option value="Background Check">Background Check</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            DOT Compliance Documents ({filteredCompliance.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompliance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No compliance documents found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Document Type</th>
                    <th className="text-left p-3">Document Name</th>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Document #</th>
                    <th className="text-left p-3">Issue Date</th>
                    <th className="text-left p-3">Expiration</th>
                    <th className="text-left p-3">Authority</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompliance.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        <span
                          className={`font-medium ${getComplianceTypeColor(item.compliance_type)}`}
                        >
                          {item.compliance_type}
                        </span>
                      </td>
                      <td className="p-3">{item.document_name}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          Driver {item.driver_id?.substring(0, 8)}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {item.document_number}
                      </td>
                      <td className="p-3">
                        {new Date(item.issue_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div
                          className={`${
                            new Date(item.expiration_date) < new Date()
                              ? "text-red-600 font-medium"
                              : new Date(item.expiration_date) <
                                  new Date(
                                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                                  )
                                ? "text-yellow-600 font-medium"
                                : ""
                          }`}
                        >
                          {new Date(item.expiration_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3 text-xs">{item.issuing_authority}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regulatory Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Regulatory Compliance Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {regulatoryItems.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No regulatory tracking items configured.</p>
                <Button className="mt-4" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Regulations
                </Button>
              </div>
            ) : (
              regulatoryItems.map((item) => (
                <Card key={item.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{item.regulation_name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.regulation_type}
                        </p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      {item.description}
                    </p>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Deadline:</span>
                        <span
                          className={
                            new Date(item.compliance_deadline) < new Date()
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {new Date(
                            item.compliance_deadline,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Responsible:</span>
                        <span>{item.responsible_party}</span>
                      </div>
                      {item.next_audit_date && (
                        <div className="flex justify-between">
                          <span>Next Audit:</span>
                          <span>
                            {new Date(
                              item.next_audit_date,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {item.penalty_amount > 0 && (
                        <div className="flex justify-between">
                          <span>Penalty:</span>
                          <span className="text-red-600 font-medium">
                            ${item.penalty_amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
