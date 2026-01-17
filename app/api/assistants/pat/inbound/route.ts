import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { from, subject, body } = await req.json();
    if (!from || !subject || !body) {
      return NextResponse.json({ error: "Missing from, subject, or body." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      received: { from, subject },
      parsed: {
        company_name: "Jones Construction",
        material_type: "gravel_34",
        quantity: 15,
        unit: "tons",
        pickup_location: "Pit 7",
        delivery_location: "Main St Project",
        requested_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Inbound processing failed." }, { status: 500 });
  }
}
