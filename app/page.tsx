import Link from "next/link";
import {
  BarChart,
  FileText,
  Users,
  Truck,
  DollarSign,
  Calculator,
  Navigation,
  ClipboardList,
  Settings,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-medium text-text-primary tracking-wide mb-2">
          OPERATIONS CENTER
        </h1>
        <div className="h-px bg-gold-primary w-24 mx-auto mb-4" />
        <p className="text-sm text-text-secondary tracking-wider uppercase">
          Ronyx Logistics LLC - Mission Control
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-12">
        <NavButton href="/dashboard" label="Dashboard" icon={BarChart} />
        <NavButton href="/tickets" label="Tickets" icon={FileText} />
        <NavButton href="/drivers" label="Drivers" icon={Users} />
        <NavButton href="/fleet" label="Fleet" icon={Truck} />
        <NavButton href="/payroll" label="Payroll" icon={DollarSign} />
        <NavButton href="/finance" label="Finance" icon={Calculator} />
        <NavButton href="/dispatch" label="Dispatch" icon={Navigation} />
        <NavButton href="/reports" label="Reports" icon={ClipboardList} />
        <NavButton href="/settings" label="Settings" icon={Settings} />
      </div>
      <footer className="text-text-muted text-[10px] uppercase tracking-[0.15em]">
        Ronyx Logistics LLC
      </footer>
    </div>
  );
}

function NavButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center h-28 bg-space-panel border border-space-border rounded-sm text-text-secondary hover:text-gold-primary hover:border-gold-border transition-all duration-150"
    >
      <Icon className="w-6 h-6 mb-2 text-text-muted group-hover:text-gold-primary transition-colors" strokeWidth={1.5} />
      <span className="text-sm font-medium tracking-wider uppercase">{label}</span>
    </Link>
  );
}
