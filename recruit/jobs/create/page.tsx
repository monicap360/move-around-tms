"use client";
import { useState } from "react";

export default function CreateJobPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    min_experience: 0,
    endorsements_required: "",
    twic_required: false,
    medical_card_required: false,
  });
  const [success, setSuccess] = useState(false);
  async function submitJob() {
    const payload = {
      ...form,
      requirements: form.requirements.split(",").map((s) => s.trim()),
      endorsements_required: form.endorsements_required.split(",").map((s) => s.trim()),
    };
    await fetch("/api/hiring/job/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSuccess(true);
  }
  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Create Job Posting</h1>
      <div className="max-w-xl space-y-4">
        <input
          className="w-full p-3 rounded bg-gray-900"
          placeholder="Job Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="w-full p-3 rounded bg-gray-900"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          className="w-full p-3 rounded bg-gray-900"
          placeholder="Requirements (comma separated)"
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
        />
        <input
          className="w-full p-3 rounded bg-gray-900"
          placeholder="Endorsements Required (comma separated)"
          value={form.endorsements_required}
          onChange={(e) => setForm({ ...form, endorsements_required: e.target.value })}
        />
        <input
          className="w-full p-3 rounded bg-gray-900"
          type="number"
          placeholder="Minimum Experience (years)"
          value={form.min_experience}
          onChange={(e) => setForm({ ...form, min_experience: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.twic_required}
            onChange={(e) => setForm({ ...form, twic_required: e.target.checked })}
          />
          TWIC Required
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.medical_card_required}
            onChange={(e) => setForm({ ...form, medical_card_required: e.target.checked })}
          />
          Medical Card Required
        </label>
        <button
          onClick={submitJob}
          className="w-full mt-4 p-3 bg-blue-600 rounded-lg font-bold"
        >
          Post Job
        </button>
        {success && <div className="text-green-400 mt-2">Job posted!</div>}
      </div>
    </div>
  );
}
