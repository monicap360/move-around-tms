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

function normalizeTicket(value?: string | null) {
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

function parseConfidence(value: any) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

function getOcrConfidence(ocrFields: any, key: string) {
  if (!ocrFields || typeof ocrFields !== "object") return null;
  return parseConfidence(ocrFields[key]);
}

function matchMasterLoad(ticket: any, masterLoads: any[]) {
  const ticketNumber = normalizeTicket(ticket.ticket_number);
  if (ticketNumber) {
    const exact = masterLoads.find((row) => normalizeTicket(row.ticket_number) === ticketNumber);
    if (exact) return { row: exact, method: "ticket_exact", confidence: 95, key: ticketNumber };

    const fuzzy = masterLoads.find((row) => {
      const candidate = normalizeTicket(row.ticket_number);
      return candidate && editDistance(ticketNumber, candidate) <= 1;
    });
    if (fuzzy) return { row: fuzzy, method: "ticket_fuzzy", confidence: 82, key: ticketNumber };
  }

  const ticketDate = ticket.ticket_date ? String(ticket.ticket_date).slice(0, 10) : null;
  const truck = normalizeTicket(ticket.truck_number || ticket.truck_identifier);
  if (ticketDate && truck) {
    const byTruck = masterLoads.find(
      (row) =>
        normalizeTicket(row.truck_identifier) === truck &&
        String(row.planned_date || "").slice(0, 10) === ticketDate,
    );
    if (byTruck) return { row: byTruck, method: "truck_date", confidence: 72, key: `${truck}-${ticketDate}` };
  }

  const customer = (ticket.customer_name || "").toLowerCase();
  if (ticketDate && customer) {
    const byCustomer = masterLoads.find(
      (row) =>
        String(row.customer_name || "").toLowerCase() === customer &&
        String(row.planned_date || "").slice(0, 10) === ticketDate,
    );
    if (byCustomer) return { row: byCustomer, method: "customer_date", confidence: 65, key: `${customer}-${ticketDate}` };
  }

  return { row: null, method: "none", confidence: 0, key: null };
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

  const [ticketsRes, labsRes, proofsRes, invoicesRes, partnersRes, masterLoadsRes, settingsRes] = await Promise.all([
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
    supabase
      .from("aggregate_master_loads")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("aggregate_tolerance_settings")
      .select("*")
      .eq("organization_id", config.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const tickets = ticketsRes.data || [];
  const labResults = labsRes.data || [];
  const deliveryProofs = proofsRes.data || [];
  const invoices = invoicesRes.data || [];
  const partners = partnersRes.data || [];
  const masterLoads = masterLoadsRes.data || [];
  const settings = settingsRes.data || null;

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
    masterLoads: masterLoads.length,
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
    const scaleTolerance = (settings?.scale_tolerance_pct ?? config.scaleTolerancePct) * multiplier;
    const moistureTolerance = (settings?.moisture_tolerance_pct ?? config.moistureTolerancePct) * multiplier;
    const finesTolerance = (settings?.fines_tolerance_pct ?? config.finesTolerancePct) * multiplier;
    const priceTolerance = (settings?.price_variance_pct ?? config.priceVariancePct) * multiplier;
    const deliveryWindowHours = settings?.delivery_window_hours ?? config.deliveryWindowHours;

    const ocrFieldsConfidence = ticket.ocr_fields_confidence || null;
    const ticketNumberConf = getOcrConfidence(ocrFieldsConfidence, "ticket_number");
    const quantityConf = getOcrConfidence(ocrFieldsConfidence, "quantity");
    const materialConf = getOcrConfidence(ocrFieldsConfidence, "material");
    const overallOcrConfidence = parseConfidence(ticket.ocr_confidence);

    if (overallOcrConfidence !== null && overallOcrConfidence < 70) {
      exceptions.push({
        type: "ocr_low_confidence",
        severity: overallOcrConfidence < 50 ? "high" : "medium",
        explanation: `OCR confidence ${overallOcrConfidence}% below threshold.`,
      });
    }

    if (ticketNumberConf !== null && ticketNumberConf < 0.7) {
      exceptions.push({
        type: "ocr_ticket_number",
        severity: ticketNumberConf < 0.5 ? "high" : "medium",
        explanation: `Ticket number confidence ${Math.round(ticketNumberConf * 100)}% below threshold.`,
      });
    }

    if (quantityConf !== null && quantityConf < 0.75) {
      exceptions.push({
        type: "ocr_quantity",
        severity: quantityConf < 0.5 ? "high" : "medium",
        explanation: `Quantity confidence ${Math.round(quantityConf * 100)}% below threshold.`,
      });
    }

    if (materialConf !== null && materialConf < 0.7) {
      exceptions.push({
        type: "ocr_material",
        severity: materialConf < 0.5 ? "high" : "medium",
        explanation: `Material confidence ${Math.round(materialConf * 100)}% below threshold.`,
      });
    }

    const masterMatch = matchMasterLoad(ticket, masterLoads);
    if (!masterMatch.row) {
      exceptions.push({
        type: "no_master_match",
        severity: "medium",
        explanation: "No master schedule match found.",
      });
    }

    if (masterMatch.row) {
      const planned = Number(masterMatch.row.planned_quantity || 0);
      const actual = Number(ticket.quantity || 0);
      if (planned && actual) {
        const plannedVariance = percentVariance(actual, planned);
        if (plannedVariance !== null && plannedVariance > scaleTolerance) {
          exceptions.push({
            type: "planned_variance",
            severity: plannedVariance > scaleTolerance * 2 ? "high" : "medium",
            explanation: `Planned variance ${plannedVariance.toFixed(2)}% exceeds tolerance (${scaleTolerance.toFixed(2)}%).`,
          });
        }
      }
    }

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
      if (!delivery.signature_url) {
        exceptions.push({
          type: "missing_signature",
          severity: "critical",
          explanation: "Missing delivery signature.",
        });
      }
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
      if (deliveryVariance !== null && deliveryVariance > deliveryWindowHours) {
        exceptions.push({
          type: "delivery_window",
          severity: "low",
          explanation: `Delivery time variance ${deliveryVariance} hours exceeds window.`,
        });
      }
    } else {
      exceptions.push({
        type: "missing_delivery_proof",
        severity: "medium",
        explanation: "No delivery proof found.",
      });
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
    const trustedPartner = partner?.trust_level === "trusted";
    const autoApprove = trustedPartner && exceptions.length === 0 && (overallOcrConfidence ?? 80) >= 80;

    const { data: result, error: resultError } = await supabase
      .from("aggregate_reconciliation_results")
      .insert({
        organization_id: config.organizationId,
        run_id: runId,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        status,
        master_load_id: masterMatch.row?.id || null,
        match_method: masterMatch.method,
        match_confidence: masterMatch.confidence,
        match_key: masterMatch.key,
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

    const ticketUpdates: Record<string, any> = {
      recon_status: status === "exception" ? "exception_queue" : "approved_queue",
      recon_matched_by: masterMatch.method,
    };

    if (masterMatch.row && status === "matched") {
      if (!ticket.customer_name && masterMatch.row.customer_name) {
        ticketUpdates.customer_name = masterMatch.row.customer_name;
      }
      if (!ticket.job_name && masterMatch.row.job_name) {
        ticketUpdates.job_name = masterMatch.row.job_name;
      }
      if (!ticket.quantity && masterMatch.row.planned_quantity) {
        ticketUpdates.quantity = masterMatch.row.planned_quantity;
      }
      if (!ticket.unit_type && masterMatch.row.unit_type) {
        ticketUpdates.unit_type = masterMatch.row.unit_type;
      }
    }

    if (autoApprove) {
      ticketUpdates.status = "approved";
      ticketUpdates.payment_status = ticket.payment_status || "unpaid";
    }

    await supabase.from("aggregate_tickets").update(ticketUpdates).eq("id", ticket.id);
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
