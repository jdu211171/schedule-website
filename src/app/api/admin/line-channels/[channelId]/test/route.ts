import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { testChannelCredentials, sendLinePush } from '@/lib/line-multi-channel';

// POST /api/admin/line-channels/[channelId]/test - Test LINE channel
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const segments = req.url.split('/');
    const channelId = segments[segments.length - 2]; // Get channelId from URL path
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID not provided' },
        { status: 400 }
      );
    }
    
    const { testUserId } = await req.json();

    // Get channel
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId }
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    const credentials = {
      channelAccessToken: decrypt(channel.channelAccessToken),
      channelSecret: decrypt(channel.channelSecret)
    };

    // Test credentials
    const testResult = await testChannelCredentials(credentials);

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.error || 'Invalid credentials' },
        { status: 400 }
      );
    }

    // If a test user ID is provided, send a test message
    let messageResult = null;
    if (testUserId) {
      try {
        await sendLinePush(
          testUserId,
          `🔔 テストメッセージ\n\nこれは「${channel.name}」チャンネルからのテストメッセージです。\n\n正常に受信できていれば、このチャンネルは正しく設定されています。`,
          credentials
        );
        messageResult = { success: true };
      } catch (error) {
        console.error('Error sending test message:', error);
        messageResult = { 
          success: false, 
          error: 'Failed to send test message. Please check the LINE user ID.'
        };
      }
    }

    return NextResponse.json({
      success: true,
      botInfo: testResult.botInfo,
      messageResult
    });
  } catch (error) {
    console.error('Error testing LINE channel:', error);
    return NextResponse.json(
      { error: 'Failed to test LINE channel' },
      { status: 500 }
    );
  }
});