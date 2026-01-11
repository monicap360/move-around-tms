"use client";

const partners = [
  { name: "DAT Load Board", type: "Load Board", status: "Not Connected" },
  { name: "Truckstop.com", type: "Load Board", status: "Not Connected" },
  { name: "Comdata Fuel Card", type: "Fuel Card", status: "Not Connected" },
  { name: "Progressive Insurance", type: "Insurance", status: "Not Connected" },
  { name: "Fleetio Maintenance", type: "Maintenance", status: "Not Connected" },
];

export default function MarketplaceDashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Marketplace & Partner Integrations</h1>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Available Integrations</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1">Partner</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.name} className="border-b">
                <td className="px-2 py-1 font-mono">{p.name}</td>
                <td className="px-2 py-1">{p.type}</td>
                <td className="px-2 py-1">{p.status}</td>
                <td className="px-2 py-1"><button className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Connect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>Embedded partner services:</strong> Coming soon. Access load boards, fuel, insurance, and maintenance offers directly from your TMS.
      </div>
    </div>
  );
}
