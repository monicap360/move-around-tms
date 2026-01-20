"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function MarketplacePost() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveOrganization() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (isMounted) {
        setOrganizationId(membership?.organization_id || null);
      }
    }

    resolveOrganization();

    return () => {
      isMounted = false;
    };
  }, []);

  async function checkOrganizationCompliance() {
    if (!organizationId) {
      return { compliant: true, issues: [] as string[] };
    }

    const issues: string[] = [];

    try {
      const { count: alertCount, error: alertError } = await supabase
        .from("compliance_notifications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("resolved", false);

      if (!alertError && alertCount && alertCount > 0) {
        issues.push(`${alertCount} unresolved compliance alerts`);
      }
    } catch (err) {
      console.error("Compliance notifications error:", err);
    }

    try {
      const { data: docs, error: docsError } = await supabase
        .from("driver_documents")
        .select("expiration_date, status")
        .eq("organization_id", organizationId);

      if (!docsError && docs) {
        const today = new Date();
        const expiredCount = docs.filter((doc: any) => {
          if (doc.status === "expired" || doc.status === "rejected") return true;
          if (!doc.expiration_date) return false;
          return new Date(doc.expiration_date) < today;
        }).length;
        if (expiredCount > 0) {
          issues.push(`${expiredCount} expired driver documents`);
        }
      }
    } catch (err) {
      console.error("Driver documents error:", err);
    }

    return { compliant: issues.length === 0, issues };
  }

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

    const compliance = await checkOrganizationCompliance();
    if (!compliance.compliant) {
      setError(`Organization is not compliant: ${compliance.issues.join(", ")}`);
      setLoading(false);
      await supabase.from("compliance_violations").insert([
        {
          action: "post_load",
          reason: compliance.issues.join("; "),
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const basePayload: Record<string, any> = {
      origin,
      destination,
      weight: Number(weight),
      status,
      created_at: new Date().toISOString(),
    };

    if (organizationId) {
      basePayload.organization_id = organizationId;
    }
    if (user) {
      basePayload.created_by = user.id;
    }

    let insertError = null;
    let insertResponse = await supabase.from("loads").insert([basePayload]);
    insertError = insertResponse.error;

    if (insertError && insertError.message?.includes("column")) {
      const fallbackPayload = {
        origin,
        destination,
        weight: Number(weight),
        status,
      };
      insertResponse = await supabase.from("loads").insert([fallbackPayload]);
      insertError = insertResponse.error;
    }

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
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
