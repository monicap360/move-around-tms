import { NextRequest, NextResponse } from "next/server";
import { CompanyAssetsStorageService } from "../../../lib/services/company-assets-storage";
import { CompanyAssetsService } from "../../../lib/services/company-assets";

export const dynamic = "force-dynamic";

/**
 * POST /api/company-assets/upload
 * Upload files to company assets storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assetType = formData.get('asset_type') as 'company_logo' | 'ticket_template';
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const metadata = formData.get('metadata') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!assetType || !['company_logo', 'ticket_template'].includes(assetType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing asset_type' },
        { status: 400 }
      );
    }

    // Validate file type
    const validation = CompanyAssetsStorageService.validateFileType(file, assetType);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload file to storage
    let uploadResult;
    if (assetType === 'company_logo') {
      uploadResult = await CompanyAssetsStorageService.uploadLogo(file);
    } else {
      uploadResult = await CompanyAssetsStorageService.uploadTicketTemplate(file);
    }

    if (uploadResult.error) {
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadResult.error.message}` },
        { status: 500 }
      );
    }

    // Create database record
    const assetData = {
      asset_type: assetType,
      file_path: uploadResult.filePath!,
      original_filename: file.name,
      description: description || null,
      file_size: file.size,
      mime_type: file.type,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      metadata: metadata ? JSON.parse(metadata) : {}
    };

    const dbResult = await CompanyAssetsService.createAsset(assetData);

    if (dbResult.error) {
      // If database insert fails, try to clean up the uploaded file
      try {
        await CompanyAssetsStorageService.deleteFile(uploadResult.filePath!);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }

      return NextResponse.json(
        { success: false, error: `Database error: ${dbResult.error.message}` },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const publicUrl = await CompanyAssetsStorageService.getPublicUrl(uploadResult.filePath!);

    return NextResponse.json({
      success: true,
      data: {
        ...dbResult.data,
        public_url: publicUrl
      },
      message: 'File uploaded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/company-assets/upload
 * Get upload configuration and limits
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: {
        company_logo: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ],
        ticket_template: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/json'
        ]
      },
      bucketName: 'company_assets',
      allowedPrefixes: ['logos/', 'templates/tickets/']
    }
  });
}