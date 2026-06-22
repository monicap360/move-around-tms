import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseAdmin;

  const [unitRes, woRes] = await Promise.all([
    supabase
      .from("maintenance_units")
      .select("annual_inspection_expires, insurance_expires, registration_expires, dispatch_eligible, status")
      .eq("id", params.id)
      .single(),
    supabase
      .from("maintenance_work_orders")
      .select("id, issue, priority, status")
      .eq("unit_id", params.id)
      .in("status", ["Open", "Scheduled", "In Progress", "Waiting Parts"])
      .eq("priority", "Critical"),
  ]);

  if (unitRes.error) return NextResponse.json({ eligible: false, reasons: ["Unit not found"] });

  const unit = unitRes.data;
  const today = new Date().toISOString().slice(0, 10);
  const reasons: string[] = [];

  if (unit.annual_inspection_expires && unit.annual_inspection_expires < today)
    reasons.push(`Annual inspection expired ${unit.annual_inspection_expires}`);
  if (unit.insurance_expires && unit.insurance_expires < today)
    reasons.push(`Insurance expired ${unit.insurance_expires}`);
  if (unit.registration_expires && unit.registration_expires < today)
    reasons.push(`Registration expired ${unit.registration_expires}`);
  if ((woRes.data || []).length > 0)
    reasons.push(`${woRes.data!.length} open critical work order(s)`);

  return NextResponse.json({ eligible: reasons.length === 0, reasons });
}
