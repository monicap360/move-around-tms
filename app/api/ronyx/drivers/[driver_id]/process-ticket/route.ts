import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import {
  TicketPayload,
  createSettlementItem,
  findApplicableRate,
  getWeeklySummary,
} from "@/lib/ronyx/payRateService";

export async function POST(
  req: Request,
  { params }: { params: { driver_id: string } },
) {
  try {
    const body = await req.json();
    const driverId = params.driver_id;
    const {
      load_id,
      ticket_number,
      net_tons,
      material_type,
      customer_id,
      job_id,
      equipment_used,
      miles,
      hours,
    } = body || {};

    if (!driverId || !load_id || !ticket_number) {
      return NextResponse.json(
        { error: "driver_id, load_id, and ticket_number are required" },
        { status: 400 },
      );
    }

    const payload: TicketPayload = {
      driver_id: driverId,
      load_id,
      ticket_number,
      net_tons,
      material_type,
      customer_id,
      job_id,
      equipment_used,
      miles,
      hours,
    };

    const { data: existing } = await supabaseAdmin
      .from("driver_settlement_items")
      .select("id")
      .eq("driver_id", driverId)
      .eq("ticket_number", ticket_number)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { error: "Ticket already processed for this driver" },
        { status: 409 },
      );
    }

    const selectedRate = await findApplicableRate(payload);
    if (!selectedRate) {
      return NextResponse.json(
        { error: "No rate found for driver" },
        { status: 422 },
      );
    }
    const { item: settlementItem, weekEndDate, amount } =
      await createSettlementItem(payload, selectedRate);
    const weeklySummary = await getWeeklySummary(driverId, weekEndDate);

    return NextResponse.json({
      success: true,
      data: {
        settlement_item: {
          ...settlementItem,
          rate_applied: selectedRate.rate_name || "Default Rate",
          rate_id: selectedRate.id,
        },
        weekly_summary: {
          driver_id: driverId,
          week_end_date: weekEndDate,
          total_tons: Number(weeklySummary.total_tons.toFixed(2)),
          total_amount: Number(weeklySummary.total_amount.toFixed(2)),
          load_count: weeklySummary.load_count,
        },
        next_pay_date: weekEndDate,
      },
      message: `Ticket processed. $${amount.toFixed(
        2,
      )} added to your settlement for week ending ${weekEndDate}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Invalid request" },
      { status: 400 },
    );
  }
}
