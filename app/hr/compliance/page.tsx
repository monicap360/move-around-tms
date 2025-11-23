"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { 
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Gavel,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  Search,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  Award,
  Target
} from "lucide-react";

type ComplianceSummary = {
  totalDrivers: number;
  compliantDrivers: number;
  overdue: number;
  expiringSoon: number;
  overallComplianceRate: number;
  violations12Mo: number;
  criticalViolations: number;
  averageCsaScore: number;
};

type DriverCompliance = {
  driver_id: string;
  driver_name: string;
  employee_id: string;
  employment_status: string;
  compliance_rate: number;
  total_requirements: number;
  compliant_requirements: number;
  overdue_requirements: number;
  expiring_soon: number;
  violations_12mo: number;
  serious_violations_12mo: number;
  next_expiration_date: string | null;
};

type ComplianceAlert = {
  id: string;
  alert_type: string;
  priority: string;
  driver_name: string;
  employee_id: string;
  title: string;
  message: string;
  due_date: string | null;
  alert_date: string;
  acknowledged: boolean;
};

type AuditReadiness = {
  section: string;
  metric: string;
  value: string;
  status: string;
};

export default function CompliancePage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [driverCompliance, setDriverCompliance] = useState<DriverCompliance[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [auditReadiness, setAuditReadiness] = useState<AuditReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    loadComplianceData();
  }, []);

  async function loadComplianceData() {
    try {
      // Load compliance dashboard summary
      const { data: complianceData, error: complianceError } = await supabase
        .from("compliance_dashboard_summary")
        .select("*");

      if (!complianceError && complianceData) {
        setDriverCompliance(complianceData);
        
        // Calculate summary metrics
        const total = complianceData.length;
        const compliant = complianceData.filter((d: any) => d.compliance_rate >= 100).length;
        const overdue = complianceData.filter((d: any) => d.overdue_requirements > 0).length;
        const expiring = complianceData.filter((d: any) => d.expiring_soon > 0).length;
        const avgCompliance = total > 0 
          ? complianceData.reduce((sum: number, d: any) => sum + d.compliance_rate, 0) / total
          : 0;
        const totalViolations = complianceData.reduce((sum: number, d: any) => sum + (d.violations_12mo || 0), 0);
        const criticalViolations = complianceData.reduce((sum: number, d: any) => sum + (d.serious_violations_12mo || 0), 0);

        setSummary({
          totalDrivers: total,
          compliantDrivers: compliant,
          overdue,
          expiringSoon: expiring,
          overallComplianceRate: avgCompliance,
          violations12Mo: totalViolations,
          criticalViolations,
          averageCsaScore: 85.5 // Mock CSA score
        });
      }

      // Load compliance alerts (mock data for now)
      setAlerts([
        {
          id: "1",
          alert_type: "expiration_warning",
          priority: "high",
          driver_name: "John Smith",
          employee_id: "DRV-001",
          title: "Medical Certificate Expiring Soon",
          message: "DOT Medical Certificate expires in 5 days",
          due_date: "2024-11-05",
          alert_date: "2024-10-31",
          acknowledged: false
        },
        {
          id: "2",
          alert_type: "overdue",
          priority: "critical",
          driver_name: "Jane Doe",
          employee_id: "DRV-002",
          title: "Drug Test Overdue",
          message: "Random drug test is 3 days overdue",
          due_date: "2024-10-28",
          alert_date: "2024-10-31",
          acknowledged: false
        },
        {
          id: "3",
          alert_type: "violation",
          priority: "medium",
          driver_name: "Mike Johnson",
          employee_id: "DRV-003",
          title: "Traffic Violation Reported",
          message: "Speeding violation reported - CSA impact assessment needed",
          due_date: null,
          alert_date: "2024-10-30",
          acknowledged: true
        }
      ]);

      // Load audit readiness data
      const { data: auditData, error: auditError } = await supabase
        .from("audit_readiness_report")
        .select("*");

      if (!auditError && auditData) {
        setAuditReadiness(auditData);
      }

    } catch (err) {
      console.error("Error loading compliance data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    // In production, update the alert in Supabase
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  }

  async function generateComplianceReport() {
    // Generate and download compliance report
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary,
      driverCompliance: filteredDrivers,
      alerts: alerts.filter(a => !a.acknowledged),
      auditReadiness
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filteredDrivers = driverCompliance.filter(driver => {
    const matchesSearch = driver.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterBy === "compliant") matchesFilter = driver.compliance_rate >= 100;
    else if (filterBy === "overdue") matchesFilter = driver.overdue_requirements > 0;
    else if (filterBy === "expiring") matchesFilter = driver.expiring_soon > 0;
    else if (filterBy === "violations") matchesFilter = driver.violations_12mo > 0;
    
    return matchesSearch && matchesFilter;
  });

  function getComplianceColor(rate: number) {
    if (rate >= 100) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    if (rate >= 80) return 'text-orange-600';
    return 'text-red-600';
  }

  function getComplianceBadge(rate: number) {
    if (rate >= 100) return 'bg-green-100 text-green-800';
    if (rate >= 90) return 'bg-yellow-100 text-yellow-800';
    if (rate >= 80) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  function getAlertColor(priority: string) {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-blue-500" />;
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading compliance dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/hr">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">DOT Compliance Management</h1>
            <p className="text-gray-600 mt-1">Regulatory compliance tracking and audit readiness</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => loadComplianceData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={generateComplianceReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Shield },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
            { id: 'audit', label: 'Audit Readiness', icon: FileCheck },
            { id: 'violations', label: 'Violations', icon: Gavel }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {alerts.filter(a => !a.acknowledged).length}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Overall Compliance</p>
                    <p className={`text-2xl font-bold ${getComplianceColor(summary?.overallComplianceRate || 0)}`}>
                      {summary?.overallComplianceRate?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">{summary?.totalDrivers} drivers</p>
                  </div>
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Fully Compliant</p>
                    <p className="text-2xl font-bold text-green-600">{summary?.compliantDrivers}</p>
                    <p className="text-xs text-gray-500">
                      {summary?.totalDrivers ? ((summary.compliantDrivers / summary.totalDrivers) * 100).toFixed(0) : 0}% of fleet
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
                    <p className="text-sm text-gray-500">Overdue Items</p>
                    <p className="text-2xl font-bold text-red-600">{summary?.overdue}</p>
                    <p className="text-xs text-gray-500">Requiring immediate attention</p>
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
                    <p className="text-2xl font-bold text-yellow-600">{summary?.expiringSoon}</p>
                    <p className="text-xs text-gray-500">Next 30 days</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Driver Compliance Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Driver Compliance Status ({filteredDrivers.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search drivers..."
                      value={searchTerm}
                      onChange={(e: any) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterBy}
                    onChange={(e: any) => setFilterBy(e.target.value)}
                    className="border rounded-md px-3 py-2 bg-white text-sm"
                  >
                    <option value="all">All Drivers</option>
                    <option value="compliant">Fully Compliant</option>
                    <option value="overdue">Overdue Items</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="violations">Recent Violations</option>
                  </select>
                </div>
              </div>

              {/* Compliance Table */}
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No drivers found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3">Driver</th>
                        <th className="text-left p-3">Compliance Rate</th>
                        <th className="text-left p-3">Requirements</th>
                        <th className="text-left p-3">Issues</th>
                        <th className="text-left p-3">Next Expiration</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.map((driver) => (
                        <tr key={driver.driver_id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{driver.driver_name}</div>
                              <div className="text-gray-500 text-xs">ID: {driver.employee_id}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getComplianceBadge(driver.compliance_rate)}>
                              {driver.compliance_rate?.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-xs">
                              <div className="text-green-600">{driver.compliant_requirements} compliant</div>
                              <div className="text-gray-500">{driver.total_requirements} total</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {driver.overdue_requirements > 0 && (
                                <div className="flex items-center gap-1 text-red-600 text-xs">
                                  <XCircle className="w-3 h-3" />
                                  {driver.overdue_requirements} overdue
                                </div>
                              )}
                              {driver.expiring_soon > 0 && (
                                <div className="flex items-center gap-1 text-yellow-600 text-xs">
                                  <Clock className="w-3 h-3" />
                                  {driver.expiring_soon} expiring
                                </div>
                              )}
                              {driver.violations_12mo > 0 && (
                                <div className="flex items-center gap-1 text-orange-600 text-xs">
                                  <AlertTriangle className="w-3 h-3" />
                                  {driver.violations_12mo} violations
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {driver.next_expiration_date ? (
                              <div className="text-xs">
                                {new Date(driver.next_expiration_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Compliance Alerts ({alerts.filter(a => !a.acknowledged).length} active)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-lg p-4 ${alert.acknowledged ? 'opacity-50' : ''} ${getAlertColor(alert.priority)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${alert.priority === 'critical' ? 'border-red-500' : ''}`}>
                          {alert.priority}
                        </Badge>
                        {!alert.acknowledged && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{alert.driver_name} (ID: {alert.employee_id})</span>
                      <span>
                        {alert.due_date && `Due: ${new Date(alert.due_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                DOT Audit Readiness Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {auditReadiness.reduce((acc: any, item) => {
                  if (!acc[item.section]) acc[item.section] = [];
                  acc[item.section].push(item);
                  return acc;
                }, {}) && Object.entries(
                  auditReadiness.reduce((acc: any, item) => {
                    if (!acc[item.section]) acc[item.section] = [];
                    acc[item.section].push(item);
                    return acc;
                  }, {})
                ).map(([section, items]: [string, any]) => (
                  <div key={section}>
                    <h3 className="font-medium text-lg mb-3">{section}</h3>
                    <div className="space-y-2">
                      {items.map((item: AuditReadiness, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm">{item.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${getStatusColor(item.status)}`}>
                              {item.value}
                            </span>
                            {getStatusIcon(item.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5" />
                Compliance Violations (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Violations management system</p>
                <p className="text-sm text-gray-400">Track DOT violations, fines, and CSA impact</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Report Violation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
