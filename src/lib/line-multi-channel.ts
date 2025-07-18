import { createHmac } from 'crypto';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

export interface LineChannelCredentials {
  channelAccessToken: string;
  channelSecret: string;
}

export interface LineMessage {
  type: 'text';
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
 * Get LINE channel credentials for a specific branch
 * Falls back to default channel or environment variables
 */
export async function getChannelCredentials(branchId?: string): Promise<LineChannelCredentials | null> {
  try {
    // If branchId is provided, try to get branch-specific channel
    if (branchId) {
      const branchChannel = await prisma.branchLineChannel.findFirst({
        where: {
          branchId,
          isPrimary: true,
          lineChannel: {
            isActive: true
          }
        },
        include: {
          lineChannel: true
        }
      });

      if (branchChannel?.lineChannel) {
        return {
          channelAccessToken: decrypt(branchChannel.lineChannel.channelAccessToken),
          channelSecret: decrypt(branchChannel.lineChannel.channelSecret)
        };
      }
    }

    // Try to get default channel
    const defaultChannel = await prisma.lineChannel.findFirst({
      where: {
        isDefault: true,
        isActive: true
      }
    });

    if (defaultChannel) {
      return {
        channelAccessToken: decrypt(defaultChannel.channelAccessToken),
        channelSecret: decrypt(defaultChannel.channelSecret)
      };
    }

    // Fall back to environment variables (backward compatibility)
    const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const envSecret = process.env.LINE_CHANNEL_SECRET;

    if (envToken && envSecret) {
      return {
        channelAccessToken: envToken,
        channelSecret: envSecret
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting channel credentials:', error);
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
export async function getChannelByDestination(destination: string): Promise<LineChannelCredentials | null> {
  try {
    // TODO: Implement proper destination-based channel lookup
    // This would require database schema changes to store LINE user IDs
    
    // For now, validate that destination is provided
    if (!destination) {
      console.warn('getChannelByDestination: destination parameter is required');
      return null;
    }
    
    console.log(`Looking for channel with destination: ${destination}`);
    
    // Current implementation: Return default channel as fallback
    // This maintains backward compatibility while the function is being developed
    const credentials = await getChannelCredentials();
    
    if (credentials) {
      console.log('getChannelByDestination: Using default channel credentials');
    } else {
      console.warn('getChannelByDestination: No default channel credentials available');
    }
    
    return credentials;
  } catch (error) {
    console.error('Error getting channel by destination:', error);
    return null;
  }
}

/**
 * Verify LINE webhook signature with specific channel secret
 */
export function verifySignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
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
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.channelAccessToken}`
        }
      }
    );
  } catch (error) {
    console.error('Error sending LINE reply:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('LINE API Response:', error.response.data);
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
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.channelAccessToken}`
        }
      }
    );
  } catch (error) {
    console.error('Error sending LINE push message:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('LINE API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Send a multicast message to multiple LINE users using specific channel credentials
 */
export async function sendLineMulticast(
  to: string[], 
  message: string, 
  credentials: LineChannelCredentials
): Promise<void> {
  if (to.length === 0) return;

  try {
    await axios.post(
      `${LINE_API_BASE}/message/multicast`,
      {
        to,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.channelAccessToken}`
        }
      }
    );
  } catch (error) {
    console.error('Error sending LINE multicast:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('LINE API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Test LINE channel credentials by getting bot info
 */
export async function testChannelCredentials(credentials: LineChannelCredentials): Promise<{
  success: boolean;
  botInfo?: any;
  error?: string;
}> {
  try {
    const response = await axios.get(
      `${LINE_API_BASE}/info`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`
        }
      }
    );
    
    return {
      success: true,
      botInfo: response.data
    };
  } catch (error) {
    console.error('Error testing channel credentials:', error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Invalid credentials'
      };
    }
    return {
      success: false,
      error: 'Failed to test credentials'
    };
  }
}