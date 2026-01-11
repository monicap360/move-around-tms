// Marketplace Partner Network Page
// For brokers to view and manage partner fleets

export default function MarketplacePartners() {
  // TODO: Fetch partners from Supabase
  const partners = [
    { id: 'ronyx', name: 'RonYX Logistics', status: 'Active' },
    { id: 'elite', name: 'Elite Hauling', status: 'Pending' },
  ];

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Partner Network</h1>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Partner</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {partners.map(partner => (
            <tr key={partner.id}>
              <td className="border p-2">{partner.name}</td>
              <td className="border p-2">{partner.status}</td>
              <td className="border p-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded">View</button>
                <button className="bg-green-600 text-white px-3 py-1 rounded ml-2">Message</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
