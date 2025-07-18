import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';

// GET /api/admin/branches/[branchId]/line-channels - Get channels for a specific branch
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const segments = req.url.split('/');
    const branchId = segments[segments.length - 2]; // Get branchId from URL path
    
    if (!branchId) {
      return NextResponse.json(
        { error: 'Branch ID not provided' },
        { status: 400 }
      );
    }
    
    const branchChannels = await LineChannelService.getBranchChannels(branchId);
    
    return NextResponse.json({
      data: branchChannels,
      pagination: {
        total: branchChannels.length,
        page: 1,
        limit: 100,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching branch LINE channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch LINE channels' },
      { status: 500 }
    );
  }
});