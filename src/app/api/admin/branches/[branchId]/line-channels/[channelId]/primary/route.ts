import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';

// PUT /api/admin/branches/[branchId]/line-channels/[channelId]/primary - Set channel type for a branch
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
    
    const body = await req.json();
    const { channelType } = body;
    
    if (!channelType || !['TEACHER', 'STUDENT'].includes(channelType)) {
      return NextResponse.json(
        { error: 'Valid channelType (TEACHER or STUDENT) is required' },
        { status: 400 }
      );
    }
    
    await LineChannelService.setChannelType(branchId, channelId, channelType);
    
    return NextResponse.json({ 
      success: true,
      message: `Channel type set to ${channelType} successfully`
    });
  } catch (error) {
    console.error('Error setting channel type:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to set channel type' },
      { status: 500 }
    );
  }
});