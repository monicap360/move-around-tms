import DispatchSidebar from "../components/DispatchSidebar";
import LoadBoard from "../components/LoadBoard";
import DriverPanel from "../components/DriverPanel";
import MessagesPanel from "../components/MessagesPanel";
import Timeline from "../components/Timeline";
import StatusTracker from "../components/StatusTracker";

export default function DispatchDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DispatchSidebar />
      <main className="flex-1 p-6 grid grid-cols-2 gap-6">
        <section>
          <h2 className="text-xl font-bold mb-2">Load Board</h2>
          <LoadBoard />
          <h2 className="text-xl font-bold mt-8 mb-2">Driver Panel</h2>
          <DriverPanel />
        </section>
        <section>
          <h2 className="text-xl font-bold mb-2">Messages</h2>
          <MessagesPanel />
          <h2 className="text-xl font-bold mt-8 mb-2">Timeline</h2>
          <Timeline />
          <h2 className="text-xl font-bold mt-8 mb-2">Status Tracker</h2>
          <StatusTracker />
        </section>
      </main>
    </div>
  );
}
