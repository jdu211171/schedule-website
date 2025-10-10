
import { prisma } from '@/lib/prisma';
import { Notification, NotificationStatus } from '@prisma/client';
import { sendLineMulticast, isValidLineId, classifyLineApiError } from '@/lib/line-multi-channel';
import { getChannelCredentials } from '@/lib/line-multi-channel';
import { decrypt, isEncrypted } from '@/lib/encryption';
import getNotificationConfig from '@/lib/notification/config';
import { logEvent, consoleDev } from '@/lib/telemetry/logging';

const MAX_ATTEMPTS = 3;

// Configurable worker settings
interface WorkerConfig {
  batchSize: number;
  maxConcurrency: number;
  maxExecutionTimeMs: number;
  delayBetweenBatchesMs: number;
}

// Default configuration - can be overridden via environment variables
const DEFAULT_CONFIG: WorkerConfig = {
  batchSize: parseInt(process.env.NOTIFICATION_WORKER_BATCH_SIZE || '10'),
  maxConcurrency: parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '3'),
  maxExecutionTimeMs: parseInt(process.env.NOTIFICATION_WORKER_MAX_TIME || '300000'), // 5 minutes
  delayBetweenBatchesMs: parseInt(process.env.NOTIFICATION_WORKER_DELAY || '1000'), // 1 second
};

consoleDev.log('process.env.NODE_ENV', process.env.NODE_ENV);

interface WorkerResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  executionTimeMs: number;
  batches: number;
}

// Helper: check if the given date is a vacation for the branch (handles recurring)
async function isVacationDay(branchId: string | null | undefined, date: Date | null): Promise<boolean> {
  if (!branchId || !date) return false;
  const vacations = await prisma.vacation.findMany({
    where: { branchId },
    select: { startDate: true, endDate: true, isRecurring: true },
  });
  const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const targetMD = md(date);
  for (const v of vacations) {
    if (!v.isRecurring) {
      if (v.startDate <= date && v.endDate >= date) return true;
    } else {
      const startMD = md(v.startDate);
      const endMD = md(v.endDate);
      if (startMD <= endMD) {
        if (targetMD >= startMD && targetMD <= endMD) return true;
      } else {
        if (targetMD >= startMD || targetMD <= endMD) return true;
      }
    }
  }
  return false;
}

/**
 * Processes a single notification. This function is designed to be robust.
 * It marks the notification as PROCESSING and increments attempts first.
 * Then, it tries to send the notification. If it succeeds, it marks it as SENT.
 * If it fails at any point, it marks it as FAILED and re-throws the error.
 *
 * @param notification - The notification to process.
 */
