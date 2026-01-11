"use client";
import { useEffect, useState } from "react";

export default function HRComplianceTab({ driverId }: { driverId: string }) {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDriver() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/driver/${driverId}`);
        if (!res.ok) throw new Error("Failed to fetch driver profile");
        const data = await res.json();
        setDriver(data);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    }
    fetchDriver();
  }, [driverId]);

  if (loading) return <div className="p-6">Loading driver profile...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!driver) return <div className="p-6">No driver found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">HR & TXDOT Compliance</h2>
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Driver Profile Information</h3>
        <ul className="space-y-1">
          <li><b>Name:</b> {driver.name}</li>
          <li><b>Employee/Contractor ID:</b> {driver.employee_id || "-"}</li>
          <li><b>Status:</b> {driver.status || "-"}</li>
          <li><b>Hire Date:</b> {driver.hire_date || "-"} / <b>Termination Date:</b> {driver.termination_date || "-"}</li>
          <li><b>Position/Role:</b> {driver.role || "-"}</li>
          <li><b>License Number & Class:</b> {driver.license_number || "-"} / {driver.license_class || "-"}</li>
          <li><b>License Expiration Date:</b> {driver.license_expiration || "-"}</li>
          <li><b>State of Issuance:</b> {driver.license_state || "-"}</li>
          <li><b>Endorsements/Restrictions:</b> {driver.endorsements || "-"}</li>
          <li><b>Contact Info:</b> {driver.phone || "-"} / {driver.email || "-"}</li>
        </ul>
      </section>
      {/* Next: Add document upload/tracking, compliance, and more sections here */}
    </div>
  );
}
