import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

// POST: Trigger notification for a compliance alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_type, truck_number, dvir_id, message, recipient_email } = body;
    if (!alert_type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Insert notification into queue
    const { data, error } = await supabaseAdmin
      .from('compliance_notifications')
      .insert([
        {
          alert_type,
          truck_number,
          dvir_id,
          message,
          recipient_email,
        },
      ])
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // TODO: Integrate with email service or Supabase function to send notification
    return NextResponse.json({ success: true, notification: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
