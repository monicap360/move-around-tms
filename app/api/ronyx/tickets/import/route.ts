import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Numeric coercion — strips currency symbols, commas, spaces
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Date coercion — handles MM/DD/YYYY, YYYY-MM-DD, "Jun 14 2026", Excel serials
function toDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Excel serial date (number)
  const serial = Number(s);
  if (!isNaN(serial) && serial > 1000 && serial < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

type RowInput = Record<string, unknown>;

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await req.json();
    const rows: RowInput[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const CHUNK = 50; // insert 50 rows at a time
    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK).map((row) => {
        // Known fields mapped explicitly
        const quantity = toNum(row.tons ?? row.quantity ?? row.net_tons ?? row.net_wt);
        const grossWeight = toNum(row.gross_weight ?? row.gross ?? row.gross_wt);
        const tareWeight = toNum(row.tare_weight ?? row.tare ?? row.tare_wt);
        const netWeight =
          quantity !== null
            ? quantity
            : grossWeight !== null && tareWeight !== null
            ? grossWeight - tareWeight
            : null;

        const payRate = toNum(row.pay_rate ?? row.driver_rate);
        const billRate = toNum(row.bill_rate ?? row.rate ?? row.unit_price ?? row.rate_per_ton);

        // Build notes from ALL remaining columns that weren't mapped
        const KNOWN = new Set([
          "ticket_number","ticket_date","driver_name","truck_number",
          "material","material_name","tons","quantity","net_tons","net_wt",
          "pay_rate","driver_rate","bill_rate","rate","unit_price","rate_per_ton",
          "customer_name","project_name","job_name","po_number",
          "pit_location_name","pickup_location","delivery_location",
          "invoice_number","gross_weight","gross","gross_wt",
          "tare_weight","tare","tare_wt","amount","total",
        ]);
        const extras = Object.entries(row)
          .filter(([k, v]) => !KNOWN.has(k) && v !== null && v !== undefined && String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");

        return {
          ticket_number:    String(row.ticket_number || "").trim() || undefined,
          ticket_date:      toDate(row.ticket_date) ?? new Date().toISOString().slice(0, 10),
          driver_name:      String(row.driver_name || "").trim() || null,
          truck_number:     String(row.truck_number || "").trim() || null,
          material:         String(row.material_name ?? row.material ?? "").trim() || null,
          unit_type:        "Ton",
          quantity:         netWeight,
          pay_rate:         payRate,
          bill_rate:        billRate,
          rate_amount:      billRate,
          gross_weight:     grossWeight,
          tare_weight:      tareWeight,
          net_weight:       netWeight,
          customer_name:    String(row.customer_name || "").trim() || null,
          job_name:         String(row.project_name ?? row.job_name ?? "").trim() || null,
          invoice_number:   String(row.invoice_number || "").trim() || null,
          pickup_location:  String(row.pit_location_name ?? row.pickup_location ?? "").trim() || null,
          delivery_location:String(row.delivery_location || "").trim() || null,
          work_order_number:String(row.po_number || "").trim() || null,
          ticket_notes:     extras || null,
          source:           "excel_import",
          status:           "pending",
          payment_status:   "unpaid",
          has_photo:        false,
          has_signature:    false,
        };
      });

      const { data, error } = await supabase
        .from("aggregate_tickets")
        .insert(chunk)
        .select("id");

      if (error) {
        failed += chunk.length;
        if (errors.length < 5) errors.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`);
      } else {
        created += data?.length ?? chunk.length;
      }
    }

    return NextResponse.json({
      created,
      failed,
      total: rows.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Import failed" }, { status: 500 });
  }
}
