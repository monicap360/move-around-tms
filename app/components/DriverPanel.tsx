export default function DriverPanel() {
  // TODO: Integrate Supabase drivers query
  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Drivers</div>
      <ul className="space-y-2">
        {/* Example driver */}
        <li className="flex items-center justify-between">
          <span>John Doe</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Active</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Jane Smith</span>
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">Inactive</span>
        </li>
      </ul>
    </div>
  );
}
