
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Ticket = {
  id: string;
  driver_email: string;
  driver_name: string;
  ticket_status: string;
  needs_review: boolean;
  quantity: number;
  pay_rate: number;
  total_pay: number | null;
  created_at: string;
};

export default function HRPayrollPrepPage() {
  const supabase = createClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    loadUserContext();
    loadTickets();
  }, []);

  async function loadUserContext() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('access_override')
      .eq('user_id', user.id)
      .single();

    setRole(roleRow?.role ?? null);
    setOverride(profile?.access_override ?? false);
  }

  async function loadTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_tickets_for_review')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data as Ticket[]);
    setLoading(false);
  }

  const canEdit =
    role === 'admin' ||
    role === 'manager' ||
    (role === 'hr' && override);

  const canApprove =
    role === 'admin' || role === 'manager';

  async function updateTicket(
    id: string,
    updates: Partial<Ticket>
  ) {
    await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id);

    loadTickets();
  }

  async function approveTicket(id: string) {
    await supabase
      .from('tickets')
      .update({
        ticket_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    loadTickets();
  }

  if (loading) {
    return <div className="p-6">Loading payroll queue…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        HR Payroll Prep
      </h1>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Driver</th>
              <th className="p-2 text-left">Units</th>
              <th className="p-2 text-left">Pay Rate</th>
              <th className="p-2 text-left">Total Pay</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>

          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">
                  {t.driver_name || t.driver_email}
                </td>

                <td className="p-2">
                  {canEdit ? (
                    <input
                      type="number"
                      value={t.quantity}
                      className="w-20 border rounded px-1"
                      onChange={(e) =>
                        updateTicket(t.id, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    t.quantity
                  )}
                </td>

                <td className="p-2">
                  {canEdit ? (
                    <input
                      type="number"
                      step="0.01"
                      value={t.pay_rate}
                      className="w-24 border rounded px-1"
                      onChange={(e) =>
                        updateTicket(t.id, {
                          pay_rate: Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    `$${t.pay_rate}`
                  )}
                </td>

                <td className="p-2">
                  ${(
                    t.total_pay ??
                    t.quantity * t.pay_rate
                  ).toFixed(2)}
                </td>

                <td className="p-2">
                  {t.ticket_status}
                </td>

                <td className="p-2 text-right">
                  {canApprove && (
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                      onClick={() => approveTicket(t.id)}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {tickets.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  No tickets needing review
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
