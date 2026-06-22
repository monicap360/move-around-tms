import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  return NextResponse.json({
    comparison: {
      ticket_id: id,
      dispatched: { summary: "20 tons gravel @ $20/ton — $400" },
      delivered: { summary: "22 tons gravel @ $20/ton — $440" },
      billed: { summary: "22 tons gravel @ $20/ton — $440" },
      variance: ["Quantity variance: +2T", "Price variance: $40"],
    },
  });
}
