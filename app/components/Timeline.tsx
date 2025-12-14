export default function Timeline() {
  // TODO: Integrate Supabase load_status_history query
  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Real-Time Timeline</div>
      <ul className="space-y-2">
        {/* Example timeline event */}
        <li>
          <span className="text-xs text-gray-500">08:00</span> John Doe acknowledged Load 12345
        </li>
        <li>
          <span className="text-xs text-gray-500">08:15</span> Jane Smith delivered Load 12346
        </li>
      </ul>
    </div>
  );
}
