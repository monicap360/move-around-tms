"use client";

import { useState, useEffect } from "react";
import { useRoleBasedAuth } from "../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import Link from "next/link";

interface PartnerOverview {
  id: string;
  name: string;
  email: string;
  companiesCount: number;
  monthlyCommission: number;
  theme: {
    primary: string;
    brand: string;
  };
  slug: string;
}

interface OwnerStats {
  totalPartners: number;
  totalCompanies: number;
  totalDrivers: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  activeTickets: number;
}

export default function OwnerDashboard() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const [stats, setStats] = useState<OwnerStats>({
    totalPartners: 0,
    totalCompanies: 0,
    totalDrivers: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    activeTickets: 0,
  });

  const [partners, setPartners] = useState<PartnerOverview[]>([]);
  const [selectedView, setSelectedView] = useState("global");

  useEffect(() => {
    if (profile?.role === "owner") {
      loadOwnerData();
    }
  }, [profile]);

  async function loadOwnerData() {
    try {
      // Get all partners
      const { data: partnersData, error: partnersError } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (partnersError) {
        console.error("Error loading partners:", partnersError);
        return;
      }

      // Get all organizations/companies
      const { data: organizationsData } = await supabase
        .from("organizations")
        .select("*");

      // Get all drivers
      const { count: totalDriversCount } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");

      // Get all tickets
      const { count: activeTicketsCount } = await supabase
        .from("aggregate_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "active", "in_review"]);

      // Calculate monthly revenue from organizations
      const monthlyRevenue = (organizationsData || []).reduce((sum: number, org: any) => {
        return sum + (org.monthly_fee || org.subscription_fee || 0);
      }, 0);

      // Count pending approvals
      const { count: pendingApprovalsCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalPartners: partnersData?.length || 0,
        totalCompanies: organizationsData?.length || 0,
        totalDrivers: totalDriversCount || 0,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        pendingApprovals: pendingApprovalsCount || 0,
        activeTickets: activeTicketsCount || 0,
      });

      // Build partner overview with companies count and commission
      const partnersWithStats = await Promise.all(
        (partnersData || []).map(async (partner: any) => {
          // Count companies for this partner
          const orgQueries = [
            supabase.from("organizations").select("id").eq("partner_id", partner.id),
            supabase.from("organizations").select("id").eq("partner_slug", partner.slug),
          ];

          let orgIds: string[] = [];
          for (const query of orgQueries) {
            const { data, error } = await query;
            if (!error && data && data.length > 0) {
              orgIds = data.map((org: any) => org.id);
              break;
            }
          }

          // Calculate monthly commission
          const { data: orgData } = await supabase
            .from("organizations")
            .select("monthly_fee, subscription_fee, commission_rate")
            .in("id", orgIds);

          const monthlyCommission = (orgData || []).reduce((sum: number, org: any) => {
            if (org.commission_rate) {
              return sum + ((org.monthly_fee || org.subscription_fee || 0) * (org.commission_rate / 100));
            }
            return sum + (org.monthly_fee || org.subscription_fee || 0);
          }, 0);

          // Get partner theme
          const theme = partner.theme || {
            primary: partner.primary_color || "#2563eb",
            brand: partner.brand_name || partner.name || "Partner",
          };

          return {
            id: partner.id,
            name: partner.name || partner.full_name || "Unknown",
            email: partner.email || "",
            companiesCount: orgIds.length,
            monthlyCommission: Math.round(monthlyCommission * 100) / 100,
            theme: theme,
            slug: partner.slug || partner.id,
          };
        })
      );

      setPartners(partnersWithStats);
    } catch (error) {
      console.error("Error loading owner data:", error);
      // Fallback to zero stats if database query fails
      setStats({
        totalPartners: 0,
        totalCompanies: 0,
        totalDrivers: 0,
        monthlyRevenue: 0,
        pendingApprovals: 0,
        activeTickets: 0,
      });
      setPartners([]);
    }
  }

  function handleViewSwitch(view: string) {
    setSelectedView(view);
    if (view === "global") {
      // Stay on current page
      return;
    } else {
      // Navigate to partner dashboard
      window.location.href = `/partners/${view}/dashboard`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading owner dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission("owner")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Owner access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  MoveAround TMS
                </h1>
                <p className="text-sm text-emerald-600 font-medium">
                  Owner Portal - Global Access
                </p>
              </div>
            </div>

            {/* View Switcher */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedView}
                onChange={(e) => handleViewSwitch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="global">🌐 Global Owner View</option>
                <option value="ronyx">🟡 RonYX Dashboard (Veronica)</option>
                <option value="elite">🔵 Elite Transport (Maria)</option>
                <option value="meighoo">🟢 Meighoo Logistics (Anil)</option>
                <option value="garza">🔴 Garza Transport (Miram)</option>
              </select>

              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {profile?.full_name}
                </p>
                <p className="text-sm text-gray-600">System Owner</p>
              </div>
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-medium">
                {profile?.full_name?.[0].toUpperCase() || "S"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, Sylvia! 👑
          </h2>
          <p className="text-gray-600">
            Complete system overview and partner management
          </p>
        </div>

        {/* Owner Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <OwnerStatCard
            title="Total Partners"
            value={stats.totalPartners}
            icon="🤝"
            color="bg-blue-500"
          />
          <OwnerStatCard
            title="Total Companies"
            value={stats.totalCompanies}
            icon="🏢"
            color="bg-emerald-500"
          />
          <OwnerStatCard
            title="Active Drivers"
            value={stats.totalDrivers}
            icon="👨‍💼"
            color="bg-purple-500"
          />
          <OwnerStatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon="💰"
            color="bg-yellow-500"
          />
          <OwnerStatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon="⏳"
            color="bg-orange-500"
          />
          <OwnerStatCard
            title="Active Tickets"
            value={stats.activeTickets}
            icon="🎫"
            color="bg-red-500"
          />
        </div>

        {/* Partner Portals Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Partner Portals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partners.map((partner) => (
              <PartnerPortalCard key={partner.id} partner={partner} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="HR Management"
            description="View all HR uploads, approvals, and documents"
            icon="📋"
            link="/admin/hr"
            color="bg-blue-50 border-blue-200"
            textColor="text-blue-800"
          />
          <QuickActionCard
            title="Payroll Overview"
            description="Global payroll processing and reports"
            icon="💵"
            link="/admin/payroll"
            color="bg-green-50 border-green-200"
            textColor="text-green-800"
          />
          <QuickActionCard
            title="System Analytics"
            description="Performance metrics and business intelligence"
            icon="📊"
            link="/admin/analytics"
            color="bg-purple-50 border-purple-200"
            textColor="text-purple-800"
          />
        </div>
      </main>
    </div>
  );
}

function OwnerStatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div
          className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white text-xl`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function PartnerPortalCard({ partner }: { partner: PartnerOverview }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-gray-900">
            {partner.theme.brand}
          </h4>
          <p className="text-sm text-gray-600">{partner.name}</p>
        </div>
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: partner.theme.primary }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {partner.companiesCount}
          </p>
          <p className="text-xs text-gray-600">Companies</p>
        </div>
        <div>
          <p
            className="text-2xl font-bold"
            style={{ color: partner.theme.primary }}
          >
            ${partner.monthlyCommission}
          </p>
          <p className="text-xs text-gray-600">Commission</p>
        </div>
      </div>

      <button
        onClick={() =>
          (window.location.href = `/partners/${partner.slug}/dashboard`)
        }
        className="w-full py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: partner.theme.primary }}
      >
        Access {partner.theme.brand}
      </button>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  link,
  color,
  textColor,
}: {
  title: string;
  description: string;
  icon: string;
  link: string;
  color: string;
  textColor: string;
}) {
  return (
    <Link
      href={link}
      className={`block p-6 rounded-lg border-2 ${color} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center space-x-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h4 className={`font-bold ${textColor}`}>{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
