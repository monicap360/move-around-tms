import Link from "next/link";

export default function FastScanPricing() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-4">Fast Scan™ Pricing</h1>
      <p className="text-lg mb-8">
        Fast Scan™ is a premium add-on module for MoveAround TMS, designed to
        replace costly manual ticket entry and eliminate payroll errors for
        trucking, aggregates, and construction fleets.
      </p>
      <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
        <h2 className="text-2xl font-semibold mb-2">Enterprise Offer</h2>
        <ul className="mb-4 list-disc pl-6 text-base">
          <li>Replaces $900/week admin labor</li>
          <li>Reduces payroll and compliance errors</li>
          <li>Creates audit trails and catches violations humans miss</li>
        </ul>
        <div className="mb-2">
          <span className="font-bold">One-Time Setup Fee:</span>{" "}
          <span className="text-xl">$3,500</span>
        </div>
        <div className="mb-2">
          <span className="font-bold">Monthly Subscription:</span>{" "}
          <span className="text-xl">$1,500</span>
        </div>
        <div className="mb-2 text-gray-600 text-sm">
          Includes CSV mapping, ticket format setup, driver/customer matching,
          payroll logic configuration, onboarding, and go-live validation.
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg shadow p-6 mb-8 border border-gray-100">
        <h2 className="text-xl font-semibold mb-2">How It Works</h2>
        <ol className="list-decimal pl-6 mb-4 text-base">
          <li>Upload your scale tickets (CSV)</li>
          <li>
            Fast Scan automatically reviews and flags payroll mistakes,
            violations, and profit leaks
          </li>
          <li>Instant weekly driver grouping and payroll readiness</li>
          <li>Audit-ready reports and compliance checks</li>
        </ol>
        <p className="text-base mb-2">
          We’ll run the first week with you to validate results.
        </p>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Why Fast Scan?</h2>
        <ul className="list-disc pl-6 text-base">
          <li>Works faster than manual entry</li>
          <li>Doesn’t get tired or mis-key numbers</li>
          <li>Catches violations and mistakes before payroll runs</li>
          <li>Fits seamlessly inside MoveAround TMS</li>
        </ul>
      </div>
      <div className="text-center mb-8">
        <Link
          href="/demo/fastscan"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 transition"
        >
          View Demo
        </Link>
      </div>
      <footer className="text-center text-gray-500 text-sm mt-12">
        <span>Powered by IGOTTA Technologies</span>
      </footer>
    </main>
  );
}
