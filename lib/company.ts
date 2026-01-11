import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function getCompanyDashboardData(org_code: string) {
  try {
    // Get organization ID from organization_code
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_code", org_code)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return getDefaultDashboardData();
    }

    const organizationId = org.id;

    // Calculate week range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Fetch active drivers count
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "Active")
      .eq("active", true);

    const activeDrivers = drivers?.length || 0;

    // Fetch loads this week
    const { data: loads, error: loadsError } = await supabase
      .from("loads")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    const loadsThisWeek = loads?.length || 0;

    // Fetch fleet utilization (active trucks / total trucks)
    const { data: fleet, error: fleetError } = await supabase
      .from("fleets")
      .select("id, status")
      .eq("organization_id", organizationId);

    const totalTrucks = fleet?.length || 0;
    const activeTrucks = fleet?.filter((t: any) => t.status === "active" || t.status === "in_use")?.length || 0;
    const fleetUtilization = totalTrucks > 0 ? Math.round((activeTrucks / totalTrucks) * 100) : 0;

    // Fetch recent activity (from loads, tickets, or events)
    const { data: recentLoads, error: activityError } = await supabase
      .from("loads")
      .select("id, load_number, status, updated_at, driver:drivers(name)")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(5);

    const recentActivity = (recentLoads || []).map((load: any) => {
      const timeAgo = getTimeAgo(new Date(load.updated_at));
      const driverName = load.driver?.name || "Unknown Driver";
      return {
        description: `Load #${load.load_number || load.id} ${load.status || "updated"}${driverName !== "Unknown Driver" ? ` by ${driverName}` : ""}`,
        timeAgo,
      };
    });

    // Calculate widgets (simplified - can be enhanced)
    const widgets = [
      { title: "Active Drivers", content: `${activeDrivers}` },
      { title: "Loads This Week", content: `${loadsThisWeek}` },
      { title: "Fleet Utilization", content: `${fleetUtilization}%` },
      { title: "Active Trucks", content: `${activeTrucks}/${totalTrucks}` },
    ];

    return {
      activeDrivers,
      loadsThisWeek,
      fleetUtilization,
      recentActivity,
      widgets,
    };
  } catch (error: any) {
    console.error("Error fetching company dashboard data:", error);
    return getDefaultDashboardData();
  }
}

function getDefaultDashboardData() {
  return {
    activeDrivers: 0,
    loadsThisWeek: 0,
    fleetUtilization: 0,
    recentActivity: [],
    widgets: [
      { title: "Active Drivers", content: "0" },
      { title: "Loads This Week", content: "0" },
      { title: "Fleet Utilization", content: "0%" },
      { title: "Active Trucks", content: "0/0" },
    ],
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
