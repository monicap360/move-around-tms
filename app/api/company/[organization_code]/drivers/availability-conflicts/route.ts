import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hour, minute] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const shiftWithinWindow = (
  shiftStart?: string | null,
  shiftEnd?: string | null,
  windowStart?: string | null,
  windowEnd?: string | null,
) => {
  const shiftStartMinutes = timeToMinutes(shiftStart);
  const shiftEndMinutes = timeToMinutes(shiftEnd);
  const windowStartMinutes = timeToMinutes(windowStart);
  const windowEndMinutes = timeToMinutes(windowEnd);
  if (
    shiftStartMinutes === null ||
    shiftEndMinutes === null ||
    windowStartMinutes === null ||
    windowEndMinutes === null
  ) {
    return true;
  }
  if (windowStartMinutes <= windowEndMinutes) {
    return (
      shiftStartMinutes >= windowStartMinutes &&
      shiftEndMinutes <= windowEndMinutes
    );
  }
  // Overnight window (e.g., 22:00 - 06:00)
  return (
    shiftStartMinutes >= windowStartMinutes || shiftEndMinutes <= windowEndMinutes
  );
};

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orgCode = pathParts[pathParts.indexOf("company") + 1];
    const dateParam = url.searchParams.get("date");
    const date = dateParam || new Date().toISOString().slice(0, 10);

    if (!orgCode) {
      return NextResponse.json(
        { error: "Missing organization code" },
        { status: 400 },
      );
    }

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

    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("id, driver_uuid, name, status")
      .eq("organization_id", company.id);

    if (driversError) {
      return NextResponse.json(
        { error: driversError.message },
        { status: 500 },
      );
    }

    const driverIds = (drivers || []).map((driver: any) => driver.id).filter(Boolean);
    if (driverIds.length === 0) {
      return NextResponse.json({ conflicts: [], count: 0 });
    }

    const idsCsv = driverIds.join(",");
    const [{ data: availability }, { data: statusRows }, { data: shifts }] =
      await Promise.all([
        supabase
          .from("driver_availability")
          .select("driver_id, date, available, start_time, end_time")
          .in("driver_id", driverIds)
          .eq("date", date),
        supabase
          .from("driver_status")
          .select("driver_id, status, updated_at")
          .in("driver_id", driverIds),
        supabase
          .from("shifts")
          .select("id, shift_date, start_time, end_time, status, assigned_driver_id, requested_driver_id")
          .eq("shift_date", date)
          .or(`assigned_driver_id.in.(${idsCsv}),requested_driver_id.in.(${idsCsv})`),
      ]);

    const availabilityMap = new Map<string, any>();
    (availability || []).forEach((entry: any) => availabilityMap.set(entry.driver_id, entry));

    const statusMap = new Map<string, any>();
    (statusRows || []).forEach((row: any) => {
      const existing = statusMap.get(row.driver_id);
      if (!existing || new Date(row.updated_at) > new Date(existing.updated_at)) {
        statusMap.set(row.driver_id, row);
      }
    });

    const conflicts = (shifts || [])
      .map((shift: any) => {
        const driverId = shift.assigned_driver_id || shift.requested_driver_id;
        if (!driverId) return null;
        const driver = (drivers || []).find((d: any) => d.id === driverId);
        if (!driver) return null;

        const statusRow = statusMap.get(driverId);
        if (statusRow && ["Off", "Quit"].includes(statusRow.status)) {
          return {
            driver_id: driverId,
            driver_name: driver.name,
            shift_id: shift.id,
            reason: "driver_status",
            details: statusRow.status,
          };
        }

        const availabilityRow = availabilityMap.get(driverId);
        if (availabilityRow && availabilityRow.available === false) {
          return {
            driver_id: driverId,
            driver_name: driver.name,
            shift_id: shift.id,
            reason: "availability_disabled",
            details: null,
          };
        }

        if (
          availabilityRow &&
          !shiftWithinWindow(
            shift.start_time,
            shift.end_time,
            availabilityRow.start_time,
            availabilityRow.end_time,
          )
        ) {
          return {
            driver_id: driverId,
            driver_name: driver.name,
            shift_id: shift.id,
            reason: "outside_availability_window",
            details: {
              shift_start: shift.start_time,
              shift_end: shift.end_time,
              available_start: availabilityRow.start_time,
              available_end: availabilityRow.end_time,
            },
          };
        }

        return null;
      })
      .filter(Boolean);

    return NextResponse.json({ conflicts, count: conflicts.length, date });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load availability conflicts" },
      { status: 500 },
    );
  }
}
