import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const truck = searchParams.get("truck");
    const dateRange = searchParams.get("dateRange");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabaseAdmin
      .from("dvir_inspections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("overall_status", status);
    }

    if (truck) {
      query = query.ilike("truck_number", `%${truck}%`);
    }

    // Apply date filter
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: dvirs, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch DVIRs", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ dvirs: dvirs || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      driver_name,
      truck_number,
      odometer_reading,
      inspection_type,
      location,
      inspection_items = [],
      overall_status = "satisfactory",
    } = body;

    if (!driver_name || !truck_number || !inspection_type) {
      return NextResponse.json(
        {
          error: "Driver name, truck number, and inspection type are required",
        },
        { status: 400 },
      );
    }

    // Create the DVIR record
    const { data: dvir, error: dvirError } = await supabaseAdmin
      .from("dvir_inspections")
      .insert([
        {
          driver_name,
          truck_number,
          odometer_reading: parseInt(odometer_reading) || 0,
          inspection_type,
          location: location || "",
          inspection_items,
          overall_status,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dvirError) {
      console.error("DVIR creation error:", dvirError);
      return NextResponse.json(
        { error: "Failed to create DVIR", details: dvirError.message },
        { status: 500 },
      );
    }

    // If there are defects, create individual defect records and maintenance requests
    const defectiveItems = inspection_items.filter(
      (item: any) => item.status === "defective",
    );

    if (defectiveItems.length > 0) {
      // Create defect records
      const defectRecords = defectiveItems.map((item: any) => ({
        dvir_id: dvir.id,
        category: item.category,
        item_description: item.item,
        defect_notes: item.notes || "",
        severity: determineSeverity(item.category, item.item),
        photo_urls: item.photoUrl ? [item.photoUrl] : [],
        is_corrected: false,
        created_at: new Date().toISOString(),
      }));

      const { error: defectsError } = await supabaseAdmin
        .from("dvir_defects")
        .insert(defectRecords);

      if (defectsError) {
        console.error("Error creating defect records:", defectsError);
      }

      // Create maintenance requests for critical defects
      const maintenanceRequests = defectiveItems.map((item: any) => ({
        truck_number,
        driver_name,
        issue_type: "DVIR Defect",
        priority: determinePriority(item.category, item.item),
        description: `DVIR Defect - ${item.category}: ${item.item}${item.notes ? "\nNotes: " + item.notes : ""}`,
        can_drive_safely: !isCriticalDefect(item.category, item.item),
        status: "Pending",
        dvir_id: dvir.id,
        submitted_at: new Date().toISOString(),
      }));

      const { error: maintenanceError } = await supabaseAdmin
        .from("maintenance_requests")
        .insert(maintenanceRequests);

      if (maintenanceError) {
        console.error("Error creating maintenance requests:", maintenanceError);
      }
    }

    return NextResponse.json({
      dvir,
      message: `DVIR created successfully${defectiveItems.length > 0 ? ` with ${defectiveItems.length} defect(s) reported` : ""}`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, defects_corrected, mechanic_signature, correction_notes } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "DVIR ID is required" },
        { status: 400 },
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (defects_corrected !== undefined) {
      updates.defects_corrected = defects_corrected;
      if (defects_corrected) {
        updates.overall_status = "defects_corrected";
      }
    }

    if (mechanic_signature) {
      updates.mechanic_signature = mechanic_signature;
    }

    const { data: updatedDVIR, error } = await supabaseAdmin
      .from("dvir_inspections")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("DVIR update error:", error);
      return NextResponse.json(
        { error: "Failed to update DVIR", details: error.message },
        { status: 500 },
      );
    }

    // If defects were marked as corrected, update defect records
    if (defects_corrected) {
      const { error: defectsUpdateError } = await supabaseAdmin
        .from("dvir_defects")
        .update({
          is_corrected: true,
          corrected_at: new Date().toISOString(),
          corrected_by: mechanic_signature || "System",
          correction_notes:
            correction_notes || "Marked as corrected via DVIR dashboard",
        })
        .eq("dvir_id", id);

      if (defectsUpdateError) {
        console.error("Error updating defect records:", defectsUpdateError);
      }
    }

    return NextResponse.json({ dvir: updatedDVIR });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions to determine defect severity and priority
function determineSeverity(category: string, item: string): string {
  const criticalItems = ["brake", "steering", "tire", "wheel", "suspension"];

  const highItems = ["light", "signal", "mirror", "horn", "windshield"];

  const itemLower = `${category} ${item}`.toLowerCase();

  if (criticalItems.some((critical) => itemLower.includes(critical))) {
    return "critical";
  }

  if (highItems.some((high) => itemLower.includes(high))) {
    return "high";
  }

  return "medium";
}

function determinePriority(category: string, item: string): string {
  const severity = determineSeverity(category, item);

  switch (severity) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    default:
      return "Medium";
  }
}

function isCriticalDefect(category: string, item: string): boolean {
  return determineSeverity(category, item) === "critical";
}
