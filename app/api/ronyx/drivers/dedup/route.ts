import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/drivers/dedup
// Removes duplicate driver records, keeping the oldest (first imported) per name.
export async function POST() {
  const supabase = supabaseAdmin;

  // 1. Find all drivers grouped by normalized name
  const { data: allDrivers, error: fetchErr } = await supabase
    .from("drivers")
    .select("id, full_name, created_at, status")
    .neq("status", "deleted")
    .order("created_at", { ascending: true });

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  // 2. Group by normalized name, keep first (oldest), collect IDs to delete
  const seen = new Map<string, string>(); // normalized name → keeper id
  const toDelete: string[] = [];

  for (const d of allDrivers ?? []) {
    const key = (d.full_name ?? "").toLowerCase().trim();
    if (!key) continue;
    if (seen.has(key)) {
      toDelete.push(d.id); // duplicate — mark for deletion
    } else {
      seen.set(key, d.id); // first occurrence — keep this one
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ removed: 0, message: "No duplicates found." });
  }

  // 3. Delete in batches of 100 to avoid URL length limits
  let removed = 0;
  const BATCH = 100;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const chunk = toDelete.slice(i, i + BATCH);
    const { error: delErr, count } = await supabase
      .from("drivers")
      .delete({ count: "exact" })
      .in("id", chunk);

    if (delErr) {
      return NextResponse.json({
        error: delErr.message,
        removed,
        remaining: toDelete.length - i,
      }, { status: 500 });
    }
    removed += count ?? chunk.length;
  }

  return NextResponse.json({
    removed,
    kept: seen.size,
    message: `Removed ${removed} duplicate record${removed !== 1 ? "s" : ""}. ${seen.size} unique drivers remain.`,
  });
}

// GET /api/ronyx/drivers/dedup — preview only, no deletions
export async function GET() {
  const supabase = supabaseAdmin;

  const { data: allDrivers, error } = await supabase
    .from("drivers")
    .select("id, full_name, created_at")
    .neq("status", "deleted")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seen = new Map<string, number>();
  for (const d of allDrivers ?? []) {
    const key = (d.full_name ?? "").toLowerCase().trim();
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, copies: count, extras: count - 1 }))
    .sort((a, b) => b.copies - a.copies);

  const totalExtras = duplicates.reduce((s, d) => s + d.extras, 0);

  return NextResponse.json({ duplicates, totalExtras, uniqueNames: seen.size });
}
