import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';
import { testChannelCredentials } from '@/lib/line-multi-channel';
import { Prisma } from '@prisma/client';

export interface CreateLineChannelData {
  name: string;
  description?: string;
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl?: string;
  isDefault?: boolean;
  branchIds?: string[];
}

export interface UpdateLineChannelData {
  name?: string;
  description?: string;
  channelAccessToken?: string;
  channelSecret?: string;
  webhookUrl?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export class LineChannelService {
  /**
   * Get base URL for webhook endpoints from server-side environment variables
   * Uses NEXTAUTH_URL first (recommended), then BASE_URL as fallback
   */
  private static getBaseUrl(): string {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const baseUrl = process.env.BASE_URL;
    
    if (nextAuthUrl) {
      return nextAuthUrl;
    }
    
    if (baseUrl) {
      return baseUrl;
    }
    
    // Fallback with warning
    console.warn('BASE_URL environment variable not set. Using default fallback URL.');
    return 'https://your-domain.com';
  }

  /**
   * Generate preview for sensitive credentials
   */
  private static generateCredentialPreview(credential: string, showStart = 4, showEnd = 4): string {
    if (!credential || credential.length <= showStart + showEnd) {
      return '****';
    }
    return `${credential.substring(0, showStart)}...${credential.slice(-showEnd)}`;
  }
  /**
   * Create a new LINE channel with encrypted credentials
   */
  static async createChannel(data: CreateLineChannelData) {
    const { branchIds, ...channelData } = data;

    // Test credentials before saving
    const testResult = await testChannelCredentials({
      channelAccessToken: data.channelAccessToken,
      channelSecret: data.channelSecret
    });

    if (!testResult.success) {
      throw new Error(`Invalid LINE credentials: ${testResult.error}`);
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.lineChannel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    // Encrypt credentials
    const encryptedToken = encrypt(data.channelAccessToken);
    const encryptedSecret = encrypt(data.channelSecret);

    // Create channel with branch associations
    const channel = await prisma.lineChannel.create({
      data: {
        ...channelData,
        channelAccessToken: encryptedToken,
        channelSecret: encryptedSecret,
        branchLineChannels: branchIds ? {
          create: branchIds.map(branchId => ({
            branchId,
            isPrimary: true
          }))
        } : undefined
      },
      include: {
        branchLineChannels: {
          include: {
            branch: true
          }
        }
      }
    });

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Generate previews for credentials
    const tokenPreview = this.generateCredentialPreview(data.channelAccessToken, 10, 10);
    const secretPreview = this.generateCredentialPreview(data.channelSecret);

    // Return channel without encrypted credentials but with webhook URL and previews
    return {
      id: channel.channelId,
      ...channel,
      channelId: undefined,
      channelAccessToken: undefined,
      channelSecret: undefined,
      channelAccessTokenPreview: tokenPreview,
      channelSecretPreview: secretPreview,
      webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
      branches: channel.branchLineChannels,
      branchLineChannels: undefined,
      botInfo: testResult.botInfo
    };
  }

  /**
   * Update an existing LINE channel
   */
  static async updateChannel(channelId: string, data: UpdateLineChannelData) {
    const existingChannel = await prisma.lineChannel.findUnique({
      where: { channelId }
    });

    if (!existingChannel) {
      throw new Error('Channel not found');
    }

    // If updating credentials, test them first
    if (data.channelAccessToken || data.channelSecret) {
      const accessToken = data.channelAccessToken || decrypt(existingChannel.channelAccessToken);
      const secret = data.channelSecret || decrypt(existingChannel.channelSecret);

      const testResult = await testChannelCredentials({
        channelAccessToken: accessToken,
        channelSecret: secret
      });

      if (!testResult.success) {
        throw new Error(`Invalid LINE credentials: ${testResult.error}`);
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.lineChannel.updateMany({
        where: { 
          isDefault: true,
          NOT: { channelId }
        },
        data: { isDefault: false }
      });
    }

    // Prepare update data
    const updateData: Prisma.LineChannelUpdateInput = {
      ...data,
      channelAccessToken: data.channelAccessToken ? encrypt(data.channelAccessToken) : undefined,
      channelSecret: data.channelSecret ? encrypt(data.channelSecret) : undefined,
      lastRotatedAt: (data.channelAccessToken || data.channelSecret) ? new Date() : undefined
    };

    const channel = await prisma.lineChannel.update({
      where: { channelId },
      data: updateData,
      include: {
        branchLineChannels: {
          include: {
            branch: true
          }
        }
      }
    });

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Decrypt to generate previews
    const decryptedToken = decrypt(channel.channelAccessToken);
    const decryptedSecret = decrypt(channel.channelSecret);

    // Return channel without encrypted credentials but with webhook URL and previews
    return {
      id: channel.channelId,
      ...channel,
      channelId: undefined,
      channelAccessToken: undefined,
      channelSecret: undefined,
      channelAccessTokenPreview: this.generateCredentialPreview(decryptedToken, 10, 10),
      channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
      webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
      branches: channel.branchLineChannels,
      branchLineChannels: undefined
    };
  }

  /**
   * Delete a LINE channel
   */
  static async deleteChannel(channelId: string) {
    return await prisma.lineChannel.delete({
      where: { channelId }
    });
  }

  /**
   * Get all LINE channels (without credentials)
   */
  static async getAllChannels() {
    const channels = await prisma.lineChannel.findMany({
      include: {
        branchLineChannels: {
          include: {
            branch: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Remove encrypted credentials and add webhook URL from response
    return channels.map(channel => {
      // Decrypt to generate previews
      const decryptedToken = decrypt(channel.channelAccessToken);
      const decryptedSecret = decrypt(channel.channelSecret);
      
      return {
        id: channel.channelId,
        ...channel,
        channelId: undefined,
        channelAccessToken: undefined,
        channelSecret: undefined,
        channelAccessTokenPreview: this.generateCredentialPreview(decryptedToken, 10, 10),
        channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
        webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
        branches: channel.branchLineChannels,
        branchLineChannels: undefined
      };
    });
  }

  /**
   * Get a specific channel by ID (without credentials)
   */
  static async getChannel(channelId: string) {
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
      include: {
        branchLineChannels: {
          include: {
            branch: true
          }
        }
      }
    });

    if (!channel) {
      return null;
    }

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Decrypt to generate previews
    const decryptedToken = decrypt(channel.channelAccessToken);
    const decryptedSecret = decrypt(channel.channelSecret);

    // Remove encrypted credentials and add webhook URL from response
    return {
      id: channel.channelId,
      ...channel,
      channelId: undefined,
      channelAccessToken: undefined,
      channelSecret: undefined,
      channelAccessTokenPreview: this.generateCredentialPreview(decryptedToken, 10, 10),
      channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
      webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
      branches: channel.branchLineChannels,
      branchLineChannels: undefined
    };
  }

  /**
   * Assign branches to a channel
   */
  static async assignBranches(channelId: string, branchIds: string[]) {
    // Remove existing assignments
    await prisma.branchLineChannel.deleteMany({
      where: { channelId }
    });

    // Create new assignments
    if (branchIds.length > 0) {
      await prisma.branchLineChannel.createMany({
        data: branchIds.map(branchId => ({
          branchId,
          channelId,
          isPrimary: true
        }))
      });
    }

    return await this.getChannel(channelId);
  }

  /**
   * Get channels for a specific branch
   */
  static async getBranchChannels(branchId: string) {
    const branchChannels = await prisma.branchLineChannel.findMany({
      where: { branchId },
      include: {
        lineChannel: true
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Remove encrypted credentials from response
    return branchChannels.map(bc => ({
      ...bc,
      lineChannel: {
        ...bc.lineChannel,
        channelAccessToken: undefined,
        channelSecret: undefined
      }
    }));
  }

  /**
   * Set primary channel for a branch
   */
  static async setPrimaryChannel(branchId: string, channelId: string) {
    // First, unset all primary flags for this branch
    await prisma.branchLineChannel.updateMany({
      where: { branchId },
      data: { isPrimary: false }
    });

    // Set the new primary channel
    await prisma.branchLineChannel.update({
      where: {
        branchId_channelId: {
          branchId,
          channelId
        }
      },
      data: { isPrimary: true }
    });
  }

  /**
   * Test LINE channel credentials and optionally send a test message
   */
  static async testChannel(channelId: string, testUserId?: string) {
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId }
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    const credentials = {
      channelAccessToken: decrypt(channel.channelAccessToken),
      channelSecret: decrypt(channel.channelSecret)
    };

    // Test credentials
    const testResult = await testChannelCredentials(credentials);

    if (!testResult.success) {
      throw new Error(testResult.error || 'Invalid credentials');
    }

    // If a test user ID is provided, send a test message
    let messageResult = null;
    if (testUserId) {
      try {
        const { sendLinePush } = await import('@/lib/line-multi-channel');
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

    return {
      success: true,
      botInfo: testResult.botInfo,
      messageResult
    };
  }

  /**
   * Migrate environment variables to database (one-time migration)
   */
  static async migrateFromEnvironment() {
    const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const envSecret = process.env.LINE_CHANNEL_SECRET;

    if (!envToken || !envSecret) {
      return null;
    }

    // Check if already migrated
    const existingDefault = await prisma.lineChannel.findFirst({
      where: { isDefault: true }
    });

    if (existingDefault) {
      return existingDefault;
    }

    // Create default channel from environment variables
    return await this.createChannel({
      name: 'Default Channel (Migrated)',
      description: 'Migrated from environment variables',
      channelAccessToken: envToken,
      channelSecret: envSecret,
      isDefault: true
    });
  }
}