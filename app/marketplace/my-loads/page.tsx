// Marketplace My Loads Page
// For shippers and haulers to track their posted/assigned loads

export default function MarketplaceMyLoads() {
  // TODO: Fetch my loads from Supabase
  const myLoads = [
    { id: '1', origin: 'Dallas, TX', destination: 'Chicago, IL', weight: '20 tons', status: 'Open' },
    { id: '2', origin: 'Houston, TX', destination: 'Atlanta, GA', weight: '15 tons', status: 'Assigned' },
  ];

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">My Loads</h1>
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
          {myLoads.map(load => (
            <tr key={load.id}>
              <td className="border p-2">{load.origin}</td>
              <td className="border p-2">{load.destination}</td>
              <td className="border p-2">{load.weight}</td>
              <td className="border p-2">{load.status}</td>
              <td className="border p-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded">View</button>
                <button className="bg-red-600 text-white px-3 py-1 rounded ml-2">Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
