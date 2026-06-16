import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/ronyx/dispatch-import/match
// { drivers: string[], trucks: string[] }
// Returns driver_matches and truck_matches keyed by the input value

function scoreName(full: string, target: string): number {
  const f = full.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (f === t) return 1.0;
  if (f.includes(t) || t.includes(f)) return 0.88;
  const parts = t.split(/\s+/);
  let hit = 0;
  for (const p of parts) if (f.includes(p)) hit++;
  return hit / Math.max(parts.length, 1) * 0.75;
}

export async function POST(req: Request) {
  const sb = createSupabaseServerClient();
  const body = await req.json();
  const drivers: string[] = body.drivers || [];
  const trucks:  string[] = body.trucks  || [];

  const driver_matches: Record<string, { id: string | null; company_name: string | null; confidence: number; found: boolean }> = {};
  const truck_matches:  Record<string, { id: string | null; owner_operator_name: string | null; status: string; found: boolean }> = {};

  // ── Driver matching ──────────────────────────────────────
  if (drivers.length > 0) {
    // Fetch all drivers and score client-side (avoids many round trips for small fleets)
    const { data: allDrivers } = await sb
      .from("drivers")
      .select("id, first_name, last_name, company_name, carrier")
      .limit(2000);

    for (const name of drivers) {
      if (!name) { driver_matches[name] = { id: null, company_name: null, confidence: 0, found: false }; continue; }
      if (!allDrivers?.length) { driver_matches[name] = { id: null, company_name: null, confidence: 0, found: false }; continue; }

      const scored = allDrivers.map(d => ({
        ...d,
        score: scoreName(`${d.first_name ?? ""} ${d.last_name ?? ""}`, name),
      })).sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (best && best.score > 0.4) {
        driver_matches[name] = {
          id:           best.id,
          company_name: best.company_name || best.carrier || null,
          confidence:   best.score,
          found:        true,
        };
      } else {
        driver_matches[name] = { id: null, company_name: null, confidence: best?.score ?? 0, found: false };
      }
    }
  }

  // ── Truck matching ───────────────────────────────────────
  if (trucks.length > 0) {
    const { data: allTrucks } = await sb
      .from("trucks")
      .select("id, truck_number, status")
      .in("truck_number", trucks);

    const truckMap: Record<string, any> = {};
    for (const t of (allTrucks || [])) truckMap[t.truck_number] = t;

    for (const num of trucks) {
      const t = truckMap[num];
      if (t) {
        truck_matches[num] = { id: t.id, owner_operator_name: null, status: t.status || "active", found: true };
      } else {
        truck_matches[num] = { id: null, owner_operator_name: null, status: "unknown", found: false };
      }
    }
  }

  return NextResponse.json({ driver_matches, truck_matches });
}
