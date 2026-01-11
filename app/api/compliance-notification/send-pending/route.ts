import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

// This endpoint checks for unsent compliance notifications and sends emails via the existing /api/email/send route.
export async function POST() {
  // Fetch unsent notifications
  const { data: notifications, error } = await supabaseAdmin
    .from('compliance_notifications')
    .select('*')
    .eq('sent', false)
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications || notifications.length === 0) return NextResponse.json({ ok: true, message: 'No unsent notifications.' });

  let sentCount = 0;
  for (const n of notifications) {
    if (!n.recipient_email) continue;
    // Compose email
    const subject = `Compliance Alert: ${n.alert_type.replace(/_/g, ' ').toUpperCase()}`;
    const text = n.message;
    // Send email via internal API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: n.recipient_email,
        subject,
        text
      })
    });
    if (res.ok) {
      // Mark as sent
      await supabaseAdmin
        .from('compliance_notifications')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', n.id);
      sentCount++;
    }
  }
  return NextResponse.json({ ok: true, sent: sentCount });
}
