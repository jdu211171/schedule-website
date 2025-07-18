import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';

// PUT /api/admin/branches/[branchId]/line-channels/[channelId]/primary - Set primary channel for a branch
export const PUT = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const segments = req.url.split('/');
    const channelId = segments[segments.length - 2]; // Get channelId from URL path
    const branchId = segments[segments.length - 4]; // Get branchId from URL path
    
    if (!branchId || !channelId) {
      return NextResponse.json(
        { error: 'Branch ID and Channel ID are required' },
        { status: 400 }
      );
    }
    
    await LineChannelService.setPrimaryChannel(branchId, channelId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Primary channel set successfully'
    });
  } catch (error) {
    console.error('Error setting primary channel:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to set primary channel' },
      { status: 500 }
    );
  }
});