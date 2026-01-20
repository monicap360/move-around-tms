import supabaseAdmin from "@/lib/supabaseAdmin";

export type DriverRate = {
  id: string;
  rate_name: string | null;
  rate_type: "PER_TON" | "PER_LOAD" | "PER_MILE" | "PER_HOUR";
  rate_value: number;
  material_type: string | null;
  customer_id: string | null;
  job_id: string | null;
  equipment_type: string | null;
  is_default: boolean | null;
  effective_date: string;
};

export type TicketPayload = {
  driver_id: string;
  load_id: string;
  ticket_number: string;
  net_tons?: number;
  material_type?: string | null;
  customer_id?: string | null;
  job_id?: string | null;
  equipment_used?: string | null;
  miles?: number | null;
  hours?: number | null;
};

export function getNextFriday(date: Date) {
  const day = date.getDay();
  const diff = (5 - day + 7) % 7;
  const result = new Date(date);
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result.toISOString().slice(0, 10);
}

function ratePriority(rate: DriverRate) {
  const hasMaterial = Boolean(rate.material_type);
  const hasCustomer = Boolean(rate.customer_id);
  const hasJob = Boolean(rate.job_id);
  const hasEquipment = Boolean(rate.equipment_type);
  if (hasMaterial && hasCustomer && hasJob && hasEquipment) return 1;
  if (hasMaterial && hasCustomer && hasEquipment) return 2;
  if (hasCustomer && hasEquipment) return 3;
  if (hasMaterial && hasEquipment) return 4;
  if (hasCustomer) return 5;
  if (hasMaterial) return 6;
  if (hasEquipment) return 7;
  if (rate.is_default) return 8;
  return 9;
}

function matchesRate(rate: DriverRate, payload: TicketPayload) {
  if (rate.material_type && rate.material_type !== payload.material_type) return false;
  if (rate.customer_id && rate.customer_id !== payload.customer_id) return false;
  if (rate.job_id && rate.job_id !== payload.job_id) return false;
  if (rate.equipment_type && rate.equipment_type !== payload.equipment_used) return false;
  return true;
}

export async function findApplicableRate(payload: TicketPayload) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: rates, error } = await supabaseAdmin
    .from("driver_pay_rates")
    .select("*")
    .eq("driver_id", payload.driver_id)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const matchingRates = (rates || [])
    .filter((rate: DriverRate) => matchesRate(rate, payload))
    .sort((a: DriverRate, b: DriverRate) => ratePriority(a) - ratePriority(b));

  return matchingRates[0] as DriverRate | undefined;
}

export function calculateAmount(rate: DriverRate, payload: TicketPayload) {
  let quantity = 0;
  if (rate.rate_type === "PER_TON") {
    quantity = Number(payload.net_tons || 0);
  } else if (rate.rate_type === "PER_LOAD") {
    quantity = 1;
  } else if (rate.rate_type === "PER_MILE") {
    quantity = Number(payload.miles || 0);
  } else if (rate.rate_type === "PER_HOUR") {
    quantity = Number(payload.hours || 0);
  }

  if (!quantity || Number.isNaN(quantity)) {
    throw new Error("Missing quantity for rate calculation");
  }

  const amount = Number((quantity * Number(rate.rate_value || 0)).toFixed(2));
  return { quantity, amount };
}

export async function createSettlementItem(
  payload: TicketPayload,
  rate: DriverRate,
) {
  const weekEndDate = getNextFriday(new Date());
  const { quantity, amount } = calculateAmount(rate, payload);

  const { data: item, error } = await supabaseAdmin
    .from("driver_settlement_items")
    .insert({
      driver_id: payload.driver_id,
      load_id: payload.load_id,
      ticket_number: payload.ticket_number,
      week_end_date: weekEndDate,
      quantity,
      rate_type: rate.rate_type,
      rate_value: rate.rate_value,
      calculated_amount: amount,
      material_type: payload.material_type || null,
      customer_id: payload.customer_id || null,
      status: "PENDING",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { item, weekEndDate, amount };
}

export async function getWeeklySummary(driverId: string, weekEndDate: string) {
  const { data, error } = await supabaseAdmin
    .from("driver_settlement_items")
    .select("quantity, calculated_amount")
    .eq("driver_id", driverId)
    .eq("week_end_date", weekEndDate)
    .eq("status", "PENDING");

  if (error) {
    throw new Error(error.message);
  }

  const totals = (data || []).reduce(
    (acc, row: any) => {
      acc.total_tons += Number(row.quantity || 0);
      acc.total_amount += Number(row.calculated_amount || 0);
      acc.load_count += 1;
      return acc;
    },
    { total_tons: 0, total_amount: 0, load_count: 0 },
  );

  return totals;
}
