import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { PDFDocument, rgb } from 'pdf-lib';

async function getRecipientByToken(token: string) {
  const { data: rec, error } = await supabaseAdmin
    .from('esign_recipients')
    .select('*, esign_envelopes(*)')
    .eq('token', token)
    .single();
  if (error) return { error } as const;
  return { rec } as const;
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { rec, error } = await getRecipientByToken(token);
  if (error || !rec) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // Check token expiry
  if (rec.token_expires_at && new Date(rec.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 });
  }

  const env = rec.esign_envelopes;
  const effectivePath = env.signed_pdf_path || env.original_pdf_path;

  // Create a short-lived signed URL to view the PDF
  const { data: signed, error: urlErr } = await supabaseAdmin.storage
    .from('esign')
    .createSignedUrl(effectivePath, 60 * 15); // 15 minutes

  if (urlErr || !signed) {
    return NextResponse.json({ error: urlErr?.message || 'Failed to create signed URL' }, { status: 500 });
  }

  // Log a viewed event (best-effort)
  await supabaseAdmin.from('esign_events').insert({
    envelope_id: env.id,
    recipient_id: rec.id,
    event_type: 'Viewed',
    ip_address: request.headers.get('x-forwarded-for') || null,
    user_agent: request.headers.get('user-agent') || null,
  });

  return NextResponse.json({
    envelope: {
      id: env.id,
      document_type: env.document_type,
      filename: env.filename,
      status: env.status,
    },
    recipient: { id: rec.id, name: rec.name, email: rec.email, status: rec.status },
    pdfUrl: signed.signedUrl,
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await request.json();
  const signature_base64 = body?.signature_base64 as string | undefined; // PNG base64 without prefix

  if (!signature_base64) {
    return NextResponse.json({ error: 'Missing signature_base64' }, { status: 400 });
  }

  const { rec, error } = await getRecipientByToken(token);
  if (error || !rec) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  if (rec.status === 'Signed') {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 });
  }

  // Check token expiry
  if (rec.token_expires_at && new Date(rec.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 });
  }

  const env = rec.esign_envelopes;
  const basePath = env.signed_pdf_path || env.original_pdf_path;

  // Download current PDF
  const download = await supabaseAdmin.storage.from('esign').download(basePath);
  if (download.error || !download.data) {
    return NextResponse.json({ error: download.error?.message || 'Failed to download PDF' }, { status: 500 });
  }

  const pdfBytes = Buffer.from(await download.data.arrayBuffer());

  // Load and stamp signature on the first page bottom-right
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1]; // last page

  const pngBytes = Buffer.from(signature_base64, 'base64');
  const pngImage = await pdfDoc.embedPng(pngBytes);

  const sigWidth = 200;
  const scale = sigWidth / pngImage.width;
  const sigHeight = pngImage.height * scale;

  const margin = 48;
  const x = page.getWidth() - sigWidth - margin;
  const y = margin; // bottom margin

  page.drawImage(pngImage, { x, y, width: sigWidth, height: sigHeight });

  // Optional: Add a label above signature
  page.drawText(`${rec.name}`, {
    x,
    y: y + sigHeight + 8,
    size: 10,
    color: rgb(0, 0, 0),
  });

  const newPdfBytes = await pdfDoc.save();

  const signedPath = `envelopes/${env.id}/signed.pdf`;
  const up = await supabaseAdmin.storage.from('esign').upload(signedPath, newPdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  // Update recipient and envelope
  await supabaseAdmin
    .from('esign_recipients')
    .update({ status: 'Signed', signed_at: new Date().toISOString() })
    .eq('id', rec.id);

  // Check if all recipients are signed
  const { data: remaining, error: remainErr } = await supabaseAdmin
    .from('esign_recipients')
    .select('id')
    .eq('envelope_id', env.id)
    .neq('status', 'Signed');

  const allSigned = !remainErr && (remaining?.length || 0) === 0;

  await supabaseAdmin
    .from('esign_envelopes')
    .update({ status: allSigned ? 'Completed' : 'InProgress', signed_pdf_path: signedPath, updated_at: new Date().toISOString() })
    .eq('id', env.id);

  // Log signed event
  await supabaseAdmin.from('esign_events').insert({
    envelope_id: env.id,
    recipient_id: rec.id,
    event_type: 'Signed',
    ip_address: request.headers.get('x-forwarded-for') || null,
    user_agent: request.headers.get('user-agent') || null,
  });

  return NextResponse.json({ ok: true });
}
