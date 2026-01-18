import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let filters = [
  { id: "default-pending", name: "Pending Uploads" },
  { id: "default-flagged", name: "Flagged Tickets" },
];

export async function GET() {
  return NextResponse.json({ filters });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Missing filter name" }, { status: 400 });
  }
  const filter = { id: `filter-${Date.now()}`, name };
  filters = [filter, ...filters];
  return NextResponse.json({ filter });
}
