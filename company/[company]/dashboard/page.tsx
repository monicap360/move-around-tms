"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";
import SystemCard from "@/components/dashboard/SystemCard";

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Admin override badge
function OverrideBadge({
  admin_override,
  override_expires_at,
}: {
  admin_override: boolean;
  override_expires_at: string | null;
}) {
  if (admin_override) {
    return (
      <div className="mb-4">
        <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          🔵 Permanent Admin Override Enabled
        </span>
      </div>
    );
  }

  if (override_expires_at) {
    const expires = new Date(override_expires_at);
    const now = new Date();
    const ms = expires.getTime() - now.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));

    if (ms > 0) {
      return (
        <div className="mb-4">
          <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            🟢 Override Active — {days} day{days !== 1 ? "s" : ""} remaining
            (expires {expires.toLocaleDateString()})
          </span>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          🔴 Override Expired
        </span>
      </div>
    );
  }

  return null;
}

export default function CompanyDashboard() {
  const { organization_code } = useParams();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [pay, setPay] = useState<any[]>([]);

  const [overrideStatus, setOverrideStatus] = useState<{
    admin_override: boolean;
    override_expires_at: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Load company using organization_code
  useEffect(() => {
    async function resolveOrg() {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("organization_code", organization_code)
        .single();

      if (error) {
        console.error("Org lookup error:", error);
        return;
      }

      setOrgId(data.id);
      setOrgInfo(data);

      // Check override status
      try {
        const res = await fetch(`/api/admin/subscriptions`);
        const allOrgs = await res.json();
        const found = allOrgs.find((o: any) => o.id === data.id);
        if (found) {
          setOverrideStatus({
            admin_override: found.admin_override,
            override_expires_at: found.override_expires_at,
          });
        }
      } catch {
        setOverrideStatus(null);
      }
    }
    resolveOrg();
  }, [organization_code]);

  // Load all org data
  useEffect(() => {
    if (!orgId) return;

    async function loadEverything() {
      setLoading(true);

      const [driversRes, loadsRes, ticketsRes, fleetRes, uploadsRes, payRes] =
        await Promise.all([
          supabase.from("drivers").select("*").eq("organization_id", orgId),
          supabase.from("loads").select("*").eq("organization_id", orgId),
          supabase
            .from("scale_tickets")
            .select("*")
            .eq("organization_id", orgId),
          supabase.from("vehicles").select("*").eq("organization_id", orgId),
          supabase
            .from("uploads")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("driver_pay").select("*").eq("organization_id", orgId),
        ]);

      if (!driversRes.error) setDrivers(driversRes.data);
      if (!loadsRes.error) setLoads(loadsRes.data);
      if (!ticketsRes.error) setTickets(ticketsRes.data);
      if (!fleetRes.error) setFleet(fleetRes.data);
      if (!uploadsRes.error) setUploads(uploadsRes.data);
      if (!payRes.error) setPay(payRes.data);

      setLoading(false);
    }

    loadEverything();
  }, [orgId]);

  // Derived KPIs
  const activeDrivers = useMemo(
    () => drivers.filter((d) => d.status === "active").length,
    [drivers],
  );

  const activeLoads = useMemo(
    () => loads.filter((l) => l.status !== "Delivered").length,
    [loads],
  );

  const totalFleet = fleet.length;
  const unpaidTickets = tickets.filter((t) => !t.paid).length;
  const monthlyPay = pay.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (!orgId || loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Loading company dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader
        title={`${orgInfo?.name} Dashboard`}
        subtitle="Company Operations Overview"
      />

      {overrideStatus && (
        <OverrideBadge
          admin_override={overrideStatus.admin_override}
          override_expires_at={overrideStatus.override_expires_at}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Active Drivers"
            value={activeDrivers}
            icon="🚚"
            color="from-blue-500 to-blue-600"
          />
          <DashboardCard
            title="Open Loads"
            value={activeLoads}
            icon="📦"
            color="from-purple-500 to-purple-600"
          />
          <DashboardCard
            title="Fleet Vehicles"
            value={totalFleet}
            icon="🚛"
            color="from-green-500 to-green-600"
          />
          <DashboardCard
            title="Unpaid Tickets"
            value={unpaidTickets}
            icon="🎫"
            color="from-red-500 to-red-600"
          />
        </div>

        {/* OCR Inbox + Fleet + Loads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SystemCard title="📥 OCR Inbox" items={uploads} type="uploads" />
          <SystemCard title="🚛 Fleet Overview" items={fleet} type="fleet" />
          <SystemCard title="📦 Active Loads" items={loads} type="loads" />
        </div>

        {/* Tickets + Driver Pay */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SystemCard
            title="🎫 Recent Tickets"
            items={tickets.slice(0, 6)}
            type="tickets"
          />
          <SystemCard
            title="💰 Driver Pay Summary"
            value={monthlyPay}
            type="pay"
          />
        </div>
      </div>
    </div>
  );
}
