"use client";

import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/ronyx" },
  { label: "Loads", href: "/loads" },
  { label: "Drivers", href: "/drivers" },
  { label: "Trucks", href: "/trucks" },
  { label: "Dispatch", href: "/dispatch" },
  { label: "Tracking", href: "/tracking" },
  { label: "Payroll", href: "/payroll" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

const quickActions = [
  { title: "Create Load", href: "/loads/new" },
  { title: "Assign Driver", href: "/drivers" },
  { title: "Track Shipment", href: "/tracking" },
  { title: "Run Payroll", href: "/payroll" },
];

export default function RonyxDashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap");
        * {
          font-family: "Poppins", sans-serif;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-[#0f0f11] border-r border-[#2a2a2f] flex flex-col">
          <div className="px-6 py-6 border-b border-[#2a2a2f]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F7931E] rounded-lg flex items-center justify-center font-bold text-black text-2xl shadow-lg shadow-[#F7931E]/30">
                R
              </div>
              <div>
                <div className="text-lg font-bold text-[#F7931E]">
                  RONYX LOGISTICS
                </div>
                <div className="text-xs text-gray-400 tracking-wider">
                  Fleet Operations
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#1a1a1d] transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-[#F7931E]/60"></span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-6 py-6 border-t border-[#2a2a2f]">
            <div className="text-xs text-gray-500 mb-2">Support</div>
            <a
              href="mailto:support@movearoundtms.com"
              className="text-sm text-gray-300 hover:text-[#F7931E] transition-colors"
            >
              support@movearoundtms.com
            </a>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="border-b border-[#2a2a2f] bg-[#0f0f11] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
                <p className="text-sm text-gray-400">
                  Real-time overview of fleet performance
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block">
                  <input
                    type="text"
                    placeholder="Search loads, drivers, trucks..."
                    className="w-72 bg-[#141418] border border-[#2a2a2f] rounded-lg px-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-[#F7931E]/60"
                  />
                </div>
                <button className="px-4 py-2 bg-[#141418] border border-[#2a2a2f] rounded-lg text-sm text-gray-200 hover:border-[#F7931E]/60 transition-all">
                  Notifications
                </button>
                <button className="px-4 py-2 bg-[#F7931E] text-black font-semibold rounded-lg hover:bg-[#ff8800] transition-all">
                  Portal Admin
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6">
            {/* Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Active Loads", value: "42", trend: "+6 today" },
                { label: "Available Drivers", value: "18", trend: "2 on break" },
                { label: "Trucks In Service", value: "37", trend: "3 in maintenance" },
                { label: "On-Time Rate", value: "98%", trend: "+1.2% WoW" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#111114] border border-[#222228] rounded-xl p-6"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-3xl font-bold text-[#F7931E] mt-2">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">{stat.trend}</div>
                </div>
              ))}
            </section>

            {/* Quick actions */}
            <section className="bg-[#111114] border border-[#222228] rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Quick Actions</h2>
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Dispatch shortcuts
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="px-4 py-4 bg-[#141418] border border-[#2a2a2f] rounded-lg text-sm font-semibold text-gray-200 hover:border-[#F7931E]/60 hover:text-white transition-all"
                  >
                    {action.title}
                  </Link>
                ))}
              </div>
            </section>

            {/* Fleet overview */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-[#111114] border border-[#222228] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Live Loads</h2>
                  <button className="text-sm text-[#F7931E] hover:text-[#ff8800] transition-colors">
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { id: "LD-2471", route: "Houston → Dallas", status: "In Transit", driver: "J. Smith" },
                    { id: "LD-2475", route: "Austin → San Antonio", status: "Loading", driver: "K. Alvarez" },
                    { id: "LD-2481", route: "El Paso → Laredo", status: "Delivered", driver: "R. Thompson" },
                  ].map((load) => (
                    <div
                      key={load.id}
                      className="flex items-center justify-between bg-[#141418] border border-[#2a2a2f] rounded-lg px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {load.id} • {load.route}
                        </div>
                        <div className="text-xs text-gray-400">Driver: {load.driver}</div>
                      </div>
                      <span className="text-xs font-semibold text-[#F7931E]">
                        {load.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111114] border border-[#222228] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Alerts</h2>
                  <button className="text-xs text-gray-400 hover:text-[#F7931E] transition-colors">
                    Manage
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    "Truck 18 due for maintenance in 3 days",
                    "Driver K. Alvarez HOS limit approaching",
                    "Load LD-2475 detention timer running",
                    "Insurance renewal due in 12 days",
                  ].map((alert) => (
                    <div
                      key={alert}
                      className="bg-[#141418] border border-[#2a2a2f] rounded-lg p-4 text-sm text-gray-300"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
