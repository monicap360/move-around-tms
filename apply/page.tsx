"use client";
import React, { useState } from "react";

export default function DriverApplyPage() {
  const [step, setStep] = useState(1);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) data.append(k, v as any);
      });
      const res = await fetch("/api/apply", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Failed to submit application");
      setSuccess(true);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        Apply to Drive with MoveAround
      </h1>
      {step === 1 && (
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
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Phone</label>
            <input
              className="w-full border p-2 rounded"
              required
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Experience (years)
            </label>
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
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <button
            type="submit"
            className="bg-blue-700 text-white px-6 py-2 rounded font-semibold w-full"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>
      )}
      {step === 2 && success && (
        <div className="bg-green-50 border border-green-200 p-6 rounded shadow text-center">
          <h2 className="text-2xl font-bold text-green-700 mb-2">Thank you!</h2>
          <p>
            Your application has been received. We’ll review your info and
            contact you if you’re a match for our customers.
          </p>
        </div>
      )}
    </main>
  );
}
