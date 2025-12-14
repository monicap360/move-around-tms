export default function DispatchSidebar() {
  return (
    <aside className="w-64 bg-white border-r shadow-sm flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-6">FleetFlow Dispatch</h1>
      <nav className="flex flex-col gap-4">
        <a href="/dispatch" className="font-semibold text-blue-600">Dashboard</a>
        <a href="/loads" className="font-semibold">Loads</a>
        <a href="/drivers" className="font-semibold">Drivers</a>
        <a href="/messages" className="font-semibold">Messages</a>
        <a href="/reports" className="font-semibold">Reports</a>
      </nav>
      <div className="mt-auto pt-6">
        <span className="text-xs text-gray-400">© 2025 FleetFlow</span>
      </div>
    </aside>
  );
}
