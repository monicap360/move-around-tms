import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AggregateReconciliationConfig = {
  organizationId: string;
  scaleTolerancePct: number;
  moistureTolerancePct: number;
  finesTolerancePct: number;
  priceVariancePct: number;
  deliveryWindowHours: number;
};

function percentVariance(a?: number | null, b?: number | null) {
  if (a === null || a === undefined || b === null || b === undefined || b === 0) {
    return null;
  }
  return Math.abs((a - b) / b) * 100;
}

function hoursBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) return null;
  return Math.round(Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60));
}

export async function runAggregateReconciliation(config: AggregateReconciliationConfig) {
  const supabase = createSupabaseServerClient();

  const runInsert = await supabase
    .from("aggregate_reconciliation_runs")
    .insert({
      organization_id: config.organizationId,
      status: "running",
      input_counts: {},
    })
    .select()
    .single();

  if (runInsert.error || !runInsert.data) {
    throw new Error(runInsert.error?.message || "Failed to start reconciliation run");
  }

  const runId = runInsert.data.id;

  const [ticketsRes, labsRes, proofsRes, invoicesRes, partnersRes] = await Promise.all([
    supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("aggregate_lab_results")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("aggregate_delivery_proofs")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase.from("aggregate_partners").select("id, trust_level, tolerance_multiplier"),
  ]);

  const tickets = ticketsRes.data || [];
  const labResults = labsRes.data || [];
  const deliveryProofs = proofsRes.data || [];
  const invoices = invoicesRes.data || [];
  const partners = partnersRes.data || [];

  const partnerMap = new Map<string, { trust_level?: string | null; tolerance_multiplier?: number | null }>();
  partners.forEach((partner) => {
    if (partner.id) {
      partnerMap.set(partner.id, {
        trust_level: partner.trust_level,
        tolerance_multiplier: partner.tolerance_multiplier,
      });
    }
  });

  const inputCounts = {
    tickets: tickets.length,
    labResults: labResults.length,
    deliveryProofs: deliveryProofs.length,
    invoices: invoices.length,
  };

  const labByTicket = new Map<string, any>();
  labResults.forEach((lab) => {
    if (lab.ticket_number) labByTicket.set(lab.ticket_number, lab);
  });

  const deliveryByTicket = new Map<string, any>();
  deliveryProofs.forEach((proof) => {
    if (proof.ticket_number) deliveryByTicket.set(proof.ticket_number, proof);
  });

  const invoiceByNumber = new Map<string, any>();
  invoices.forEach((inv) => {
    if (inv.invoice_number) invoiceByNumber.set(inv.invoice_number, inv);
  });

  let matchedCount = 0;
  let exceptionCount = 0;

  for (const ticket of tickets) {
    const exceptions: { type: string; severity: string; explanation: string }[] = [];

    const invoice = ticket.invoice_number
      ? invoiceByNumber.get(ticket.invoice_number)
      : null;
    const lab = ticket.ticket_number ? labByTicket.get(ticket.ticket_number) : null;
    const delivery = ticket.ticket_number
      ? deliveryByTicket.get(ticket.ticket_number)
      : null;

    const partner = ticket.partner_id ? partnerMap.get(ticket.partner_id) : null;
    const multiplier = Number(partner?.tolerance_multiplier || 1);
    const scaleTolerance = config.scaleTolerancePct * multiplier;
    const moistureTolerance = config.moistureTolerancePct * multiplier;
    const finesTolerance = config.finesTolerancePct * multiplier;
    const priceTolerance = config.priceVariancePct * multiplier;

    const quantityVariance = percentVariance(
      ticket.net_weight || ticket.quantity,
      ticket.quantity,
    );
    if (quantityVariance !== null && quantityVariance > scaleTolerance) {
      exceptions.push({
        type: "weight_mismatch",
        severity: quantityVariance > scaleTolerance * 2 ? "high" : "medium",
        explanation: `Scale variance ${quantityVariance.toFixed(2)}% exceeds tolerance (${scaleTolerance.toFixed(2)}%).`,
      });
    }

    if (lab?.moisture_pct !== null && lab?.moisture_pct !== undefined) {
      const moistureVariance = Math.abs(lab.moisture_pct - (ticket.moisture_pct || 0));
      if (moistureVariance > moistureTolerance) {
        exceptions.push({
          type: "moisture_variance",
          severity: moistureVariance > moistureTolerance * 2 ? "high" : "medium",
          explanation: `Moisture variance ${moistureVariance.toFixed(2)}% exceeds tolerance (${moistureTolerance.toFixed(2)}%).`,
        });
      }
    }

    if (lab?.fines_pct !== null && lab?.fines_pct !== undefined) {
      if (lab.fines_pct > finesTolerance) {
        exceptions.push({
          type: "quality_variance",
          severity: "high",
          explanation: `Fines content ${lab.fines_pct.toFixed(2)}% exceeds tolerance (${finesTolerance.toFixed(2)}%).`,
        });
      }
    }

    if (delivery) {
      if (!delivery.geofence_match) {
        exceptions.push({
          type: "delivery_location",
          severity: "medium",
          explanation: "Delivery location did not match geofence.",
        });
      }

      const deliveryVariance = hoursBetween(
        delivery.delivered_at,
        ticket.ticket_date,
      );
      if (deliveryVariance !== null && deliveryVariance > config.deliveryWindowHours) {
        exceptions.push({
          type: "delivery_window",
          severity: "low",
          explanation: `Delivery time variance ${deliveryVariance} hours exceeds window.`,
        });
      }
    }

    if (invoice) {
      const priceVariance = percentVariance(invoice.total, ticket.total_bill);
      if (priceVariance !== null && priceVariance > priceTolerance) {
        exceptions.push({
          type: "price_variance",
          severity: priceVariance > priceTolerance * 2 ? "high" : "medium",
          explanation: `Invoice price variance ${priceVariance.toFixed(
            2,
          )}% exceeds tolerance (${priceTolerance.toFixed(2)}%).`,
        });
      }
    }

    const status = exceptions.length > 0 ? "exception" : "matched";

    const { data: result, error: resultError } = await supabase
      .from("aggregate_reconciliation_results")
      .insert({
        organization_id: config.organizationId,
        run_id: runId,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        status,
        quantity_variance_pct: quantityVariance,
        quality_variance_pct: lab?.fines_pct ?? null,
        delivery_variance_hours: delivery
          ? hoursBetween(delivery.delivered_at, ticket.ticket_date)
          : null,
        price_variance_pct: invoice
          ? percentVariance(invoice.total, ticket.total_bill)
          : null,
      })
      .select()
      .single();

    if (resultError || !result) {
      throw new Error(resultError?.message || "Failed to store reconciliation result");
    }

    if (exceptions.length > 0) {
      exceptionCount += 1;
      for (const ex of exceptions) {
        await supabase.from("aggregate_reconciliation_exceptions").insert({
          organization_id: config.organizationId,
          run_id: runId,
          result_id: result.id,
          exception_type: ex.type,
          severity: ex.severity,
          explanation: ex.explanation,
        });

        await supabase.from("workflow_tickets").insert({
          organization_id: config.organizationId,
          source_type: "matching",
          source_id: result.id,
          department:
            ex.type === "price_variance"
              ? "accounting"
              : ex.type.includes("delivery")
                ? "warehouse"
                : "procurement",
          title: ex.explanation,
          description: `Ticket ${ticket.ticket_number} ${ex.explanation}`,
          status: "open",
        });
      }
    } else {
      matchedCount += 1;
    }
  }

  await supabase
    .from("aggregate_reconciliation_runs")
    .update({
      status: "completed",
      input_counts: inputCounts,
      matched_count: matchedCount,
      exception_count: exceptionCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return {
    runId,
    inputCounts,
    matchedCount,
    exceptionCount,
  };
}
