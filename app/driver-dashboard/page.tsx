"use client";
import React, { useEffect, useState } from "react";

export default function DriverDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    licenseType: "",
    resume: null as File | null,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const res = await fetch("/api/driver/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          experience: data.experience || "",
          licenseType: data.license_type || "",
          resume: null,
          notes: data.notes || "",
        });
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) data.append(k, v as any);
      });
      const res = await fetch("/api/driver/profile", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Failed to update profile");
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-10 text-gray-500">Loading…</div>;

  return (
    <main className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">
        Driver Profile & Onboarding
      </h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 rounded shadow"
      >
        <div>
          <label className="block font-semibold mb-1">Full Name</label>
          <input
            className="w-full border p-2 rounded"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input
            type="email"
            className="w-full border p-2 rounded"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Phone</label>
          <input
            className="w-full border p-2 rounded"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Experience (years)</label>
          <input
            type="number"
            min="0"
            className="w-full border p-2 rounded"
            required
            value={form.experience}
            onChange={(e) =>
              setForm((f) => ({ ...f, experience: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">License Type</label>
          <input
            className="w-full border p-2 rounded"
            required
            value={form.licenseType}
            onChange={(e) =>
              setForm((f) => ({ ...f, licenseType: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Résumé (PDF, optional)
          </label>
          <input
            type="file"
            accept="application/pdf"
            className="w-full"
            onChange={(e) =>
              setForm((f) => ({ ...f, resume: e.target.files?.[0] || null }))
            }
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Notes (optional)</label>
          <textarea
            className="w-full border p-2 rounded"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-700 text-white px-6 py-2 rounded font-semibold w-full"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Profile"}
        </button>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        {success && <div className="text-green-600 mt-2">Profile updated!</div>}
      </form>
    </main>
  );
}
