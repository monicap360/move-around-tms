import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
import {
  addWatermarkToPDF,
  createProvenanceMetadata,
  embedProvenanceInPDF,
  generateDocumentHash,
  verifyDocumentIntegrity,
  WatermarkOptions,
} from '@/lib/digitalProvenance';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/documents/watermark
 * 
 * Add watermark and provenance to a document
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const organizationId = formData.get('organizationId') as string;
    const userId = formData.get('userId') as string;
    const purpose = formData.get('purpose') as string | undefined;
    const watermarkText = formData.get('watermarkText') as string | undefined;
    const watermarkPosition = formData.get('watermarkPosition') as WatermarkOptions['position'] | undefined;

    if (!file || !organizationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, organizationId, userId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported for server-side watermarking' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Create provenance metadata
    const documentId = uuidv4();
    const metadata = createProvenanceMetadata(
      documentId,
      organizationId,
      userId,
      file.name,
      originalBuffer,
      { purpose }
    );

    // Create watermark options
    const watermarkOptions: WatermarkOptions = {
      text: watermarkText || `${organizationId} - CONFIDENTIAL`,
      opacity: 0.2,
      fontSize: 48,
      position: watermarkPosition || 'diagonal',
      includeMetadata: true,
    };

    // Add watermark
    let watermarkedBuffer = await addWatermarkToPDF(originalBuffer, watermarkOptions);

    // Embed provenance metadata
    watermarkedBuffer = await embedProvenanceInPDF(watermarkedBuffer, metadata);

    // Store in Supabase Storage
    const storagePath = `documents/${organizationId}/${documentId}_watermarked.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, watermarkedBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Store provenance record in database
    const { error: dbError } = await supabase.from('document_provenance').insert({
      document_id: documentId,
      organization_id: organizationId,
      user_id: userId,
      original_filename: file.name,
      storage_path: storagePath,
      hash: metadata.hash,
      timestamp: metadata.timestamp,
      version: metadata.version,
      purpose: purpose || null,
      metadata: metadata.customMetadata || {},
    });

    if (dbError) {
      console.error('Error storing provenance:', dbError);
      // Don't fail if DB insert fails, but log it
    }

    return NextResponse.json({
      success: true,
      documentId,
      url: urlData.publicUrl,
      metadata: {
        hash: metadata.hash,
        timestamp: metadata.timestamp,
        documentId,
      },
    });
  } catch (error: any) {
    console.error('Watermarking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/watermark/verify
 * 
 * Verify document integrity
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const hash = searchParams.get('hash');

    if (!documentId || !hash) {
      return NextResponse.json(
        { error: 'Missing documentId or hash' },
        { status: 400 }
      );
    }

    const supabase = createServerAdmin();

    // Get provenance record
    const { data: provenance, error } = await supabase
      .from('document_provenance')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error || !provenance) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Download document
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(provenance.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download document' },
        { status: 500 }
      );
    }

    // Verify hash
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isValid = verifyDocumentIntegrity(buffer, hash);

    return NextResponse.json({
      valid: isValid,
      documentId,
      expectedHash: provenance.hash,
      providedHash: hash,
      metadata: provenance,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify document' },
      { status: 500 }
    );
  }
}
