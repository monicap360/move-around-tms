import { NextRequest, NextResponse } from "next/server";
import { CompanyAssetsStorageService } from "../../../../lib/services/company-assets-storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/company-assets/files/[...path]
 * Get public URL or signed URL for a file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    const { searchParams } = new URL(request.url);
    const signed = searchParams.get('signed') === 'true';
    const expiresIn = parseInt(searchParams.get('expires') || '3600');

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      );
    }

    // Validate file path prefix for security
    if (!filePath.startsWith('logos/') && !filePath.startsWith('templates/tickets/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    if (signed) {
      // Get signed URL for temporary access
      const result = await CompanyAssetsStorageService.getSignedUrl(filePath, expiresIn);
      
      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          signedUrl: result.data?.signedUrl,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }
      });
    } else {
      // Get public URL
      const publicUrl = await CompanyAssetsStorageService.getPublicUrl(filePath);
      
      return NextResponse.json({
        success: true,
        data: {
          publicUrl,
          filePath
        }
      });
    }

  } catch (error) {
    console.error('Error getting file URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get file URL' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company-assets/files/[...path]
 * Delete a file from storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      );
    }

    // Validate file path prefix for security
    if (!filePath.startsWith('logos/') && !filePath.startsWith('templates/tickets/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const result = await CompanyAssetsStorageService.deleteFile(filePath);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}