import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

// GET /api/payroll
// Server-side endpoint that returns payroll summary rows using the admin
// client (SUPABASE_SERVICE_KEY). This route includes a minimal auth guard
// that checks a bearer token in the Authorization header against
// process.env.ADMIN_TOKEN. Replace with your real auth system for
// production.

function computeCurrentFridayISODate(): string {
  // Compute the current Friday (week start) in UTC as YYYY-MM-DD, matching the payroll view
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  // ISO weekday: 1=Mon..7=Sun
  const iso = ((day + 6) % 7) + 1;
  // Friday is 5
  const daysToFriday = (5 - iso + 7) % 7;
  const friday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  friday.setUTCDate(friday.getUTCDate() + daysToFriday);
  return friday.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const expected = process.env.ADMIN_TOKEN;

    if (!expected) {
      console.warn(
        "ADMIN_TOKEN is not set in environment; /api/payroll is unprotected",
      );
    }

    if (!expected || authHeader !== `Bearer ${expected}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get("weekStart"); // YYYY-MM-DD (Friday)
    const weekStart = weekStartParam || computeCurrentFridayISODate();

    // New payroll view uses week_start_friday and week_end_thursday columns
    const { data, error } = await supabaseAdmin
      .from("driver_weekly_payroll_summary")
      .select("*")
      .eq("week_start_friday", weekStart)
      .order("driver_name", { ascending: true });

    if (error) {
      console.error("Supabase payroll query error", error);
      return NextResponse.json(
        { ok: false, error: "query_failed" },
        { status: 500 },
      );
    }

    // Calculate totals across all drivers for the week
    const totals = data.reduce(
      (acc: any, row: any) => ({
        total_drivers: acc.total_drivers + 1,
        total_tickets: acc.total_tickets + (row.total_tickets || 0),
        approved_tickets: acc.approved_tickets + (row.approved_tickets || 0),
        gross_pay: acc.gross_pay + (Number(row.gross_pay) || 0),
        social_security_withholding:
          acc.social_security_withholding +
          (Number(row.social_security_withholding) || 0),
        medicare_withholding:
          acc.medicare_withholding + (Number(row.medicare_withholding) || 0),
        federal_tax_withholding:
          acc.federal_tax_withholding +
          (Number(row.federal_tax_withholding) || 0),
        employer_social_security:
          acc.employer_social_security +
          (Number(row.employer_social_security) || 0),
        employer_medicare:
          acc.employer_medicare + (Number(row.employer_medicare) || 0),
        employer_futa: acc.employer_futa + (Number(row.employer_futa) || 0),
        net_pay: acc.net_pay + (Number(row.net_pay) || 0),
      }),
      {
        total_drivers: 0,
        total_tickets: 0,
        approved_tickets: 0,
        gross_pay: 0,
        social_security_withholding: 0,
        medicare_withholding: 0,
        federal_tax_withholding: 0,
        employer_social_security: 0,
        employer_medicare: 0,
        employer_futa: 0,
        net_pay: 0,
      },
    );

    return NextResponse.json({
      ok: true,
      weekStart,
      rows: data,
      summary: totals,
    });
  } catch (err) {
    console.error("Unexpected error in /api/payroll", err);
    return NextResponse.json(
      { ok: false, error: "unexpected" },
      { status: 500 },
    );
  }
}
