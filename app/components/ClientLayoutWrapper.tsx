"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

import NotificationsBell from "./NotificationsBell";
import PWAStatus from "./PWAStatus";
import {
  Users,
  ClipboardList,
  Truck,
  FileText,
  DollarSign,
  CheckCircle,
  BookOpen,
  Wrench,
  ShieldCheck,
  Store,
  BarChart,
  Settings,
  Database,
} from "lucide-react";

// Navigation structure with grouped items
const navigationSections = [
  {
    name: "Main",
    items: [
      { name: "Dashboard", path: "/", icon: BarChart },
      { name: "Mobile Quick Actions", path: "/mobile", icon: BarChart },
      { name: "My Profile", path: "/driver/profile", icon: Users },
      { name: "Customer Portal", path: "/customer-portal", icon: Users },
      { name: "Supplier Portal", path: "/supplier-portal", icon: Users },
      { name: "Truck Board", path: "/truck-board", icon: Truck },
      {
        name: "Driver Schedule",
        path: "/driver-schedule",
        icon: ClipboardList,
      },
      {
        name: "Driver Availability",
        path: "/driver-availability",
        icon: Users,
      },
      { name: "Violations & Alerts", path: "/violations", icon: ShieldCheck },
    ],
  },
  {
    name: "Operations",
    items: [
      { name: "Aggregates", path: "/aggregates", icon: ClipboardList },
      {
        name: "Aggregate Tickets",
        path: "/aggregates/tickets",
        icon: FileText,
      },
      { name: "Aggregate Reconciliation", path: "/aggregates/reconciliation", icon: FileText },
      { name: "Carrier Management", path: "/carriers", icon: Truck },
      { name: "Carrier Rates", path: "/carriers/rates", icon: FileText },
      { name: "Tracking Updates", path: "/tracking", icon: Truck },
      { name: "Detention & Accessorials", path: "/detention", icon: DollarSign },
      { name: "Documents", path: "/documents", icon: FileText },
      { name: "Ticket Templates", path: "/ticket-templates", icon: FileText },
      { name: "Payroll", path: "/payroll", icon: DollarSign },
      { name: "Ronyx Customers", path: "/ronyx/customers", icon: Users },
      { name: "Ronyx Projects", path: "/ronyx/projects", icon: ClipboardList },
      { name: "Ronyx Financial Ops", path: "/ronyx/financial", icon: DollarSign },
      { name: "Ronyx Billing", path: "/ronyx/billing", icon: DollarSign },
      { name: "Validation Rules", path: "/ronyx/validation-rules", icon: ShieldCheck },
      { name: "Geofences", path: "/ronyx/geofences", icon: ShieldCheck },
    ],
  },
  {
    name: "Safety & HR",
    items: [
      { name: "HR Dashboard", path: "/hr", icon: Users },
      { name: "DVIR Inspections", path: "/driver/dvir", icon: CheckCircle },
      {
        name: "DVIR Reference",
        path: "/driver/dvir-reference",
        icon: BookOpen,
      },
      { name: "Driver Forms", path: "/driver/templates", icon: FileText },
      { name: "DVIR Dashboard", path: "/hr/dvir-dashboard", icon: CheckCircle },
    ],
  },
  {
    name: "Administration",
    items: [
      { name: "Maintenance", path: "/maintenance", icon: Wrench },
      { name: "Fleet Management", path: "/fleet", icon: Truck },
      { name: "Compliance / IFTA", path: "/compliance", icon: ShieldCheck },
      {
        name: "DOT Compliance",
        path: "/compliance/dot-dashboard",
        icon: ShieldCheck,
      },
    ],
  },
  {
    name: "System",
    items: [
      { name: "Reports", path: "/reports", icon: BarChart },
      { name: "Executive Reports", path: "/reports/executive", icon: BarChart },
      { name: "Merch Store", path: "/merch", icon: Store },
      { name: "3PL Clients", path: "/3pl/clients", icon: Users },
      { name: "3PL Billing", path: "/3pl/billing", icon: DollarSign },
      { name: "Cross-Border", path: "/cross-border", icon: ShieldCheck },
      { name: "Integrations", path: "/integrations", icon: Database },
      { name: "Matching", path: "/matching", icon: Database },
      { name: "Plant Ops Workflow", path: "/workflows/plant-ops", icon: ShieldCheck },
      { name: "Workflow Rules", path: "/workflows/ticket-rules", icon: ShieldCheck },
      { name: "API Keys", path: "/settings/api-keys", icon: Settings },
      { name: "Database Setup", path: "/setup-database", icon: Database },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({
  children,
}: ClientLayoutWrapperProps) {
  const pathname = usePathname();

  // Check if this is a public route (login, signup, landing page, etc.)
  const isPublic =
    pathname === "/" ||
    pathname === "/app" ||
    pathname === "/ronyx" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/auth/callback") ||
    pathname?.startsWith("/demo") ||
    pathname?.startsWith("/pit-to-pay") ||
    pathname?.startsWith("/dump-truck-fleets") ||
    pathname?.startsWith("/cross-border") ||
    pathname?.startsWith("/compare") ||
    pathname === "/integrations" ||
    pathname?.startsWith("/for-shippers") ||
    pathname?.startsWith("/roadmap") ||
    pathname?.startsWith("/audit-support-for-trucking-companies") ||
    pathname?.startsWith("/terms") ||
    pathname?.startsWith("/privacy");

  // Debug: Uncomment these lines to debug layout rendering
  // console.log('ClientLayoutWrapper - pathname:', pathname);
  // console.log('ClientLayoutWrapper - isPublic:', isPublic);
  // console.log('ClientLayoutWrapper - will render:', isPublic ? 'PUBLIC_LAYOUT' : 'FULL_LAYOUT_WITH_SIDEBAR');

  // For public routes, render without the main app layout
  if (isPublic) {
    return (
      <>
        {children}
        <PWAStatus />
      </>
    );
  }

  // For authenticated routes, render with full layout
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-blue-900 text-white flex flex-col justify-between h-full">
          <div>
            {/* Brand Header */}
            <header className="py-3 border-b border-blue-700">
              <div className="px-3 flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                  <h1 className="text-lg font-semibold tracking-wide text-blue-300">
                    Move Around TMS™
                  </h1>
                  <p className="text-xs text-gray-400 italic">
                    Built for those who move
                  </p>
                  <h2 className="text-xl font-bold text-white mt-1 tracking-wide uppercase">
                    Ronyx Logistics LLC
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationsBell />
                </div>
              </div>
            </header>

            {/* Nav */}
            <nav className="mt-6 px-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {navigationSections.map((section, sectionIndex) => (
                <div
                  key={section.name}
                  className={sectionIndex > 0 ? "mt-6" : ""}
                >
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {section.name}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map(({ name, path, icon: Icon }) => (
                      <Link key={name} href={path}>
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${
                            pathname === path
                              ? "bg-blue-800 text-yellow-400"
                              : "hover:bg-blue-800"
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4 text-yellow-400" />}
                          <span className="text-sm font-semibold">{name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="text-center text-gray-400 text-xs py-3 border-t border-blue-700">
            © 2025 Move Around TMS
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <PWAStatus />
    </>
  );
}
