export default function StatusTracker() {
  // TODO: Integrate Supabase loads + drivers status
  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Status Tracker</div>
      <ul className="space-y-2">
        {/* Example status */}
        <li>
          <span className="font-bold">Load 12345:</span>{" "}
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
            Acknowledged
          </span>
        </li>
        <li>
          <span className="font-bold">Load 12346:</span>{" "}
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            Delivering
          </span>
        </li>
      </ul>
    </div>
  );
}
