import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ ok: true, ticket_id: params.id, status: "resolved" });
}
