/**
 * Advanced Rating Engine
 * Calculates rates with accessorials, per-dimension pricing, and cumulative options
 */

export interface RateRule {
  id: string;
  name: string;
  baseRate: number;
  rateType: "per_mile" | "per_ton" | "per_hour" | "flat" | "per_dimension";
  accessorials: Accessorial[];
  cumulativeOptions?: CumulativeOption[];
}

export interface Accessorial {
  id: string;
  name: string;
  type: "flat" | "percentage" | "per_unit";
  value: number;
  condition?: (ticket: any) => boolean; // When to apply this accessorial
}

export interface CumulativeOption {
  type: "volume_discount" | "mileage_discount" | "tiered_pricing";
  thresholds: Array<{
    min: number;
    max?: number;
    discount: number; // Percentage or flat amount
  }>;
}

export interface RatingResult {
  baseRate: number;
  baseAmount: number;
  accessorials: Array<{
    name: string;
    amount: number;
  }>;
  subtotal: number;
  discounts: Array<{
    name: string;
    amount: number;
  }>;
  total: number;
  breakdown: string;
}

/**
 * Calculate rate for a ticket
 */
export function calculateRate(
  ticket: any,
  rateRule: RateRule
): RatingResult {
  let baseAmount = 0;
  const accessorialAmounts: Array<{ name: string; amount: number }> = [];
  const discountAmounts: Array<{ name: string; amount: number }> = [];

  // Calculate base amount
  switch (rateRule.rateType) {
    case "per_mile":
      const miles = ticket.miles || ticket.odometer_end - ticket.odometer_start || 0;
      baseAmount = rateRule.baseRate * miles;
      break;
    case "per_ton":
      baseAmount = rateRule.baseRate * (ticket.quantity || 0);
      break;
    case "per_hour":
      const hours = ticket.hours || 0;
      baseAmount = rateRule.baseRate * hours;
      break;
    case "flat":
      baseAmount = rateRule.baseRate;
      break;
    case "per_dimension":
      // LTL per-dimension rating (length * width * height / divisor)
      const length = ticket.length || 0;
      const width = ticket.width || 0;
      const height = ticket.height || 0;
      const cubicFeet = (length * width * height) / 1728; // Convert to cubic feet
      baseAmount = rateRule.baseRate * cubicFeet;
      break;
  }

  // Apply accessorials
  rateRule.accessorials.forEach((accessorial) => {
    if (!accessorial.condition || accessorial.condition(ticket)) {
      let amount = 0;
      switch (accessorial.type) {
        case "flat":
          amount = accessorial.value;
          break;
        case "percentage":
          amount = baseAmount * (accessorial.value / 100);
          break;
        case "per_unit":
          amount = accessorial.value * (ticket.quantity || 1);
          break;
      }
      accessorialAmounts.push({
        name: accessorial.name,
        amount,
      });
    }
  });

  // Apply cumulative options (discounts)
  if (rateRule.cumulativeOptions) {
    rateRule.cumulativeOptions.forEach((option) => {
      if (option.type === "volume_discount") {
        const quantity = ticket.quantity || 0;
        const threshold = option.thresholds.find(
          (t) => quantity >= t.min && (!t.max || quantity <= t.max)
        );
        if (threshold) {
          const discount = baseAmount * (threshold.discount / 100);
          discountAmounts.push({
            name: `Volume Discount (${threshold.discount}%)`,
            amount: discount,
          });
        }
      } else if (option.type === "mileage_discount") {
        const miles = ticket.miles || 0;
        const threshold = option.thresholds.find(
          (t) => miles >= t.min && (!t.max || miles <= t.max)
        );
        if (threshold) {
          const discount = baseAmount * (threshold.discount / 100);
          discountAmounts.push({
            name: `Mileage Discount (${threshold.discount}%)`,
            amount: discount,
          });
        }
      }
    });
  }

  const subtotal = baseAmount + accessorialAmounts.reduce((sum, a) => sum + a.amount, 0);
  const totalDiscount = discountAmounts.reduce((sum, d) => sum + d.amount, 0);
  const total = subtotal - totalDiscount;

  // Generate breakdown text
  const breakdown = `
Base Rate (${rateRule.rateType}): $${baseAmount.toFixed(2)}
${accessorialAmounts.map((a) => `${a.name}: $${a.amount.toFixed(2)}`).join("\n")}
${discountAmounts.map((d) => `${d.name}: -$${d.amount.toFixed(2)}`).join("\n")}
Subtotal: $${subtotal.toFixed(2)}
Total Discount: -$${totalDiscount.toFixed(2)}
Total: $${total.toFixed(2)}
  `.trim();

  return {
    baseRate: rateRule.baseRate,
    baseAmount,
    accessorials: accessorialAmounts,
    subtotal,
    discounts: discountAmounts,
    total,
    breakdown,
  };
}

/**
 * Default accessorials
 */
export const DEFAULT_ACCESSORIALS: Accessorial[] = [
  {
    id: "fuel_surcharge",
    name: "Fuel Surcharge",
    type: "percentage",
    value: 5, // 5% fuel surcharge
    condition: () => true, // Always apply
  },
  {
    id: "detention",
    name: "Detention",
    type: "per_hour",
    value: 50, // $50/hour
    condition: (ticket) => (ticket.detention_hours || 0) > 0,
  },
  {
    id: "layover",
    name: "Layover",
    type: "flat",
    value: 200, // $200 flat
    condition: (ticket) => ticket.layover === true,
  },
  {
    id: "tarp",
    name: "Tarp Charge",
    type: "flat",
    value: 150, // $150 flat
    condition: (ticket) => ticket.tarp_required === true,
  },
  {
    id: "oversize",
    name: "Oversize Permit",
    type: "flat",
    value: 300, // $300 flat
    condition: (ticket) => ticket.oversize === true,
  },
];
