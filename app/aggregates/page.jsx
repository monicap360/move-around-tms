export default function AggregatesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Aggregates</h1>
      <p className="mb-8">Material management, scale tickets, dispatching, and load tracking.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Materials */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Materials</h2>
          <p className="text-gray-600 text-sm">Track materials (rock, sand, dirt, recycled) with pricing and inventory.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">Open Materials</button>
        </div>

        {/* Scale Tickets */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Scale Tickets</h2>
          <p className="text-gray-600 text-sm">Upload, edit, and reconcile scale tickets for billing and payroll.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">View Tickets</button>
        </div>

        {/* Dispatch */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Dispatch</h2>
          <p className="text-gray-600 text-sm">Assign trucks, drivers, and loads for aggregate hauling.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">Dispatch Loads</button>
        </div>

        {/* Jobsites */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Jobsites</h2>
          <p className="text-gray-600 text-sm">Manage jobsite addresses, hours, materials allowed, and contacts.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">Manage Jobsites</button>
        </div>

        {/* Rates */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Rates</h2>
          <p className="text-gray-600 text-sm">Set per-ton, per-load, per-hour, or zone-based pricing.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">Manage Rates</button>
        </div>

        {/* Reports */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Reports</h2>
          <p className="text-gray-600 text-sm">View tonnage, materials delivered, driver payout, and billing summaries.</p>
          <button className="mt-4 bg-blue-900 text-white px-4 py-2 rounded">Open Reports</button>
        </div>

      </div>
    </div>
  );
}
