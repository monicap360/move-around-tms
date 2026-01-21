"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../components/ui/button";

export default function DispatchPage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/ronyx/dispatch")
    ? "/ronyx/dispatch"
    : "/dispatch";

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 shadow-lg rounded-2xl p-6 md:p-8 flex flex-col items-center gap-5">
      <div className="text-base md:text-lg text-blue-700 font-semibold">
        Dispatch Center: Access all dispatch tools below.
      </div>
      <div className="flex flex-col md:flex-row gap-3 w-full justify-center">
        <Link className="btn-primary text-center w-full md:w-auto" href={`${basePath}/board`}>
          Open Dispatch Board
        </Link>
        <Link className="btn-secondary text-center w-full md:w-auto" href={`${basePath}/map`}>
          Live Fleet Map
        </Link>
        <Link className="btn-success text-center w-full md:w-auto" href={`${basePath}/loads/L-1001`}>
          View Load Details
        </Link>
      </div>

      <div className="mt-2">
        <Button
          onClick={async () => {
            try {
              // Example API call for truck suggestion
              const response = await fetch('/api/dispatch/suggest-truck', { method: 'POST' });
              const data = await response.json();
              if (data.ok) {
                alert(`Suggested truck: ${data.suggestedTruck.unit} (type: ${data.suggestedTruck.truck_type})`);
              } else {
                alert(`No suggestion: ${data.message}`);
              }
            } catch (err) {
              alert('Error while requesting suggestion: ' + String(err));
            }
          }}
        >
          Suggest Truck
        </Button>
      </div>
      <footer className="text-slate-400 text-sm mt-4">
        © {new Date().getFullYear()} Move Around TMS
      </footer>
    </div>
  );
}
