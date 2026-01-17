import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Missing content." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      extracted: {
        company_name: "Thompson Contractors",
        material_type: "fill_sand",
        quantity: 12,
        unit: "yards",
        pickup_location: "Pit 3",
        delivery_location: "Oakridge Site",
        rate_type: "per_ton",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Parse failed." }, { status: 500 });
  }
}
