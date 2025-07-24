import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';
import { lineChannelUpdateSchema } from '@/schemas/line-channel.schema';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// GET /api/admin/line-channels/[channelId] - Get a specific LINE channel
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const channelId = req.url.split('/').pop();
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID not provided' },
        { status: 400 }
      );
    }
    
    const channel = await LineChannelService.getChannel(channelId);
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: channel });
  } catch (error) {
    console.error('Error fetching LINE channel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LINE channel' },
      { status: 500 }
    );
  }
});

// PATCH /api/admin/line-channels/[channelId] - Update a LINE channel
export const PATCH = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const channelId = req.url.split('/').pop();
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID not provided' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const validatedData = lineChannelUpdateSchema.parse(body);

    const channel = await LineChannelService.updateChannel(channelId, validatedData);

    return NextResponse.json({ data: channel });
  } catch (error) {
    console.error('Error updating LINE channel:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Channel not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Invalid LINE credentials')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update LINE channel' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/line-channels/[channelId] - Delete a LINE channel
export const DELETE = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const channelId = req.url.split('/').pop();
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'チャンネルIDが指定されていません' },
        { status: 400 }
      );
    }
    
    // Check for branch associations
    const branchChannelCount = await prisma.branchLineChannel.count({
      where: { channelId }
    });

    if (branchChannelCount > 0) {
      return NextResponse.json(
        { 
          error: `このLINEチャンネルは${branchChannelCount}つの校舎に関連付けられているため削除できません。`,
          details: {
            branchAssociations: branchChannelCount
          }
        },
        { status: 400 }
      );
    }
    
    await LineChannelService.deleteChannel(channelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting LINE channel:', error);
    return NextResponse.json(
      { error: 'LINEチャンネルの削除に失敗しました' },
      { status: 500 }
    );
  }
});