const processNotification = async (notification: Notification): Promise<void> => {
  // Immediately mark as processing and increment attempt count.
  // This prevents other workers from picking up the same job.
  await prisma.notification.update({
    where: { notificationId: notification.notificationId },
    data: {
      status: NotificationStatus.PROCESSING,
      processingAttempts: { increment: 1 },
    },
  });

  let channelIdForDelivery: string | null = null;
  
  try {
    // Skip notifications on vacation days for the branch
    if (await isVacationDay(notification.branchId, notification.targetDate)) {
      await prisma.notification.update({
        where: { notificationId: notification.notificationId },
        data: {
          status: NotificationStatus.FAILED,
          processingAttempts: MAX_ATTEMPTS,
          logs: {
            success: false,
            message: 'SKIPPED_VACATION_DAY: Target date is vacation for branch',
            context: {
              branchId: notification.branchId,
              targetDate: notification.targetDate,
            }
          }
        }
      });
      return;
    }

    // Always use multi-channel links strategy
    const lineIds: string[] = [];

    // Multi-channel link strategy
    if (notification.branchId) {
      // Resolve branch channel by recipient type, fallback to default if needed
      const recipientType = notification.recipientType as 'TEACHER' | 'STUDENT';
      const primary = await prisma.branchLineChannel.findFirst({
        where: {
          branchId: notification.branchId,
          channelType: recipientType,
          lineChannel: { isActive: true }
        },
        include: { lineChannel: true }
      });

      let resolvedChannel = primary;
      if (!resolvedChannel) {
        const fbPolicy = (process.env.LINE_MULTICHANNEL_FALLBACK || 'skip').toLowerCase();
        if (fbPolicy === 'other-type') {
          const otherType = recipientType === 'TEACHER' ? 'STUDENT' : 'TEACHER';
          resolvedChannel = await prisma.branchLineChannel.findFirst({
            where: {
              branchId: notification.branchId,
              channelType: otherType,
              lineChannel: { isActive: true }
            },
            include: { lineChannel: true }
          });
        } else if (fbPolicy === 'default') {
          const def = await prisma.lineChannel.findFirst({ where: { isDefault: true, isActive: true } });
          if (def) {
            resolvedChannel = { channelId: def.channelId, branchId: notification.branchId, channelType: recipientType, createdAt: new Date(), lineChannel: def, id: '', } as any;
          }
        }
      }

      if (resolvedChannel?.lineChannel) {
        channelIdForDelivery = resolvedChannel.lineChannel.channelId;

        if (recipientType === 'TEACHER') {
          const links = await prisma.teacherLineLink.findMany({
            where: { teacherId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        } else {
          const links = await prisma.studentLineLink.findMany({
            where: { studentId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        }
      }
    } else {
      // No branch specified - try to find a default channel
      const defaultChannel = await prisma.lineChannel.findFirst({ 
        where: { isDefault: true, isActive: true } 
      });
      
      if (defaultChannel) {
        channelIdForDelivery = defaultChannel.channelId;
        
        if (notification.recipientType === 'TEACHER') {
          const links = await prisma.teacherLineLink.findMany({
            where: { teacherId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        } else if (notification.recipientType === 'STUDENT') {
          const links = await prisma.studentLineLink.findMany({
            where: { studentId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        }
      }
    }

    if (lineIds.length === 0) {
      // Mark as failed but do not retry (treat as skipped-no-link)
      await prisma.notification.update({
        where: { notificationId: notification.notificationId },
        data: {
          status: NotificationStatus.FAILED,
          processingAttempts: MAX_ATTEMPTS,
          logs: {
            success: false,
            message: 'SKIPPED_NO_LINK: No LINE IDs for delivery',
            context: {
              recipientType: notification.recipientType,
              recipientId: notification.recipientId,
              branchId: notification.branchId,
              timestamp: new Date().toISOString(),
            }
          }
        }
      });
      return; // do not throw to avoid extra noise
    }

    // Validate all LINE ID formats
    const validLineIds = lineIds.filter(lineId => {
      const isValid = isValidLineId(lineId);
      if (!isValid) {
        console.warn(`Invalid LINE ID format for ${notification.recipientType} ${notification.recipientId}: ${lineId}`);
      }
      return isValid;
    });

    if (validLineIds.length === 0) {
      await prisma.notification.update({
        where: { notificationId: notification.notificationId },
        data: {
          status: NotificationStatus.FAILED,
          processingAttempts: MAX_ATTEMPTS,
          logs: {
            success: false,
            message: 'SKIPPED_NO_LINK: No valid LINE IDs for delivery',
            context: {
              recipientType: notification.recipientType,
              recipientId: notification.recipientId,
              branchId: notification.branchId,
              timestamp: new Date().toISOString(),
            }
          }
        }
      });
      return;
    }

    // Get channel credentials based on resolved channel or branch routing
    let credentials = null;
    if (channelIdForDelivery) {
      // Fetch specific channel credentials
      const ch = await prisma.lineChannel.findUnique({ where: { channelId: channelIdForDelivery } });
      if (ch) {
        const token = isEncrypted(ch.channelAccessToken) ? decrypt(ch.channelAccessToken) : ch.channelAccessToken;
        const secret = isEncrypted(ch.channelSecret) ? decrypt(ch.channelSecret) : ch.channelSecret;
        credentials = { channelAccessToken: token, channelSecret: secret };
      }
    }
    if (!credentials) {
      credentials = await getChannelCredentials(
        notification.branchId || undefined,
        notification.recipientType as 'TEACHER' | 'STUDENT'
      );
    }

    if (!credentials) {
      throw new Error('No LINE channel credentials available for delivery');
    }

    // Send via LINE to all valid IDs
    await sendLineMulticast(validLineIds, notification.message!, credentials);

    // Mark as sent on success
    await prisma.notification.update({
      where: { notificationId: notification.notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        logs: {
          success: true,
          message: `Message sent successfully via LINE to ${validLineIds.length} account(s)`,
          recipients: validLineIds.length,
          deliveryChannelId: channelIdForDelivery,
          linkCount: validLineIds.length,
          branchId: notification.branchId,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Enhanced error logging with notification context
    console.error(`❌ Failed to process notification:`, {
      notificationId: notification.notificationId,
      recipientType: notification.recipientType,
      recipientId: notification.recipientId,
      notificationType: notification.notificationType,
      branchId: notification.branchId,
      attempt: notification.processingAttempts + 1, // +1 since we incremented it earlier
      scheduledAt: notification.scheduledAt,
      targetDate: notification.targetDate,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined
    });

    // Mark as failed on any error
    await prisma.notification.update({
      where: { notificationId: notification.notificationId },
      data: {
        status: NotificationStatus.FAILED,
        logs: {
          success: false,
          message: errorMessage,
          context: {
            recipientType: notification.recipientType,
            recipientId: notification.recipientId,
            notificationType: notification.notificationType,
            attempt: notification.processingAttempts + 1,
            timestamp: new Date().toISOString(),
            deliveryChannelId: channelIdForDelivery,
            branchId: notification.branchId,
            linkCount: 0,
          }
        },
      },
    });

    // Swallow error; already recorded above. Further retries depend on attempts.
    return;
  }
};

/**
 * Group notifications by channel and message for efficient multicast
 */
interface NotificationGroup {
  channelId: string;
  message: string;
  lineIds: string[];
  notifications: Notification[];
  /**
   * Maps each notification to its associated LINE IDs for this group.
   * Used during chunked delivery to track which notifications correspond to which LINE recipients,
   * enabling accurate persistence of delivery success/failure for each chunk.
   * This ensures that when sending messages in batches, we can record the delivery status
   * for each notification and its recipients individually.
   */
  recipients: Array<{ notification: Notification; lineIds: string[] }>;
  credentials?: any;
}

async function groupNotificationsByChannel(notifications: Notification[]): Promise<NotificationGroup[]> {
  const groups = new Map<string, NotificationGroup>();
  
  for (const notification of notifications) {
    // Process each notification to get channel and LINE IDs
    const lineIds: string[] = [];
    let channelIdForDelivery: string | null = null;
    
    // Multi-channel link strategy (same logic as processNotification)
    if (notification.branchId) {
      const recipientType = notification.recipientType as 'TEACHER' | 'STUDENT';
      const primary = await prisma.branchLineChannel.findFirst({
        where: {
          branchId: notification.branchId,
          channelType: recipientType,
          lineChannel: { isActive: true }
        },
        include: { lineChannel: true }
      });

      let resolvedChannel = primary;
      if (!resolvedChannel) {
        const fbPolicy = (process.env.LINE_MULTICHANNEL_FALLBACK || 'skip').toLowerCase();
        if (fbPolicy === 'other-type') {
          const otherType = recipientType === 'TEACHER' ? 'STUDENT' : 'TEACHER';
          resolvedChannel = await prisma.branchLineChannel.findFirst({
            where: {
              branchId: notification.branchId,
              channelType: otherType,
              lineChannel: { isActive: true }
            },
            include: { lineChannel: true }
          });
        } else if (fbPolicy === 'default') {
          const def = await prisma.lineChannel.findFirst({ where: { isDefault: true, isActive: true } });
          if (def) {
            resolvedChannel = { channelId: def.channelId, branchId: notification.branchId, channelType: recipientType, createdAt: new Date(), lineChannel: def, id: '', } as any;
          }
        }
      }

      if (resolvedChannel?.lineChannel) {
        channelIdForDelivery = resolvedChannel.lineChannel.channelId;

        if (recipientType === 'TEACHER') {
          const links = await prisma.teacherLineLink.findMany({
            where: { teacherId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        } else {
          const links = await prisma.studentLineLink.findMany({
            where: { studentId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        }
      }
    } else {
      // No branch specified - try default channel
      const defaultChannel = await prisma.lineChannel.findFirst({ 
        where: { isDefault: true, isActive: true } 
      });
      
      if (defaultChannel) {
        channelIdForDelivery = defaultChannel.channelId;
        
        if (notification.recipientType === 'TEACHER') {
          const links = await prisma.teacherLineLink.findMany({
            where: { teacherId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        } else if (notification.recipientType === 'STUDENT') {
          const links = await prisma.studentLineLink.findMany({
            where: { studentId: notification.recipientId!, channelId: channelIdForDelivery, enabled: true },
            select: { lineUserId: true }
          });
          lineIds.push(...links.map(l => l.lineUserId));
        }
      }
    }
    
    // Filter to valid LINE IDs first
    const validIds = lineIds.filter(id => isValidLineId(id));
    // Skip if no valid LINE IDs or channel
    if (validIds.length === 0 || !channelIdForDelivery || !notification?.message) {
      continue;
    }
    
    // Group by channel + message
    const groupKey = `${channelIdForDelivery}:${notification.message}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        channelId: channelIdForDelivery,
        message: notification.message!,
        lineIds: [],
        notifications: [],
        recipients: [],
      });
    }
    
    const group = groups.get(groupKey)!;
    group.lineIds.push(...validIds);
    group.notifications.push(notification);
    group.recipients.push({ notification, lineIds: validIds });
  }
  
  // Get credentials for each channel
  for (const group of groups.values()) {
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId: group.channelId }
    });
    
    if (channel) {
      const token = isEncrypted(channel.channelAccessToken) ? decrypt(channel.channelAccessToken) : channel.channelAccessToken;
      const secret = isEncrypted(channel.channelSecret) ? decrypt(channel.channelSecret) : channel.channelSecret;
      group.credentials = { channelAccessToken: token, channelSecret: secret };
    }
  }
  
  return Array.from(groups.values()).filter(g => g.credentials && g.lineIds.length > 0);
}

/**
 * Process multiple notifications with channel grouping for efficient multicast
 */
async function processBatchWithGrouping(
  notifications: Notification[],
  maxConcurrency: number,
  circuitOpenUntil?: Map<string, number>,
  circuitFailCount?: Map<string, number>
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;
  const cfg = getNotificationConfig();
  
  // First, mark all notifications as processing
  await prisma.notification.updateMany({
    where: {
      notificationId: { in: notifications.map(n => n.notificationId) }
    },
    data: {
      status: NotificationStatus.PROCESSING,
      processingAttempts: { increment: 1 }
    }
  });
  
  try {
    // Group notifications by channel and message
    const groups = await groupNotificationsByChannel(notifications);
    consoleDev.log(`Grouped ${notifications.length} notifications into ${groups.length} channel groups`);
    
    // Process each group
    for (const group of groups) {
      // Track per-group delivered status at LINE ID granularity
      const pendingByNotif = new Map<string, number>();
      const lineToNotifs = new Map<string, Set<string>>();
      const deliveredNotifIds = new Set<string>();
      // Initialize maps
      for (const r of group.recipients) {
        const notifId = r.notification.notificationId;
        const validIds = r.lineIds;
        pendingByNotif.set(notifId, (pendingByNotif.get(notifId) || 0) + validIds.length);
        for (const id of validIds) {
          if (!lineToNotifs.has(id)) lineToNotifs.set(id, new Set());
          lineToNotifs.get(id)!.add(notifId);
        }
      }
      // Snapshot initial valid count to identify zero-recipient notifications reliably on failure
      const initialValidCounts = new Map(pendingByNotif);
      try {
        // Circuit breaker: skip sends if open
        if (circuitOpenUntil) {
          const openUntil = circuitOpenUntil.get(group.channelId);
          if (openUntil && Date.now() < openUntil) {
            // Reset notifications back to FAILED with a future scheduledAt so they get retried later
            const ids = group.notifications.map(n => n.notificationId);
            await prisma.notification.updateMany({
              where: { notificationId: { in: ids } },
              data: {
                status: NotificationStatus.FAILED,
                scheduledAt: new Date(openUntil),
                logs: {
                  success: false,
                  message: 'SKIPPED_CIRCUIT_OPEN: deferred to cooldown',
                  deliveryChannelId: group.channelId,
                  timestamp: new Date().toISOString(),
                  errorType: 'TRANSIENT',
                  errorCode: 'CIRCUIT_OPEN',
                  httpStatus: 429,
                }
              }
            });
            // Undo the attempts increment for these, so skipped runs don't consume retry budget
            await prisma.notification.updateMany({
              where: { notificationId: { in: ids }, processingAttempts: { gt: 0 } },
              data: { processingAttempts: { decrement: 1 } }
            });
            logEvent('worker.circuit_open.skip', { channel_id: group.channelId, open_until: new Date(openUntil).toISOString(), deferred: group.notifications.length });
            failed += group.notifications.length; // Not delivered in this run
            continue;
          }
        }
        // Note: group-level idempotency across batches is disabled to avoid dropping
        // recipients in subsequent fetches. Each batch's group is sent independently.
        // Remove duplicates from lineIds
        const uniqueLineIds = [...new Set(group.lineIds)];

        // Split into chunks according to config
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueLineIds.length; i += cfg.groupMaxRecipients) {
          chunks.push(uniqueLineIds.slice(i, i + cfg.groupMaxRecipients));
        }

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await sendLineMulticast(chunk, group.message, group.credentials);
          logEvent('worker.send_multicast', {
            channel_id: group.channelId,
            recipients: chunk.length,
            chunk_index: i,
            chunks_total: chunks.length,
          });
          // Update per-notification pending counts based on delivered LINE IDs
          const newlyComplete: string[] = [];
          for (const id of chunk) {
            const notifIds = lineToNotifs.get(id);
            if (!notifIds) continue;
            for (const notifId of notifIds) {
              const remaining = (pendingByNotif.get(notifId) || 0) - 1;
              pendingByNotif.set(notifId, Math.max(remaining, 0));
              if (remaining === 0) {
                newlyComplete.push(notifId);
              }
            }
          }
          if (newlyComplete.length > 0) {
            await prisma.notification.updateMany({
              where: { notificationId: { in: newlyComplete } },
              data: {
                status: NotificationStatus.SENT,
                sentAt: new Date(),
                logs: {
                  success: true,
                  message: `All linked accounts delivered via chunks`,
                  deliveryChannelId: group.channelId,
                  timestamp: new Date().toISOString(),
                }
              }
            });
            newlyComplete.forEach(id => deliveredNotifIds.add(id));
          }
        }

        // Group completed; ensure any remaining fully delivered are marked
        const remainingToMark: string[] = [];
        for (const [notifId, remain] of pendingByNotif.entries()) {
          if (remain === 0 && !deliveredNotifIds.has(notifId)) remainingToMark.push(notifId);
        }
        if (remainingToMark.length > 0) {
          await prisma.notification.updateMany({
            where: { notificationId: { in: remainingToMark } },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
              logs: {
                success: true,
                message: `Delivered via prior chunk(s)`,
                deliveryChannelId: group.channelId,
                timestamp: new Date().toISOString(),
              }
            }
          });
          remainingToMark.forEach(id => deliveredNotifIds.add(id));
        }

        successful += group.notifications.length;
        // Reset consecutive transient failure counter on success
        if (circuitFailCount) circuitFailCount.set(group.channelId, 0);
        consoleDev.log(`✅ Sent multicast to ${uniqueLineIds.length} recipients for channel ${group.channelId}`);
        
      } catch (error) {
        // Mark all notifications in this group as failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const classification = classifyLineApiError(error);
        const now = Date.now();
        const updates: any = {
          status: NotificationStatus.FAILED,
          logs: {
            success: false,
            message: errorMessage,
            deliveryChannelId: group.channelId,
            timestamp: new Date().toISOString(),
            errorType: classification.type,
            errorCode: classification.code,
            httpStatus: classification.status,
          }
        };
        // Exponential backoff for transient errors
        if (classification.type === 'TRANSIENT') {
          // Use next attempt number based on increment earlier
          const maxNextAttempt = Math.max(...group.notifications.map(n => (n.processingAttempts || 0) + 1));
          const backoffMs = maxNextAttempt === 1 ? 10_000 : maxNextAttempt === 2 ? 30_000 : 120_000;
          updates.scheduledAt = new Date(now + backoffMs);
        } else {
          // Mark as terminal by setting attempts to MAX_ATTEMPTS
          updates.processingAttempts = MAX_ATTEMPTS;
        }
        // Open circuit only after threshold of consecutive transient errors
        if (classification.type === 'TRANSIENT') {
          if (circuitFailCount) {
            const threshold = cfg.circuitOpenThreshold;
            const current = (circuitFailCount.get(group.channelId) || 0) + 1;
            circuitFailCount.set(group.channelId, current);
            if (current >= threshold && circuitOpenUntil) {
              const cooldown = cfg.circuitCooldownMs;
              circuitOpenUntil.set(group.channelId, now + cooldown);
              circuitFailCount.set(group.channelId, 0);
              logEvent('worker.circuit_open', { channel_id: group.channelId, cooldown_ms: cooldown, threshold });
            } else {
              logEvent('worker.circuit_failure_count', { channel_id: group.channelId, count: current, threshold });
            }
          }
        } else {
          // Non-transient error breaks the consecutive streak
          if (circuitFailCount) circuitFailCount.set(group.channelId, 0);
        }
        // Only mark undelivered notifications as FAILED; preserve SENT ones
        const undeliveredIds = group.notifications
          .map(n => n.notificationId)
          .filter(id => (pendingByNotif.get(id) || 0) > 0);
        if (undeliveredIds.length > 0) {
          await prisma.notification.updateMany({
            where: { notificationId: { in: undeliveredIds } },
            data: updates
          });
        }
        // Additionally, handle notifications with zero valid LINE IDs (they were grouped but have no deliverable recipients)
        const zeroValidIds = Array.from(initialValidCounts.entries())
          .filter(([id, count]) => count === 0)
          .map(([id]) => id);
        if (zeroValidIds.length > 0) {
          await prisma.notification.updateMany({
            where: { notificationId: { in: zeroValidIds } },
            data: {
              status: NotificationStatus.FAILED,
              processingAttempts: MAX_ATTEMPTS,
              logs: {
                success: false,
                message: 'SKIPPED_NO_LINK: No valid LINE recipients',
                deliveryChannelId: group.channelId,
                timestamp: new Date().toISOString(),
                errorType: 'PERMANENT',
                errorCode: 'NO_VALID_RECIPIENTS',
              }
            }
          });
        }
        
        const deliveredCount = group.notifications.length - undeliveredIds.length - zeroValidIds.length;
        if (deliveredCount > 0) {
          successful += deliveredCount;
          logEvent('worker.group.partial_success', {
            channel_id: group.channelId,
            delivered: deliveredCount,
            failed: undeliveredIds.length + zeroValidIds.length,
          });
        }
        failed += undeliveredIds.length + zeroValidIds.length;
        console.error(`❌ Failed to send multicast for channel ${group.channelId}:`, errorMessage);
      }
    }
    
    // Handle notifications that couldn't be grouped (no valid recipients)
    const groupedIds = new Set(groups.flatMap(g => g.notifications.map(n => n.notificationId)));
    const ungroupedNotifications = notifications.filter(n => !groupedIds.has(n.notificationId));
    
    if (ungroupedNotifications.length > 0) {
      await prisma.notification.updateMany({
        where: {
          notificationId: { in: ungroupedNotifications.map(n => n.notificationId) }
        },
        data: {
          status: NotificationStatus.FAILED,
          processingAttempts: MAX_ATTEMPTS,
          logs: {
            success: false,
            message: 'No valid LINE recipients found',
            timestamp: new Date().toISOString(),
          }
        }
      });
      
      failed += ungroupedNotifications.length;
    }
    
  } catch (error) {
    console.error('Error in batch processing:', error);
    // Fall back to individual processing for remaining notifications
    const remainingNotifications = await prisma.notification.findMany({
      where: {
        notificationId: { in: notifications.map(n => n.notificationId) },
        status: NotificationStatus.PROCESSING
      }
    });
    
    const result = await processBatchConcurrently(remainingNotifications, maxConcurrency);
    successful += result.successful;
    failed += result.failed;
  }
  
  return { successful, failed };
}

/**
 * Process multiple notifications concurrently. It uses Promise.allSettled
 * to ensure that one failed notification does not stop others in the batch.
 */
async function processBatchConcurrently(
  notifications: Notification[],
  maxConcurrency: number
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  // Process in chunks to control concurrency
  for (let i = 0; i < notifications.length; i += maxConcurrency) {
    const batch = notifications.slice(i, i + maxConcurrency);

    const results = await Promise.allSettled(
      batch.map(notification => processNotification(notification))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful++;
      } else {
        failed++;
        const notification = batch[index];
        // Enhanced error logging with notification context
        console.error(`❌ Notification batch failure:`, {
          notificationId: notification.notificationId,
          recipientType: notification.recipientType,
          recipientId: notification.recipientId,
          notificationType: notification.notificationType,
          branchId: notification.branchId,
          attempt: notification.processingAttempts,
          scheduledAt: notification.scheduledAt,
          targetDate: notification.targetDate,
          error: result.reason
        });
      }
    });
  }

  return { successful, failed };
}

/**
 * Enhanced notification worker with configurable settings and performance improvements.
 */
export const runNotificationWorker = async (config: Partial<WorkerConfig> = {}): Promise<WorkerResult> => {
  const startTime = Date.now();
  const workerConfig = { ...DEFAULT_CONFIG, ...config };
  const cfg = getNotificationConfig();
  const circuitOpenUntil = cfg.circuitEnabled ? new Map<string, number>() : undefined;
  const circuitFailCount = cfg.circuitEnabled ? new Map<string, number>() : undefined;

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let batches = 0;

  try {
    // Add a brief delay to allow for transaction propagation in a distributed environment.
    // This helps prevent a race condition where the worker starts before the notification
    // records are visible to it.
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    consoleDev.log(`Starting notification worker with config:`, workerConfig);

    while (Date.now() - startTime < workerConfig.maxExecutionTimeMs) {
      // Fetch next batch of pending notifications
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] },
          processingAttempts: { lt: MAX_ATTEMPTS },
          scheduledAt: { lte: new Date() },
        },
        take: workerConfig.batchSize,
        orderBy: [
          { processingAttempts: 'asc' }, // Process new notifications first
          { scheduledAt: 'asc' }, // Then by scheduled time
        ],
      });

      // If no notifications to process, break
      if (pendingNotifications.length === 0) {
        consoleDev.log('No pending notifications found. Worker completed.');
        consoleDev.log(`Query criteria: status IN [PENDING, FAILED], attempts < ${MAX_ATTEMPTS}, scheduledAt <= ${new Date().toISOString()}`);
        break;
      }

      consoleDev.log(`Processing batch ${batches + 1} with ${pendingNotifications.length} notifications`);
      logEvent('worker.batch.start', { batch: batches + 1, size: pendingNotifications.length });

      // Log details of notifications being processed
      pendingNotifications.forEach((notif, idx) => {
        consoleDev.log(`  ${idx + 1}. ${notif.recipientType} ${notif.recipientId} - Status: ${notif.status}, Attempts: ${notif.processingAttempts}`);
      });

      // Process batch with channel grouping for efficient multicast
      const batchResult = await processBatchWithGrouping(
        pendingNotifications,
        workerConfig.maxConcurrency,
        circuitOpenUntil,
        circuitFailCount,
      );

      totalProcessed += pendingNotifications.length;
      totalSuccessful += batchResult.successful;
      totalFailed += batchResult.failed;
      batches++;

      consoleDev.log(`Batch ${batches} completed: ${batchResult.successful} successful, ${batchResult.failed} failed`);
      logEvent('worker.batch.end', { batch: batches, successful: batchResult.successful, failed: batchResult.failed });

      // Delay between batches to avoid overwhelming the system
      if (pendingNotifications.length === workerConfig.batchSize) {
        await new Promise(resolve => setTimeout(resolve, workerConfig.delayBetweenBatchesMs));
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const result: WorkerResult = {
      totalProcessed,
      successful: totalSuccessful,
      failed: totalFailed,
      executionTimeMs,
      batches
    };

    consoleDev.log(`Notification worker completed:`, result);
    logEvent('worker.end', result as unknown as Record<string, unknown>);
    return result;

  } catch (error) {
    // Enhanced error logging for worker-level failures
    console.error('❌ Notification worker encountered a critical error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalProcessed,
      successful: totalSuccessful,
      failed: totalFailed,
      batches,
      executionTimeMs: Date.now() - startTime,
      config: workerConfig
    });
    const executionTimeMs = Date.now() - startTime;

    return {
      totalProcessed,
      successful: totalSuccessful,
      failed: totalFailed,
      executionTimeMs,
      batches
    };
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use runNotificationWorker() instead
 */
export const runSimpleNotificationWorker = async (): Promise<void> => {
  await runNotificationWorker({ batchSize: 10, maxConcurrency: 1 });
};
