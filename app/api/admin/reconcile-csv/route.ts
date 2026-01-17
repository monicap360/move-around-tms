import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Papa from "papaparse";

export const dynamic = 'force-dynamic';

// Admin-only endpoint to reconcile tickets against material plant CSV files
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { ticketId, csvUrl } = await req.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 },
      );
    }

    // Get the ticket details
    const { data: ticket, error: ticketErr } = await supabase
      .from("aggregate_tickets")
      .select("*, aggregate_partners(name)")
      .eq("id", ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // If CSV URL provided, fetch and parse it
    let csvData: any[] = [];
    if (csvUrl) {
      const csvResponse = await fetch(csvUrl);
      const csvText = await csvResponse.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      csvData = parsed.data;
    }

    // Try to find matching record in CSV
    const match = findTicketInCsv(ticket, csvData);

    if (match) {
      // Update ticket with reconciliation info
      await supabase
        .from("aggregate_tickets")
        .update({
          csv_reconciled: true,
          csv_match_details: {
            matched: true,
            csv_ticket_number: match.ticket_number,
            csv_quantity: match.quantity,
            csv_material: match.material,
            csv_date: match.date,
            quantity_match:
              Math.abs(parseFloat(match.quantity) - ticket.quantity) < 0.1,
            date_match: match.date === ticket.ticket_date,
            matched_at: new Date().toISOString(),
          },
        })
        .eq("id", ticketId);

      return NextResponse.json({
        success: true,
        reconciled: true,
        match: {
          ticket_number: match.ticket_number,
          quantity: match.quantity,
          material: match.material,
          date: match.date,
        },
      });
    } else {
      // No match found
      await supabase
        .from("aggregate_tickets")
        .update({
          csv_reconciled: false,
          csv_match_details: {
            matched: false,
            attempted_at: new Date().toISOString(),
            csv_records_checked: csvData.length,
          },
        })
        .eq("id", ticketId);

      return NextResponse.json({
        success: true,
        reconciled: false,
        message: "No matching record found in plant CSV",
      });
    }
  } catch (err: any) {
    console.error("CSV reconciliation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reconcile" },
      { status: 500 },
    );
  }
}

function findTicketInCsv(ticket: any, csvData: any[]): any | null {
  // Try to match by ticket number (most reliable)
  let match = csvData.find(
    (row) =>
      row.ticket_number?.trim() === ticket.ticket_number?.trim() ||
      row.TicketNumber?.trim() === ticket.ticket_number?.trim() ||
      row["Ticket #"]?.trim() === ticket.ticket_number?.trim(),
  );

  if (match) return match;

  const ticketNumber = normalizeTicket(ticket.ticket_number);
  if (ticketNumber) {
    match = csvData.find((row) => {
      const candidate = normalizeTicket(row.ticket_number || row.TicketNumber || row["Ticket #"]);
      if (!candidate) return false;
      return editDistance(ticketNumber, candidate) <= 1;
    });
  }

  if (match) return match;

  // Try fuzzy match by date + quantity + material
  match = csvData.find((row) => {
    const dateMatch =
      row.date === ticket.ticket_date ||
      row.Date === ticket.ticket_date ||
      row.delivery_date === ticket.ticket_date;

    const quantityMatch =
      Math.abs(
        parseFloat(row.quantity || row.Quantity || row.tons || 0) -
          ticket.quantity,
      ) < 0.1;

    const materialMatch =
      row.material?.toLowerCase().includes(ticket.material?.toLowerCase()) ||
      row.Material?.toLowerCase().includes(ticket.material?.toLowerCase()) ||
      row.product?.toLowerCase().includes(ticket.material?.toLowerCase());

    return dateMatch && quantityMatch && materialMatch;
  });

  return match || null;
}

function normalizeTicket(value?: string) {
  if (!value) return "";
  return String(value).replace(/\s+/g, "").toUpperCase();
}

function editDistance(a: string, b: string) {
  if (!a || !b) return Math.max(a.length, b.length);
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

// GET endpoint to auto-reconcile all missing tickets
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get all unreconciled missing tickets
    const { data: tickets, error } = await supabase
      .from("aggregate_tickets")
      .select("id, ticket_number, aggregate_partners(name, csv_export_url)")
      .eq("is_missing_ticket", true)
      .eq("csv_reconciled", false)
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];
    for (const ticket of tickets || []) {
      const partner = (ticket as any).aggregate_partners;
      if (partner?.csv_export_url) {
        try {
          // Reconcile against partner's CSV
          const response = await POST(
            new NextRequest(req.url, {
              method: "POST",
              body: JSON.stringify({
                ticketId: ticket.id,
                csvUrl: partner.csv_export_url,
              }),
            }),
          );
          const result = await response.json();
          results.push({ ticketId: ticket.id, ...result });
        } catch (err) {
          results.push({ ticketId: ticket.id, error: "Reconciliation failed" });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Batch reconciliation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to batch reconcile" },
      { status: 500 },
    );
  }
}
