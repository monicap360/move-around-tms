"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type RonyxNavigationProps = {
  modules: string[];
  disabledModules?: string[];
};

const routeMap: Record<string, string> = {
  loads: "/ronyx/loads",
  finance: "/ronyx/financial",
  tracking: "/ronyx/tracking",
  hr: "/ronyx/hr-compliance",
  materials: "/ronyx/aggregates",
  tickets: "/ronyx/tickets",
  dispatch: "/ronyx/dispatch",
  fleet: "/ronyx/fleet",
};

export function RonyxNavigation({
  modules,
  disabledModules = [],
}: RonyxNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="ronyx-nav">
      {modules.map((module) => {
        const isDisabled = disabledModules.includes(module);
        const href = routeMap[module] || "/ronyx";
        const isActive = pathname === href;
        return (
          <Link
            key={module}
            href={href}
            className={`ronyx-nav-link ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
            aria-disabled={isDisabled}
          >
            {module.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
