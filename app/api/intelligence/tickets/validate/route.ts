import { NextResponse } from "next/server";
import { logValidations, validateTicket } from "@/lib/ronyx/aiValidationEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ticket = body?.ticket || body;
    if (!ticket) {
      return NextResponse.json({ error: "Missing ticket payload" }, { status: 400 });
    }

    const results = await validateTicket(ticket);
    await logValidations(ticket.ticket_id, results);

    return NextResponse.json({
      success: true,
      validations: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Validation failed" },
      { status: 500 },
    );
  }
}
