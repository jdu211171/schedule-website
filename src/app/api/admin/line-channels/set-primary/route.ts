import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';
import { z } from 'zod';

const setPrimarySchema = z.object({
  branchId: z.string().min(1),
  channelId: z.string().min(1)
});

// POST /api/admin/line-channels/set-primary - Set a channel as primary for a branch
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = setPrimarySchema.parse(body);

    await LineChannelService.setPrimaryChannel(
      validatedData.branchId,
      validatedData.channelId
    );

    return NextResponse.json({ 
      message: 'Primary channel set successfully'
    });
  } catch (error) {
    console.error('Error setting primary channel:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Channel is not assigned to this branch') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set primary channel' },
      { status: 500 }
    );
  }
});