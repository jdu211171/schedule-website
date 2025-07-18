import { prisma } from '@/lib/prisma';
import { NotificationStatus } from '@prisma/client';
import { logCleanupOperation } from './notification-cleanup-logger';

export interface CleanupConfig {
  retentionDays: {
    [NotificationStatus.SENT]: number;
    [NotificationStatus.FAILED]: number;
    [NotificationStatus.PENDING]: number;
    [NotificationStatus.PROCESSING]: number;
  };
  batchSize: number;
  maxExecutionTimeMs: number;
  dryRun: boolean;
}

export interface CleanupResult {
  success: boolean;
  totalProcessed: number;
  totalDeleted: number;
  deletedByStatus: {
    [key in NotificationStatus]?: number;
  };
  executionTimeMs: number;
  errors: string[];
  dryRun: boolean;
}

export interface CleanupStats {
  status: NotificationStatus;
  count: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
}

const DEFAULT_CONFIG: CleanupConfig = {
  retentionDays: {
    [NotificationStatus.SENT]: 30,
    [NotificationStatus.FAILED]: 90,
    [NotificationStatus.PENDING]: 0, // No automatic cleanup
    [NotificationStatus.PROCESSING]: 0, // No automatic cleanup
  },
  batchSize: 1000,
  maxExecutionTimeMs: 10 * 60 * 1000, // 10 minutes
  dryRun: false,
};

/**
 * Gets cleanup statistics for notifications
 */
