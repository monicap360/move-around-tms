import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { to, body } = await req.json();
    if (!to || !body) {
      return NextResponse.json({ error: "Missing 'to' or 'body'." }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER." },
        { status: 400 }
      );
    }

    const payload = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: body,
    });

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.message || "Twilio SMS failed." }, { status: response.status });
    }

    return NextResponse.json({ sid: data.sid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "SMS failed." }, { status: 500 });
  }
}
