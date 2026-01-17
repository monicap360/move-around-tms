export type TicketForClarifier = {
  id: string;
  ticket_number: string;
  gross_weight?: string | number | null;
  tare_weight?: string | number | null;
  net_weight?: string | number | null;
  quantity?: string | number | null;
  bill_rate?: string | number | null;
};

export function clarifier(tickets: TicketForClarifier[]) {
  const issues: { id: string; ticket_number: string; reason: string }[] = [];

  tickets.forEach((ticket) => {
    const gross = Number(ticket.gross_weight || 0);
    const tare = Number(ticket.tare_weight || 0);
    const net = Number(ticket.net_weight || 0);

    if (gross && tare && net && Math.abs(gross - tare - net) > 0.01) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Net weight mismatch" });
      return;
    }

    if ((gross && !tare) || (!gross && tare)) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Missing gross or tare weight" });
      return;
    }

    if (!ticket.quantity || !ticket.bill_rate) {
      issues.push({ id: ticket.id, ticket_number: ticket.ticket_number, reason: "Missing quantity or rate" });
    }
  });

  return issues;
}
