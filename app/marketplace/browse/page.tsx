// Marketplace Browse Loads Page
// Unified board for shippers, haulers, brokers

import { useState } from 'react';

export default function MarketplaceBrowse() {
  // TODO: Fetch from Supabase
  const [role, setRole] = useState('broker');
  const loads = [
    { id: '1', origin: 'Dallas, TX', destination: 'Chicago, IL', weight: '20 tons', status: 'Open' },
    { id: '2', origin: 'Houston, TX', destination: 'Atlanta, GA', weight: '15 tons', status: 'Bid' },
  ];

  return (
    <main className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Marketplace Loads</h1>
      <div className="mb-4">
        <span className="font-semibold">Role:</span>
        <select value={role} onChange={e => setRole(e.target.value)} className="ml-2 border rounded p-1">
          <option value="shipper">Shipper</option>
          <option value="hauler">Hauler</option>
          <option value="broker">Broker</option>
        </select>
      </div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Origin</th>
            <th className="border p-2">Destination</th>
            <th className="border p-2">Weight</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loads.map(load => (
            <tr key={load.id}>
              <td className="border p-2">{load.origin}</td>
              <td className="border p-2">{load.destination}</td>
              <td className="border p-2">{load.weight}</td>
              <td className="border p-2">{load.status}</td>
              <td className="border p-2">
                {role === 'hauler' && <button className="bg-green-600 text-white px-3 py-1 rounded">Bid</button>}
                {role === 'broker' && <button className="bg-yellow-600 text-white px-3 py-1 rounded">Match</button>}
                {role === 'shipper' && <button className="bg-blue-600 text-white px-3 py-1 rounded">Edit</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
