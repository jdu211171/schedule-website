import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';

// GET /api/admin/line-channels/validate - Validate primary channel assignments
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const validation = await LineChannelService.validatePrimaryChannels();
    
    return NextResponse.json({
      data: validation,
      message: validation.isValid 
        ? 'All branches have valid channel assignments' 
        : 'Some branches have multiple primary channels'
    });
  } catch (error) {
    console.error('Error validating channel assignments:', error);
    return NextResponse.json(
      { error: 'Failed to validate channel assignments' },
      { status: 500 }
    );
  }
});