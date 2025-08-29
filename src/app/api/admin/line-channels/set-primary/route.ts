import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';
import { z } from 'zod';

const setChannelTypeSchema = z.object({
  branchId: z.string().min(1),
  channelId: z.string().min(1),
  channelType: z.enum(['TEACHER', 'STUDENT'])
});

// POST /api/admin/line-channels/set-primary - Set a channel type for a branch
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = setChannelTypeSchema.parse(body);

    await LineChannelService.setChannelType(
      validatedData.branchId,
      validatedData.channelId,
      validatedData.channelType
    );

    return NextResponse.json({ 
      message: `Channel type set to ${validatedData.channelType} successfully`
    });
  } catch (error) {
    console.error('Error setting channel type:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'この校舎にはチャンネルが割り当てられていません') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set channel type' },
      { status: 500 }
    );
  }
});