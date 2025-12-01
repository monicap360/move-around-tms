"use client";
import { useState } from "react";

export default function HiringPortal() {
  const [form, setForm] = useState({
    company_name: "",
    contact_email: "",
    job_title: "",
    job_description: "",
    pay_rate: "",
    location: "",
  });

  async function submitJob() {
    await fetch("/api/hiring/job/create", {
      method: "POST",
      body: JSON.stringify(form),
    });
    alert("Job Posted!");
  }

  return (
    <div className="p-10 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold">Post a Driver Job</h1>
      <div className="mt-6 space-y-4 max-w-xl">
        {Object.keys(form).map((field) => (
          <input
            key={field}
            placeholder={field.replace("_", " ")}
            className="w-full p-3 rounded bg-gray-900 text-white"
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          />
        ))}
      </div>
      <button
        onClick={submitJob}
        className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
      >
        Post Job
      </button>
    </div>
  );
}
