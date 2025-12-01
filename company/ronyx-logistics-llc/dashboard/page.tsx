import React from 'react';

export default function RonyxLogisticsDashboard() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Ronyx Logistics LLC — Company Dashboard</h1>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded shadow p-4">Total Loads: 0</div>
        <div className="bg-white rounded shadow p-4">Active Drivers: 0</div>
        <div className="bg-white rounded shadow p-4">Pending Tickets: 0</div>
      </section>
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
        <ul>
          <li>No recent activity.</li>
        </ul>
      </section>
    </main>
  );
}