export const getCleanupStats = async (branchId?: string): Promise<CleanupStats[]> => {
  const stats = await prisma.notification.groupBy({
    by: ['status'],
    where: branchId ? { branchId } : undefined,
    _count: true,
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  return stats.map(stat => ({
    status: stat.status,
    count: stat._count,
    oldestRecord: stat._min.createdAt,
    newestRecord: stat._max.createdAt,
  }));
};

/**
 * Gets notifications eligible for cleanup
 */
export const getEligibleNotifications = async (
  config: CleanupConfig,
  branchId?: string
): Promise<{ status: NotificationStatus; count: number; cutoffDate: Date }[]> => {
  const results = [];

  for (const [status, retentionDays] of Object.entries(config.retentionDays)) {
    if (retentionDays === 0) continue; // Skip statuses with no cleanup

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const count = await prisma.notification.count({
      where: {
        status: status as NotificationStatus,
        createdAt: { lt: cutoffDate },
        ...(branchId && { branchId }),
      },
    });

    if (count > 0) {
      results.push({
        status: status as NotificationStatus,
        count,
        cutoffDate,
      });
    }
  }

  return results;
};

/**
 * Performs cleanup of old notifications
 */
export const cleanupNotifications = async (
  config: Partial<CleanupConfig> = {},
  branchId?: string,
  logOptions: {
    userId?: string;
    userEmail?: string;
  } = {}
): Promise<CleanupResult> => {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const result: CleanupResult = {
    success: false,
    totalProcessed: 0,
    totalDeleted: 0,
    deletedByStatus: {},
    executionTimeMs: 0,
    errors: [],
    dryRun: finalConfig.dryRun,
  };

  try {
    console.log(`Starting notification cleanup ${finalConfig.dryRun ? '(DRY RUN)' : ''}...`);
    
    const eligibleNotifications = await getEligibleNotifications(finalConfig, branchId);
    
    if (eligibleNotifications.length === 0) {
      console.log('No notifications eligible for cleanup');
      result.success = true;
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }

    for (const { status, count, cutoffDate } of eligibleNotifications) {
      if (Date.now() - startTime > finalConfig.maxExecutionTimeMs) {
        result.errors.push('Maximum execution time exceeded');
        break;
      }

      console.log(`Processing ${count} ${status} notifications older than ${cutoffDate.toISOString()}`);
      
      let processedForStatus = 0;
      let deletedForStatus = 0;

      // Process in batches
      while (processedForStatus < count) {
        if (Date.now() - startTime > finalConfig.maxExecutionTimeMs) {
          result.errors.push('Maximum execution time exceeded during batch processing');
          break;
        }

        const batchSize = Math.min(finalConfig.batchSize, count - processedForStatus);
        
        try {
          if (finalConfig.dryRun) {
            // For dry run, just count what would be deleted
            const batchCount = await prisma.notification.count({
              where: {
                status,
                createdAt: { lt: cutoffDate },
                ...(branchId && { branchId }),
              },
              take: batchSize,
            });
            deletedForStatus += batchCount;
          } else {
            // Find notifications to delete
            const notificationsToDelete = await prisma.notification.findMany({
              where: {
                status,
                createdAt: { lt: cutoffDate },
                ...(branchId && { branchId }),
              },
              select: { notificationId: true },
              take: batchSize,
            });

            if (notificationsToDelete.length === 0) {
              break; // No more notifications to process
            }

            // Delete the batch
            const deleteResult = await prisma.notification.deleteMany({
              where: {
                notificationId: {
                  in: notificationsToDelete.map(n => n.notificationId),
                },
              },
            });

            deletedForStatus += deleteResult.count;
          }

          processedForStatus += batchSize;
          
          // Log progress periodically
          if (processedForStatus % (finalConfig.batchSize * 5) === 0) {
            console.log(`Processed ${processedForStatus}/${count} ${status} notifications`);
          }
        } catch (error) {
          const errorMsg = `Error processing ${status} notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
          break;
        }
      }

      result.totalProcessed += processedForStatus;
      result.totalDeleted += deletedForStatus;
      result.deletedByStatus[status] = deletedForStatus;

      console.log(`Completed ${status}: processed ${processedForStatus}, deleted ${deletedForStatus}`);
    }

    result.success = result.errors.length === 0;
    result.executionTimeMs = Date.now() - startTime;

    console.log(`Cleanup completed in ${result.executionTimeMs}ms`);
    console.log(`Total processed: ${result.totalProcessed}, Total deleted: ${result.totalDeleted}`);
    console.log(`Deleted by status:`, result.deletedByStatus);
    
    if (result.errors.length > 0) {
      console.log(`Errors encountered:`, result.errors);
    }

    // Log the cleanup operation
    logCleanupOperation(result, finalConfig, {
      branchId,
      userId: logOptions.userId,
      userEmail: logOptions.userEmail,
    });

    return result;
  } catch (error) {
    result.success = false;
    result.executionTimeMs = Date.now() - startTime;
    result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Notification cleanup failed:', error);
    
    // Log the failed cleanup operation
    logCleanupOperation(result, finalConfig, {
      branchId,
      userId: logOptions.userId,
      userEmail: logOptions.userEmail,
    });
    
    return result;
  }
};

/**
 * Performs a dry run to show what would be cleaned up
 */
export const dryRunCleanup = async (
  config: Partial<CleanupConfig> = {},
  branchId?: string,
  logOptions: {
    userId?: string;
    userEmail?: string;
  } = {}
): Promise<CleanupResult> => {
  return cleanupNotifications({ ...config, dryRun: true }, branchId, logOptions);
};

/**
 * Gets configuration from environment variables
 */
export const getCleanupConfigFromEnv = (): Partial<CleanupConfig> => {
  const config: Partial<CleanupConfig> = {};
  
  // Retention days
  const sentRetention = process.env.NOTIFICATION_CLEANUP_SENT_RETENTION_DAYS;
  const failedRetention = process.env.NOTIFICATION_CLEANUP_FAILED_RETENTION_DAYS;
  const batchSize = process.env.NOTIFICATION_CLEANUP_BATCH_SIZE;
  const maxExecutionTime = process.env.NOTIFICATION_CLEANUP_MAX_EXECUTION_TIME_MS;

  if (sentRetention || failedRetention) {
    config.retentionDays = {
      [NotificationStatus.SENT]: sentRetention ? parseInt(sentRetention, 10) : DEFAULT_CONFIG.retentionDays[NotificationStatus.SENT],
      [NotificationStatus.FAILED]: failedRetention ? parseInt(failedRetention, 10) : DEFAULT_CONFIG.retentionDays[NotificationStatus.FAILED],
      [NotificationStatus.PENDING]: 0,
      [NotificationStatus.PROCESSING]: 0,
    };
  }

  if (batchSize) {
    config.batchSize = parseInt(batchSize, 10);
  }

  if (maxExecutionTime) {
    config.maxExecutionTimeMs = parseInt(maxExecutionTime, 10);
  }

  return config;
};