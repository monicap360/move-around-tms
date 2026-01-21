import { NextRequest, NextResponse } from "next/server";
import { parseLoadRequest } from "@/lib/assistants/loadRequestParser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { from, subject, body } = await req.json();
    if (!from || !subject || !body) {
      return NextResponse.json({ error: "Missing from, subject, or body." }, { status: 400 });
    }

    const content = `From: ${from}\nSubject: ${subject}\n\n${body}`;
    const parsed = await parseLoadRequest(content);
    return NextResponse.json({
      ok: true,
      received: { from, subject },
      parsed: { ...parsed, requested_at: new Date().toISOString() },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Inbound processing failed." }, { status: 500 });
  }
}
