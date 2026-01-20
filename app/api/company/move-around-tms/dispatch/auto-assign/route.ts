import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const orgCode = "move-around-tms";

    // Get organization_id from organization_code
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_code", orgCode)
      .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const organizationId = organization.id;

    // Fetch all unassigned loads
    const { data: loads, error: loadsError } = await supabase
      .from("loads")
      .select("*")
      .eq("organization_id", organizationId)
      .is("driver_id", null)
      .in("status", ["unassigned", "pending", "created"]);

    if (loadsError) {
      return NextResponse.json(
        { error: loadsError.message },
        { status: 500 },
      );
    }

    // Fetch all available drivers
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("*")
      .eq("organization_id", organizationId)
      .is("active_load", null)
      .in("status", ["available", "Active", "active"]);

    if (driversError) {
      return NextResponse.json(
        { error: driversError.message },
        { status: 500 },
      );
    }

    // Sort drivers by safety score and performance (if available)
    const sortedDrivers = (drivers || []).sort((a: any, b: any) => {
      const scoreA = (a.safety_score || 0) + (a.performance_score || 0);
      const scoreB = (b.safety_score || 0) + (b.performance_score || 0);
      return scoreB - scoreA; // Highest score first
    });

    const assignedCount = 0;
    const driverPool = [...sortedDrivers];
    const assignedLoads: any[] = [];

    // Assign loads to drivers
    for (const load of loads || []) {
      if (driverPool.length === 0) break;

      // Find best matching driver
      let bestDriver = driverPool.find((d: any) => {
        // Check for required endorsements if load specifies them
        if (load.required_endorsements) {
          const required = Array.isArray(load.required_endorsements)
            ? load.required_endorsements
            : [load.required_endorsements];
          const driverEndorsements = Array.isArray(d.endorsements)
            ? d.endorsements
            : d.endorsements
              ? [d.endorsements]
              : [];
          return required.every((req: string) =>
            driverEndorsements.includes(req),
          );
        }
        return true;
      });

      // If no match with requirements, use highest scored driver
      if (!bestDriver) {
        bestDriver = driverPool[0];
      }

      // Remove assigned driver from pool
      const driverIndex = driverPool.indexOf(bestDriver);
      if (driverIndex > -1) {
        driverPool.splice(driverIndex, 1);
      }

      // Update load assignment
      await supabase
        .from("loads")
        .update({
          driver_id: bestDriver.driver_uuid || bestDriver.id,
          driver_uuid: bestDriver.driver_uuid || bestDriver.id,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", load.id)
        .eq("organization_id", organizationId);

      // Update driver's active load
      await supabase
        .from("drivers")
        .update({ active_load: load.id, status: "assigned" })
        .eq("driver_uuid", bestDriver.driver_uuid || bestDriver.id)
        .eq("organization_id", organizationId);

      assignedLoads.push({ load_id: load.id, driver_id: bestDriver.driver_uuid || bestDriver.id });
    }

    return NextResponse.json({
      success: true,
      message: `${assignedLoads.length} loads auto-assigned.`,
      assignedLoads,
      total_loads_processed: (loads || []).length,
      total_drivers: (drivers || []).length,
    });
  } catch (err: any) {
    console.error("Auto-assign failed:", err);
    return NextResponse.json(
      { error: err.message || "Auto-assign failed" },
      { status: 500 },
    );
  }
}
