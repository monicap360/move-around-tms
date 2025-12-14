"use client";
import { useState } from "react";

export default function RateDispatcherPage({ params }) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submitRating() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/drivers/${params.driver_uuid}/rate-dispatcher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback }),
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      setSuccess(true);
      setScore(0);
      setFeedback("");
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Rate Your Dispatcher</h1>
      <div className="mb-4">
        <div className="font-semibold mb-2">Score</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`w-10 h-10 rounded-full border-2 text-xl font-bold transition-all duration-100 ${score >= n ? "bg-yellow-400 border-yellow-600" : "bg-gray-200 border-gray-400"}`}
              onClick={() => setScore(n)}
              aria-label={`Rate ${n}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2">Feedback (optional)</div>
        <textarea
          className="w-full p-3 rounded border border-gray-300"
          rows={4}
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Share your experience with your dispatcher..."
        />
      </div>
      <button
        onClick={submitRating}
        className="bg-blue-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-50"
        disabled={saving || score === 0}
      >
        {saving ? "Submitting..." : "Submit Rating"}
      </button>
      {success && <div className="mt-4 text-green-600 font-medium">Thank you for your feedback!</div>}
      {error && <div className="mt-4 text-red-600 font-medium">{error}</div>}
    </main>
  );
}
