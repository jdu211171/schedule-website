import { createHmac } from "crypto";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/encryption";

const LINE_API_BASE = "https://api.line.me/v2/bot";

export interface LineChannelCredentials {
  channelAccessToken: string;
  channelSecret: string;
}

export interface LineMessage {
  type: "text";
  text: string;
}

export interface LineWebhookEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
  };
  source: {
    userId: string;
    type: string;
  };
  replyToken?: string;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery: boolean;
  };
}

export interface LineWebhookBody {
  destination?: string; // User ID of the channel (channel's LINE user ID)
  events: LineWebhookEvent[];
}

/**
 * Get LINE channel credentials for a specific branch and recipient type
 * Falls back to default channel if specific channel type not found
 */
export async function getChannelCredentials(
  branchId?: string,
  recipientType?: "TEACHER" | "STUDENT"
): Promise<LineChannelCredentials | null> {
  try {
    // If branchId is provided, try to get branch-specific channel for the recipient type
    if (branchId && recipientType) {
      const branchChannel = await prisma.branchLineChannel.findFirst({
        where: {
          branchId,
          channelType: recipientType,
          lineChannel: {
            isActive: true,
          },
        },
        include: {
          lineChannel: true,
        },
      });

      if (branchChannel?.lineChannel) {
        // Handle both encrypted and unencrypted data
        let accessToken: string;
        let secret: string;

        try {
          if (isEncrypted(branchChannel.lineChannel.channelAccessToken)) {
            accessToken = decrypt(branchChannel.lineChannel.channelAccessToken);
          } else {
            accessToken = branchChannel.lineChannel.channelAccessToken;
            console.warn(
              `Branch channel ${branchChannel.lineChannel.channelId} has unencrypted access token`
            );
          }

          if (isEncrypted(branchChannel.lineChannel.channelSecret)) {
            secret = decrypt(branchChannel.lineChannel.channelSecret);
          } else {
            secret = branchChannel.lineChannel.channelSecret;
            console.warn(
              `Branch channel ${branchChannel.lineChannel.channelId} has unencrypted secret`
            );
          }
        } catch (error) {
          console.error("Failed to decrypt branch channel credentials:", error);
          return null;
        }

        return {
          channelAccessToken: accessToken,
          channelSecret: secret,
        };
      }

      // If specific channel type not found, try to get the other type as fallback
      const fallbackChannelType =
        recipientType === "TEACHER" ? "STUDENT" : "TEACHER";
      const fallbackBranchChannel = await prisma.branchLineChannel.findFirst({
        where: {
          branchId,
          channelType: fallbackChannelType,
          lineChannel: {
            isActive: true,
          },
        },
        include: {
          lineChannel: true,
        },
      });

      if (fallbackBranchChannel?.lineChannel) {
        console.warn(
          `⚠️ Using ${fallbackChannelType} channel for ${recipientType} notification in branch ${branchId}`
        );
        return {
          channelAccessToken: decrypt(
            fallbackBranchChannel.lineChannel.channelAccessToken
          ),
          channelSecret: decrypt(
            fallbackBranchChannel.lineChannel.channelSecret
          ),
        };
      }
    } else if (branchId) {
      // Legacy support: if no recipientType provided, get any channel for the branch
      const branchChannel = await prisma.branchLineChannel.findFirst({
        where: {
          branchId,
          lineChannel: {
            isActive: true,
          },
        },
        include: {
          lineChannel: true,
        },
      });

      if (branchChannel?.lineChannel) {
        // Handle both encrypted and unencrypted data
        let accessToken: string;
        let secret: string;

        try {
          if (isEncrypted(branchChannel.lineChannel.channelAccessToken)) {
            accessToken = decrypt(branchChannel.lineChannel.channelAccessToken);
          } else {
            accessToken = branchChannel.lineChannel.channelAccessToken;
            console.warn(
              `Branch channel ${branchChannel.lineChannel.channelId} has unencrypted access token`
            );
          }

          if (isEncrypted(branchChannel.lineChannel.channelSecret)) {
            secret = decrypt(branchChannel.lineChannel.channelSecret);
          } else {
            secret = branchChannel.lineChannel.channelSecret;
            console.warn(
              `Branch channel ${branchChannel.lineChannel.channelId} has unencrypted secret`
            );
          }
        } catch (error) {
          console.error("Failed to decrypt branch channel credentials:", error);
          return null;
        }

        return {
          channelAccessToken: accessToken,
          channelSecret: secret,
        };
      }
    }

    // Try to get default channel
    const defaultChannel = await prisma.lineChannel.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    });

    if (defaultChannel) {
      // Handle both encrypted and unencrypted data
      let accessToken: string;
      let secret: string;

      try {
        if (isEncrypted(defaultChannel.channelAccessToken)) {
          accessToken = decrypt(defaultChannel.channelAccessToken);
        } else {
          accessToken = defaultChannel.channelAccessToken;
          console.warn(
            `Default channel ${defaultChannel.channelId} has unencrypted access token`
          );
        }

        if (isEncrypted(defaultChannel.channelSecret)) {
          secret = decrypt(defaultChannel.channelSecret);
        } else {
          secret = defaultChannel.channelSecret;
          console.warn(
            `Default channel ${defaultChannel.channelId} has unencrypted secret`
          );
        }
      } catch (error) {
        console.error("Failed to decrypt default channel credentials:", error);
        return null;
      }

      return {
        channelAccessToken: accessToken,
        channelSecret: secret,
      };
    }

    // Log warning with more context
    console.warn("⚠️ No LINE channel credentials found in database", {
      branchId,
      recipientType,
      hasDefaultChannel: false,
      message: "Please configure LINE channels in the admin panel",
    });

    // Check if environment variables exist but don't use them
    const hasEnvToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const hasEnvSecret = !!process.env.LINE_CHANNEL_SECRET;

    if (hasEnvToken || hasEnvSecret) {
      console.error(
        "❌ Environment variables detected but not used. Remove LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET from environment."
      );
    }

    return null;
  } catch (error) {
    console.error("Error getting channel credentials:", error);
    return null;
  }
}

