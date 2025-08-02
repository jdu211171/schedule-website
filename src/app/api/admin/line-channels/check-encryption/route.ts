import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, isEncrypted } from '@/lib/encryption';
import { UserRole } from '@prisma/client';

// GET /api/admin/line-channels/check-encryption
export const GET = withRole([UserRole.ADMIN], async () => {
  try {
    // Get all LINE channels
    const channels = await prisma.lineChannel.findMany({
      select: {
        channelId: true,
        name: true,
        channelAccessToken: true,
        channelSecret: true,
        isActive: true,
        createdAt: true
      }
    });
    
    // Check each channel for unencrypted data
    const unencryptedChannels = channels.filter(channel => {
      const tokenEncrypted = isEncrypted(channel.channelAccessToken);
      const secretEncrypted = isEncrypted(channel.channelSecret);
      return !tokenEncrypted || !secretEncrypted;
    });
    
    // Prepare report
    const report = {
      totalChannels: channels.length,
      encryptedChannels: channels.length - unencryptedChannels.length,
      unencryptedChannels: unencryptedChannels.length,
      channels: unencryptedChannels.map(channel => ({
        channelId: channel.channelId,
        name: channel.name,
        isActive: channel.isActive,
        createdAt: channel.createdAt,
        tokenEncrypted: isEncrypted(channel.channelAccessToken),
        secretEncrypted: isEncrypted(channel.channelSecret)
      }))
    };
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error checking encryption status:', error);
    return NextResponse.json(
      { error: 'Failed to check encryption status' },
      { status: 500 }
    );
  }
});

// POST /api/admin/line-channels/check-encryption
// Encrypt all unencrypted channels
export const POST = withRole([UserRole.ADMIN], async () => {
  try {
    // Get all LINE channels
    const channels = await prisma.lineChannel.findMany();
    
    let encryptedCount = 0;
    const errors: any[] = [];
    
    // Process each channel
    for (const channel of channels) {
      try {
        let needsUpdate = false;
        let updatedToken = channel.channelAccessToken;
        let updatedSecret = channel.channelSecret;
        
        // Check and encrypt access token if needed
        if (!isEncrypted(channel.channelAccessToken)) {
          updatedToken = encrypt(channel.channelAccessToken);
          needsUpdate = true;
        }
        
        // Check and encrypt secret if needed
        if (!isEncrypted(channel.channelSecret)) {
          updatedSecret = encrypt(channel.channelSecret);
          needsUpdate = true;
        }
        
        // Update the channel if needed
        if (needsUpdate) {
          await prisma.lineChannel.update({
            where: { channelId: channel.channelId },
            data: {
              channelAccessToken: updatedToken,
              channelSecret: updatedSecret
            }
          });
          encryptedCount++;
          console.log(`✅ Encrypted credentials for channel: ${channel.name} (${channel.channelId})`);
        }
      } catch (error) {
        console.error(`Failed to encrypt channel ${channel.channelId}:`, error);
        errors.push({
          channelId: channel.channelId,
          name: channel.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const report = {
      totalChannels: channels.length,
      encryptedCount,
      alreadyEncrypted: channels.length - encryptedCount - errors.length,
      errors: errors.length,
      errorDetails: errors
    };
    
    return NextResponse.json({
      message: 'Encryption process completed',
      report
    });
  } catch (error) {
    console.error('Error encrypting channels:', error);
    return NextResponse.json(
      { error: 'Failed to encrypt channels' },
      { status: 500 }
    );
  }
});