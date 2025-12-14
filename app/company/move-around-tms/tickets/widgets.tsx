"use client";
import { useEffect, useState } from "react";

export default function TicketDashboardWidgets() {
  const [stats, setStats] = useState({ total: 0, earnings: 0, recent: [] });

  useEffect(() => {
    fetch("/api/company/move-around-tms/tickets/list")
      .then(res => res.json())
      .then(data => {
        setStats({
          total: data.length,
          earnings: data.reduce((sum, t) => sum + ((t.weight_out - t.weight_in) * (t.rate / 2000)), 0),
          recent: data.slice(0, 5)
        });
      });
  }, []);

  return (
    <div className="grid grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-sm opacity-60">Total Tickets</div>
      </div>
      <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
        <div className="text-2xl font-bold text-green-400">${stats.earnings.toFixed(2)}</div>
        <div className="text-sm opacity-60">Total Earnings</div>
      </div>
      <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
        <div className="text-sm font-bold mb-2">Recent Tickets</div>
        <ul className="space-y-1">
          {stats.recent.map(t => (
            <li key={t.ticket_uuid} className="text-xs opacity-80">
              #{t.ticket_uuid.slice(0, 8)} — {t.material_id} — ${(t.weight_out - t.weight_in) * (t.rate / 2000)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
