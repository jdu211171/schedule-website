import { createHmac } from "crypto";
import axios from "axios";
import { getChannelCredentials as getMultiChannelCredentials } from "./line-multi-channel";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

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
}

export interface LineWebhookBody {
  events: LineWebhookEvent[];
}

/**
 * Verify LINE webhook signature
 */
export function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) {
    console.error("LINE_CHANNEL_SECRET is not set");
    return false;
  }

  const hash = createHmac("sha256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * Send a reply message to LINE (free within 24 hours)
 */
export async function sendLineReply(
  replyToken: string,
  message: string
): Promise<void> {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

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
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
  } catch (error) {
    console.error("Error sending LINE reply:", error);
    throw error;
  }
}

/**
 * Send a push message to a single LINE user
 * Backward compatible version that uses multi-channel support
 */
export async function sendLinePush(
  to: string,
  message: string,
  branchId?: string
): Promise<void> {
  // Try to get credentials from multi-channel system first
  const credentials = await getMultiChannelCredentials(branchId);

  if (credentials) {
    // Use multi-channel system
    const { sendLinePush: sendMultiChannelPush } = await import(
      "./line-multi-channel"
    );
    return sendMultiChannelPush(to, message, credentials);
  }

  // No credentials found - do not fall back to environment variables
  console.error(
    "❌ No LINE channel credentials found. Please configure LINE channels in the admin panel."
  );
  throw new Error(
    "No LINE channel credentials available. Configure channels in admin panel."
  );
}

/**
 * Send a multicast message to multiple LINE users (more efficient for bulk messages)
 * Backward compatible version that uses multi-channel support
 */
export async function sendLineMulticast(
  to: string[],
  message: string,
  branchId?: string
): Promise<void> {
  if (to.length === 0) return;

  // Try to get credentials from multi-channel system first
  const credentials = await getMultiChannelCredentials(branchId);

  if (credentials) {
    // Use multi-channel system
    const { sendLineMulticast: sendMultiChannelMulticast } = await import(
      "./line-multi-channel"
    );
    return sendMultiChannelMulticast(to, message, credentials);
  }

  // No credentials found - do not fall back to environment variables
  console.error(
    "❌ No LINE channel credentials found. Please configure LINE channels in the admin panel."
  );
  throw new Error(
    "No LINE channel credentials available. Configure channels in admin panel."
  );
}
