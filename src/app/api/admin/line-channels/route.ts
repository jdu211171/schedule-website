import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';
import { z } from 'zod';

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  channelAccessToken: z.string().min(1),
  channelSecret: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  isDefault: z.boolean().optional(),
  branchIds: z.array(z.string()).optional()
});

// GET /api/admin/line-channels - Get all LINE channels
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const channels = await LineChannelService.getAllChannels();
    
    // Return in expected format with pagination
    return NextResponse.json({
      data: channels,
      pagination: {
        total: channels.length,
        page: 1,
        limit: 100,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching LINE channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LINE channels' },
      { status: 500 }
    );
  }
});

// POST /api/admin/line-channels - Create a new LINE channel
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = createChannelSchema.parse(body);

    const channel = await LineChannelService.createChannel(validatedData);

    return NextResponse.json({ 
      data: channel,
      message: 'LINE channel created successfully'
    });
  } catch (error) {
    console.error('Error creating LINE channel:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Invalid LINE credentials')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create LINE channel' },
      { status: 500 }
    );
  }
});