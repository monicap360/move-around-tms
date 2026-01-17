import Link from "next/link";

type SectionPageProps = {
  params: { section: string };
};

const sectionLabels: Record<string, string> = {
  loads: "Loads",
  drivers: "Drivers",
  trucks: "Trucks",
  dispatch: "Dispatch",
  tracking: "Tracking",
  payroll: "Payroll",
  reports: "Reports",
  settings: "Settings",
};

export default function RonyxSectionPage({ params }: SectionPageProps) {
  const label = sectionLabels[params.section] || "Module";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Ronyx TMS</p>
            <h1 className="text-3xl font-bold text-[#F7931E]">{label}</h1>
          </div>
          <Link
            href="/ronyx"
            className="px-4 py-2 bg-[#141418] border border-[#2a2a2f] rounded-lg text-sm text-gray-200 hover:border-[#F7931E]/60 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#111114] border border-[#222228] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Ronyx {label} Module</h2>
          <p className="text-sm text-gray-400">
            This is the dedicated software area for Ronyx operations. Replace this placeholder
            with the live module when ready.
          </p>
        </div>
      </div>
    </div>
  );
}
