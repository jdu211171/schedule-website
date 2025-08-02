
import { prisma } from '@/lib/prisma';
import { Notification, NotificationStatus } from '@prisma/client';
import { sendLineMulticast, isValidLineId } from '@/lib/line-multi-channel';
import { getChannelCredentials } from '@/lib/line-multi-channel';

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

console.log('process.env.NODE_ENV', process.env.NODE_ENV);

interface WorkerResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  executionTimeMs: number;
  batches: number;
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

  try {
    // Get the recipient's LINE IDs based on recipientType and recipientId
    const lineIds: string[] = [];

    if (notification.recipientType === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId: notification.recipientId! },
        select: { lineId: true, lineNotificationsEnabled: true }
      });
      if (teacher?.lineNotificationsEnabled && teacher.lineId) {
        lineIds.push(teacher.lineId);
      }
    } else if (notification.recipientType === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { studentId: notification.recipientId! },
        select: {
          lineId: true,
          parentLineId1: true,
          parentLineId2: true,
          lineNotificationsEnabled: true
        }
      });

      if (student?.lineNotificationsEnabled) {
        // Collect all available LINE IDs for the student and parents
        if (student.lineId) {
          lineIds.push(student.lineId);
        }
        if (student.parentLineId1) {
          lineIds.push(student.parentLineId1);
        }
        if (student.parentLineId2) {
          lineIds.push(student.parentLineId2);
        }
      }
    }

    if (lineIds.length === 0) {
      throw new Error(`No LINE IDs found or notifications disabled for ${notification.recipientType} ${notification.recipientId}`);
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
      throw new Error(`No valid LINE IDs found for ${notification.recipientType} ${notification.recipientId}`);
    }

    // Get channel credentials for this branch and recipient type
    const credentials = await getChannelCredentials(
      notification.branchId || undefined,
      notification.recipientType as 'TEACHER' | 'STUDENT'
    );

    if (credentials) {
      // Send via multi-channel to all valid LINE IDs
      await sendLineMulticast(validLineIds, notification.message!, credentials);
    } else {
      // Fallback to basic LINE function if no credentials found
      const { sendLineMulticast: fallbackMulticast } = await import('@/lib/line');
      await fallbackMulticast(validLineIds, notification.message!, notification.branchId || undefined);
    }

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
            timestamp: new Date().toISOString()
          }
        },
      },
    });

    // Re-throw to signal failure to the batch processor
    throw error;
  }
};

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

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let batches = 0;

  try {
    // Add a brief delay to allow for transaction propagation in a distributed environment.
    // This helps prevent a race condition where the worker starts before the notification
    // records are visible to it.
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    console.log(`Starting notification worker with config:`, workerConfig);

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
        console.log('No pending notifications found. Worker completed.');
        console.log(`Query criteria: status IN [PENDING, FAILED], attempts < ${MAX_ATTEMPTS}, scheduledAt <= ${new Date().toISOString()}`);
        break;
      }

      console.log(`Processing batch ${batches + 1} with ${pendingNotifications.length} notifications`);

      // Log details of notifications being processed
      pendingNotifications.forEach((notif, idx) => {
        console.log(`  ${idx + 1}. ${notif.recipientType} ${notif.recipientId} - Status: ${notif.status}, Attempts: ${notif.processingAttempts}`);
      });

      // Process batch with controlled concurrency
      const batchResult = await processBatchConcurrently(
        pendingNotifications,
        workerConfig.maxConcurrency
      );

      totalProcessed += pendingNotifications.length;
      totalSuccessful += batchResult.successful;
      totalFailed += batchResult.failed;
      batches++;

      console.log(`Batch ${batches} completed: ${batchResult.successful} successful, ${batchResult.failed} failed`);

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

    console.log(`Notification worker completed:`, result);
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
