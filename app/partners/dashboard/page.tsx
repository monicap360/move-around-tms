"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRoleBasedAuth } from "../../lib/role-auth";
import { exportNodeAsPng } from "../../maintenance/dvir-dashboard/exportAsImage";
import { createClient } from "@/lib/supabase/client";
import ComplianceCalendar from "./ComplianceCalendar";
// Supabase client for compliance reminders/notifications
const supabase = createClient();
// Mock compliance reminders (replace with Supabase query)
function generateComplianceReminders() {
  return [
    {
      id: 1,
      company: "ABC Transport Co.",
      type: "Document Expiry",
      due: "2026-01-15",
      status: "Pending",
    },
    {
      id: 2,
      company: "XYZ Logistics",
      type: "Driver Medical",
      due: "2026-01-20",
      status: "Pending",
    },
    {
      id: 3,
      company: "Elite Hauling",
      type: "Insurance Renewal",
      due: "2026-01-25",
      status: "Sent",
    },
  ];
}
// Compliance analytics data loader
async function loadComplianceTrends(supabaseClient: ReturnType<typeof createClient>, orgIds: string[]) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Initialize 30 days of data
  const trendData: { [key: string]: { compliant: number; noncompliant: number } } = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - i));
    trendData[date.toISOString().slice(0, 10)] = { compliant: 0, noncompliant: 0 };
  }

  if (orgIds.length === 0) {
    return Object.entries(trendData).map(([date, data]) => ({
      date,
      compliant: data.compliant,
      noncompliant: data.noncompliant,
      total: data.compliant + data.noncompliant,
    }));
  }

  try {
    // Get compliance notifications (issues/violations)
    const { data: notifications } = await supabaseClient
      .from("compliance_notifications")
      .select("created_at, resolved")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Count notifications by date
    (notifications || []).forEach((notification: { created_at: string; resolved: boolean }) => {
      const date = notification.created_at.slice(0, 10);
      if (trendData[date]) {
        if (notification.resolved) {
          trendData[date].compliant++;
        } else {
          trendData[date].noncompliant++;
        }
      }
    });

    // Get driver documents with expiration tracking
    const { data: documents } = await supabaseClient
      .from("driver_documents")
      .select("created_at, status, expiration_date")
      .in("organization_id", orgIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Count documents by date and status
    (documents || []).forEach((doc: { created_at: string; status: string; expiration_date: string | null }) => {
      const date = doc.created_at.slice(0, 10);
      if (trendData[date]) {
        if (doc.status === "approved" || doc.status === "valid") {
          trendData[date].compliant++;
        } else if (doc.status === "expired" || doc.status === "rejected") {
          trendData[date].noncompliant++;
        }
      }
    });
  } catch (error) {
    console.error("Error loading compliance trends:", error);
  }

  return Object.entries(trendData).map(([date, data]) => ({
    date,
    compliant: data.compliant,
    noncompliant: data.noncompliant,
    total: data.compliant + data.noncompliant,
  }));
}

interface PartnerTheme {
  brand: string;
  primary: string;
  secondary: string;
  background: string;
  accent?: string;
  text: {
    primary: string;
    secondary: string;
    light: string;
  };
  logo: string;
  tagline: string;
  navigation: {
    background: string;
    text: string;
    hover: string;
  };
  cards: {
    background: string;
    border: string;
    shadow: string;
  };
  buttons: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
  };
}

interface DashboardStats {
  companiesOnboarded: number;
  activeDrivers: number;
  hrUploads: number;
  monthlyCommission: number;
  totalReferrals: number;
  pendingApprovals: number;
}

