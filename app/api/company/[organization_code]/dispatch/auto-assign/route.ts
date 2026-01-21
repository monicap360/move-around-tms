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
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orgCode = pathParts[pathParts.indexOf("company") + 1];

    if (!orgCode) {
      return NextResponse.json(
        { error: "Missing organization code" },
        { status: 400 },
      );
    }

    // Get organization_id from organization_code
    const { data: company, error: companyError } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_code", orgCode)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const organizationId = company.id;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

    const timeToMinutes = (value?: string | null) => {
      if (!value) return null;
      const [hour, minute] = value.split(":").map((part) => Number(part));
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
      return hour * 60 + minute;
    };

    const isWithinWindow = (start?: string | null, end?: string | null) => {
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      if (startMinutes === null || endMinutes === null) return true;
      if (startMinutes <= endMinutes) {
        return minutesSinceMidnight >= startMinutes && minutesSinceMidnight <= endMinutes;
      }
      return (
        minutesSinceMidnight >= startMinutes || minutesSinceMidnight <= endMinutes
      );
    };

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

    const driverIds = (drivers || []).map((driver: any) => driver.id).filter(Boolean);
    let availabilityMap = new Map<string, any>();
    let statusMap = new Map<string, any>();
    let shiftMap = new Map<string, any>();

    if (driverIds.length > 0) {
      const { data: availability } = await supabase
        .from("driver_availability")
        .select("driver_id, date, available, start_time, end_time, standby")
        .in("driver_id", driverIds)
        .eq("date", today);

      (availability || []).forEach((entry: any) => {
        availabilityMap.set(entry.driver_id, entry);
      });

      const { data: statusRows } = await supabase
        .from("driver_status")
        .select("driver_id, status, updated_at")
        .in("driver_id", driverIds);

      (statusRows || []).forEach((row: any) => {
        const existing = statusMap.get(row.driver_id);
        if (!existing || new Date(row.updated_at) > new Date(existing.updated_at)) {
          statusMap.set(row.driver_id, row);
        }
      });

      const idsCsv = driverIds.join(",");
      const { data: shifts } = await supabase
        .from("shifts")
        .select("assigned_driver_id, requested_driver_id, start_time, end_time, status")
        .eq("shift_date", today)
        .or(`assigned_driver_id.in.(${idsCsv}),requested_driver_id.in.(${idsCsv})`);

      (shifts || []).forEach((shift: any) => {
        const driverId = shift.assigned_driver_id || shift.requested_driver_id;
        if (!driverId) return;
        const existing = shiftMap.get(driverId);
        if (!existing) {
          shiftMap.set(driverId, shift);
        }
      });
    }

    const eligibleDrivers = (drivers || []).filter((driver: any) => {
      const statusRow = statusMap.get(driver.id);
      if (statusRow && ["Off", "Quit"].includes(statusRow.status)) return false;

      const shift = shiftMap.get(driver.id);
      if (shift) {
        if (shift.status === "denied") return false;
        return isWithinWindow(shift.start_time, shift.end_time);
      }

      const availability = availabilityMap.get(driver.id);
      if (!availability) return true;
      if (availability.available === false) return false;
      return isWithinWindow(availability.start_time, availability.end_time);
    });

    // Sort drivers by safety score and performance (if available)
    const sortedDrivers = eligibleDrivers.sort((a: any, b: any) => {
      const scoreA = (a.safety_score || 0) + (a.performance_score || 0);
      const scoreB = (b.safety_score || 0) + (b.performance_score || 0);
      return scoreB - scoreA; // Highest score first
    });

    let assignedCount = 0;
    const driverPool = [...sortedDrivers];
    const assignments: Array<{ load_id: string; driver_id: string }> = [];

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
      const { error: loadUpdateError } = await supabase
        .from("loads")
        .update({
          driver_id: bestDriver.driver_uuid || bestDriver.id,
          driver_uuid: bestDriver.driver_uuid || bestDriver.id,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", load.id)
        .eq("organization_id", organizationId);

      if (loadUpdateError) {
        continue;
      }

      // Update driver's active load
      const { error: driverUpdateError } = await supabase
        .from("drivers")
        .update({ active_load: load.id, status: "assigned" })
        .eq("driver_uuid", bestDriver.driver_uuid || bestDriver.id)
        .eq("organization_id", organizationId);

      if (!driverUpdateError) {
        assignedCount += 1;
        assignments.push({
          load_id: load.id,
          driver_id: bestDriver.driver_uuid || bestDriver.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      assigned: assignedCount,
      total_loads: (loads || []).length,
      total_drivers: sortedDrivers.length,
      assignments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Auto-assign failed" },
      { status: 500 },
    );
  }
}
