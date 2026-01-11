import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getComplianceRules } from "@/lib/complianceRules";

const supabase = createClient();

export default function MarketplacePost() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handlePost(e: any) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Compliance check: require all fields, weight > 0, and (mock) org compliance
    const missingFields = [];
    if (!origin) missingFields.push("Origin");
    if (!destination) missingFields.push("Destination");
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0)
      missingFields.push("Weight");
    // Example: block if not compliant (expand with real rules as needed)
    if (missingFields.length > 0) {
      setError("Missing or invalid: " + missingFields.join(", "));
      setLoading(false);
      // Log violation
      await supabase
        .from("compliance_violations")
        .insert([
          {
            action: "post_load",
            reason: "Missing fields: " + missingFields.join(", "),
            timestamp: new Date().toISOString(),
          },
        ]);
      return;
    }

    // Example: check org compliance (stub, always pass)
    const orgCompliant = true; // TODO: Replace with real compliance check
    if (!orgCompliant) {
      setError("Organization is not compliant for posting loads.");
      setLoading(false);
      await supabase
        .from("compliance_violations")
        .insert([
          {
            action: "post_load",
            reason: "Organization not compliant",
            timestamp: new Date().toISOString(),
          },
        ]);
      return;
    }

    const { error } = await supabase.from("loads").insert([
      {
        origin,
        destination,
        weight,
        status,
      },
    ]);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setOrigin("");
      setDestination("");
      setWeight("");
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Post a New Load</h1>
      <form
        onSubmit={handlePost}
        className="space-y-4 bg-blue-50 p-6 rounded-xl"
      >
        <div>
          <label className="block font-semibold mb-1">Origin</label>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Destination</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Weight</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Posting…" : "Post Load"}
        </button>
        {success && (
          <div className="text-green-600 mt-2">Load posted successfully!</div>
        )}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </main>
  );
}
