import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MatchingConfig = {
  organizationId: string;
  quantityVariancePct: number;
  priceVariancePct: number;
  deliveryWindowDays: number;
};

const UOM_TO_TON: Record<string, number> = {
  ton: 1,
  tons: 1,
  tn: 1,
  lb: 1 / 2000,
  lbs: 1 / 2000,
  pound: 1 / 2000,
  pounds: 1 / 2000,
  kg: 1 / 907.185,
  kilogram: 1 / 907.185,
  kilograms: 1 / 907.185,
};

function normalizeKey(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function convertQuantity(quantity: number, uom: string) {
  const factor = UOM_TO_TON[normalizeKey(uom)];
  if (!factor) return null;
  return quantity * factor;
}

export async function runMatching(config: MatchingConfig) {
  const supabase = createSupabaseServerClient();
  const runInsert = await supabase
    .from("matching_runs")
    .insert({
      organization_id: config.organizationId,
      status: "running",
      input_counts: {},
    })
    .select()
    .single();

  if (runInsert.error || !runInsert.data) {
    throw new Error(runInsert.error?.message || "Failed to start matching run");
  }

  const runId = runInsert.data.id;

  const [pitData, receipts, invoices, poData] = await Promise.all([
    supabase
      .from("pit_data")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("material_receipts")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("supplier_invoices")
      .select("*")
      .eq("organization_id", config.organizationId),
    supabase
      .from("po_data")
      .select("*")
      .eq("organization_id", config.organizationId),
  ]);

  const pitRows = pitData.data || [];
  const receiptRows = receipts.data || [];
  const invoiceRows = invoices.data || [];
  const poRows = poData.data || [];

  const inputCounts = {
    pit: pitRows.length,
    receipts: receiptRows.length,
    invoices: invoiceRows.length,
    pos: poRows.length,
  };

  const makeKey = (row: any) =>
    `${normalizeKey(row.material_number)}|${normalizeKey(row.batch_lot)}`;

  const groupByKey = (rows: any[]) => {
    const map = new Map<string, any[]>();
    rows.forEach((row) => {
      const key = makeKey(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(row);
    });
    return map;
  };

  const pitByKey = groupByKey(pitRows);
  const receiptsByKey = groupByKey(receiptRows);
  const poByKey = groupByKey(poRows);

  let matchedCount = 0;
  let exceptionCount = 0;

  for (const invoice of invoiceRows) {
    const key = makeKey(invoice);
    const receiptsForKey = receiptsByKey.get(key) || [];
    const pitForKey = pitByKey.get(key) || [];
    const poForKey = poByKey.get(key) || [];

    const receipt = receiptsForKey.shift() || null;
    const pit = pitForKey.shift() || null;
    const po = poForKey.shift() || null;

    if (receiptsForKey.length === 0) receiptsByKey.delete(key);
    if (pitForKey.length === 0) pitByKey.delete(key);
    if (poForKey.length === 0) poByKey.delete(key);

    const exceptions: { type: string; severity: string; explanation: string }[] =
      [];

    if (!receipt && !pit) {
      exceptions.push({
        type: "missing_receipt",
        severity: "high",
        explanation: "No material receipt or PIT entry found.",
      });
    }

    if (!po) {
      exceptions.push({
        type: "missing_po",
        severity: "medium",
        explanation: "No purchase order found for this item/batch.",
      });
    }

    const quantityReceived = receipt?.quantity ?? pit?.quantity ?? null;
    const quantityBilled = invoice.quantity ?? null;
    const uom = receipt?.uom || pit?.uom || invoice.uom;

    let variancePct: number | null = null;
    if (quantityReceived !== null && quantityBilled !== null) {
      const received = convertQuantity(quantityReceived, uom);
      const billed = convertQuantity(quantityBilled, invoice.uom || uom);
      if (received === null || billed === null) {
        exceptions.push({
          type: "uom_mismatch",
          severity: "medium",
          explanation: "Unit of measure could not be normalized.",
        });
      } else if (received > 0) {
        variancePct = Math.abs((billed - received) / received) * 100;
        if (variancePct > config.quantityVariancePct) {
          exceptions.push({
            type: "quantity_variance",
            severity: variancePct > 10 ? "high" : "medium",
            explanation: `Quantity variance ${variancePct.toFixed(
              2,
            )}% exceeds threshold.`,
          });
        }
      }
    }

    let priceVariancePct: number | null = null;
    if (po?.unit_price && invoice?.unit_price) {
      priceVariancePct =
        Math.abs(invoice.unit_price - po.unit_price) / po.unit_price * 100;
      if (priceVariancePct > config.priceVariancePct) {
        exceptions.push({
          type: "price_variance",
          severity: priceVariancePct > 15 ? "high" : "medium",
          explanation: `Price variance ${priceVariancePct.toFixed(
            2,
          )}% exceeds threshold.`,
        });
      }
    }

    const receiptDate = parseDate(receipt?.receipt_date) || parseDate(pit?.received_date);
    const invoiceDate = parseDate(invoice.invoice_date);
    const dateVariance = daysBetween(receiptDate, invoiceDate);
    if (dateVariance !== null && dateVariance > config.deliveryWindowDays) {
      exceptions.push({
        type: "date_window",
        severity: "low",
        explanation: `Delivery date variance ${dateVariance} days exceeds window.`,
      });
    }
    if (receiptDate && invoiceDate && invoiceDate < receiptDate) {
      exceptions.push({
        type: "invoice_before_receipt",
        severity: "medium",
        explanation: "Invoice date is earlier than the delivery receipt date.",
      });
    }

    if (receipt?.quality_hold || receipt?.quality_notes) {
      exceptions.push({
        type: "quality_hold",
        severity: "high",
        explanation: receipt?.quality_notes
          ? `Quality hold: ${receipt.quality_notes}`
          : "Quality hold flagged on receipt.",
      });
    }

    const status = exceptions.length > 0 ? "exception" : "matched";

    const { data: matched, error: matchedError } = await supabase
      .from("matched_records")
      .insert({
        organization_id: config.organizationId,
        run_id: runId,
        material_number: invoice.material_number,
        batch_lot: invoice.batch_lot || null,
        pit_id: pit?.id || null,
        receipt_id: receipt?.id || null,
        invoice_id: invoice.id,
        po_id: po?.id || null,
        quantity_received: quantityReceived,
        quantity_billed: quantityBilled,
        uom,
        unit_price_po: po?.unit_price || null,
        unit_price_invoice: invoice.unit_price || null,
        delivery_date: receipt?.receipt_date || pit?.received_date || null,
        status,
        variance_pct: variancePct,
        price_variance_pct: priceVariancePct,
        date_variance_days: dateVariance,
      })
      .select()
      .single();

    if (matchedError || !matched) {
      throw new Error(matchedError?.message || "Failed to save matched record");
    }

    if (exceptions.length > 0) {
      exceptionCount += 1;
      for (const ex of exceptions) {
        await supabase.from("matching_exceptions").insert({
          organization_id: config.organizationId,
          run_id: runId,
          matched_record_id: matched.id,
          exception_type: ex.type,
          severity: ex.severity,
          explanation: ex.explanation,
        });

        await supabase.from("exception_queue").insert({
          entity_type: "matching",
          entity_id: matched.id,
          impact_score: Math.min(100, variancePct ? variancePct : 10),
          confidence_score: 1,
          exception_type: ex.type,
          severity: ex.severity,
          explanation: ex.explanation,
        });

        const department =
          ex.type === "price_variance" || ex.type === "missing_po"
            ? "procurement"
            : ex.type === "quality_hold"
              ? "accounting"
              : ex.type === "invoice_before_receipt" || ex.type === "date_window"
                ? "accounting"
                : "warehouse";

        const titleMap: Record<string, string> = {
          quantity_variance: "Short shipment investigation required",
          price_variance: "Price increase requires approval",
          quality_hold: "Quality hold - do not pay invoice",
          invoice_before_receipt: "Invoice timing validation required",
          missing_po: "Missing PO requires procurement review",
          missing_receipt: "Missing receipt requires warehouse review",
          uom_mismatch: "Unit of measure mismatch requires review",
          date_window: "Delivery timing variance requires review",
        };

        await supabase.from("workflow_tickets").insert({
          organization_id: config.organizationId,
          source_type: "matching",
          source_id: matched.id,
          department,
          title: titleMap[ex.type] || "Exception review required",
          description: ex.explanation,
          status: "open",
        });
      }
    } else {
      matchedCount += 1;
    }
  }

  await supabase.from("matching_runs").update({
    status: "completed",
    input_counts: inputCounts,
    matched_count: matchedCount,
    exception_count: exceptionCount,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  return {
    runId,
    inputCounts,
    matchedCount,
    exceptionCount,
  };
}
