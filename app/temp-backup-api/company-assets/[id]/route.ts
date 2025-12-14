import { NextRequest, NextResponse } from "next/server";
import { CompanyAssetsService } from "../../../lib/services/company-assets";

export const dynamic = "force-dynamic";

/**
 * GET /api/company-assets/[id]
 * Get a specific company asset by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const result = await CompanyAssetsService.getAssetById(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: result.error.message.includes('not found') ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });

  } catch (error) {
    console.error('Error fetching company asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company asset' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company-assets/[id]
 * Update a specific company asset
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const { description, tags, metadata } = body;
    const updateData: any = {};
    
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;

    const result = await CompanyAssetsService.updateAsset(id, updateData);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Company asset updated successfully',
    });

  } catch (error) {
    console.error('Error updating company asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company asset' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company-assets/[id]
 * Delete a specific company asset
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const result = await CompanyAssetsService.deleteAsset(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Company asset deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting company asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete company asset' },
      { status: 500 }
    );
  }
}