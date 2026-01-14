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

// Navigation structure with grouped items - Mission Critical Operations
const navigationSections = [
  {
    name: "Operations",
    items: [
      { name: "Dashboard", path: "/", icon: BarChart },
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
    name: "Tickets & Payroll",
    items: [
      { name: "Aggregates", path: "/aggregates", icon: ClipboardList },
      {
        name: "Aggregate Tickets",
        path: "/aggregates/tickets",
        icon: FileText,
      },
      { name: "Ticket Templates", path: "/ticket-templates", icon: FileText },
      { name: "Payroll", path: "/payroll", icon: DollarSign },
    ],
  },
  {
    name: "Safety & Compliance",
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
    name: "Fleet & Maintenance",
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

  // Check if this is a public route (login, signup, etc.)
  const isPublic =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/auth/callback") ||
    pathname?.startsWith("/demo");

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

  // For authenticated routes, render with full layout - Space-Grade Design
  return (
    <>
      <div className="flex h-screen overflow-hidden bg-space-deep">
        {/* Sidebar - Mission Critical Operations */}
        <aside className="w-64 bg-space-panel flex flex-col justify-between h-full border-r border-space-border">
          <div>
            {/* Brand Header */}
            <header className="py-4 border-b border-space-border">
              <div className="px-4">
                <div className="text-center">
                  <h1 className="text-sm font-medium tracking-widest text-gold-primary uppercase">
                    Move Around TMS
                  </h1>
                  <div className="h-px bg-space-border my-2 mx-8" />
                  <h2 className="text-base font-medium text-text-primary tracking-wide">
                    Ronyx Logistics LLC
                  </h2>
                </div>
                <div className="flex items-center justify-center mt-3">
                  <NotificationsBell />
                </div>
              </div>
            </header>

            {/* Nav - Restrained, Precise */}
            <nav className="mt-4 px-2 max-h-[calc(100vh-180px)] overflow-y-auto">
              {navigationSections.map((section, sectionIndex) => (
                <div
                  key={section.name}
                  className={sectionIndex > 0 ? "mt-4" : ""}
                >
                  <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-[0.15em] mb-1 px-3">
                    {section.name}
                  </h3>
                  <div className="space-y-0.5">
                    {section.items.map(({ name, path, icon: Icon }) => (
                      <Link key={name} href={path}>
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-sm cursor-pointer transition-all duration-150 ${
                            pathname === path
                              ? "bg-space-surface text-gold-primary border-l-2 border-gold-primary"
                              : "text-text-secondary hover:bg-space-surface hover:text-text-primary border-l-2 border-transparent"
                          }`}
                        >
                          {Icon && (
                            <Icon
                              className={`h-4 w-4 ${
                                pathname === path
                                  ? "text-gold-primary"
                                  : "text-text-muted"
                              }`}
                              strokeWidth={1.5}
                            />
                          )}
                          <span className="text-[13px] font-normal">{name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="text-center text-text-muted text-[10px] py-3 border-t border-space-border tracking-wider">
            RONYX LOGISTICS LLC
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-space-deep p-6">{children}</main>
      </div>
      <PWAStatus />
    </>
  );
}
