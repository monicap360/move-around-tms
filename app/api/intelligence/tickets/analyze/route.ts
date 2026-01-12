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
    const { ticket_id } = body;

    if (!ticket_id) {
      return NextResponse.json(
        { error: "ticket_id is required" },
        { status: 400 },
      );
    }

    // Fetch ticket data from aggregate_tickets (primary table)
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      // Try tickets table as fallback
      const { data: altTicket } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticket_id)
        .single();

      if (!altTicket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 },
        );
      }

      // Use altTicket for analysis
      return analyzeTicket(altTicket);
    }

    return analyzeTicket(ticket);
  } catch (error: any) {
    console.error("Error analyzing ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze ticket" },
      { status: 500 },
    );
  }
}

function analyzeTicket(ticket: any) {
  // Analyze ticket for anomalies
  const anomalies: string[] = [];
  let forensicScore = 100; // Start with perfect score, deduct for issues

  // Check for weight mismatches
  if (ticket.ocr_net && ticket.recon_net) {
    const weightDiff = Math.abs(Number(ticket.ocr_net) - Number(ticket.recon_net));
    const weightDiffPercent = (weightDiff / Number(ticket.ocr_net)) * 100;
    
    if (weightDiffPercent > 5) {
      anomalies.push("weight_mismatch");
      forensicScore -= 15;
    } else if (weightDiffPercent > 2) {
      anomalies.push("minor_weight_variance");
      forensicScore -= 5;
    }
  }

  // Check for date offsets
  if (ticket.ocr_timestamp && ticket.ticket_date) {
    const ocrDate = new Date(ticket.ocr_timestamp);
    const ticketDate = new Date(ticket.ticket_date);
    const daysDiff = Math.abs((ocrDate.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) {
      anomalies.push("date_offset");
      forensicScore -= 10;
    }
  }

  // Check for material mismatches
  if (ticket.ocr_json && ticket.recon_material) {
    const ocrMaterial = (ticket.ocr_json as any)?.material || (ticket.ocr_json as any)?.commodity;
    if (ocrMaterial && ticket.recon_material && ocrMaterial.toLowerCase() !== ticket.recon_material.toLowerCase()) {
      anomalies.push("material_mismatch");
      forensicScore -= 10;
    }
  }

  // Check for plant mismatches
  if (ticket.plant && ticket.recon_plant && ticket.plant !== ticket.recon_plant) {
    anomalies.push("plant_mismatch");
    forensicScore -= 5;
  }

  // Check if ticket is reconciled
  if (!ticket.reconciled && ticket.recon_status !== "reconciled") {
    anomalies.push("unreconciled");
    forensicScore -= 20;
  }

  // Ensure score is between 0 and 100
  forensicScore = Math.max(0, Math.min(100, forensicScore));

  // Generate recommendations
  const recommendations: string[] = [];
  if (anomalies.includes("weight_mismatch")) {
    recommendations.push("Review weight discrepancy between OCR and reconciliation");
  }
  if (anomalies.includes("date_offset")) {
    recommendations.push("Verify ticket date matches load date");
  }
  if (anomalies.includes("material_mismatch")) {
    recommendations.push("Confirm material type matches between OCR and reconciliation");
  }
  if (anomalies.includes("unreconciled")) {
    recommendations.push("Complete ticket reconciliation to ensure accuracy");
  }
  if (anomalies.length === 0) {
    recommendations.push("Ticket appears to be in good standing");
  }

  // Calculate confidence
  let confidence = 0.9;
  if (!ticket.ocr_net || !ticket.recon_net) confidence -= 0.2;
  if (!ticket.ocr_timestamp) confidence -= 0.1;
  if (!ticket.recon_material) confidence -= 0.1;
  confidence = Math.max(0.5, Math.min(1.0, confidence));

  return NextResponse.json({
    status: "ok",
    ticket_id: ticket.id,
    forensic_score: Math.round(forensicScore),
    anomalies,
    confidence: Math.round(confidence * 100) / 100,
    recommendations,
    ticket,
  });
}
