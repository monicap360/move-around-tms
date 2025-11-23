import Link from "next/link";

export default function Sidebar() {
  // You can change the order of items here
  const items = [
    { name: "Dashboard", path: "/" },
    { name: "Tickets", path: "/tickets" },
    { name: "Aggregates", path: "/aggregates" },
    { name: "Drivers", path: "/drivers" },
    { name: "Materials", path: "/materials" },
    { name: "Plants", path: "/plants" },
    { name: "Jobsites", path: "/jobsites" },
    { name: "Loads", path: "/loads" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Payroll", path: "/payroll" },
    { name: "HR", path: "/hr" },
    { name: "IFTA", path: "/ifta" },
    { name: "Maintenance", path: "/maintenance" },
    { name: "Billing", path: "/billing" },
    { name: "Reports", path: "/reports" },
    { name: "Admin", path: "/admin" },
  ];

  // Horizontal shortcuts (top bar)
  const shortcuts = [
    { name: "Tickets", path: "/tickets" },
    { name: "Aggregates", path: "/aggregates" },
    { name: "Drivers", path: "/drivers" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Reports", path: "/reports" },
  ];

  return (
    <>
      {/* Horizontal Shortcuts Bar */}
      <div className="w-full flex space-x-2 bg-[#1E90FF] text-white p-2 fixed top-0 left-0 z-50 shadow-lg">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.path}
            href={shortcut.path}
            className="px-3 py-1 rounded hover:bg-[#0A1C2E] font-semibold"
          >
            {shortcut.name}
          </Link>
        ))}
      </div>
      {/* Sidebar */}
      <aside className="w-60 bg-[#0A1C2E] text-white h-screen p-4 space-y-2 fixed left-0 top-12">
        <h1 className="text-xl font-bold mb-4">MoveAround TMS</h1>
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="block px-3 py-2 rounded hover:bg-[#1E90FF]"
          >
            {item.name}
          </Link>
        ))}
      </aside>
    </>
  );
}
