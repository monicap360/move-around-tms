"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  Shield,
  CreditCard,
  User,
  DollarSign,
  Truck
} from "lucide-react";

interface OnboardingRecord {
  id: string;
  driver_email: string;
  current_step: number;
  status: string;
  personal_info: any;
  employment_info: any;
  started_at: string;
  completed_at?: string;
}

interface DocumentRecord {
  id: string;
  driver_email: string;
  document_type: string;
  file_url: string;
  file_name: string;
  expiration_date?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  uploaded_at: string;
}

interface OnboardingStats {
  totalInProgress: number;
  completedThisMonth: number;
  pendingDocuments: number;
  expiredDocuments: number;
}

export default function HROnboardingDashboard() {
  const [onboardingRecords, setOnboardingRecords] = useState<OnboardingRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<OnboardingStats>({
    totalInProgress: 0,
    completedThisMonth: 0,
    pendingDocuments: 0,
    expiredDocuments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("onboarding");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOnboardingRecords(),
        loadDocuments(),
        loadStats()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOnboardingRecords = async () => {
    const { data, error } = await supabase
      .from("driver_onboarding")
      .select("*")
      .order("started_at", { ascending: false });

    if (!error && data) {
      setOnboardingRecords(data);
    }
  };

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("driver_onboarding_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
  };

  const loadStats = async () => {
    // Calculate stats from the loaded data
    const inProgress = onboardingRecords.filter(r => r.status === 'in_progress').length;
    
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const completedThisMonth = onboardingRecords.filter(r => 
      r.status === 'completed' && 
      r.completed_at && 
      new Date(r.completed_at) > thisMonth
    ).length;

    const pendingDocs = documents.filter(d => d.status === 'uploaded').length;

    const expiredDocs = documents.filter(d => 
      d.expiration_date && 
      new Date(d.expiration_date) < new Date()
    ).length;

    setStats({
      totalInProgress: inProgress,
      completedThisMonth,
      pendingDocuments: pendingDocs,
      expiredDocuments: expiredDocs
    });
  };

  const approveDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("driver_onboarding_documents")
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'HR' // In real app, get from auth context
        })
        .eq("id", docId);

      if (error) throw error;

      await loadDocuments();
      await loadStats();
      
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Failed to approve document");
    }
  };

  const rejectDocument = async (docId: string) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("driver_onboarding_documents")
        .update({
          status: 'rejected',
          rejection_reason: reason,
          approved_by: 'HR' // In real app, get from auth context
        })
        .eq("id", docId);

      if (error) throw error;

      await loadDocuments();
      await loadStats();
      
    } catch (error) {
      console.error("Error rejecting document:", error);
      alert("Failed to reject document");
    }
  };

  const getDocumentIcon = (docType: string) => {
    switch (docType) {
      case 'drivers_license':
        return <CreditCard className="w-4 h-4" />;
      case 'cdl_license':
        return <Truck className="w-4 h-4" />;
      case 'twic_card':
        return <Shield className="w-4 h-4" />;
      case 'social_security_card':
        return <User className="w-4 h-4" />;
      case 'w2_form':
      case 'form_1099':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return "bg-green-100 text-green-800";
      case 'in_progress':
      case 'uploaded':
        return "bg-yellow-100 text-yellow-800";
      case 'on_hold':
      case 'rejected':
        return "bg-red-100 text-red-800";
      case 'expired':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getProgressPercentage = (currentStep: number) => {
    return Math.round((currentStep / 4) * 100);
  };

  const formatDocumentType = (docType: string) => {
    return docType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredOnboarding = onboardingRecords.filter(record => {
    const matchesSearch = record.driver_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.driver_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formatDocumentType(doc.document_type).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Onboarding Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage driver onboarding and document verification</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{stats.totalInProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed This Month</p>
                <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Documents</p>
                <p className="text-2xl font-bold">{stats.pendingDocuments}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expired Documents</p>
                <p className="text-2xl font-bold">{stats.expiredDocuments}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by email or document type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="uploaded">Uploaded</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="space-y-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("onboarding")}
            className={`px-4 py-2 font-medium ${
              activeTab === "onboarding"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Onboarding Progress
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 font-medium ${
              activeTab === "documents"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Document Review
          </button>
        </div>

        {activeTab === "onboarding" && (
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredOnboarding.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No onboarding records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOnboarding.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold">{record.driver_email}</h3>
                            <p className="text-sm text-gray-600">
                              Started: {new Date(record.started_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(record.status)}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">Step {record.current_step} of 4</p>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${getProgressPercentage(record.current_step)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {record.personal_info && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Name:</span> {record.personal_info.fullName}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {record.personal_info.phone}
                          </div>
                        </div>
                      )}

                      {record.employment_info && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                          <div>
                            <span className="font-medium">Position:</span> {record.employment_info.position}
                          </div>
                          <div>
                            <span className="font-medium">Start Date:</span> {record.employment_info.startDate}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "documents" && (
          <Card>
            <CardHeader>
              <CardTitle>Document Review Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getDocumentIcon(doc.document_type)}
                          <div>
                            <h3 className="font-semibold">{formatDocumentType(doc.document_type)}</h3>
                            <p className="text-sm text-gray-600">{doc.driver_email}</p>
                            <p className="text-xs text-gray-500">
                              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>

                          {doc.expiration_date && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Expires</p>
                              <p className="text-sm font-medium">
                                {new Date(doc.expiration_date).toLocaleDateString()}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(doc.file_url, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>

                            {doc.status === 'uploaded' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveDocument(doc.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectDocument(doc.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {doc.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Rejection Reason:</span> {doc.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
