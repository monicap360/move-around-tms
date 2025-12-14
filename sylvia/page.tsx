"use client";
import Link from "next/link";
import { useState } from "react";

export default function SylviaDashboard() {
  // Placeholder states for marketing, driver search, and onboarding
  const [drivers, setDrivers] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sylvia's Master Dashboard</h1>
      <nav className="mb-6 flex gap-4">
        <Link href="/hr" className="text-blue-600 underline">HR Dashboard</Link>
        <Link href="/payroll" className="text-blue-600 underline">Payroll</Link>
        <Link href="/drivers" className="text-blue-600 underline">Drivers</Link>
        <Link href="/marketing" className="text-blue-600 underline">Marketing</Link>
      </nav>
      {/* Combined Overview */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
        <div className="flex gap-4 mb-4">
          <Link href="/hr" className="bg-blue-500 text-white px-4 py-2 rounded">Go to HR</Link>
          <Link href="/payroll" className="bg-green-500 text-white px-4 py-2 rounded">Go to Payroll</Link>
          <Link href="/drivers" className="bg-purple-500 text-white px-4 py-2 rounded">Find Drivers</Link>
          <Link href="/onboarding" className="bg-yellow-500 text-white px-4 py-2 rounded">Onboard Drivers</Link>
        </div>
      </section>
      {/* Marketing Overview */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Marketing Overview</h2>
        <div className="bg-white rounded shadow p-4 mb-2">
          <p>Analytics and marketing campaign stats will appear here.</p>
        </div>
      </section>
      {/* Driver Search */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Find Drivers</h2>
        <div className="bg-white rounded shadow p-4 mb-2">
          <p>Driver search and recruitment tools will appear here.</p>
        </div>
      </section>
      {/* Onboarding Workflow */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Onboarding</h2>
        <div className="bg-white rounded shadow p-4">
          <p>Onboarding workflow and status for new drivers will appear here.</p>
        </div>
      </section>
    </div>
  );
}
