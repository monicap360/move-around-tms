import supabaseAdmin from "@/lib/supabaseAdmin";

type TicketRow = {
  id: string;
  project_id: string | null;
  customer_id: string | null;
  material_type: string | null;
  load_weight: number | null;
  cubic_yards: number | null;
  load_count: number | null;
  waiting_minutes: number | null;
  calculated_distance: number | null;
};

type ProjectRow = {
  id: string;
  rate_per_ton: number | null;
  rate_per_cy: number | null;
  rate_per_load: number | null;
  min_daily_rate: number | null;
  fuel_surcharge_applicable: boolean | null;
  retainage_percent: number | null;
  waiting_rate_per_minute: number | null;
};

type CustomerRow = {
  id: string;
  customer_name: string;
  payment_terms: string | null;
};

function calculateDueDate(paymentTerms?: string | null) {
  const now = new Date();
  const map: Record<string, number> = {
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
    cod: 0,
    weekly: 7,
  };
  const days = paymentTerms ? map[paymentTerms] ?? 30 : 30;
  const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return due.toISOString().slice(0, 10);
}

function calculateFuelSurcharge(baseAmount: number) {
  const basePrice = 2.5;
  const currentPrice = 2.9;
  if (currentPrice <= basePrice) return 0;
  const increase = currentPrice - basePrice;
  const surchargePercent = increase / basePrice;
  return Number((baseAmount * surchargePercent).toFixed(2));
}

function calculateTotals(tickets: TicketRow[], project: ProjectRow) {
  let subtotal = 0;
  let waitingCharges = 0;

  tickets.forEach((ticket) => {
    if (project.rate_per_load) {
      subtotal += project.rate_per_load;
    } else if (project.rate_per_ton && ticket.load_weight) {
      subtotal += project.rate_per_ton * ticket.load_weight;
    } else if (project.rate_per_cy && ticket.cubic_yards) {
      subtotal += project.rate_per_cy * ticket.cubic_yards;
    } else if (ticket.load_count) {
      subtotal += ticket.load_count;
    }

    if (ticket.waiting_minutes && project.waiting_rate_per_minute) {
      waitingCharges += ticket.waiting_minutes * project.waiting_rate_per_minute;
    }
  });

  if (project.min_daily_rate) {
    const dailyTotal = subtotal + waitingCharges;
    if (dailyTotal < project.min_daily_rate) {
      subtotal = project.min_daily_rate - waitingCharges;
    }
  }

  const fuelSurcharge = project.fuel_surcharge_applicable
    ? calculateFuelSurcharge(subtotal)
    : 0;
  const retainage = project.retainage_percent
    ? ((subtotal + fuelSurcharge + waitingCharges) *
        project.retainage_percent) /
      100
    : 0;

  const totalAmount = subtotal + fuelSurcharge + waitingCharges;
  const netPayable = totalAmount - retainage;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    fuelSurcharge: Number(fuelSurcharge.toFixed(2)),
    waitingCharges: Number(waitingCharges.toFixed(2)),
    retainage: Number(retainage.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    netPayable: Number(netPayable.toFixed(2)),
  };
}

export async function generateInvoiceFromTickets(ticketIds: string[]) {
  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from("aggregate_tickets")
    .select(
      "id, project_id, customer_id, material_type, load_weight, cubic_yards, load_count, waiting_minutes, calculated_distance",
    )
    .in("id", ticketIds);

  if (ticketError) {
    throw new Error(ticketError.message);
  }

  const ticketsData = (tickets || []) as TicketRow[];
  if (ticketsData.length === 0) {
    throw new Error("No tickets found for invoice generation");
  }

  const projectId = ticketsData[0].project_id;
  const customerId = ticketsData[0].customer_id;
  if (!projectId || !customerId) {
    throw new Error("Tickets must include project_id and customer_id");
  }

  const { data: project } = await supabaseAdmin
    .from("ronyx_projects")
    .select(
      "id, rate_per_ton, rate_per_cy, rate_per_load, min_daily_rate, fuel_surcharge_applicable, retainage_percent, waiting_rate_per_minute",
    )
    .eq("id", projectId)
    .single();

  const { data: customer } = await supabaseAdmin
    .from("ronyx_customers")
    .select("id, customer_name, payment_terms")
    .eq("id", customerId)
    .single();

  if (!project || !customer) {
    throw new Error("Project or customer not found for tickets");
  }

  const totals = calculateTotals(ticketsData, project as ProjectRow);
  const invoiceNumber = `INV-${Date.now()}`;
  const issuedDate = new Date().toISOString().slice(0, 10);
  const dueDate = calculateDueDate((customer as CustomerRow).payment_terms);

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("ronyx_invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_name: (customer as CustomerRow).customer_name,
      project_id: projectId,
      issued_date: issuedDate,
      due_date: dueDate,
      subtotal: totals.subtotal,
      fuel_surcharge: totals.fuelSurcharge,
      waiting_charges: totals.waitingCharges,
      total_amount: totals.totalAmount,
      retainage_amount: totals.retainage,
      net_payable: totals.netPayable,
      ticket_ids: ticketIds,
      status: "open",
      payment_status: "unpaid",
      accounting_status: "not_exported",
    })
    .select("*")
    .single();

  if (invoiceError) {
    throw new Error(invoiceError.message);
  }

  await supabaseAdmin
    .from("aggregate_tickets")
    .update({ status: "invoiced", invoice_number: invoiceNumber })
    .in("id", ticketIds);

  return invoice;
}
