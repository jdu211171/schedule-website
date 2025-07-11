import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';
import { z } from 'zod';

const assignBranchesSchema = z.object({
  branchIds: z.array(z.string())
});

// PUT /api/admin/line-channels/[channelId]/branches - Assign branches to a channel
export const PUT = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const segments = req.url.split('/');
    const channelId = segments[segments.length - 2]; // Get channelId from URL path
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID not provided' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { branchIds } = assignBranchesSchema.parse(body);

    const channel = await LineChannelService.assignBranches(channelId, branchIds);

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Error assigning branches to LINE channel:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to assign branches' },
      { status: 500 }
    );
  }
});