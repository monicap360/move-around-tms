import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// POST: Send push notification for compliance alert (stub for extension)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, url, data, playerId, externalUserId } =
      body;
    if (!title || !message || (!userId && !playerId && !externalUserId)) {
      return NextResponse.json(
        { error: "Missing recipient, title, or message" },
        { status: 400 },
      );
    }

    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;
    if (!appId || !apiKey) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 500 },
      );
    }

    const recipients = playerId
      ? { include_player_ids: [playerId] }
      : { include_external_user_ids: [externalUserId || userId] };

    const payload = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      url,
      data,
      ...recipients,
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: "Failed to send push notification", details: errorBody },
        { status: 502 },
      );
    }

    const dataJson = await response.json();
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId || externalUserId,
        title,
        message,
        metadata: { onesignal_id: dataJson?.id, url, data },
      });
    } catch {
      // Notification log is optional; ignore failures.
    }

    return NextResponse.json({ ok: true, response: dataJson });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
