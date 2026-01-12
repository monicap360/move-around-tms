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
    const body = await req.json();
    const { driver_uuid, date } = body;

    if (!driver_uuid) {
      return NextResponse.json(
        { error: "driver_uuid is required" },
        { status: 400 },
      );
    }

    // Use provided date or today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch tickets for the day
    const { data: tickets } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .or(`driver_id.eq.${driver_uuid},driver_uuid.eq.${driver_uuid}`)
      .eq("ticket_date", targetDate.toISOString().split('T')[0])
      .order("ticket_date", { ascending: true });

    // Fetch yard events for the day
    const { data: yardEvents } = await supabase
      .from("driver_yard_events")
      .select("*")
      .eq("driver_uuid", driver_uuid)
      .gte("timestamp", startOfDay.toISOString())
      .lte("timestamp", endOfDay.toISOString())
      .order("timestamp", { ascending: true });

    // Fetch load assignments for the day
    const { data: loads } = await supabase
      .from("loads")
      .select("*")
      .or(`driver_id.eq.${driver_uuid},driver_uuid.eq.${driver_uuid}`)
      .gte("load_start", startOfDay.toISOString())
      .lte("load_end", endOfDay.toISOString())
      .order("load_start", { ascending: true });

    // Build reconstruction timeline
    const reconstruction: any[] = [];

    // Add yard events
    (yardEvents || []).forEach((event: any) => {
      const eventTime = new Date(event.timestamp);
      reconstruction.push({
        event: event.event_type === "enter" ? "yard_entry" : "yard_exit",
        start: eventTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        end: null,
        location: event.yard_id || "Yard",
      });
    });

    // Add ticket scans (as loading/dumping events)
    (tickets || []).forEach((ticket: any, index: number) => {
      const ticketTime = ticket.ocr_timestamp ? new Date(ticket.ocr_timestamp) : new Date(ticket.ticket_date);
      const timeStr = ticketTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      
      // First ticket is usually loading
      if (index === 0) {
        reconstruction.push({
          event: "loading",
          start: timeStr,
          end: null,
          location: ticket.plant || "Plant",
        });
      } else {
        // Subsequent tickets might be dumping
        reconstruction.push({
          event: "dumping",
          start: timeStr,
          end: null,
          location: ticket.plant || "Plant",
        });
      }
    });

    // Add load events
    (loads || []).forEach((load: any) => {
      if (load.load_start) {
        const startTime = new Date(load.load_start);
        reconstruction.push({
          event: "load_start",
          start: startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          end: null,
          location: load.origin || "Origin",
        });
      }
      if (load.load_end) {
        const endTime = new Date(load.load_end);
        reconstruction.push({
          event: "load_complete",
          start: endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          end: null,
          location: load.destination || "Destination",
        });
      }
    });

    // Sort by start time
    reconstruction.sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.start}`).getTime();
      const timeB = new Date(`2000-01-01 ${b.start}`).getTime();
      return timeA - timeB;
    });

    // Calculate end times (next event's start time)
    for (let i = 0; i < reconstruction.length - 1; i++) {
      reconstruction[i].end = reconstruction[i + 1].start;
    }

    return NextResponse.json({
      driver_uuid,
      date: targetDate.toISOString().split('T')[0],
      reconstruction,
    });
  } catch (error: any) {
    console.error("Error reconstructing day:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reconstruct day" },
      { status: 500 },
    );
  }
}
