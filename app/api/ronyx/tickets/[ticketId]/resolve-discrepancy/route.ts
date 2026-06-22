import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return NextResponse.json({ ok: true, ticket_id: params.id, status: "resolved" });
}
