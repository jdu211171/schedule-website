import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { LineChannelService } from '@/services/line-channel.service';

// POST /api/admin/line-channels/migrate - Migrate from environment variables
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const channel = await LineChannelService.migrateFromEnvironment();
    
    if (!channel) {
      return NextResponse.json(
        { 
          message: 'No environment variables found to migrate',
          hint: 'Ensure LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET are set'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully migrated LINE credentials from environment variables',
      channel: {
        ...channel,
        channelAccessToken: undefined,
        channelSecret: undefined
      }
    });
  } catch (error) {
    console.error('Error migrating LINE channel:', error);
    
    if (error instanceof Error && error.message.includes('Invalid LINE credentials')) {
      return NextResponse.json(
        { error: 'Environment variables contain invalid LINE credentials' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to migrate LINE channel' },
      { status: 500 }
    );
  }
});