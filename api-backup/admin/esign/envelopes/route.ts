// Create E-sign envelope
// Accepts: { document_type, related_id, filename, pdf_base64, recipients: [{name,email}] }
// Stores original PDF in storage bucket 'esign', creates recipient tokens, returns signing URLs

import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { document_type, related_id, filename, pdf_base64, recipients } = body as {
    document_type: 'Quote' | 'Invoice' | 'Other';
    related_id?: string;
    filename: string;
    pdf_base64: string; // base64 string without data: prefix
    recipients: Array<{ name: string; email: string; role?: string }>;
  };

  if (!document_type || !filename || !pdf_base64 || !recipients?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Create envelope row
    const { data: env, error: envErr } = await supabaseAdmin
      .from('esign_envelopes')
      .insert({
        document_type,
        related_id: related_id || null,
        filename,
        original_pdf_path: 'pending',
        status: 'Created',
      })
      .select('*')
      .single();

    if (envErr || !env) {
      return NextResponse.json({ error: envErr?.message || 'Failed to create envelope' }, { status: 500 });
    }

    const objectPath = `envelopes/${env.id}/original.pdf`;

    // Upload original PDF to storage
    const pdfBuffer = Buffer.from(pdf_base64, 'base64');
    const upload = await supabaseAdmin.storage.from('esign').upload(objectPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (upload.error) {
      return NextResponse.json(
        { error: `Failed to upload PDF to storage: ${upload.error.message}. Ensure bucket 'esign' exists.` },
        { status: 500 }
      );
    }

    // Update envelope with path
    await supabaseAdmin
      .from('esign_envelopes')
      .update({ original_pdf_path: objectPath, status: 'Sent', updated_at: new Date().toISOString() })
      .eq('id', env.id);

    // Create recipients with tokens
    const tokenExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const recRows = recipients.map((r) => ({
      envelope_id: env.id,
      role: r.role || 'Signer',
      name: r.name,
      email: r.email,
      token: randomToken(),
      token_expires_at: tokenExpiry,
    }));

    const { data: recs, error: recErr } = await supabaseAdmin
      .from('esign_recipients')
      .insert(recRows)
      .select('id, name, email, token');

    if (recErr) {
      return NextResponse.json({ error: recErr.message }, { status: 500 });
    }

    // Return signing URLs
    const signingUrls = recs?.map((r) => ({
      name: r.name,
      email: r.email,
      url: `/esign/${r.token}`,
    })) || [];

    return NextResponse.json({ envelope_id: env.id, signing_urls: signingUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
