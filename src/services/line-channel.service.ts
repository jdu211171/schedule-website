import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import { testChannelCredentials } from "@/lib/line-multi-channel";
import { Prisma } from "@prisma/client";

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
    console.warn(
      "BASE_URL environment variable not set. Using default fallback URL."
    );
    return "https://your-domain.com";
  }

  /**
   * Generate preview for sensitive credentials
   */
  private static generateCredentialPreview(
    credential: string,
    showStart = 4,
    showEnd = 4
  ): string {
    if (!credential || credential.length <= showStart + showEnd) {
      return "****";
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
      channelSecret: data.channelSecret,
    });

    if (!testResult.success) {
      throw new Error(`Invalid LINE credentials: ${testResult.error}`);
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.lineChannel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
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
        },
      });

      // Assign branches neutrally (UNSPECIFIED) if provided. Role is set later explicitly via UI.
      if (branchIds && branchIds.length > 0) {
        for (const branchId of branchIds) {
          await tx.branchLineChannel.create({
            data: {
              branchId,
              channelId: newChannel.channelId,
              channelType: "UNSPECIFIED",
            },
          });
        }
      }

      // Return the channel with associations
      return tx.lineChannel.findUnique({
        where: { channelId: newChannel.channelId },
        include: {
          branchLineChannels: {
            include: {
              branch: true,
            },
          },
        },
      });
    });

    if (!channel) {
      throw new Error("Failed to create channel");
    }

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Generate previews for credentials
    const tokenPreview = this.generateCredentialPreview(
      data.channelAccessToken,
      10,
      10
    );
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
      botInfo: testResult.botInfo,
    };
  }

  /**
   * Update an existing LINE channel
   */
  static async updateChannel(channelId: string, data: UpdateLineChannelData) {
    const existingChannel = await prisma.lineChannel.findUnique({
      where: { channelId },
    });

    if (!existingChannel) {
      throw new Error("Channel not found");
    }

    // If updating credentials, test them first
    // Only test if non-empty credentials are provided
    const hasNewAccessToken =
      data.channelAccessToken && data.channelAccessToken.trim().length > 0;
    const hasNewSecret =
      data.channelSecret && data.channelSecret.trim().length > 0;

    if (hasNewAccessToken || hasNewSecret) {
      // Get access token - handle both encrypted and unencrypted data
      let accessToken: string;
      if (hasNewAccessToken) {
        accessToken = data.channelAccessToken!;
      } else {
        // Decrypt existing token - handle both encrypted and unencrypted
        if (isEncrypted(existingChannel.channelAccessToken)) {
          accessToken = decrypt(existingChannel.channelAccessToken);
        } else {
          accessToken = existingChannel.channelAccessToken;
        }
      }

      // Get secret - handle both encrypted and unencrypted data
      let secret: string;
      if (hasNewSecret) {
        secret = data.channelSecret!;
      } else {
        // Decrypt existing secret - handle both encrypted and unencrypted
        if (isEncrypted(existingChannel.channelSecret)) {
          secret = decrypt(existingChannel.channelSecret);
        } else {
          secret = existingChannel.channelSecret;
        }
      }

      const testResult = await testChannelCredentials({
        channelAccessToken: accessToken,
        channelSecret: secret,
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
          NOT: { channelId },
        },
        data: { isDefault: false },
      });
    }

    // Extract branchIds from data to handle separately
    const { branchIds, ...channelUpdateData } = data;

    // Prepare update data
    const updateData: Prisma.LineChannelUpdateInput = {
      ...channelUpdateData,
      channelAccessToken:
        hasNewAccessToken && data.channelAccessToken
          ? encrypt(data.channelAccessToken)
          : undefined,
      channelSecret:
        hasNewSecret && data.channelSecret
          ? encrypt(data.channelSecret)
          : undefined,
      lastRotatedAt: hasNewAccessToken || hasNewSecret ? new Date() : undefined,
    };

    // Use transaction to ensure atomicity
    const channel = (await prisma.$transaction(async (tx) => {
      // Update channel
      const updatedChannel = await tx.lineChannel.update({
        where: { channelId },
        data: updateData,
        include: {
          branchLineChannels: {
            include: {
              branch: true,
            },
          },
        },
      });

      // Update branch assignments if provided
      if (branchIds !== undefined) {
        // Remove existing assignments
        await tx.branchLineChannel.deleteMany({
          where: { channelId },
        });

        // Create new assignments as UNSPECIFIED (type is set later explicitly via UI)
        if (branchIds.length > 0) {
          for (const branchId of branchIds) {
            // Create neutral association (no TEACHER/STUDENT decision here)
            await tx.branchLineChannel.create({
              data: {
                branchId,
                channelId,
                channelType: "UNSPECIFIED",
              },
            });
          }
        }

        // Return channel with updated branch assignments
        return await tx.lineChannel.findUnique({
          where: { channelId },
          include: {
            branchLineChannels: {
              include: {
                branch: true,
              },
            },
          },
        });
      }

      return updatedChannel;
    })) as any;

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Decrypt to generate previews - handle both encrypted and unencrypted data
    let decryptedToken: string;
    let decryptedSecret: string;

    try {
      // Check if data is encrypted before attempting to decrypt
      if (isEncrypted(channel.channelAccessToken)) {
        decryptedToken = decrypt(channel.channelAccessToken);
      } else {
        // Data is not encrypted, use as-is
        decryptedToken = channel.channelAccessToken;
        console.warn(
          `LINE channel ${channel.channelId} has unencrypted access token`
        );
      }

      if (isEncrypted(channel.channelSecret)) {
        decryptedSecret = decrypt(channel.channelSecret);
      } else {
        // Data is not encrypted, use as-is
        decryptedSecret = channel.channelSecret;
        console.warn(
          `LINE channel ${channel.channelId} has unencrypted secret`
        );
      }
    } catch (error) {
      console.error(
        `Failed to decrypt credentials for channel ${channel.channelId}:`,
        error
      );
      // If decryption fails, try using the raw value
      decryptedToken = channel.channelAccessToken;
      decryptedSecret = channel.channelSecret;
    }

    // Return channel without encrypted credentials but with webhook URL and previews
    return {
      id: channel.channelId,
      ...channel,
      channelId: undefined,
      channelAccessToken: undefined,
      channelSecret: undefined,
      channelAccessTokenPreview: this.generateCredentialPreview(
        decryptedToken,
        10,
        10
      ),
      channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
      webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
      branches: channel.branchLineChannels,
      branchLineChannels: undefined,
    };
  }

  /**
   * Delete a LINE channel
   */
  static async deleteChannel(channelId: string) {
    return await prisma.lineChannel.delete({
      where: { channelId },
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
            branch: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Remove encrypted credentials and add webhook URL from response
    const processedChannels = channels.map((channel) => {
      // Decrypt to generate previews - handle both encrypted and unencrypted data
      let decryptedToken: string;
      let decryptedSecret: string;

      try {
        // Check if data is encrypted before attempting to decrypt
        if (isEncrypted(channel.channelAccessToken)) {
          try {
            decryptedToken = decrypt(channel.channelAccessToken);
          } catch (decryptError) {
            console.warn(
              `LINE channel ${channel.channelId} appears encrypted but failed to decrypt access token - may be encrypted with different key`
            );
            // Skip this channel if we can't decrypt it
            return null;
          }
        } else {
          // Data is not encrypted, use as-is
          decryptedToken = channel.channelAccessToken;
          console.warn(
            `LINE channel ${channel.channelId} has unencrypted access token`
          );
        }

        if (isEncrypted(channel.channelSecret)) {
          try {
            decryptedSecret = decrypt(channel.channelSecret);
          } catch (decryptError) {
            console.warn(
              `LINE channel ${channel.channelId} appears encrypted but failed to decrypt secret - may be encrypted with different key`
            );
            // Skip this channel if we can't decrypt it
            return null;
          }
        } else {
          // Data is not encrypted, use as-is
          decryptedSecret = channel.channelSecret;
          console.warn(
            `LINE channel ${channel.channelId} has unencrypted secret`
          );
        }
      } catch (error) {
        console.error(
          `Failed to process credentials for channel ${channel.channelId}:`,
          error
        );
        // Skip this channel
        return null;
      }

      return {
        id: channel.channelId,
        ...channel,
        channelId: undefined,
        channelAccessToken: undefined,
        channelSecret: undefined,
        channelAccessTokenPreview: this.generateCredentialPreview(
          decryptedToken,
          10,
          10
        ),
        channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
        webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
        branches: channel.branchLineChannels,
        branchLineChannels: undefined,
      };
    });

    // Filter out any channels that couldn't be processed (null values)
    return processedChannels.filter((channel) => channel !== null);
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
            branch: true,
          },
        },
      },
    });

    if (!channel) {
      return null;
    }

    // Get base URL for webhook endpoints
    const baseUrl = this.getBaseUrl();

    // Decrypt to generate previews - handle both encrypted and unencrypted data
    let decryptedToken: string;
    let decryptedSecret: string;

    try {
      // Check if data is encrypted before attempting to decrypt
      if (isEncrypted(channel.channelAccessToken)) {
        decryptedToken = decrypt(channel.channelAccessToken);
      } else {
        // Data is not encrypted, use as-is
        decryptedToken = channel.channelAccessToken;
        console.warn(
          `LINE channel ${channel.channelId} has unencrypted access token`
        );
      }

      if (isEncrypted(channel.channelSecret)) {
        decryptedSecret = decrypt(channel.channelSecret);
      } else {
        // Data is not encrypted, use as-is
        decryptedSecret = channel.channelSecret;
        console.warn(
          `LINE channel ${channel.channelId} has unencrypted secret`
        );
      }
    } catch (error) {
      console.error(
        `Failed to decrypt credentials for channel ${channel.channelId}:`,
        error
      );
      // If decryption fails, try using the raw value
      decryptedToken = channel.channelAccessToken;
      decryptedSecret = channel.channelSecret;
    }

    // Remove encrypted credentials and add webhook URL from response
    return {
      id: channel.channelId,
      ...channel,
      channelId: undefined,
      channelAccessToken: undefined,
      channelSecret: undefined,
      channelAccessTokenPreview: this.generateCredentialPreview(
        decryptedToken,
        10,
        10
      ),
      channelSecretPreview: this.generateCredentialPreview(decryptedSecret),
      webhookUrl: `${baseUrl}/api/line/webhook/${channel.channelId}`,
      branches: channel.branchLineChannels,
      branchLineChannels: undefined,
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
        where: { channelId },
      });

      // Create new assignments as UNSPECIFIED (type is set via separate UI)
      if (branchIds.length > 0) {
        for (const branchId of branchIds) {
          await tx.branchLineChannel.create({
            data: {
              branchId,
              channelId,
              channelType: "UNSPECIFIED",
            },
          });
        }
      }
    });

    return await this.getChannel(channelId);
  }

  /**
   * Set a specific channel type for a branch
   */
  static async setChannelType(
    branchId: string,
    channelId: string,
    channelType: "TEACHER" | "STUDENT"
  ) {
    // Verify the channel is assigned to the branch
    const assignment = await prisma.branchLineChannel.findFirst({
      where: {
        branchId,
        channelId,
      },
    });

    if (!assignment) {
      throw new Error("この校舎にはチャンネルが割り当てられていません");
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Remove any existing channel of this type for this branch
      await tx.branchLineChannel.deleteMany({
        where: {
          branchId,
          channelType,
          id: { not: assignment.id }, // Don't delete the current assignment
        },
      });

      // Update the channel type
      await tx.branchLineChannel.update({
        where: {
          id: assignment.id,
        },
        data: {
          channelType,
        },
      });
    });

    return true;
  }

  /**
   * Validate that each branch has at most one channel of each type
   * Returns branches with multiple channels of the same type
   */
  static async validateChannelTypes() {
    const result = await prisma.branchLineChannel.groupBy({
      by: ["branchId", "channelType"],
      _count: {
        channelId: true,
      },
      having: {
        channelId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (result.length > 0) {
      // Get branch details for the problematic branches
      const branchIds = result.map((r) => r.branchId);
      const branches = await prisma.branch.findMany({
        where: {
          branchId: { in: branchIds },
        },
        include: {
          branchLineChannels: {
            include: {
              lineChannel: {
                select: {
                  channelId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        isValid: false,
        invalidBranches: branches.map((branch) => ({
          branchId: branch.branchId,
          branchName: branch.name,
          channels: branch.branchLineChannels.map((blc) => ({
            channelId: blc.lineChannel.channelId,
            channelName: blc.lineChannel.name,
            channelType: blc.channelType,
          })),
        })),
      };
    }

    return {
      isValid: true,
      invalidBranches: [],
    };
  }

  /**
   * Get channels for a specific branch
   */
  static async getBranchChannels(branchId: string) {
    const branchChannels = await prisma.branchLineChannel.findMany({
      where: { branchId },
      include: {
        lineChannel: true,
      },
      orderBy: [
        { channelType: "asc" }, // TEACHER channels first, then STUDENT
        { createdAt: "asc" },
      ],
    });

    // Remove encrypted credentials from response
    return branchChannels.map((bc) => ({
      ...bc,
      lineChannel: {
        ...bc.lineChannel,
        channelAccessToken: undefined,
        channelSecret: undefined,
      },
    }));
  }

  /**
   * Test LINE channel credentials and optionally send a test message
   */
  static async testChannel(channelId: string, testUserId?: string) {
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
    });

    if (!channel) {
      throw new Error("Channel not found");
    }

    // Decrypt credentials - handle both encrypted and unencrypted data
    let channelAccessToken: string;
    let channelSecret: string;

    try {
      // Check if data is encrypted before attempting to decrypt
      if (isEncrypted(channel.channelAccessToken)) {
        channelAccessToken = decrypt(channel.channelAccessToken);
      } else {
        // Data is not encrypted, use as-is
        channelAccessToken = channel.channelAccessToken;
        console.warn(`LINE channel ${channelId} has unencrypted access token`);
      }

      if (isEncrypted(channel.channelSecret)) {
        channelSecret = decrypt(channel.channelSecret);
      } else {
        // Data is not encrypted, use as-is
        channelSecret = channel.channelSecret;
        console.warn(`LINE channel ${channelId} has unencrypted secret`);
      }
    } catch (error) {
      console.error(
        `Failed to decrypt credentials for channel ${channelId}:`,
        error
      );
      throw new Error("Failed to decrypt channel credentials");
    }

    const credentials = {
      channelAccessToken,
      channelSecret,
    };

    // Test credentials
    const testResult = await testChannelCredentials(credentials);

    if (!testResult.success) {
      throw new Error(testResult.error || "Invalid credentials");
    }

    // If a test user ID is provided, send a test message
    let messageResult = null;
    if (testUserId) {
      try {
        // Create a notification record
        const { createNotification } = await import(
          "@/lib/notification/notification-service"
        );
        const testMessage = `🔔 テストメッセージ\n\nこれは「${channel.name}」チャンネルからのテストメッセージです。\n\n正常に受信できていれば、このチャンネルは正しく設定されています。`;

        const notification = await createNotification({
          recipientId: testUserId,
          recipientType: "TEACHER", // Assuming TEACHER for channel testing
          notificationType: "CHANNEL_TEST",
          message: testMessage,
          branchId: undefined, // Channel test is not branch-specific
          sentVia: "LINE",
          targetDate: new Date(
            new Date().toISOString().split("T")[0] + "T00:00:00.000Z"
          ), // Today's date at midnight UTC
        });

        if (notification) {
          try {
            // Send the LINE message
            const { sendLinePush } = await import("@/lib/line-multi-channel");
            await sendLinePush(testUserId, testMessage, credentials);

            // Update notification status to SENT
            await prisma.notification.update({
              where: { notificationId: notification.notificationId },
              data: {
                status: "SENT",
                sentAt: new Date(),
              },
            });

            messageResult = {
              success: true,
              notificationId: notification.notificationId,
            };
          } catch (lineError) {
            // If LINE message fails, update notification status to FAILED
            await prisma.notification.update({
              where: { notificationId: notification.notificationId },
              data: {
                status: "FAILED",
                logs: {
                  error:
                    (lineError as Error).message ||
                    "Failed to send test message",
                  timestamp: new Date().toISOString(),
                },
              },
            });
            throw lineError;
          }
        } else {
          messageResult = {
            success: true,
            message: "Test message already sent (duplicate notification)",
          };
        }
      } catch (error) {
        console.error("Error sending test message:", error);
        messageResult = {
          success: false,
          error: "Failed to send test message. Please check the LINE user ID.",
        };
      }
    }

    return {
      success: true,
      botInfo: testResult.botInfo,
      messageResult,
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
      where: { isDefault: true },
    });

    if (existingDefault) {
      return existingDefault;
    }

    // Create default channel from environment variables
    return await this.createChannel({
      name: "Default Channel (Migrated)",
      description: "Migrated from environment variables",
      channelAccessToken: envToken,
      channelSecret: envSecret,
      isDefault: true,
    });
  }

  /**
   * Unassign a channel type from a branch
   */
  static async unassignChannelType(
    branchId: string,
    channelType: "TEACHER" | "STUDENT"
  ) {
    // Verify the branch exists
    const branch = await prisma.branch.findUnique({
      where: { branchId },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    // Check if there's a channel assigned for this type
    const assignment = await prisma.branchLineChannel.findFirst({
      where: {
        branchId,
        channelType,
      },
    });

    if (!assignment) {
      throw new Error("この校舎にはチャンネルが割り当てられていません");
    }

    // Delete the assignment
    await prisma.branchLineChannel.delete({
      where: {
        id: assignment.id,
      },
    });
  }
}
