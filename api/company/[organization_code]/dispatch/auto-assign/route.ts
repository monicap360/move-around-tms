import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const organizationCode = params?.["organization_code"];

  if (!organizationCode) {
    return NextResponse.json(
      { error: "Missing organization code" },
      { status: 400 },
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("organization_code", organizationCode)
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const organizationId = organization.id;

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

  if (!loads?.length || !drivers?.length) {
    return NextResponse.json({
      success: true,
      assigned: 0,
      total_loads: loads?.length || 0,
      total_drivers: drivers?.length || 0,
    });
  }

  const sortedDrivers = [...drivers].sort((a: any, b: any) => {
    const scoreA = (a.safety_score || 0) + (a.performance_score || 0);
    const scoreB = (b.safety_score || 0) + (b.performance_score || 0);
    return scoreB - scoreA;
  });

  let assignedCount = 0;
  const assignmentFailures: Array<{ loadId: string; error: string }> = [];
  const driverPool = [...sortedDrivers];

  for (const load of loads || []) {
    if (driverPool.length === 0) break;

    let bestDriver = driverPool.find((driver: any) => {
      if (load.required_endorsements) {
        const required = Array.isArray(load.required_endorsements)
          ? load.required_endorsements
          : [load.required_endorsements];
        const driverEndorsements = Array.isArray(driver.endorsements)
          ? driver.endorsements
          : driver.endorsements
            ? [driver.endorsements]
            : [];
        return required.every((req: string) =>
          driverEndorsements.includes(req),
        );
      }
      return true;
    });

    if (!bestDriver) {
      bestDriver = driverPool[0];
    }

    const driverIndex = driverPool.indexOf(bestDriver);
    if (driverIndex > -1) {
      driverPool.splice(driverIndex, 1);
    }

    const driverIdentifier = bestDriver.driver_uuid || bestDriver.id;
    const loadUpdate: Record<string, string> = {
      driver_id: driverIdentifier,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    };
    if (bestDriver.driver_uuid) {
      loadUpdate.driver_uuid = bestDriver.driver_uuid;
    }

    const { error: loadUpdateError } = await supabase
      .from("loads")
      .update(loadUpdate)
      .eq("id", load.id)
      .eq("organization_id", organizationId);

    if (loadUpdateError) {
      assignmentFailures.push({
        loadId: load.id,
        error: loadUpdateError.message,
      });
      continue;
    }

    const driverIdColumn = bestDriver.driver_uuid ? "driver_uuid" : "id";
    const { error: driverUpdateError } = await supabase
      .from("drivers")
      .update({ active_load: load.id, status: "assigned" })
      .eq(driverIdColumn, driverIdentifier)
      .eq("organization_id", organizationId);

    if (driverUpdateError) {
      assignmentFailures.push({
        loadId: load.id,
        error: driverUpdateError.message,
      });
      continue;
    }

    assignedCount += 1;
  }

  return NextResponse.json({
    success: true,
    assigned: assignedCount,
    failed: assignmentFailures.length,
    failures: assignmentFailures,
    total_loads: loads?.length || 0,
    total_drivers: drivers?.length || 0,
  });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
