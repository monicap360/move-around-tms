import { NextRequest, NextResponse } from "next/server";
import { parseLoadRequest } from "@/lib/assistants/loadRequestParser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Missing content." }, { status: 400 });
    }

    const extracted = await parseLoadRequest(content);
    return NextResponse.json({ ok: true, extracted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Parse failed." }, { status: 500 });
  }
}
