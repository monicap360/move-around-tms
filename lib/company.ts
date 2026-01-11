import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function getCompanyDashboardData(org_code: string) {
  // Example: fetch stats, widgets, and recent activity for the dashboard
  // Replace with real queries as needed
  return {
    activeDrivers: 18,
    loadsThisWeek: 124,
    fleetUtilization: 92,
    recentActivity: [
      {
        description: "Driver John Smith completed Load #1234",
        timeAgo: "2h ago",
      },
      { description: "New ticket uploaded by dispatcher", timeAgo: "4h ago" },
      { description: "Truck #22 maintenance scheduled", timeAgo: "1d ago" },
    ],
    widgets: [
      { title: "Profitability", content: "$12,400 (MTD)" },
      { title: "Yard Turnaround", content: "Avg 18 min" },
      { title: "AI Forensics", content: "2 anomalies flagged" },
      { title: "Payroll Accuracy", content: "99.2%" },
    ],
  };
}