export default function PartnerDashboard() {
  const { user, profile, partnerInfo, loading } = useRoleBasedAuth();
  const [theme, setTheme] = useState<PartnerTheme | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    companiesOnboarded: 0,
    activeDrivers: 0,
    hrUploads: 0,
    monthlyCommission: 0,
    totalReferrals: 0,
    pendingApprovals: 0,
  });

  // Compliance analytics state
  const [complianceTrends, setComplianceTrends] = useState([]);
  const complianceSectionRef = useRef<HTMLDivElement>(null);
  // Compliance reminders/notifications state
  const [complianceReminders, setComplianceReminders] = useState([]);
  const [reminderLoading, setReminderLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (partnerInfo?.theme) {
        setTheme(partnerInfo.theme as PartnerTheme);
        loadPartnerStats();
        loadComplianceReminders();
        
        // Load compliance trends with real data
        const orgIds = await getPartnerOrgIds();
        const trends = await loadComplianceTrends(supabase, orgIds);
        setComplianceTrends(trends as any);
      } else if (profile?.role === "partner") {
        // Load default RonYX theme for Veronica
        loadRonYXTheme();
        loadComplianceReminders();
        
        // Load compliance trends with real data
        const orgIds = await getPartnerOrgIds();
        const trends = await loadComplianceTrends(supabase, orgIds);
        setComplianceTrends(trends as any);
      }
    }
    
    async function getPartnerOrgIds(): Promise<string[]> {
      if (!user?.id) return [];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .or(`partner_id.eq.${user.id},created_by.eq.${user.id}`);
      return orgs?.map((org) => org.id) || [];
    }
    
    loadDashboardData();
  }, [partnerInfo, profile, user]);

  async function loadComplianceReminders() {
    setReminderLoading(true);
    try {
      if (!user?.email) {
        setComplianceReminders([]);
        setReminderLoading(false);
        return;
      }

      // Get partner's organizations
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, slug")
        .eq("email", user.email)
        .limit(1)
        .single();

      if (!partnerData) {
        setComplianceReminders([]);
        setReminderLoading(false);
        return;
      }

      const orgQueries = [
        supabase.from("organizations").select("id, name").eq("partner_id", partnerData.id),
        supabase.from("organizations").select("id, name").eq("partner_slug", partnerData.slug),
      ];

      let orgIds: string[] = [];
      let orgNames: { [key: string]: string } = {};
      for (const query of orgQueries) {
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          orgIds = data.map((org: any) => org.id);
          data.forEach((org: any) => {
            orgNames[org.id] = org.name;
          });
          break;
        }
      }

      if (orgIds.length === 0) {
        setComplianceReminders([]);
        setReminderLoading(false);
        return;
      }

      // Get driver documents with expiration dates
      const { data: documents } = await supabase
        .from("driver_documents")
        .select("organization_id, doc_type, expiration_date, status")
        .in("organization_id", orgIds)
        .not("expiration_date", "is", null);

      const reminders: any[] = [];
      const today = new Date();
      const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      (documents || []).forEach((doc: any) => {
        if (doc.expiration_date) {
          const expDate = new Date(doc.expiration_date);
          if (expDate <= sixtyDaysFromNow && expDate >= today) {
            reminders.push({
              id: doc.id || Math.random().toString(),
              company: orgNames[doc.organization_id] || "Unknown",
              type: doc.doc_type === "cdl" || doc.doc_type === "CDL License" ? "Document Expiry" : doc.doc_type || "Document Expiry",
              due: expDate.toISOString().split('T')[0],
              status: doc.status === "sent" ? "Sent" : "Pending",
            });
          }
        }
      });

      // Sort by due date
      reminders.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

      setComplianceReminders(reminders.slice(0, 10)); // Limit to 10 most urgent
    } catch (error) {
      console.error("Error loading compliance reminders:", error);
      setComplianceReminders([]);
    } finally {
      setReminderLoading(false);
    }
  }

  async function loadRonYXTheme() {
    try {
      const response = await fetch("/partners/ronyx/theme.json");
      const themeData = await response.json();
      setTheme(themeData);
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  }

  async function loadPartnerStats() {
    try {
      if (!user?.id) {
        setStats({
          companiesOnboarded: 0,
          activeDrivers: 0,
          hrUploads: 0,
          monthlyCommission: 0,
          totalReferrals: 0,
          pendingApprovals: 0,
        });
        return;
      }

      // Get organizations linked to this partner
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name")
        .or(`partner_id.eq.${user.id},created_by.eq.${user.id}`);

      const orgIds = orgs?.map((org) => org.id) || [];
      const companiesOnboarded = orgs?.length || 0;

      // Get active drivers count across partner's organizations
      let activeDrivers = 0;
      if (orgIds.length > 0) {
        const { count: driverCount } = await supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .in("organization_id", orgIds)
          .eq("status", "active");
        activeDrivers = driverCount || 0;
      }

      // Get HR document uploads count
      let hrUploads = 0;
      if (orgIds.length > 0) {
        const { count: docCount } = await supabase
          .from("driver_documents")
          .select("id", { count: "exact", head: true })
          .in("organization_id", orgIds);
        hrUploads = docCount || 0;
      }

      // Get commission data from agent_commissions or commission_events
      let monthlyCommission = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: commissions } = await supabase
        .from("commission_events")
        .select("amount")
        .eq("agent_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      if (commissions && commissions.length > 0) {
        monthlyCommission = commissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      }

      // Get referral count from agent_leads
      const { count: referralCount } = await supabase
        .from("agent_leads")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", user.id);
      const totalReferrals = referralCount || 0;

      // Get pending approvals (organizations with pending status or pending payments)
      let pendingApprovals = 0;
      if (orgIds.length > 0) {
        const { count: pendingCount } = await supabase
          .from("billing_payments")
          .select("id", { count: "exact", head: true })
          .in("org_id", orgIds)
          .eq("status", "pending");
        pendingApprovals = pendingCount || 0;
      }

      setStats({
        companiesOnboarded,
        activeDrivers,
        hrUploads,
        monthlyCommission,
        totalReferrals,
        pendingApprovals,
      });
    } catch (error) {
      console.error("Error loading partner stats:", error);
      // Set default values on error
      setStats({
        companiesOnboarded: 0,
        activeDrivers: 0,
        hrUploads: 0,
        monthlyCommission: 0,
        totalReferrals: 0,
        pendingApprovals: 0,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Loading your partner dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (profile?.role !== "partner") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">This dashboard is for partners only.</p>
        </div>
      </div>
    );
  }

  if (!theme) {
    return <div>Loading theme...</div>;
  }

  const brandDisplay =
    theme.brand === "RonYX Logistics LLC" ? "RonYX" : theme.brand;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.background,
        color: theme.text.primary,
      }}
    >
      {/* Header */}
      <header
        className="shadow-lg"
        style={{ backgroundColor: theme.navigation.background }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{
                    backgroundColor: theme.background,
                    color: theme.primary,
                  }}
                >
                  R
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ color: theme.navigation.text }}
                  >
                    {brandDisplay}
                  </h1>
                  <p
                    className="text-sm opacity-90"
                    style={{ color: theme.navigation.text }}
                  >
                    {theme.tagline}
                  </p>
                  {/* Compliance Analytics Section */}
                  <div className="mb-8" ref={complianceSectionRef}>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="font-semibold text-lg"
                        style={{ color: theme.text.primary }}
                      >
                        Compliance Analytics (30 days)
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          onClick={() => {
                            const headers = [
                              "Date",
                              "Compliant",
                              "Noncompliant",
                              "Total",
                            ];
                            const rows = complianceTrends.map((d: any) => [
                              d.date,
                              d.compliant,
                              d.noncompliant,
                              d.total,
                            ]);
                            const csv = [headers, ...rows]
                              .map((r) =>
                                r
                                  .map(
                                    (x) =>
                                      `"${(x || "").toString().replace(/"/g, '""')}"`,
                                  )
                                  .join(","),
                              )
                              .join("\n");
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `compliance_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Export CSV
                        </button>
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          onClick={() => {
                            if (complianceSectionRef.current)
                              exportNodeAsPng(
                                complianceSectionRef.current,
                                `compliance_analytics_${new Date().toISOString().slice(0, 10)}.png`,
                              );
                          }}
                        >
                          Export as Image
                        </button>
                      </div>
                    </div>
                    <ComplianceCalendar data={complianceTrends} />
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p
                  className="font-medium"
                  style={{ color: theme.navigation.text }}
                >
                  {partnerInfo?.full_name || profile?.full_name}
                </p>
                <p
                  className="text-sm opacity-75"
                  style={{ color: theme.navigation.text }}
                >
                  Partner Dashboard
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                style={{
                  backgroundColor: theme.background,
                  color: theme.primary,
                }}
              >
                {(partnerInfo?.full_name ||
                  profile?.full_name ||
                  "U")[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compliance Reminders/Notifications Section */}
        <div className="mb-8 rounded-lg p-6 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-lg text-yellow-800">
              Compliance Reminders & Notifications
            </div>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
              onClick={() => {
                // Export reminders as CSV
                const headers = ["Company", "Type", "Due", "Status"];
                const rows = complianceReminders.map((r: any) => [
                  r.company,
                  r.type,
                  r.due,
                  r.status,
                ]);
                const csv = [headers, ...rows]
                  .map((r) =>
                    r
                      .map(
                        (x) => `"${(x || "").toString().replace(/"/g, '""')}"`,
                      )
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `compliance_reminders_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </button>
          </div>
          {reminderLoading ? (
            <div className="py-4 text-gray-400">Loading reminders…</div>
          ) : (
            <table className="min-w-full border text-sm bg-white rounded">
              <thead>
                <tr className="bg-yellow-100">
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Type</th>
                  <th className="border p-2">Due</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {complianceReminders.map((reminder: any) => (
                  <tr key={reminder.id}>
                    <td className="border p-2">{reminder.company}</td>
                    <td className="border p-2">{reminder.type}</td>
                    <td className="border p-2">{reminder.due}</td>
                    <td className="border p-2">{reminder.status}</td>
                    <td className="border p-2">
                      {reminder.status === "Pending" ? (
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          onClick={() => alert("Reminder sent!")}
                        >
                          Send Reminder
                        </button>
                      ) : (
                        <span className="text-green-700 font-semibold">
                          Sent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Welcome Section */}
        <div className="mb-8">
          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: theme.text.primary }}
          >
            Welcome back, {partnerInfo?.full_name?.split(" ")[0] || "Partner"}!
          </h2>
          <p style={{ color: theme.text.secondary }}>
            Here&apos;s your partner performance overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Companies Onboarded"
            value={stats.companiesOnboarded}
            theme={theme}
            icon="🏢"
          />
          <StatCard
            title="Active Drivers"
            value={stats.activeDrivers}
            theme={theme}
            icon="👨‍💼"
          />
          <StatCard
            title="HR Uploads"
            value={stats.hrUploads}
            theme={theme}
            icon="📄"
          />
          <StatCard
            title="Monthly Commission"
            value={`$${stats.monthlyCommission.toFixed(2)}`}
            theme={theme}
            icon="💰"
          />
          <StatCard
            title="Total Referrals"
            value={stats.totalReferrals}
            theme={theme}
            icon="🤝"
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            theme={theme}
            icon="⏳"
          />
        </div>

        {/* Referral Tracker Section with Compliance Status */}
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: theme.cards.background,
            border: `1px solid ${theme.cards.border}`,
            boxShadow: theme.cards.shadow,
          }}
        >
          <h3
            className="text-xl font-bold mb-4"
            style={{ color: theme.text.primary }}
          >
            Referral Tracker & Compliance Status
          </h3>
          <div className="space-y-4">
            {/* Example companies with compliance status */}
            <div
              className="flex justify-between items-center p-4 rounded border-l-4"
              style={{ borderLeftColor: theme.primary }}
            >
              <div>
                <h4
                  className="font-medium"
                  style={{ color: theme.text.primary }}
                >
                  ABC Transport Co.
                </h4>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  Onboarded: Nov 1, 2025
                </p>
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                  Compliant
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: theme.primary }}>
                  $250.00
                </p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  Commission
                </p>
              </div>
            </div>
            <div
              className="flex justify-between items-center p-4 rounded border-l-4"
              style={{ borderLeftColor: theme.primary }}
            >
              <div>
                <h4
                  className="font-medium"
                  style={{ color: theme.text.primary }}
                >
                  XYZ Logistics
                </h4>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  Onboarded: Oct 28, 2025
                </p>
                <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  Needs Attention
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: theme.primary }}>
                  $180.00
                </p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  Commission
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <button
            className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
            style={{
              backgroundColor: theme.buttons.primary,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor =
                theme.buttons.primaryHover)
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = theme.buttons.primary)
            }
          >
            Add New Company
          </button>
          <button
            className="px-6 py-3 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: theme.buttons.secondary,
              color: theme.text.light,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor =
                theme.buttons.secondaryHover)
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = theme.buttons.secondary)
            }
          >
            View Reports
          </button>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  theme,
  icon,
}: {
  title: string;
  value: string | number;
  theme: PartnerTheme;
  icon: string;
}) {
  return (
    <div
      className="rounded-lg p-6 transition-transform hover:scale-105"
      style={{
        backgroundColor: theme.cards.background,
        border: `1px solid ${theme.cards.border}`,
        boxShadow: theme.cards.shadow,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: theme.text.secondary }}
          >
            {title}
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: theme.text.primary }}
          >
            {value}
          </p>
        </div>
        <div className="text-3xl opacity-60">{icon}</div>
      </div>
    </div>
  );
}
