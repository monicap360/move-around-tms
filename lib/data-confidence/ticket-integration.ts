// Ticket Integration Helper
// Scores confidence for ticket fields after creation/update

import type { ConfidenceScore } from './confidence-scorer';
import { scoreFieldConfidence } from './confidence-scorer';

interface TicketData {
  id: string;
  quantity?: number;
  pay_rate?: number;
  bill_rate?: number;
  driver_id?: string;
  site_id?: string;
}

/**
 * Score confidence for a ticket's key fields
 * Called after ticket creation/update
 */
export async function scoreTicketConfidence(ticket: TicketData): Promise<{
  quantity?: ConfidenceScore;
  pay_rate?: ConfidenceScore;
  bill_rate?: ConfidenceScore;
}> {
  const results: {
    quantity?: ConfidenceScore;
    pay_rate?: ConfidenceScore;
    bill_rate?: ConfidenceScore;
  } = {};

  // Score quantity (use 30d for driver, 90d for site/global)
  if (ticket.quantity !== undefined && ticket.quantity !== null) {
    try {
      results.quantity = await scoreFieldConfidence(
        'ticket',
        ticket.id,
        'quantity',
        ticket.quantity,
        ticket.driver_id || undefined,
        ticket.site_id || undefined,
        ticket.driver_id ? 30 : 90 // 30d for driver, 90d for site/global
      );
      
      // Record confidence event via API
      await fetch('/api/confidence/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'ticket',
          entityId: ticket.id,
          fieldName: 'quantity',
          actualValue: ticket.quantity,
          driverId: ticket.driver_id,
          siteId: ticket.site_id,
          days: ticket.driver_id ? 30 : 90,
        }),
      });
    } catch (err) {
      console.error('Error scoring quantity confidence:', err);
    }
  }

  // Score pay_rate
  if (ticket.pay_rate !== undefined && ticket.pay_rate !== null) {
    try {
      results.pay_rate = await scoreFieldConfidence(
        'ticket',
        ticket.id,
        'pay_rate',
        ticket.pay_rate,
        ticket.driver_id || undefined,
        ticket.site_id || undefined,
        ticket.driver_id ? 30 : 90
      );
      
      await fetch('/api/confidence/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'ticket',
          entityId: ticket.id,
          fieldName: 'pay_rate',
          actualValue: ticket.pay_rate,
          driverId: ticket.driver_id,
          siteId: ticket.site_id,
          days: ticket.driver_id ? 30 : 90,
        }),
      });
    } catch (err) {
      console.error('Error scoring pay_rate confidence:', err);
    }
  }

  // Score bill_rate
  if (ticket.bill_rate !== undefined && ticket.bill_rate !== null) {
    try {
      results.bill_rate = await scoreFieldConfidence(
        'ticket',
        ticket.id,
        'bill_rate',
        ticket.bill_rate,
        ticket.driver_id || undefined,
        ticket.site_id || undefined,
        ticket.driver_id ? 30 : 90
      );
      
      await fetch('/api/confidence/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'ticket',
          entityId: ticket.id,
          fieldName: 'bill_rate',
          actualValue: ticket.bill_rate,
          driverId: ticket.driver_id,
          siteId: ticket.site_id,
          days: ticket.driver_id ? 30 : 90,
        }),
      });
    } catch (err) {
      console.error('Error scoring bill_rate confidence:', err);
    }
  }

  return results;
}
