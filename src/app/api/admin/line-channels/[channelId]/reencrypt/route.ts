import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const reencryptSchema = z.object({
  channelAccessToken: z.string().min(1),
  channelSecret: z.string().min(1),
});

// PUT /api/admin/line-channels/[channelId]/reencrypt
// Re-encrypt channel with new credentials when old ones can't be decrypted
export const PUT = withRole([UserRole.ADMIN], async (req: NextRequest) => {
  const channelId = req.url.split('/').slice(-2)[0];
  
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = reencryptSchema.parse(body);
    
    // Check if channel exists
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
      select: {
        channelId: true,
        name: true,
        channelAccessToken: true,
        channelSecret: true
      }
    });
    
    if (!channel) {
      return NextResponse.json(
        { error: 'LINE channel not found' },
        { status: 404 }
      );
    }
    
    // Check current encryption status
    const tokenEncrypted = isEncrypted(channel.channelAccessToken);
    const secretEncrypted = isEncrypted(channel.channelSecret);
    
    // Try to decrypt current values to verify they're corrupted
    let currentTokenOk = false;
    let currentSecretOk = false;
    
    if (tokenEncrypted) {
      try {
        decrypt(channel.channelAccessToken);
        currentTokenOk = true;
      } catch (error) {
        // Expected - can't decrypt
      }
    }
    
    if (secretEncrypted) {
      try {
        decrypt(channel.channelSecret);
        currentSecretOk = true;
      } catch (error) {
        // Expected - can't decrypt
      }
    }
    
    // Encrypt new credentials
    const encryptedToken = encrypt(validatedData.channelAccessToken);
    const encryptedSecret = encrypt(validatedData.channelSecret);
    
    // Update the channel
    await prisma.lineChannel.update({
      where: { channelId },
      data: {
        channelAccessToken: encryptedToken,
        channelSecret: encryptedSecret
      }
    });
    
    return NextResponse.json({
      message: 'Channel credentials re-encrypted successfully',
      channelId,
      name: channel.name,
      previousStatus: {
        tokenEncrypted,
        tokenDecryptable: currentTokenOk,
        secretEncrypted,
        secretDecryptable: currentSecretOk
      }
    });
    
  } catch (error) {
    console.error('Error re-encrypting channel:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to re-encrypt channel' },
      { status: 500 }
    );
  }
});