import Link from "next/link";

const shortcuts = [
  { name: "Tickets", path: "/tickets" },
  { name: "Aggregates", path: "/aggregates" },
  { name: "Drivers", path: "/drivers" },
  { name: "Dispatch", path: "/dispatch" },
  { name: "Reports", path: "/reports" },
];

export default function HorizontalShortcuts() {
  return (
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
  );
}