/**
 * Get LINE channel by destination (channel's LINE user ID from webhook)
 *
 * NOTE: This function is currently a placeholder implementation.
 * The current webhook architecture uses URL path routing (/api/line/webhook/[channelId])
 * rather than destination-based routing from the webhook body.
 *
 * To fully implement this function, you would need to:
 * 1. Add a 'lineUserId' field to the LineChannel model in the database
 * 2. Store the channel's LINE user ID when setting up the channel
 * 3. Query the database to match the destination to the stored LINE user ID
 *
 * @param destination - The destination field from LINE webhook body (channel's LINE user ID)
 * @returns Channel credentials if found, null otherwise
 */
export async function getChannelByDestination(
  destination: string
): Promise<LineChannelCredentials | null> {
  try {
    // TODO: Implement proper destination-based channel lookup
    // This would require database schema changes to store LINE user IDs

    // For now, validate that destination is provided
    if (!destination) {
      console.warn(
        "getChannelByDestination: destination parameter is required"
      );
      return null;
    }

    console.log(`Looking for channel with destination: ${destination}`);

    // Current implementation: Return default channel as fallback
    // This maintains backward compatibility while the function is being developed
    const credentials = await getChannelCredentials();

    if (credentials) {
      console.log("getChannelByDestination: Using default channel credentials");
    } else {
      console.warn(
        "getChannelByDestination: No default channel credentials available"
      );
    }

    return credentials;
  } catch (error) {
    console.error("Error getting channel by destination:", error);
    return null;
  }
}

/**
 * Verify LINE webhook signature with specific channel secret
 */
export function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * Send a reply message to LINE using specific channel credentials
 */
export async function sendLineReply(
  replyToken: string,
  message: string,
  credentials: LineChannelCredentials
): Promise<void> {
  try {
    await axios.post(
      `${LINE_API_BASE}/message/reply`,
      {
        replyToken,
        messages: [{ type: "text", text: message }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.channelAccessToken}`,
        },
      }
    );
  } catch (error) {
    console.error("Error sending LINE reply:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("LINE API Response:", error.response.data);
    }
    throw error;
  }
}

/**
 * Send a push message to a single LINE user using specific channel credentials
 */
export async function sendLinePush(
  to: string,
  message: string,
  credentials: LineChannelCredentials
): Promise<void> {
  try {
    await axios.post(
      `${LINE_API_BASE}/message/push`,
      {
        to,
        messages: [{ type: "text", text: message }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.channelAccessToken}`,
        },
      }
    );
  } catch (error) {
    console.error("Error sending LINE push message:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("LINE API Response:", error.response.data);
    }
    throw error;
  }
}

/**
 * Validates a LINE user ID.
 * A valid user ID must start with 'U' and be 33 characters long.
 * @param lineId The LINE user ID to validate.
 * @returns True if the ID is valid, false otherwise.
 */
export function isValidLineId(lineId: string): boolean {
  return (
    typeof lineId === "string" && lineId.startsWith("U") && lineId.length === 33
  );
}

/**
 * Send a multicast message to multiple LINE users using specific channel credentials
 */
export async function sendLineMulticast(
  to: string[],
  message: string,
  credentials: LineChannelCredentials
): Promise<void> {
  const validRecipients = to.filter(isValidLineId);

  if (validRecipients.length === 0) {
    console.warn("No valid LINE IDs to send multicast message.");
    return;
  }

  try {
    await axios.post(
      `${LINE_API_BASE}/message/multicast`,
      {
        to: validRecipients,
        messages: [{ type: "text", text: message }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.channelAccessToken}`,
        },
      }
    );
  } catch (error) {
    console.error("Error sending LINE multicast:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("LINE API Response:", error.response.data);
    }
    throw error;
  }
}

/**
 * Test LINE channel credentials by getting bot info
 */
export async function testChannelCredentials(
  credentials: LineChannelCredentials
): Promise<{
  success: boolean;
  botInfo?: any;
  error?: string;
}> {
  try {
    const response = await axios.get(`${LINE_API_BASE}/info`, {
      headers: {
        Authorization: `Bearer ${credentials.channelAccessToken}`,
      },
    });

    return {
      success: true,
      botInfo: response.data,
    };
  } catch (error) {
    console.error("Error testing channel credentials:", error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.message || "Invalid credentials",
      };
    }
    return {
      success: false,
      error: "Failed to test credentials",
    };
  }
}
