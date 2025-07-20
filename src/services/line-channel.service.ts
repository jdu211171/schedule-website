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
  description?: string | null;
  channelAccessToken?: string;
  channelSecret?: string;
  webhookUrl?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  branchIds?: string[];
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

    // Create channel with branch associations in a transaction
    const channel = await prisma.$transaction(async (tx) => {
      // Create the channel first
      const newChannel = await tx.lineChannel.create({
        data: {
          ...channelData,
          channelAccessToken: encryptedToken,
          channelSecret: encryptedSecret,
        }
      });

      // Handle branch assignments if provided
      if (branchIds && branchIds.length > 0) {
        // For each branch, ensure only one primary channel
        for (let i = 0; i < branchIds.length; i++) {
          const branchId = branchIds[i];
          const isPrimary = i === 0; // First branch gets primary status

          // If this will be primary, unset any existing primary channels for this branch
          if (isPrimary) {
            await tx.branchLineChannel.updateMany({
              where: {
                branchId,
                isPrimary: true
              },
              data: {
                isPrimary: false
              }
            });
          }

          // Create the association
          await tx.branchLineChannel.create({
            data: {
              branchId,
              channelId: newChannel.channelId,
              isPrimary
            }
          });
        }
      }

      // Return the channel with associations
      return tx.lineChannel.findUnique({
        where: { channelId: newChannel.channelId },
        include: {
          branchLineChannels: {
            include: {
              branch: true
            }
          }
        }
      });
    });

    if (!channel) {
      throw new Error('Failed to create channel');
    }

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
    // Only test if non-empty credentials are provided
    const hasNewAccessToken = data.channelAccessToken && data.channelAccessToken.trim().length > 0;
    const hasNewSecret = data.channelSecret && data.channelSecret.trim().length > 0;
    
    if (hasNewAccessToken || hasNewSecret) {
      const accessToken = hasNewAccessToken ? data.channelAccessToken! : decrypt(existingChannel.channelAccessToken);
      const secret = hasNewSecret ? data.channelSecret! : decrypt(existingChannel.channelSecret);

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

    // Extract branchIds from data to handle separately
    const { branchIds, ...channelUpdateData } = data;

    // Prepare update data
    const updateData: Prisma.LineChannelUpdateInput = {
      ...channelUpdateData,
      channelAccessToken: hasNewAccessToken && data.channelAccessToken ? encrypt(data.channelAccessToken) : undefined,
      channelSecret: hasNewSecret && data.channelSecret ? encrypt(data.channelSecret) : undefined,
      lastRotatedAt: (hasNewAccessToken || hasNewSecret) ? new Date() : undefined
    };

    // Use transaction to ensure atomicity
    const channel = await prisma.$transaction(async (tx) => {
      // Update channel
      const updatedChannel = await tx.lineChannel.update({
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

      // Update branch assignments if provided
      if (branchIds !== undefined) {
        // Remove existing assignments
        await tx.branchLineChannel.deleteMany({
          where: { channelId }
        });

        // Create new assignments with proper primary handling
        if (branchIds.length > 0) {
          for (let i = 0; i < branchIds.length; i++) {
            const branchId = branchIds[i];
            const isPrimary = i === 0; // First branch gets primary status

            // If this will be primary, unset any existing primary channels for this branch
            if (isPrimary) {
              await tx.branchLineChannel.updateMany({
                where: {
                  branchId,
                  isPrimary: true
                },
                data: {
                  isPrimary: false
                }
              });
            }

            // Create the association
            await tx.branchLineChannel.create({
              data: {
                branchId,
                channelId,
                isPrimary
              }
            });
          }
        }

        // Return channel with updated branch assignments
        return await tx.lineChannel.findUnique({
          where: { channelId },
          include: {
            branchLineChannels: {
              include: {
                branch: true
              }
            }
          }
        });
      }

      return updatedChannel;
    }) as any;

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
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.branchLineChannel.deleteMany({
        where: { channelId }
      });

      // Create new assignments with proper primary handling
      if (branchIds.length > 0) {
        for (let i = 0; i < branchIds.length; i++) {
          const branchId = branchIds[i];
          const isPrimary = i === 0; // First branch gets primary status

          // If this will be primary, unset any existing primary channels for this branch
          if (isPrimary) {
            await tx.branchLineChannel.updateMany({
              where: {
                branchId,
                isPrimary: true
              },
              data: {
                isPrimary: false
              }
            });
          }

          // Create the association
          await tx.branchLineChannel.create({
            data: {
              branchId,
              channelId,
              isPrimary
            }
          });
        }
      }
    });

    return await this.getChannel(channelId);
  }

  /**
   * Set a specific channel as primary for a branch
   */
  static async setPrimaryChannel(branchId: string, channelId: string) {
    // Verify the channel is assigned to the branch
    const assignment = await prisma.branchLineChannel.findFirst({
      where: {
        branchId,
        channelId
      }
    });

    if (!assignment) {
      throw new Error('Channel is not assigned to this branch');
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Unset all primary channels for this branch
      await tx.branchLineChannel.updateMany({
        where: {
          branchId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });

      // Set the specified channel as primary
      await tx.branchLineChannel.update({
        where: {
          id: assignment.id
        },
        data: {
          isPrimary: true
        }
      });
    });

    return true;
  }

  /**
   * Validate that each branch has at most one primary channel
   * Returns branches with multiple primary channels
   */
  static async validatePrimaryChannels() {
    const result = await prisma.branchLineChannel.groupBy({
      by: ['branchId'],
      where: {
        isPrimary: true
      },
      _count: {
        channelId: true
      },
      having: {
        channelId: {
          _count: {
            gt: 1
          }
        }
      }
    });

    if (result.length > 0) {
      // Get branch details for the problematic branches
      const branchIds = result.map(r => r.branchId);
      const branches = await prisma.branch.findMany({
        where: {
          branchId: { in: branchIds }
        },
        include: {
          branchLineChannels: {
            where: { isPrimary: true },
            include: {
              lineChannel: {
                select: {
                  channelId: true,
                  name: true
                }
              }
            }
          }
        }
      });

      return {
        isValid: false,
        invalidBranches: branches.map(branch => ({
          branchId: branch.branchId,
          branchName: branch.name,
          primaryChannels: branch.branchLineChannels.map(blc => ({
            channelId: blc.lineChannel.channelId,
            channelName: blc.lineChannel.name
          }))
        }))
      };
    }

    return {
      isValid: true,
      invalidBranches: []
    };
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