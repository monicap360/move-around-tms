export default function MessagesPanel() {
  // TODO: Integrate Supabase driver_messages query
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="font-semibold mb-2">Messages</div>
      <ul className="space-y-2">
        {/* Example message */}
        <li>
          <span className="font-bold">John Doe:</span> At the plant now
        </li>
        <li>
          <span className="font-bold">Jane Smith:</span> Heading to Site B
        </li>
      </ul>
    </div>
  );
}
